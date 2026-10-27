import { useCallback, useEffect, useState } from 'react';
import { FiUserPlus, FiUser, FiCheckCircle, FiXCircle, FiUsers } from 'react-icons/fi';
import { api } from '../../lib/api';
import { useAuth } from '../../context/AuthContext';
import { Btn, Vacio, Aviso } from '../../components/ui';

export default function Profesores() {
  const { perfil } = useAuth();
  const [lista, setLista] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [form, setForm] = useState({ email: '', nombre: '', password: '' });
  const [guardando, setGuardando] = useState(false);
  const [aviso, setAviso] = useState(null);

  const cargar = useCallback(async () => {
    try { setLista(await api('/admin/profesores')); }
    catch (e) { setAviso({ tipo: 'error', texto: e.message }); }
    finally { setCargando(false); }
  }, []);
  useEffect(() => { cargar(); }, [cargar]);

  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  const registrar = async (e) => {
    e.preventDefault();
    if (form.password.length < 6) return setAviso({ tipo: 'error', texto: 'La contraseña debe tener al menos 6 caracteres.' });
    setGuardando(true); setAviso(null);
    try {
      await api('/admin/profesores', {
        method: 'POST',
        body: { email: form.email.trim(), nombre: form.nombre.trim(), password: form.password },
      });
      setForm({ email: '', nombre: '', password: '' });
      setAviso({ tipo: 'ok', texto: 'Profesor registrado.' });
      cargar();
    } catch (err) { setAviso({ tipo: 'error', texto: err.message }); }
    finally { setGuardando(false); }
  };

  const toggle = async (p) => {
    try {
      await api(`/admin/profesores/${p.id}/toggle`, { method: 'PUT', body: { activo: !p.activo } });
      cargar();
    } catch (err) { setAviso({ tipo: 'error', texto: err.message }); }
  };

  return (
    <>
      <h2>Profesores</h2>
      <p className="sub">Registra profesores y activa o desactiva su acceso.</p>

      <form className="card" onSubmit={registrar}>
        <h3>Registrar nuevo profesor</h3>
        <div className="fila">
          <label style={{ flex: 1 }}>Correo
            <input type="email" value={form.email} onChange={set('email')} required />
          </label>
          <label style={{ flex: 1 }}>Nombre completo
            <input value={form.nombre} onChange={set('nombre')} required />
          </label>
          <label style={{ flex: 1 }}>Contraseña
            <input type="password" value={form.password} onChange={set('password')} required />
          </label>
          <Btn icon={FiUserPlus} variant="s" disabled={guardando}>{guardando ? 'Registrando…' : 'Registrar'}</Btn>
        </div>
        <Aviso aviso={aviso} />
      </form>

      {cargando ? <p className="muted">Cargando…</p> : lista.length === 0
        ? <Vacio icon={FiUsers} texto="No hay profesores registrados" />
        : lista.map((p) => (
          <div className="li" key={p.id}>
            <span className="avatar" style={{ background: p.activo ? 'var(--success-soft)' : 'var(--danger-soft)', color: p.activo ? 'var(--success)' : 'var(--danger)' }}>
              <FiUser size={18} />
            </span>
            <div className="info">
              <strong>{p.nombre}</strong><br />
              <span className="muted">{p.email}</span>
            </div>
            <span className={`badge ${p.activo ? 'on' : 'off'}`}>
              {p.activo ? <FiCheckCircle size={12} /> : <FiXCircle size={12} />}{p.activo ? 'Activo' : 'Inactivo'}
            </span>
            <Btn variant={p.activo ? 'danger sm' : 'ok sm'} onClick={() => toggle(p)} disabled={p.id === perfil.id}
              title={p.id === perfil.id ? 'No puedes desactivar tu propia cuenta' : ''}>
              {p.activo ? 'Desactivar' : 'Activar'}
            </Btn>
          </div>
        ))}
    </>
  );
}