import { supabase } from './supabase';

const API = import.meta.env.VITE_API_URL;

export const fechaHoy = () =>
  new Date().toLocaleDateString('en-CA', { timeZone: 'America/Tegucigalpa' });

export const fmt = (d) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

const esperar = (ms) => new Promise((r) => setTimeout(r, ms));

// ── Función para obtener un token válido (con auto-refresh) ──
let refreshEnCurso = null;

async function obtenerTokenValido() {
  const { data: { session } } = await supabase.auth.getSession();
  
  // Si no hay sesión, no podemos hacer nada
  if (!session) return null;

  // Si el token expira en menos de 1 minuto, lo refrescamos
  const expira = session.expires_at * 1000;
  const ahora = Date.now();
  
  if (expira - ahora < 60000) {
    if (!refreshEnCurso) {
      refreshEnCurso = supabase.auth.refreshSession()
        .then(({ data }) => data?.session?.access_token ?? null)
        .catch(() => null)
        .finally(() => { refreshEnCurso = null; });
    }
    return refreshEnCurso;
  }

  return session.access_token;
}

export async function api(path, { method = 'GET', body, params, timeoutMs = 90000 } = {}) {
  if (!API) {
    throw new Error('Falta VITE_API_URL en el .env (debe terminar en /api). Reinicia npm run dev después de crearlo.');
  }

  // ✅ NUEVO: Leemos el colegio elegido por el coordinador
  const colegio = sessionStorage.getItem('kairos_colegio');

  const qs = params
    ? '?' + new URLSearchParams(Object.entries(params).filter(([, v]) => v !== undefined && v !== null && v !== ''))
    : '';
  const esForm = typeof FormData !== 'undefined' && body instanceof FormData;
  const intentos = method === 'GET' ? 2 : 1;

  for (let i = 1; i <= intentos; i++) {
    const token = await obtenerTokenValido();
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), timeoutMs);
    
    try {
      const res = await fetch(`${API}${path}${qs}`, {
        method,
        signal: ctrl.signal,
        headers: {
          ...(esForm ? {} : { 'Content-Type': 'application/json' }),
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
          ...(colegio ? { 'X-Institucion-Id': colegio } : {}), // ✅ NUEVO HEADER
        },
        body: body ? (esForm ? body : JSON.stringify(body)) : undefined,
      });

      // ✅ NUEVO: Si el servidor responde 401, intentamos refrescar el token y reintentar una vez
      if (res.status === 401 && i === 1) {
        console.warn('Token expirado, intentando refrescar...');
        const { data } = await supabase.auth.refreshSession();
        if (data?.session) {
          // Reintentar la petición con el nuevo token
          const nuevoToken = data.session.access_token;
          const resReintento = await fetch(`${API}${path}${qs}`, {
            method,
            signal: ctrl.signal,
            headers: {
              ...(esForm ? {} : { 'Content-Type': 'application/json' }),
              Authorization: `Bearer ${nuevoToken}`,
              ...(colegio ? { 'X-Institucion-Id': colegio } : {}), // ✅ NUEVO HEADER EN REINTENTO
            },
            body: body ? (esForm ? body : JSON.stringify(body)) : undefined,
          });
          
          if (!resReintento.ok) {
            const dataError = await resReintento.json();
            throw new Error(dataError.error || `Error ${resReintento.status}`);
          }
          return await resReintento.json();
        } else {
          // Si no se pudo refrescar, cerramos sesión
          await supabase.auth.signOut();
          throw new Error('Sesión expirada. Por favor, vuelve a iniciar sesión.');
        }
      }

      if (!(res.headers.get('content-type') || '').includes('application/json')) {
        throw new Error(`El servidor respondió algo que no es JSON (HTTP ${res.status}). Revisa que VITE_API_URL apunte al backend y termine en /api.`);
      }
      
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || `Error ${res.status}`);
      return data;
      
    } catch (e) {
      const caidaDeRed = e.name === 'AbortError' || e instanceof TypeError;
      if (caidaDeRed && i < intentos) { await esperar(4000); continue; }
      if (e.name === 'AbortError') throw new Error('El servidor tardó demasiado en responder. Si estaba dormido, intenta de nuevo en unos segundos.');
      if (e instanceof TypeError) throw new Error('No se pudo conectar con el servidor. Causas probables: el backend no permite este origen (CORS) o está dormido.');
      throw e;
    } finally {
      clearTimeout(timer);
    }
  }
}
