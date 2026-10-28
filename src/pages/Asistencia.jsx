import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  IoCheckmarkCircleOutline, IoCameraOutline, IoCheckmarkDoneOutline,
  IoTrashOutline, IoRefreshOutline, IoCloseOutline, IoCheckmark
} from 'react-icons/io5';
import { supabase } from '../lib/supabase';
import { api, fechaHoy } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import QrScanner from '../components/QrScanner';
import { Btn, Aviso } from '../components/ui';

export default function Asistencia() {
  const { perfil } = useAuth();
  const [clases, setClases] = useState([]);
  const [clase, setClase] = useState(null);
  const [lista, setLista] = useState([]);
  const [cedula, setCedula] = useState('');
  const [aviso, setAviso] = useState(null);
  const [camara, setCamara] = useState(false);
  const [ocupado, setOcupado] = useState(false);
  const [eliminandoId, setEliminandoId] = useState(null);
  const inputRef = useRef(null);

  // ✅ NUEVO ESTADO: Guarda al alumno para mostrar la ventanita
  const [alumnoRegistrado, setAlumnoRegistrado] = useState(null);

  const cargarLista = useCallback(async () => {
    try { setLista(await api('/asistencia/hoy', { params: { profesorEmail: perfil.email } })); }
    catch (e) { setAviso({ tipo: 'error', texto: e.message }); }
  }, [perfil.email]);

  useEffect(() => {
    supabase.from('materias').select('*').eq('profesor_id', perfil.id)
      .then(({ data }) => setClases(data || []));
    cargarLista();
    const t = setInterval(cargarLista, 30000);
    return () => clearInterval(t);
  }, [perfil.id, cargarLista]);

  const visibles = useMemo(() => {
    if (!clase) return lista;
    return lista.filter((i) => (i.materia_id ? i.materia_id === clase.id : i.materia_nombre === clase.nombre));
  }, [lista, clase]);

  const registrar = useCallback(async (valor) => {
    const c = String(valor).trim();
    if (!clase) return setAviso({ tipo: 'error', texto: 'Primero selecciona una clase.' });
    if (c.length !== 13) return setAviso({ tipo: 'error', texto: 'La cédula debe tener 13 dígitos.' });
    
    setOcupado(true);
    try {
      const r = await api('/asistencia', { method: 'POST', body: { cedula: c, materiaId: clase.id } });
      
      // ✅ AQUÍ ACTIVAMOS LA VENTANITA
      setAlumnoRegistrado(r.estudiante); 
      
      setAviso({ tipo: 'ok', texto: `✓ ${r.estudiante.nombre} ${r.estudiante.apellido} — ${r.hora}` });
      setCedula('');
      await cargarLista();
    } catch (e) {
      setAviso({ tipo: 'error', texto: e.message });
    } finally {
      setOcupado(false);
      inputRef.current?.focus();
    }
  }, [clase, cargarLista]);

  const eliminar = async (item) => {
    const nombre = `${item.estudiante?.nombre || ''} ${item.estudiante?.apellido || ''}`.trim();
    if (!window.confirm(`¿Quitar a ${nombre} de la asistencia de hoy?\n\nÚsalo si el alumno se fue o se registró por error.`)) return;
    setEliminandoId(item.id);
    try {
      await api(`/asistencia/${item.id}`, { method: 'DELETE' });
      setLista((prev) => prev.filter((a) => a.id !== item.id));
      setAviso({ tipo: 'ok', texto: `${nombre} fue quitado de la lista.` });
    } catch (e) {
      setAviso({ tipo: 'error', texto: e.message });
    } finally {
      setEliminandoId(null);
    }
  };

  const finalizar = async () => {
    if (!clase) return;
    if (!window.confirm(`¿Finalizar "${clase.nombre}"?\nSe notificará a los padres de presentes y ausentes.`)) return;
    setOcupado(true);
    try {
      const r = await api('/asistencia/finalizar-clase', {
        method: 'POST',
        body: { materiaId: clase.id, nombreProfesor: perfil.nombre, nombreMateria: clase.nombre },
      });
      setAviso({
        tipo: 'ok',
        texto: r.yaFinalizada ? r.mensaje : `Clase finalizada. Presentes: ${r.presentes} · Ausentes: ${r.ausentes}`,
      });
    } catch (e) {
      setAviso({ tipo: 'error', texto: e.message });
    } finally { setOcupado(false); }
  };

  return (
    <>
      <h2>Tomar asistencia</h2>
      <p className="sub">Selecciona una clase y registra con cédula, lector o cámara.</p>

      <div className="clases">
        {clases.length === 0 && <p className="muted">No tienes clases asignadas.</p>}
        {clases.map((c) => (
          <button key={c.id} className={`clase ${clase?.id === c.id ? 'activa' : ''}`} onClick={() => setClase(c)}>
            <strong>{c.nombre || c.carrera}</strong>
            <span className="muted">{c.grado}° · {c.seccion}</span>
          </button>
        ))}
      </div>

      <div className="card">
        <form className="fila" onSubmit={(e) => { e.preventDefault(); registrar(cedula); }}>
          <input
            ref={inputRef} autoFocus inputMode="numeric" maxLength={13}
            placeholder="Cédula (13 dígitos) — o usa un lector de código"
            value={cedula} onChange={(e) => setCedula(e.target.value)} disabled={!clase || ocupado}
          />
          <Btn icon={IoCheckmarkCircleOutline} disabled={!clase || ocupado}>Registrar</Btn>
          <Btn type="button" icon={IoCameraOutline} variant="sec" onClick={() => setCamara((v) => !v)} disabled={!clase}>
            {camara ? 'Cerrar cámara' : 'Escanear QR'}
          </Btn>
          <Btn type="button" icon={IoCheckmarkDoneOutline} variant="ok" onClick={finalizar} disabled={!clase || ocupado}>
            Finalizar clase
          </Btn>
        </form>
        <Aviso aviso={aviso} />
        {camara && clase && <QrScanner onCode={registrar} />}
      </div>

      <div className="card">
        <div className="fila between">
          <h3>Registros de hoy: {visibles.length}</h3>
          <button className="link" onClick={cargarLista}><IoRefreshOutline size={15} /> Actualizar</button>
        </div>
        <div className="scroll">
          <table>
            <thead><tr><th>Hora</th><th>Estudiante</th><th>Materia</th><th>Grado</th><th></th></tr></thead>
            <tbody>
              {visibles.length === 0 && <tr><td colSpan="5" className="muted">Sin registros todavía.</td></tr>}
              {visibles.map((i) => (
                <tr key={i.id}>
                  <td>{i.hora?.slice(0, 5)}</td>
                  <td>
                    {i.estudiante?.nombre} {i.estudiante?.apellido}
                    {i.faltasEnMes >= 3 && <span className="chip">3+ faltas</span>}
                  </td>
                  <td>{i.materia_nombre}</td>
                  <td>{i.estudiante?.grado}° {i.estudiante?.seccion}</td>
                  <td style={{ textAlign: 'right' }}>
                    <Btn icon={IoTrashOutline} variant="danger sm" onClick={() => eliminar(i)}
                      disabled={eliminandoId === i.id} title="Quitar de la asistencia de hoy">
                      {eliminandoId === i.id ? 'Quitando…' : 'Quitar'}
                    </Btn>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* ✅ VENTANITA QUE APARECE AL REGISTRAR AL ALUMNO */}
      {alumnoRegistrado && (
        <div className="modal-alumno-overlay" onClick={() => setAlumnoRegistrado(null)}>
          <div className="modal-alumno-card" onClick={(e) => e.stopPropagation()}>
            
            <button className="modal-alumno-close" onClick={() => setAlumnoRegistrado(null)}>
              <IoCloseOutline size={24} />
            </button>

            <div className="modal-alumno-foto">
              {alumnoRegistrado.foto_url ? (
                <img src={alumnoRegistrado.foto_url} alt="Estudiante" />
              ) : (
                <span>{alumnoRegistrado.nombre[0]}{alumnoRegistrado.apellido[0]}</span>
              )}
            </div>
            
            <h3 className="modal-alumno-nombre">{alumnoRegistrado.nombre} {alumnoRegistrado.apellido}</h3>
            <p className="modal-alumno-carrera">{alumnoRegistrado.carrera || 'Sin carrera'}</p>
            <p className="modal-alumno-grado">Grado: {alumnoRegistrado.grado}° - Sección: {alumnoRegistrado.seccion}</p>
            
            <button className="modal-alumno-btn" onClick={() => setAlumnoRegistrado(null)}>
              <IoCheckmark size={22} />
              Aceptar
            </button>
          </div>
        </div>
      )}
    </>
  );
}
