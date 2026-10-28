import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  IoCheckmarkCircleOutline, IoCameraOutline, IoCheckmarkDoneOutline,
  IoTrashOutline, IoRefreshOutline, IoSearchOutline, IoCloseOutline, IoCreateOutline
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

  // ✅ NUEVOS ESTADOS PARA EL MODAL MANUAL
  const [modalManual, setModalManual] = useState(false);
  const [cedulaManual, setCedulaManual] = useState('');
  const [estudianteManual, setEstudianteManual] = useState(null);
  const [buscandoManual, setBuscandoManual] = useState(false);

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

  // Función para registrar (usada por el escáner y el manual)
  const registrar = useCallback(async (valor) => {
    const c = String(valor).trim();
    if (!clase) return setAviso({ tipo: 'error', texto: 'Primero selecciona una clase.' });
    if (c.length !== 13) return setAviso({ tipo: 'error', texto: 'La cédula debe tener 13 dígitos.' });
    setOcupado(true);
    try {
      const r = await api('/asistencia', { method: 'POST', body: { cedula: c, materiaId: clase.id } });
      setAviso({ tipo: 'ok', texto: `✓ ${r.estudiante.nombre} ${r.estudiante.apellido} — ${r.hora}` });
      setCedula('');
      await cargarLista();
      return true; // Retornamos true para saber que fue exitoso
    } catch (e) {
      setAviso({ tipo: 'error', texto: e.message });
      return false;
    } finally {
      setOcupado(false);
      inputRef.current?.focus();
    }
  }, [clase, cargarLista]);

  // ✅ NUEVA FUNCIÓN: Buscar estudiante para el modal
  const buscarEstudianteManual = async (e) => {
    e.preventDefault();
    if (!cedulaManual || cedulaManual.length !== 13) {
      return setAviso({ tipo: 'error', texto: 'Ingresa una cédula de 13 dígitos' });
    }
    setBuscandoManual(true);
    setEstudianteManual(null);
    try {
      // Asumimos que tienes este endpoint para buscar por cédula
      const data = await api(`/estudiantes/buscar/${cedulaManual}`);
      setEstudianteManual(data);
    } catch (err) {
      setAviso({ tipo: 'error', texto: 'Estudiante no encontrado' });
    } finally {
      setBuscandoManual(false);
    }
  };

  // ✅ NUEVA FUNCIÓN: Registrar desde el modal
  const confirmarRegistroManual = async () => {
    if (!estudianteManual) return;
    const exito = await registrar(estudianteManual.cedula);
    if (exito) {
      setModalManual(false);
      setCedulaManual('');
      setEstudianteManual(null);
    }
  };

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
        <div className="fila" style={{ marginBottom: 15 }}>
          <Btn 
            type="button" 
            variant="sec" 
            icon={IoCreateOutline} 
            onClick={() => setModalManual(true)} 
            disabled={!clase}
            style={{ flex: 1 }}
          >
            Registro manual
          </Btn>
          <Btn type="button" icon={IoCameraOutline} variant="sec" onClick={() => setCamara((v) => !v)} disabled={!clase} style={{ flex: 1 }}>
            {camara ? 'Cerrar cámara' : 'Escanear QR'}
          </Btn>
          <Btn type="button" icon={IoCheckmarkDoneOutline} variant="ok" onClick={finalizar} disabled={!clase || ocupado} style={{ flex: 1 }}>
            Finalizar clase
          </Btn>
        </div>
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

      {/* ✅ NUEVO MODAL DE REGISTRO MANUAL (IDÉNTICO A LA APP) */}
      {modalManual && (
        <div className="manual-overlay" onClick={() => setModalManual(false)}>
          <div className="manual-modal" onClick={(e) => e.stopPropagation()}>
            
            <div className="manual-header">
              <div className="manual-title">
                <span className="manual-ico"><IoCreateOutline size={20} /></span>
                <h3>Registro manual</h3>
              </div>
              <button className="manual-close" onClick={() => setModalManual(false)}><IoCloseOutline size={24} /></button>
            </div>

            <form className="manual-search" onSubmit={buscarEstudianteManual}>
              <input 
                type="text" 
                placeholder="0101200900594" 
                value={cedulaManual} 
                onChange={(e) => setCedulaManual(e.target.value.replace(/\D/g, ''))} 
                maxLength={13}
              />
              <button type="submit" className="manual-search-btn" disabled={buscandoManual}>
                {buscandoManual ? '...' : <IoSearchOutline size={20} />}
              </button>
            </form>

            {estudianteManual && (
              <div className="manual-card">
                <div className="manual-avatar">
                  {estudianteManual.foto_url ? (
                    <img src={estudianteManual.foto_url} alt="Estudiante" />
                  ) : (
                    <span>{estudianteManual.nombre[0]}{estudianteManual.apellido[0]}</span>
                  )}
                </div>
                <h4>{estudianteManual.nombre} {estudianteManual.apellido}</h4>
                <p className="manual-carrera">{estudianteManual.carrera || 'Sin carrera'}</p>
                <p className="manual-grado">Grado: {estudianteManual.grado}° - Sección: {estudianteManual.seccion}</p>
                
                {/* Validación visual por si no pertenece a la clase */}
                {estudianteManual.grado !== clase?.grado || estudianteManual.carrera !== clase?.carrera ? (
                  <p className="manual-error">⚠️ Este estudiante no pertenece a esta clase.</p>
                ) : (
                  <button className="manual-btn-ok" onClick={confirmarRegistroManual} disabled={ocupado}>
                    <IoCheckmarkCircleOutline size={20} />
                    {ocupado ? 'Registrando...' : 'Registrar asistencia'}
                  </button>
                )}
              </div>
            )}
            
          </div>
        </div>
      )}
    </>
  );
}
