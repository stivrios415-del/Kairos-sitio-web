import { useCallback, useEffect, useRef, useState } from 'react';
import { QRCodeCanvas } from 'qrcode.react';
import {
  IoSchoolOutline, IoBookOutline, IoCameraOutline, IoBarChartOutline, IoPeople, IoQrCodeOutline,
  IoDownloadOutline, IoSearchOutline, IoCheckmarkCircle, IoCloseCircle, IoTrashOutline, IoAddOutline,
  IoPersonAddOutline, IoDocumentOutline, IoLibraryOutline,
} from 'react-icons/io5';
import { api, fechaHoy } from '../../lib/api';
import { Btn, Modal, Vacio, Aviso } from '../../components/ui';
import QrScanner from '../../components/QrScanner';

const B = '/profesor-independiente';
const iniciales = (e) => `${(e.nombre || '')[0] || ''}${(e.apellido || '')[0] || ''}`.toUpperCase();

function QrModal({ est, onClose }) {
  const id = `qr-${est.cedula}`;
  const descargar = () => {
    const canvas = document.getElementById(id);
    const a = document.createElement('a');
    a.href = canvas.toDataURL('image/png');
    a.download = `QR_${est.cedula}.png`;
    a.click();
  };
  return (
    <Modal titulo={`${est.nombre} ${est.apellido}`} icon={IoQrCodeOutline} onClose={onClose}>
      <p className="muted" style={{ textAlign: 'center', margin: 0 }}>ID {est.cedula}</p>
      <div style={{ display: 'flex', justifyContent: 'center', margin: '16px 0' }}>
        <QRCodeCanvas id={id} value={String(est.cedula)} size={220} marginSize={4} />
      </div>
      <div className="fila" style={{ justifyContent: 'center' }}>
        <Btn icon={IoDownloadOutline} onClick={descargar}>Descargar imagen</Btn>
      </div>
    </Modal>
  );
}

