import { useCallback, useEffect, useMemo, useState } from 'react';
import { FiPlus, FiEdit2, FiTrash2, FiUser, FiBookOpen, FiRefreshCw } from 'react-icons/fi';
import { api } from '../../lib/api';
import { Btn, Modal, Vacio, Aviso } from '../../components/ui';
// ✅ NUEVO: Importación de useAuth
import { useAuth } from '../../context/AuthContext';

const VACIO = { nombre: '', descripcion: '', grado: '', seccion: '', carrera: '', profesor_id: '' };
const conActual = (lista, valor) => (valor && !lista.includes(valor) ? [...lista, valor] : lista);

export default function Clases() {
  // ✅ NUEVO: Obtenemos la institución para saber si es rural
  const { inst } = useAuth();
  const rural = !!inst?.es_rural;

  const [materias, setMaterias] = useState([]);
  const [profesores, setProfesores] = useState([]);
  const [estudiantes, setEstudiantes] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [modal, setModal] = useState(false);
  const [editando, setEditando] = useState(null);
  const [form, setForm] = useState(VACIO);
  const [guardando, setGuardando] = useState(false);
  const [aviso, setAviso] = useState(null);

  const cargar = useCallback(async () => {
    setCargando(true);
    try {
      const [m, p, e] = await Promise.all([
        api('/materias'), api('/admin/profesores'), api('/estudiantes').catch(() => []),
      ]);
      setMaterias(m); setProfesores(p); setEstudiantes(e);
    } catch (err) { setAviso({ tipo: 'error', texto: err.message }); }
    finally { setCargando(false); }
  }, []);
  useEffect(() => { cargar(); }, [cargar]);

  // Grados y carreras tomados de los estudiantes reales: así la clase
  // siempre coincide con el texto con que se cruzan los alumnos.
  const carreras = useMemo(() => {
    const v = [...new Set(estudiantes.map((x) => x.carrera).filter(Boolean))].sort();
    return v.length ? v : ['BCH', 'Informatica', 'Finanzas', 'Administracion'];
  }, [estudiantes]);
  const grados = useMemo(() => {
    const v = [...new Set(estudiantes.map((x) => String(x.grado)).filter(Boolean))].sort((a, b) => a - b);
    return v.length ? v : ['7', '8', '9', '10', '11', '12'];
  }, [estudiantes]);

  const nombreProf = (id) => (id ? profesores.find((p) => p.id === id)?.nombre || 'Desconocido' : 'Sin asignar');
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  const abrir = (m = null) => {
    setEditando(m);
    setForm(m ? {
      nombre: m.nombre || '', descripcion: m.descripcion || '', grado: String(m.grado ?? ''),
      seccion: m.seccion || '', carrera: m.carrera || '', profesor_id: m.profesor_id || '',
    } : VACIO);
    setModal(true);
  };

  // ✅ MODIFICADO: Lógica para colegios rurales
  const guardar = async (e) => {
    e.preventDefault();
    
    const datos = rural ? { ...form, grado: 'Todos', seccion: 'U', carrera: 'Rural' } : form;
    
    if (!datos.nombre || !datos.grado || !datos.seccion || !datos.carrera) {
      return setAviso({ tipo: 'error', texto: 'Completa los campos obligatorios.' });
    }
    
    setGuardando(true);
    try {
      await api(editando ? `/materias/${editando.id}` : '/materias', {
        method: editando ? 'PUT' : 'POST', 
        body: datos, // ✅ Usamos 'datos' en lugar de 'form'
      });
      setModal(false);
      setAviso({ tipo: 'ok', texto: editando ? 'Clase actualizada.' : 'Clase creada.' });
      cargar();
    } catch (err) { setAviso({ tipo: 'error', texto: err.message }); }
    finally { setGuardando(false); }
  };

  const eliminar = async (m) => {
    if (!window.confirm(`¿Eliminar la clase "${m.nombre}"?`)) return;
    try {
      await api(`/materias/${m.id}`, { method: 'DELETE' });
      setAviso({ tipo: 'ok', texto: 'Clase eliminada.' });
      cargar();
    } catch (err) { setAviso({ tipo: 'error', texto: err.message }); }
  };

  return (
    <>
      <div className="top">
        <div><h2>Clases registradas</h2><p className="sub" style={{ margin: 0 }}>{materias.length} clases</p></div>
        <div className="fila">
          <Btn icon={FiRefreshCw} variant="sec" onClick={cargar}>Actualizar</Btn>
          <Btn icon={FiPlus} variant="s" onClick={() => abrir()}>Nueva clase</Btn>
        </div>
      </div>
      <Aviso aviso={aviso} />
      <div style={{ height: 14 }} />

      {cargando ? <p className="muted">Cargando…</p> : materias.length === 0
        ? <Vacio icon={FiBookOpen} texto="No hay clases creadas" />
        : <div className="grid">
          {materias.map((m) => (
            <div className="cardx" key={m.id}>
              <div className="accent" />
              <div className="body">
                <strong style={{ color: 'var(--p)', fontSize: 17 }}>{m.nombre}</strong>
                <span className="muted">{m.grado}° - {m.seccion} - {m.carrera}</span>
                <span style={{ color: 'var(--s)', fontWeight: 600, fontSize: 13, display: 'flex', alignItems: 'center', gap: 5 }}>
                  <FiUser size={13} />{nombreProf(m.profesor_id)}
                </span>
                {m.descripcion ? <span className="muted">{m.descripcion}</span> : null}
                <div className="acciones">
                  <Btn icon={FiEdit2} variant="s sm" onClick={() => abrir(m)}>Editar</Btn>
                  <Btn icon={FiTrash2} variant="danger sm" onClick={() => eliminar(m)}>Eliminar</Btn>
                </div>
              </div>
            </div>
          ))}
        </div>}

      {modal && (
        <Modal titulo={editando ? 'Editar clase' : 'Nueva clase'} icon={FiBookOpen} onClose={() => setModal(false)}>
          <form className="form" onSubmit={guardar}>
            <label>Nombre de la clase *<input value={form.nombre} onChange={set('nombre')} required /></label>
            <label>Descripción<input value={form.descripcion} onChange={set('descripcion')} /></label>
            
            {/* ✅ MODIFICADO: Ocultamos Grado, Sección y Carrera si es rural */}
            {!rural && (
              <>
                <div className="row2">
                  <label>Grado *
                    <select value={form.grado} onChange={set('grado')} required>
                      <option value="">Selecciona…</option>
                      {conActual(grados, form.grado).map((g) => <option key={g} value={g}>{g}°</option>)}
                    </select>
                  </label>
                  <label>Sección *<input value={form.seccion} onChange={set('seccion')} placeholder="Ej: A, 1" required /></label>
                </div>
                <label>Carrera *
                  <select value={form.carrera} onChange={set('carrera')} required>
                    <option value="">Selecciona…</option>
                    {conActual(carreras, form.carrera).map((c) => <option key={c} value={c}>{c}</option>)}
                  </select>
                </label>
              </>
            )}

            <label>Profesor asignado
              <select value={form.profesor_id} onChange={set('profesor_id')}>
                <option value="">Sin asignar</option>
                {profesores.filter((p) => p.activo || p.id === form.profesor_id).map((p) => (
                  <option key={p.id} value={p.id}>{p.nombre}</option>
                ))}
              </select>
            </label>
            <div className="fila">
              <Btn type="button" variant="sec" onClick={() => setModal(false)}>Cancelar</Btn>
              <Btn variant="s" disabled={guardando}>{guardando ? 'Guardando…' : 'Guardar'}</Btn>
            </div>
          </form>
        </Modal>
      )}
    </>
  );
}
