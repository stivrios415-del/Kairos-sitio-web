import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { supabase } from '../lib/supabase';

const API = import.meta.env.VITE_API_URL;
const KEY_INST = 'kairos_inst';
const Ctx = createContext(null);
export const useAuth = () => useContext(Ctx);

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null);
  const [perfil, setPerfil] = useState(null);
  const [inst, setInst] = useState(null);
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
      if (!s) { setPerfil(null); setInst(null); setLoading(false); }
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

    // 1) Profesor / admin de una institución
    const { data: p } = await supabase
      .from('profesores')
      .select('id,nombre,email,rol,institucion_id,activo')
      .eq('id', uid).single();
    if (!vigente()) return;

    if (p) {
      if (p.activo === false) return rechazar('Cuenta desactivada. Contacta al administrador.');

      // Si entró con un código de institución, la cuenta debe pertenecer a ella
      const elegida = sessionStorage.getItem(KEY_INST);
      if (elegida && elegida !== p.institucion_id) {
        return rechazar('Tu cuenta no pertenece a la institución que ingresaste. Verifica el código.');
      }

      setPerfil(p);
      let i = null;
      try {
        const r = await fetch(`${API}/instituciones/mia`, {
          headers: { Authorization: `Bearer ${s.access_token}` },
        });
        if (r.ok) i = await r.json();
      } catch { /* sin branding: se usan los colores por defecto */ }
      if (vigente()) { setInst(i); setLoading(false); }
      return;
    }

    // 2) Profesor independiente: el backend confirma que la cuenta existe
    try {
      const res = await fetch(`${API}/profesor-independiente/mi-estado`, {
        headers: { Authorization: `Bearer ${s.access_token}` },
      });
      if (!vigente()) return;
      if (!res.ok) return rechazar('Esta cuenta no tiene acceso al panel web.');
      const estado = await res.json();
      const { data: n } = await supabase
        .from('profesores_independientes').select('nombre').eq('id', uid).single();
      if (!vigente()) return;
      setInst(null);
      setPerfil({
        id: uid,
        nombre: n?.nombre || s.user.email,
        email: s.user.email,
        rol: 'independiente',
        activo: !!estado.activo,
        fecha_vencimiento: estado.fecha_vencimiento,
      });
      setLoading(false);
    } catch {
      if (vigente()) rechazar('No se pudo verificar tu cuenta. Revisa tu conexión e intenta de nuevo.');
    }
  }, []);

  useEffect(() => {
    if (session?.user?.id) cargarPerfil(session);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session?.user?.id, cargarPerfil]);

  const recargar = async () => {
    const { data } = await supabase.auth.getSession();
    if (data.session) await cargarPerfil(data.session);
  };

  const login = async (email, password) => {
    setErrorAcceso('');
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
    if (error) throw new Error('Correo o contraseña incorrectos.');
  };

  const logout = () => {
    sessionStorage.removeItem(KEY_INST);
    return supabase.auth.signOut();
  };

  return (
    <Ctx.Provider value={{ session, perfil, inst, loading, errorAcceso, login, logout, recargar }}>
      {children}
    </Ctx.Provider>
  );
}