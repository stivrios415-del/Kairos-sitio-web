import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { supabase } from '../lib/supabase';
import { api } from '../lib/api';

const API = import.meta.env.VITE_API_URL;
const KEY_INST = 'kairos_inst';
const KEY_RED = 'kairos_red';
const KEY_COLEGIO = 'kairos_colegio';
const Ctx = createContext(null);
export const useAuth = () => useContext(Ctx);

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null);
  const [perfil, setPerfil] = useState(null);
  const [instProfesor, setInstProfesor] = useState(null);
  const [colegios, setColegios] = useState([]);
  const [colegioId, setColegioId] = useState(() => sessionStorage.getItem(KEY_COLEGIO));
  const [loading, setLoading] = useState(true);
  const [errorAcceso, setErrorAcceso] = useState('');
  const cargaRef = useRef(0);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      if (!data.session) setLoading(false);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => {
      setSession(s);
      if (!s) { setPerfil(null); setInstProfesor(null); setColegios([]); setLoading(false); }
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  const rechazar = async (texto) => {
    setErrorAcceso(texto);
    await supabase.auth.signOut();
    setLoading(false);
  };

  const cargarPerfil = useCallback(async (s) => {
    const id = ++cargaRef.current;
    const vigente = () => id === cargaRef.current;
    setLoading(true);
    const uid = s.user.id;
    const headers = { Authorization: `Bearer ${s.access_token}` };

    // 1) Profesor / admin de un colegio
    // ✅ FIX: Se usa .maybeSingle() para evitar el error 406
    const { data: p } = await supabase
      .from('profesores').select('id,nombre,email,rol,institucion_id,activo').eq('id', uid).maybeSingle();
    if (!vigente()) return;

    if (p) {
      if (p.activo === false) return rechazar('Cuenta desactivada. Contacta al administrador.');
      if (sessionStorage.getItem(KEY_RED)) return rechazar('Ese código es de una red de colegios. Usa el código de tu colegio.');
      const elegida = sessionStorage.getItem(KEY_INST);
      if (elegida && elegida !== p.institucion_id) {
        return rechazar('Tu cuenta no pertenece a la institución que ingresaste. Verifica el código.');
      }
      setPerfil(p);
      let i = null;
      try {
        const r = await fetch(`${API}/instituciones/mia`, { headers });
        if (r.ok) i = await r.json();
      } catch { /* sin branding: colores por defecto */ }
      if (vigente()) { setInstProfesor(i); setLoading(false); }
      return;
    }

    // 2) Coordinador de una red de colegios
    try {
      const r = await fetch(`${API}/red/mi-red`, { headers });
      if (!vigente()) return;
      if (r.ok) {
        const data = await r.json();
        if (sessionStorage.getItem(KEY_INST)) return rechazar('Ese código es de un colegio. Usa el código de tu red.');
        const redElegida = sessionStorage.getItem(KEY_RED);
        if (redElegida && redElegida !== data.red?.id) {
          return rechazar('Tu cuenta no pertenece a la red que ingresaste. Verifica el código.');
        }
        const guardado = sessionStorage.getItem(KEY_COLEGIO);
        if (guardado && !data.colegios.some((c) => c.id === guardado)) {
          sessionStorage.removeItem(KEY_COLEGIO);
          setColegioId(null);
        }
        setColegios(data.colegios);
        setInstProfesor(null);
        setPerfil({ id: uid, nombre: data.nombre || s.user.email, email: s.user.email, rol: 'coordinador', red: data.red });
        setLoading(false);
        return;
      } else {
        console.warn(`Fallo al cargar red: ${r.status} ${r.statusText}`);
      }
    } catch (err) { 
      console.warn('Error de red al buscar coordinador:', err.message);
    }

    // 3) Profesor independiente
    try {
      const res = await fetch(`${API}/profesor-independiente/mi-estado`, { headers });
      if (!vigente()) return;
      if (!res.ok) return rechazar('Esta cuenta no tiene acceso al panel web.');
      const estado = await res.json();
      const { data: n } = await supabase.from('profesores_independientes').select('nombre').eq('id', uid).single();
      if (!vigente()) return;
      setInstProfesor(null);
      setPerfil({
        id: uid, nombre: n?.nombre || s.user.email, email: s.user.email, rol: 'independiente',
        activo: !!estado.activo, fecha_vencimiento: estado.fecha_vencimiento,
      });
      setLoading(false);
    } catch {
      if (vigente()) rechazar('No se pudo verificar tu cuenta. Revisa tu conexión e intenta de nuevo.');
    }
  }, []);

  useEffect(() => {
    if (session?.user?.id) cargarPerfil(session);
  }, [session?.user?.id, cargarPerfil]);

  const recargar = async () => {
    const { data } = await supabase.auth.getSession();
    if (data.session) await cargarPerfil(data.session);
  };

  const recargarColegios = useCallback(async () => {
    try { setColegios((await api('/red/mi-red')).colegios); } catch { /* se mantiene la lista actual */ }
  }, []);

  const elegirColegio = (c) => { sessionStorage.setItem(KEY_COLEGIO, c.id); setColegioId(c.id); };
  const salirDeColegio = () => { sessionStorage.removeItem(KEY_COLEGIO); setColegioId(null); };

  const login = async (email, password) => {
    setErrorAcceso('');
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
    if (error) throw new Error('Correo o contraseña incorrectos.');
  };

  const logout = () => {
    [KEY_INST, KEY_RED, KEY_COLEGIO].forEach((k) => sessionStorage.removeItem(k));
    setColegioId(null);
    return supabase.auth.signOut();
  };

  const esCoord = perfil?.rol === 'coordinador';
  const inst = esCoord ? (colegios.find((c) => c.id === colegioId) || null) : instProfesor;
  const esAdminEfectivo = perfil?.rol === 'admin' || (esCoord && !!inst);

  return (
    <Ctx.Provider value={{
      session, perfil, inst, colegios, loading, errorAcceso, esAdminEfectivo,
      login, logout, recargar, elegirColegio, salirDeColegio, recargarColegios,
    }}>
      {children}
    </Ctx.Provider>
  );
}
