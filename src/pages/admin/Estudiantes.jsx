import { useCallback, useEffect, useMemo, useState } from 'react';
import { FiPlus, FiEdit2, FiTrash2, FiUser, FiSearch, FiArchive } from 'react-icons/fi';
import { api } from '../../lib/api';
import { useAuth } from '../../context/AuthContext';
import { Btn, Modal, Vacio, Aviso } from '../../components/ui';
import FotoEstudiante from '../../components/FotoEstudiante';

const VACIO = { cedula: '', nombre: '', apellido: '', grado: '', seccion: '', carrera: '', foto_url: '' };
const GRADOS_RURAL = ['1', '2', '3', '4', '5', '6', '7', '8', '9'];
const LIMITE = 100;
const iniciales = (e) => `${(e.nombre || '')[0] || ''}${(e.apellido || '')[0] || ''}`.toUpperCase();
const conActual = (lista, valor) => (valor && !lista.includes(valor) ? [...lista, valor] : lista);

export default function Estudiantes() {
  const { perfil, inst } = useAuth();
  const rural = !!inst?.es_rural;            // depende del colegio activo
  const coord = perfil.rol === 'coordinador';

  const [lista, setLista] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [q, setQ] = useState('');
  const [fGrado, setFGrado] = useState('');
  const [fCarrera, setFCarrera] = useState('');
  const [modal, setModal] = useState(false);
  const [editando, setEditando] = useState(null);
  const [form, setForm] = useState(VACIO);
  const [guardando, setGuardando] = useState(false);
  const [fotoPendiente, setFotoPendiente] = useState(null);
  const [aviso, setAviso] = useState(null);

  const cargar = useCallback(async () => {
    setCargando(true);
    try {
      // El filtro de archivados es un respaldo por si el controlador viejo aún los devuelve
      setLista((await api('/estudiantes')).filter((x) => !x.archivado));
    } catch (e) { setAviso({ tipo: 'error', texto: e.message }); }
    finally { setCargando(false); }
  }, [inst?.id]);
  useEffect(() => { cargar(); }, [cargar]);

  const grados = useMemo(() => {
    const datos = [...new Set(lista.map((x) => String(x.grado)).filter(Boolean))];
    const base = rural ? GRADOS_RURAL : (datos.length ? datos : ['7', '8', '9', '10', '11', '12']);
    return [...new Set([...base, ...datos])].sort((a, b) => a - b);
  }, [lista, rural]);

  const carreras = useMemo(() => {
    const v = [...new Set(lista.map((x) => x.carrera).filter(Boolean))].sort();
    return v.length ? v : ['BCH', 'Informatica', 'Finanzas', 'Administracion'];
  }, [lista]);

  const filtrados = useMemo(() => {
    const t = q.trim().toLowerCase();
    return lista
      .filter((e) =>
        (!fGrado || String(e.grado) === fGrado) &&
        (!fCarrera || e.carrera === fCarrera) &&
        (!t || `${e.nombre} ${e.apellido} ${e.cedula}`.toLowerCase().includes(t)))
      .sort((a, b) => (a.apellido || '').localeCompare(b.apellido || ''));
  }, [lista, q, fGrado, fCarrera]);

  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  const abrir = (e = null) => {
    setEditando(e);
    setForm(e ? {
      cedula: e.cedula, nombre: e.nombre || '', apellido: e.apellido || '', grado: String(e.grado ?? ''),
      seccion: e.seccion || '', carrera: e.carrera || '', foto_url: e.foto_url || '',
    } : { ...VACIO, seccion: rural ? 'U' : '', carrera: rural ? 'Rural' : '' });
    setFotoPendiente(null);
    setModal(true);
  };

  const guardar = async (ev) => {
    ev.preventDefault();
    // En un colegio rural la sección y la carrera no se piden: van con valores fijos
    const datos = rural
      ? { ...form, seccion: form.seccion || 'U', carrera: form.carrera || 'Rural' }
      : form;

    if (!editando && !/^\d{13}$/.test(datos.cedula)) {
      return setAviso({ tipo: 'error', texto: 'La cédula debe tener 13 dígitos.' });
    }
    if (!datos.nombre || !datos.apellido || !datos.grado || !datos.seccion || !datos.carrera) {
      return setAviso({ tipo: 'error', texto: 'Completa todos los campos obligatorios.' });
    }
    setGuardando(true);
    try {
      await api(editando ? `/estudiantes/${editando.cedula}` : '/estudiantes', {
        method: editando ? 'PUT' : 'POST', body: datos,
      });

      let falloFoto = '';
      if (fotoPendiente) {
        try {
          const fd = new FormData();
          fd.append('foto', fotoPendiente, 'foto.jpg');
          await api(`/estudiante-fotos/${datos.cedula}`, { method: 'POST', body: fd });
        } catch (e) {
          falloFoto = ` Pero la foto no se pudo subir: ${e.message}`;
        }
      }

      setModal(false);
      setAviso({
        tipo: falloFoto ? 'error' : 'ok',
        texto: (editando ? 'Estudiante actualizado.' : 'Estudiante creado.') + falloFoto,
      });
      cargar();
    } catch (err) {
      setAviso({ tipo: 'error', texto: err.message });
    } finally {
      setGuardando(false);
    }
  };

  const eliminar = async (e) => {
    if (!window.confirm(`¿Eliminar a ${e.nombre} ${e.apellido}?`)) return;
    try {
      await api(`/estudiantes/${e.cedula}`, { method: 'DELETE' });
      setAviso({ tipo: 'ok', texto: 'Estudiante eliminado.' });
      cargar();
    } catch (err) { setAviso({ tipo: 'error', texto: err.message }); }
  };

  const archivar = async (e) => {
    if (!window.confirm(`¿Archivar a ${e.nombre} ${e.apellido} como retirado?\nDejará de aparecer en listas y asistencia, pero su historial se conserva. Puedes restaurarlo desde "Cierre de año → Archivo".`)) return;
    try {
      await api('/promocion/archivar', { method: 'POST', body: { cedulas: [e.cedula], motivo: 'retirado' } });
      setAviso({ tipo: 'ok', texto: 'Estudiante archivado.' });
      cargar();
    } catch (err) { setAviso({ tipo: 'error', texto: err.message }); }
  };

  return (
    <>
      <div className="top">
        <div>
          <h2>Estudiantes</h2>
          <p className="sub" style={{ margin: 0 }}>
            {coord && inst ? `${inst.nombre} · ` : ''}{lista.length} registrados
          </p>
        </div>
        <Btn icon={FiPlus} variant="s" onClick={() => abrir()}>Nuevo estudiante</Btn>
      </div>

      <div className="card">
        <div className="fila">
          <label style={{ flex: 2, minWidth: 220 }}>Buscar
            <input placeholder="Nombre, apellido o cédula" value={q} onChange={(e) => setQ(e.target.value)} />
          </label>
          <label>Grado
            <select value={fGrado} onChange={(e) => setFGrado(e.target.value)}>
              <option value="">Todos</option>
              {grados.map((g) => <option key={g} value={g}>{g}°</option>)}
            </select>
          </label>
          {!rural && (
            <label>Carrera
              <select value={fCarrera} onChange={(e) => setFCarrera(e.target.value)}>
                <option value="">Todas</option>
                {carreras.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </label>
          )}
        </div>
        <Aviso aviso={aviso} />
      </div>

      <div className="card">
        {cargando ? <p className="muted">Cargando…</p> : filtrados.length === 0
          ? <Vacio icon={FiSearch} texto="Sin resultados" />
          : (
            <div className="scroll">
              <table>
                <thead>
                  <tr><th>Estudiante</th><th>Cédula</th><th>Grado</th>{!rural && <th>Carrera</th>}<th></th></tr>
                </thead>
                <tbody>
                  {filtrados.slice(0, LIMITE).map((e) => (
                    <tr key={e.cedula}>
                      <td>
                        <div className="celda">
                          <span className="avatar">{e.foto_url ? <img src={e.foto_url} alt="" /> : iniciales(e)}</span>
                          <strong>{e.nombre} {e.apellido}</strong>
                        </div>
                      </td>
                      <td>{e.cedula}</td>
                      <td>{rural ? `${e.grado}°` : `${e.grado}° ${e.seccion}`}</td>
                      {!rural && <td>{e.carrera}</td>}
                      <td style={{ whiteSpace: 'nowrap' }}>
                        <Btn icon={FiEdit2} variant="s sm" onClick={() => abrir(e)}>Editar</Btn>{' '}
                        <Btn icon={FiArchive} variant="sec sm" onClick={() => archivar(e)} title="Archivar (retirado)" />{' '}
                        <Btn icon={FiTrash2} variant="danger sm" onClick={() => eliminar(e)} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {filtrados.length > LIMITE && (
                <p className="muted" style={{ marginTop: 12 }}>
                  Mostrando {LIMITE} de {filtrados.length}. Usa el buscador o los filtros para acotar.
                </p>
              )}
            </div>
          )}
      </div>

      {modal && (
        <Modal titulo={editando ? 'Editar estudiante' : 'Nuevo estudiante'} icon={FiUser} onClose={() => setModal(false)}>
          <form className="form" onSubmit={guardar}>
            <label>Cédula *
              <input value={form.cedula} maxLength={13} inputMode="numeric" disabled={!!editando}
                onChange={(e) => setForm({ ...form, cedula: e.target.value.replace(/\D/g, '') })} required />
            </label>
            <div className="row2">
              <label>Nombre *<input value={form.nombre} onChange={set('nombre')} required /></label>
              <label>Apellido *<input value={form.apellido} onChange={set('apellido')} required /></label>
            </div>

            {rural ? (
              <label>Grado *
                <select value={form.grado} onChange={set('grado')} required>
                  <option value="">Selecciona…</option>
                  {conActual(grados, form.grado).map((g) => <option key={g} value={g}>{g}°</option>)}
                </select>
              </label>
            ) : (
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

            <FotoEstudiante
              iniciales={iniciales(form)}
              urlActual={form.foto_url}
              pendiente={fotoPendiente}
              onElegida={setFotoPendiente}
              onQuitar={() => { setFotoPendiente(null); setForm({ ...form, foto_url: '' }); }}
            />

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