export default function IndepPanel() {
  const [clases, setClases] = useState([]);
  const [clase, setClase] = useState(null);
  const [materias, setMaterias] = useState([]);
  const [materia, setMateria] = useState(null);
  const [estudiantes, setEstudiantes] = useState([]);
  const [hoy, setHoy] = useState([]);
  const [tab, setTab] = useState('asistencia');
  const [aviso, setAviso] = useState(null);
  const [cargando, setCargando] = useState(true);

  const [modal, setModal] = useState(null); // 'clase' | 'materia' | 'estudiante' | { qr: estudiante }
  const [nombre, setNombre] = useState('');
  const [desc, setDesc] = useState('');
  const [form, setForm] = useState({ cedula: '', nombre: '', apellido: '' });

  const [cedula, setCedula] = useState('');
  const [camara, setCamara] = useState(false);
  const [ocupado, setOcupado] = useState(false);
  const [subiendo, setSubiendo] = useState(false);
  const inputRef = useRef(null);
  const fileRef = useRef(null);

  const [inicio, setInicio] = useState(fechaHoy());
  const [fin, setFin] = useState(fechaHoy());
  const [filas, setFilas] = useState([]);
  const [archivo, setArchivo] = useState(null);
  const [consultando, setConsultando] = useState(false);
  const [exportando, setExportando] = useState(false);

  const run = async (fn, okTexto) => {
    try { await fn(); if (okTexto) setAviso({ tipo: 'ok', texto: okTexto }); }
    catch (e) { setAviso({ tipo: 'error', texto: e.message }); }
  };

  // ── Carga de datos ──
  const cargarClases = useCallback(async (seleccionar) => {
    try {
      const data = await api(`${B}/clases`);
      setClases(data);
      setClase((actual) => seleccionar || (actual && data.find((c) => c.id === actual.id)) || data[0] || null);
    } catch (e) { setAviso({ tipo: 'error', texto: e.message }); }
    finally { setCargando(false); }
  }, []);
  useEffect(() => { cargarClases(); }, [cargarClases]);

  useEffect(() => {
    setMateria(null); setMaterias([]); setEstudiantes([]); setHoy([]); setFilas([]); setArchivo(null);
    if (!clase) return;
    (async () => {
      try {
        const [m, e] = await Promise.all([
          api(`${B}/clases/${clase.id}/materias`),
          api(`${B}/clases/${clase.id}/estudiantes`),
        ]);
        setMaterias(m); setEstudiantes(e); setMateria(m[0] || null);
      } catch (err) { setAviso({ tipo: 'error', texto: err.message }); }
    })();
  }, [clase?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const recargarMaterias = async (seleccionar) => {
    const m = await api(`${B}/clases/${clase.id}/materias`);
    setMaterias(m);
    setMateria((act) => seleccionar || (act && m.find((x) => x.id === act.id)) || m[0] || null);
  };
  const recargarEstudiantes = async () => setEstudiantes(await api(`${B}/clases/${clase.id}/estudiantes`));

  const cargarHoy = useCallback(async () => {
    if (!materia) { setHoy([]); return; }
    try { setHoy(await api(`${B}/materias/${materia.id}/asistencia/hoy`)); } catch { /* se reintenta en el próximo registro */ }
  }, [materia?.id]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { cargarHoy(); }, [cargarHoy]);

  const presentes = new Set(hoy.map((a) => a.estudiantes_independientes?.cedula));

  // ── Clases ──
  const crearClase = (e) => {
    e.preventDefault();
    run(async () => {
      const nueva = await api(`${B}/clases`, { method: 'POST', body: { nombre: nombre.trim(), descripcion: desc } });
      setModal(null); setNombre(''); setDesc('');
      await cargarClases(nueva);
    });
  };
  const eliminarClase = (c) => {
    if (!window.confirm(`¿Eliminar "${c.nombre}" y todo su contenido?`)) return;
    run(async () => { await api(`${B}/clases/${c.id}`, { method: 'DELETE' }); await cargarClases(); }, 'Clase eliminada.');
  };

  // ── Materias ──
  const crearMateria = (e) => {
    e.preventDefault();
    run(async () => {
      const nueva = await api(`${B}/materias`, { method: 'POST', body: { clase_id: clase.id, nombre: nombre.trim() } });
      setModal(null); setNombre('');
      await recargarMaterias(nueva);
    });
  };
  const eliminarMateria = (m) => {
    if (!window.confirm(`¿Eliminar la materia "${m.nombre}"?`)) return;
    run(async () => { await api(`${B}/materias/${m.id}`, { method: 'DELETE' }); await recargarMaterias(); }, 'Materia eliminada.');
  };

  // ── Estudiantes ──
  const crearEstudiante = (e) => {
    e.preventDefault();
    run(async () => {
      await api(`${B}/estudiantes`, {
        method: 'POST',
        body: { cedula: form.cedula.trim(), nombre: form.nombre.trim(), apellido: form.apellido.trim(), clase_id: clase.id },
      });
      setModal(null); setForm({ cedula: '', nombre: '', apellido: '' });
      await recargarEstudiantes();
    }, 'Estudiante agregado.');
  };
  const eliminarEstudiante = (est) => {
    if (!window.confirm(`¿Eliminar a ${est.nombre} ${est.apellido}?`)) return;
    run(async () => { await api(`${B}/estudiantes/${est.cedula}`, { method: 'DELETE' }); await recargarEstudiantes(); }, 'Estudiante eliminado.');
  };
  const subirExcel = async (e) => {
    const f = e.target.files?.[0];
    e.target.value = '';
    if (!f || !clase) return;
    setSubiendo(true);
    await run(async () => {
      const fd = new FormData();
      fd.append('archivo', f);
      fd.append('clase_id', clase.id);
      const r = await api(`${B}/estudiantes/bulk-upload`, { method: 'POST', body: fd });
      await recargarEstudiantes();
      setAviso({ tipo: 'ok', texto: r.message || 'Estudiantes cargados.' });
    });
    setSubiendo(false);
  };

  // ── Asistencia ──
  const registrar = useCallback(async (valor) => {
    const c = String(valor).trim();
    if (!materia) return setAviso({ tipo: 'error', texto: 'Primero selecciona una materia.' });
    if (!c) return;
    setOcupado(true);
    try {
      const r = await api(`${B}/asistencia`, { method: 'POST', body: { cedula: c, clase_id: clase.id, materia_id: materia.id } });
      setAviso({ tipo: 'ok', texto: `✓ ${r.estudiante.nombre} ${r.estudiante.apellido} — ${r.hora}` });
      setCedula('');
      await cargarHoy();
    } catch (e) { setAviso({ tipo: 'error', texto: e.message }); }
    finally { setOcupado(false); inputRef.current?.focus(); }
  }, [materia, clase, cargarHoy]);

  const limpiarHoy = () => {
    if (!window.confirm(`¿Borrar los registros de hoy en "${materia.nombre}"?`)) return;
    run(async () => { await api(`${B}/materias/${materia.id}/asistencia/hoy`, { method: 'DELETE' }); await cargarHoy(); }, 'Asistencia de hoy limpiada.');
  };

  // ── Reportes ──
  const consultar = async () => {
    if (!materia) return setAviso({ tipo: 'error', texto: 'Selecciona una materia primero.' });
    setConsultando(true); setArchivo(null);
    await run(async () => {
      setFilas(await api(`${B}/materias/${materia.id}/reporte`, { params: { fechaInicio: inicio, fechaFin: fin } }));
    });
    setConsultando(false);
  };
  const exportar = async () => {
    setExportando(true); setArchivo(null);
    await run(async () => {
      const r = await api(`${B}/clases/${clase.id}/exportar-excel`, { params: { fechaInicio: inicio, fechaFin: fin } });
      if (!r.url) throw new Error('Respuesta inválida del servidor.');
      setArchivo(r.url);
    });
    setExportando(false);
  };

  const TABS = [['asistencia', 'Asistencia', IoCameraOutline], ['estudiantes', 'Estudiantes', IoPeople], ['reportes', 'Reportes', IoBarChartOutline]];

  return (
    <>
      <h2>Mi panel</h2>
      <p className="sub">Gestiona tus clases, materias, estudiantes y asistencia.</p>
      <Aviso aviso={aviso} />
      <div style={{ height: 14 }} />

      {/* Clases */}
      <div className="card">
        <div className="secth">
          <h3>Mis clases</h3>
          <Btn icon={IoAddOutline} variant="s sm" onClick={() => { setNombre(''); setDesc(''); setModal('clase'); }}>Nueva</Btn>
        </div>
        {cargando ? <p className="muted">Cargando…</p> : clases.length === 0
          ? <Vacio icon={IoLibraryOutline} texto="Crea una clase para empezar" />
          : <div className="chips">
            {clases.map((c) => (
              <span key={c.id} className={`chipx ${clase?.id === c.id ? 'on' : ''}`}>
                <button className="cm" onClick={() => setClase(c)}><IoSchoolOutline size={15} />{c.nombre}</button>
                <button className="cd" onClick={() => eliminarClase(c)} title="Eliminar clase"><IoTrashOutline size={15} /></button>
              </span>
            ))}
          </div>}
      </div>

      {clase && (
        <>
          {/* Materias */}
          <div className="card">
            <div className="secth">
              <h3>Materias de {clase.nombre}</h3>
              <Btn icon={IoAddOutline} variant="sm" onClick={() => { setNombre(''); setModal('materia'); }}>Materia</Btn>
            </div>
            {materias.length === 0
              ? <p className="muted">Aún no has agregado materias. Ej: Matemáticas, Inglés…</p>
              : <div className="chips">
                {materias.map((m) => (
                  <span key={m.id} className={`chipx mat ${materia?.id === m.id ? 'on' : ''}`}>
                    <button className="cm" onClick={() => setMateria(m)}><IoBookOutline size={14} />{m.nombre}</button>
                    <button className="cd" onClick={() => eliminarMateria(m)} title="Eliminar materia"><IoTrashOutline size={14} /></button>
                  </span>
                ))}
              </div>}
          </div>

          <div className="tabs">
            {TABS.map(([k, l, I]) => (
              <button key={k} className={`tab ${tab === k ? 'on' : ''}`} onClick={() => setTab(k)}><I size={16} />{l}</button>
            ))}
          </div>

          {/* ── Asistencia ── */}
          {tab === 'asistencia' && (!materia
            ? <div className="card"><Vacio icon={IoBookOutline} texto="Agrega una materia para pasar asistencia." /></div>
            : (
              <>
                <div className="card">
                  <form className="fila" onSubmit={(e) => { e.preventDefault(); registrar(cedula); }}>
                    <input ref={inputRef} autoFocus placeholder="Cédula / ID — o usa un lector de código"
                      value={cedula} onChange={(e) => setCedula(e.target.value)} disabled={ocupado} />
                    <Btn icon={IoCheckmarkCircle} disabled={ocupado}>Registrar</Btn>
                    <Btn type="button" icon={IoCameraOutline} variant="sec" onClick={() => setCamara((v) => !v)}>
                      {camara ? 'Cerrar cámara' : 'Escanear QR'}
                    </Btn>
                  </form>
                  {camara && <QrScanner onCode={registrar} />}
                </div>

                <div className="card">
                  <div className="secth">
                    <div className="resumen">
                      <span className="ico"><IoPeople size={22} /></span>
                      <div><b>{hoy.length}</b><span className="muted">presentes hoy en {materia.nombre}</span></div>
                    </div>
                    <Btn icon={IoTrashOutline} variant="danger sm" onClick={limpiarHoy}>Limpiar hoy</Btn>
                  </div>
                  <div className="scroll">
                    <table>
                      <thead><tr><th>Hora</th><th>Estudiante</th><th>ID</th></tr></thead>
                      <tbody>
                        {hoy.length === 0 && <tr><td colSpan="3" className="muted">Sin registros todavía.</td></tr>}
                        {hoy.map((a, i) => (
                          <tr key={a.id || i}>
                            <td>{a.hora?.slice(0, 5) || '—'}</td>
                            <td>{a.estudiantes_independientes?.nombre} {a.estudiantes_independientes?.apellido}</td>
                            <td>{a.estudiantes_independientes?.cedula}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </>
            ))}

          {/* ── Estudiantes ── */}
          {tab === 'estudiantes' && (
            <div className="card">
              <div className="secth">
                <h3>Estudiantes ({estudiantes.length})</h3>
                <div className="fila">
                  <input ref={fileRef} type="file" accept=".xlsx,.xls" hidden onChange={subirExcel} />
                  <Btn icon={IoPersonAddOutline} onClick={() => { setForm({ cedula: '', nombre: '', apellido: '' }); setModal('estudiante'); }}>Agregar uno</Btn>
                  <Btn icon={IoDocumentOutline} variant="ok" disabled={subiendo} onClick={() => fileRef.current.click()}>
                    {subiendo ? 'Subiendo…' : 'Subir Excel'}
                  </Btn>
                </div>
              </div>
              <p className="muted" style={{ marginTop: 0 }}>Usa el mismo formato de Excel que en la app. Toca QR para ver y descargar el código de cada estudiante.</p>
              <div className="scroll">
                <table>
                  <thead><tr><th>Estudiante</th><th>ID</th>{materia && <th>Hoy</th>}<th></th></tr></thead>
                  <tbody>
                    {estudiantes.length === 0 && <tr><td colSpan="4" className="muted">No hay estudiantes en esta clase.</td></tr>}
                    {estudiantes.map((e) => (
                      <tr key={e.cedula}>
                        <td><div className="celda"><span className="avatar">{iniciales(e)}</span><strong>{e.nombre} {e.apellido}</strong></div></td>
                        <td>{e.cedula}</td>
                        {materia && (
                          <td>{presentes.has(e.cedula)
                            ? <IoCheckmarkCircle size={20} color="var(--success)" />
                            : <IoCloseCircle size={20} color="var(--muted)" />}</td>
                        )}
                        <td style={{ whiteSpace: 'nowrap' }}>
                          <Btn icon={IoQrCodeOutline} variant="soft sm" onClick={() => setModal({ qr: e })}>QR</Btn>{' '}
                          <Btn icon={IoTrashOutline} variant="danger sm" onClick={() => eliminarEstudiante(e)} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ── Reportes ── */}
          {tab === 'reportes' && (
            <>
              <div className="card">
                <div className="fila">
                  <label>Desde <input type="date" value={inicio} onChange={(e) => setInicio(e.target.value)} /></label>
                  <label>Hasta <input type="date" value={fin} onChange={(e) => setFin(e.target.value)} /></label>
                  <Btn icon={IoSearchOutline} variant="s" onClick={consultar} disabled={consultando}>{consultando ? 'Consultando…' : 'Consultar'}</Btn>
                  <Btn icon={IoDownloadOutline} variant="warn" onClick={exportar} disabled={exportando}>{exportando ? 'Generando…' : 'Excel completo'}</Btn>
                </div>
                {archivo && <div className="aviso ok">Archivo listo: <a href={archivo} target="_blank" rel="noreferrer">Descargar Excel</a></div>}
                <p className="muted" style={{ marginBottom: 0 }}>
                  Consultar muestra la materia seleccionada ({materia?.nombre || 'ninguna'}). El Excel incluye toda la clase "{clase.nombre}".
                </p>
              </div>
              <div className="card">
                <h3>Resultados: {filas.length}</h3>
                <div className="scroll">
                  <table>
                    <thead><tr><th>Fecha</th><th>Hora</th><th>Estudiante</th><th>ID</th></tr></thead>
                    <tbody>
                      {filas.length === 0 && <tr><td colSpan="4" className="muted">Sin datos. Elige un rango y consulta.</td></tr>}
                      {filas.map((f, i) => (
                        <tr key={f.id || i}>
                          <td>{f.fecha}</td>
                          <td>{f.hora?.slice(0, 5)}</td>
                          <td>{f.estudiantes_independientes?.nombre} {f.estudiantes_independientes?.apellido}</td>
                          <td>{f.estudiantes_independientes?.cedula}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}
        </>
      )}

      {/* ── Modales ── */}
      {modal === 'clase' && (
        <Modal titulo="Nueva clase" icon={IoSchoolOutline} onClose={() => setModal(null)}>
          <form className="form" onSubmit={crearClase}>
            <label>Nombre *<input value={nombre} onChange={(e) => setNombre(e.target.value)} placeholder="Ej: 7mo Grado A" required autoFocus /></label>
            <label>Descripción (opcional)<input value={desc} onChange={(e) => setDesc(e.target.value)} /></label>
            <div className="fila">
              <Btn type="button" variant="sec" onClick={() => setModal(null)}>Cancelar</Btn>
              <Btn variant="s">Crear</Btn>
            </div>
          </form>
        </Modal>
      )}
      {modal === 'materia' && (
        <Modal titulo="Nueva materia" icon={IoBookOutline} onClose={() => setModal(null)}>
          <form className="form" onSubmit={crearMateria}>
            <p className="muted" style={{ margin: 0 }}>Para la clase: {clase?.nombre}</p>
            <label>Nombre *<input value={nombre} onChange={(e) => setNombre(e.target.value)} placeholder="Ej: Matemáticas, Inglés…" required autoFocus /></label>
            <div className="fila">
              <Btn type="button" variant="sec" onClick={() => setModal(null)}>Cancelar</Btn>
              <Btn variant="s">Crear</Btn>
            </div>
          </form>
        </Modal>
      )}
      {modal === 'estudiante' && (
        <Modal titulo="Nuevo estudiante" icon={IoPersonAddOutline} onClose={() => setModal(null)}>
          <form className="form" onSubmit={crearEstudiante}>
            <label>Cédula / ID *<input inputMode="numeric" value={form.cedula} onChange={(e) => setForm({ ...form, cedula: e.target.value })} required autoFocus /></label>
            <div className="row2">
              <label>Nombre *<input value={form.nombre} onChange={(e) => setForm({ ...form, nombre: e.target.value })} required /></label>
              <label>Apellido *<input value={form.apellido} onChange={(e) => setForm({ ...form, apellido: e.target.value })} required /></label>
            </div>
            <div className="fila">
              <Btn type="button" variant="sec" onClick={() => setModal(null)}>Cancelar</Btn>
              <Btn variant="s">Agregar</Btn>
            </div>
          </form>
        </Modal>
      )}
      {modal?.qr && <QrModal est={modal.qr} onClose={() => setModal(null)} />}
    </>
  );
}