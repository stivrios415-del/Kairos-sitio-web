import { useEffect, useState } from 'react';
import { Link, Navigate, useParams } from 'react-router-dom';
import {
  IoArrowBack, IoSchool, IoPerson, IoMailOutline, IoLockClosedOutline,
  IoPersonOutline, IoEyeOutline, IoEyeOffOutline, IoArrowForward,
} from 'react-icons/io5';
import { useAuth } from '../context/AuthContext';

const API = import.meta.env.VITE_API_URL;
const KEY_INST = 'kairos_inst';
const KEY_RED = 'kairos_red'; // ✅ NUEVA CLAVE PARA REDES

export default function Login() {
  const { modo } = useParams();
  const { login, session, perfil, errorAcceso } = useAuth();

  const [inst, setInst] = useState(null); // institución o red validada con el código
  const [codigo, setCodigo] = useState('');
  const [tab, setTab] = useState('login');
  const [nombre, setNombre] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [ver, setVer] = useState(false);
  const [error, setError] = useState('');
  const [aviso, setAviso] = useState('');
  const [cargando, setCargando] = useState(false);

  // ✅ ACTUALIZADO: Limpia también el KEY_RED
  useEffect(() => {
    if (modo === 'independiente') { 
      sessionStorage.removeItem(KEY_INST); 
      sessionStorage.removeItem(KEY_RED); 
    }
  }, [modo]);

  if (modo !== 'instituto' && modo !== 'independiente') return <Navigate to="/bienvenida" replace />;
  if (session && perfil) return <Navigate to="/" replace />;

  const indep = modo === 'independiente';
  const registro = indep && tab === 'registro';
  const color = indep ? '#469de5' : (inst?.color_primario || '#143C65');

  // ✅ ACTUALIZADO: Busca si es institución o si es código de red
  const validarCodigo = async (e) => {
    e.preventDefault();
    const c = codigo.trim().toUpperCase();
    if (c.length < 3) return setError('El código debe tener al menos 3 caracteres.');
    setError(''); setCargando(true);
    try {
      const res = await fetch(`${API}/instituciones/codigo/${encodeURIComponent(c)}`);
      if (res.ok) {
        const i = await res.json();
        if (i.id) sessionStorage.setItem(KEY_INST, i.id);
        sessionStorage.removeItem(KEY_RED);
        setInst(i);
      } else if (res.status === 404) {
        // ¿Es el código de una red de colegios?
        const r2 = await fetch(`${API}/red/codigo/${encodeURIComponent(c)}`);
        if (r2.ok) {
          const red = await r2.json();
          sessionStorage.setItem(KEY_RED, red.id);
          sessionStorage.removeItem(KEY_INST);
          setInst({ nombre: red.nombre });
        } else {
          setError('El código ingresado no corresponde a ninguna institución. Verifica con tu administrador.');
        }
      } else {
        setError('No se pudo verificar el código. Intenta nuevamente.');
      }
    } catch {
      setError('No se pudo conectar con el servidor (¿CORS o servidor dormido?).');
    } finally { setCargando(false); }
  };

  // ✅ ACTUALIZADO: Limpia ambas claves
  const cambiarInstitucion = () => {
    sessionStorage.removeItem(KEY_INST);
    sessionStorage.removeItem(KEY_RED);
    setInst(null); setError(''); setAviso('');
  };

  const enviar = async (e) => {
    e.preventDefault();
    setError(''); setAviso(''); setCargando(true);
    try {
      if (registro) {
        if (password.length < 6) throw new Error('La contraseña debe tener al menos 6 caracteres.');
        const res = await fetch(`${API}/profesor-independiente/registro`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: email.trim(), password, nombre: nombre.trim() }),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data.error || 'No se pudo crear la cuenta.');
        try { await login(email, password); }
        catch { setTab('login'); setAviso('Cuenta creada. Ahora inicia sesión con tu correo y contraseña.'); }
      } else {
        await login(email, password);
      }
    } catch (err) {
      setError(err instanceof TypeError
        ? 'No se pudo conectar con el servidor (¿CORS o servidor dormido?).'
        : err.message);
    } finally {
      setCargando(false);
    }
  };

  // ── Paso 1 (instituto): código de institución o red ──
  if (!indep && !inst) {
    return (
      <div className="codigo-page">
        <Link to="/bienvenida" className="cod-back" aria-label="Volver"><IoArrowBack size={22} /></Link>
        <div className="cod-wrap">
          <div className="w-logo">
            <span className="w-circle"><IoSchool size={38} color="#1A237E" /></span>
            <h1 style={{ color: '#1A237E' }}>KAIROS ASSIST</h1>
            <p style={{ color: '#4A5568' }}>Sistema de Control de Asistencia</p>
          </div>
          <form className="cod-card" onSubmit={validarCodigo}>
            <h2>¿A qué institución<br />perteneces?</h2>
            <p>Ingresa el código único de tu colegio o instituto para continuar</p>
            <input
              className="cod-input" placeholder="INGRESAR CÓDIGO" value={codigo} maxLength={20}
              onChange={(e) => setCodigo(e.target.value.toUpperCase())} autoFocus autoComplete="off"
            />
            {error && <div className="aviso error" style={{ width: '100%', margin: 0 }}>{error}</div>}
            <button className="cod-btn" disabled={cargando}>{cargando ? 'Verificando…' : 'Continuar'}</button>
            <small>¿No tienes el código? Contáctate con el administrador de tu institución.</small>
          </form>
        </div>
      </div>
    );
  }

  // ── Paso 2: correo y contraseña ──
  return (
    <div className="auth" style={{ '--p': color }}>
      <form className="card login" onSubmit={enviar}>
        {indep
          ? <Link to="/bienvenida" className="back"><IoArrowBack size={16} /> Volver</Link>
          : <button type="button" className="back link" onClick={cambiarInstitucion}><IoArrowBack size={16} /> Cambiar institución</button>}

        <div className="auth-top">
          <span className="auth-ico" style={{ background: indep ? '#E6FFFA' : '#EEF2FF', overflow: 'hidden' }}>
            {inst?.logo_url
              ? <img src={inst.logo_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              : indep ? <IoPerson size={28} color="#0D9488" /> : <IoSchool size={28} color="#4F46E5" />}
          </span>
          <h1>{indep ? 'Profesor Independiente' : (inst?.nombre || 'Instituto')}</h1>
          <p className="muted">
            {indep ? 'Controla tu propia clase de asistencia' : 'Entra con tu correo de profesor o administrador'}
          </p>
        </div>

        {indep && (
          <div className="seg">
            <button type="button" className={tab === 'login' ? 'on' : ''} onClick={() => setTab('login')}>Iniciar sesión</button>
            <button type="button" className={tab === 'registro' ? 'on' : ''} onClick={() => setTab('registro')}>Crear cuenta</button>
          </div>
        )}

        {registro && (
          <label>Nombre completo
            <div className="inp"><IoPersonOutline size={18} color="#9CA3AF" />
              <input value={nombre} onChange={(e) => setNombre(e.target.value)} placeholder="Ej: Ana Martínez" required />
            </div>
          </label>
        )}

        <label>Correo electrónico
          <div className="inp"><IoMailOutline size={18} color="#9CA3AF" />
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="correo@ejemplo.com" required autoFocus />
          </div>
        </label>

        <label>Contraseña
          <div className="inp"><IoLockClosedOutline size={18} color="#9CA3AF" />
            <input type={ver ? 'text' : 'password'} value={password} onChange={(e) => setPassword(e.target.value)}
              placeholder={registro ? 'Mínimo 6 caracteres' : 'Tu contraseña'} required />
            <button type="button" className="link" onClick={() => setVer((v) => !v)} aria-label="Mostrar u ocultar contraseña">
              {ver ? <IoEyeOffOutline size={18} /> : <IoEyeOutline size={18} />}
            </button>
          </div>
        </label>

        {aviso && <div className="aviso ok">{aviso}</div>}
        {(error || errorAcceso) && <div className="aviso error">{error || errorAcceso}</div>}

        <button className="btn" disabled={cargando}>
          {cargando ? 'Un momento…' : registro ? 'Crear cuenta' : 'Entrar'}
          {!cargando && <IoArrowForward size={16} />}
        </button>

        {indep && (
          <p className="muted" style={{ textAlign: 'center', margin: '6px 0 0' }}>
            ¿Tu colegio ya usa Kairos? <Link to="/entrar/instituto">Entra por tu instituto</Link>
          </p>
        )}
      </form>
    </div>
  );
}
