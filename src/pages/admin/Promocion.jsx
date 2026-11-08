import { useCallback, useEffect, useMemo, useState } from 'react';
import { FiArrowUp, FiArchive, FiRotateCcw, FiChevronDown, FiChevronUp } from 'react-icons/fi';
import { api } from '../../lib/api';
import { Btn, Vacio, Aviso } from '../../components/ui';

const norm = (s) => String(s ?? '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();
const esCiclo = (c) => norm(c) === 'ciclo';
const fechaCorta = (iso) => new Date(iso).toLocaleDateString('es-HN', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'America/Tegucigalpa' });

function Archivo() {
  const [lista, setLista] = useState([]);
  const [q, setQ] = useState('');
  const [cargando, setCargando] = useState(true);
  const [aviso, setAviso] = useState(null);

  const cargar = useCallback(async () => {
    setCargando(true);
    try { setLista(await api('/promocion/archivo')); }
    catch (e) { setAviso({ tipo: 'error', texto: e.message }); }
    finally { setCargando(false); }
  }, []);
  useEffect(() => { cargar(); }, [cargar]);

  const restaurar = async (a) => {
    if (!window.confirm(`¿Restaurar a ${a.nombre} ${a.apellido}? Volverá a la lista de alumnos activos en ${a.grado}°.`)) return;
    try {
      await api('/promocion/restaurar', { method: 'POST', body: { cedulas: [a.cedula] } });
      setAviso({ tipo: 'ok', texto: `${a.nombre} ${a.apellido} fue restaurado.` });
      cargar();
    } catch (e) { setAviso({ tipo: 'error', texto: e.message }); }
  };

  const t = q.trim().toLowerCase();
  const filtrados = lista.filter((a) => !t || `${a.nombre} ${a.apellido} ${a.cedula}`.toLowerCase().includes(t));

  return (
    <div className="card">
      <div className="secth">
        <h3>Archivo ({lista.length})</h3>
        <input placeholder="Buscar por nombre o cédula" value={q} onChange={(e) => setQ(e.target.value)} style={{ minWidth: 260 }} />
      </div>
      <p className="muted" style={{ marginTop: 0 }}>
        Egresados y retirados. Su historial de asistencia se conserva y no aparecen en listas, reportes del día ni notificaciones.
      </p>
      <Aviso aviso={aviso} />
      {cargando ? <p className="muted">Cargando…</p> : filtrados.length === 0
        ? <Vacio icon={FiArchive} texto="El archivo está vacío" />
        : (
          <div className="scroll">
            <table>
              <thead><tr><th>Alumno</th><th>Cédula</th><th>Último grado</th><th>Motivo</th><th></th></tr></thead>
              <tbody>
                {filtrados.slice(0, 200).map((a) => (
                  <tr key={a.cedula}>
                    <td><strong>{a.nombre} {a.apellido}</strong></td>
                    <td>{a.cedula}</td>
                    <td>{a.grado}° {a.carrera || ''}</td>
                    <td>
                      {a.motivo_archivo === 'egresado' ? `Egresó ${a.anio_egreso || ''}` : `Retirado${a.archivado_en ? ` · ${fechaCorta(a.archivado_en)}` : ''}`}
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <Btn icon={FiRotateCcw} variant="soft sm" onClick={() => restaurar(a)}>Restaurar</Btn>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {filtrados.length > 200 && <p className="muted">Mostrando 200 de {filtrados.length}. Usa el buscador.</p>}
          </div>
        )}
    </div>
  );
}

export default function Promocion() {
  const [tab, setTab] = useState('pasar');
  const [vista, setVista] = useState(null);
  const [cargando, setCargando] = useState(true);
  const [aviso, setAviso] = useState(null);
  const [anio, setAnio] = useState(new Date().getFullYear());
  const [pasan, setPasan] = useState({});       // { '7': true }
  const [repiten, setRepiten] = useState({});   // { cedula: true }
  const [carreras, setCarreras] = useState({}); // { cedula: 'Informatica' } (solo ciclo → 10°)
  const [abierto, setAbierto] = useState(null);
  const [aplicando, setAplicando] = useState(false);

  const cargar = useCallback(async () => {
    setCargando(true);
    try { setVista(await api('/promocion/vista')); }
    catch (e) { setAviso({ tipo: 'error', texto: e.message }); }
    finally { setCargando(false); }
  }, []);
  useEffect(() => { cargar(); }, [cargar]);

  const gradoFinal = vista?.gradoFinal ?? 12;

  const grados = useMemo(() => {
    const m = new Map();
    for (const e of vista?.estudiantes || []) {
      const g = String(e.grado).trim();
      if (!m.has(g)) m.set(g, []);
      m.get(g).push(e);
    }
    return [...m.entries()]
      .sort((a, b) => (parseInt(a[0], 10) || 0) - (parseInt(b[0], 10) || 0))
      .map(([grado, alumnos]) => ({
        grado,
        alumnos: [...alumnos].sort((x, y) => (x.apellido || '').localeCompare(y.apellido || '')),
      }));
  }, [vista]);

  const opcionesCarrera = useMemo(
    () => [...new Set((vista?.estudiantes || []).map((e) => e.carrera).filter((c) => c && !esCiclo(c)))].sort(),
    [vista]
  );

  const resumen = useMemo(() => {
    let promueven = 0, egresan = 0, repitenN = 0, faltan = 0;
    for (const { grado, alumnos } of grados) {
      if (!pasan[grado]) continue;
      const g = parseInt(grado, 10);
      if (!Number.isInteger(g)) continue;
      for (const a of alumnos) {
        if (repiten[a.cedula]) { repitenN++; continue; }
        if (g >= gradoFinal) egresan++;
        else {
          promueven++;
          if (esCiclo(a.carrera) && g + 1 >= 10 && !carreras[a.cedula]) faltan++;
        }
      }
    }
    return { promueven, egresan, repiten: repitenN, faltan };
  }, [grados, pasan, repiten, carreras, gradoFinal]);

  const marcarTodos = () => {
    const todos = {};
    grados.forEach(({ grado }) => { if (Number.isInteger(parseInt(grado, 10))) todos[grado] = true; });
    setPasan(todos);
  };

  const aplicar = async () => {
    const gradosSel = grados.filter((g) => pasan[g.grado]).map((g) => g.grado);
    const ultima = resumen.egresan > 0 ? `\n• ${resumen.egresan} egresan y van al Archivo` : '';
    if (!window.confirm(
      `Cierre del año ${anio}:\n• ${resumen.promueven} alumnos pasan de grado${ultima}\n• ${resumen.repiten} repiten\n\nPodrás deshacerlo después. ¿Continuar?`
    )) return;
    setAplicando(true); setAviso(null);
    try {
      const r = await api('/promocion/aplicar', {
        method: 'POST',
        body: { anio, grados: gradosSel, excepciones: Object.keys(repiten).filter((k) => repiten[k]), carreras },
      });
      setAviso({ tipo: 'ok', texto: `Listo: ${r.promovidos} pasaron de grado, ${r.egresados} egresaron y ${r.repiten} repiten.` });
      setPasan({}); setRepiten({}); setCarreras({}); setAbierto(null);
      await cargar();
    } catch (e) {
      setAviso({ tipo: 'error', texto: e.message });
    } finally { setAplicando(false); }
  };

  const deshacer = async () => {
    const u = vista.ultimaPromocion;
    if (!window.confirm(`¿Deshacer el cierre del año ${u.anio} (${fechaCorta(u.realizada_en)})?\nLos alumnos volverán a su grado anterior y los egresados saldrán del Archivo.`)) return;
    setAplicando(true); setAviso(null);
    try {
      await api('/promocion/deshacer', { method: 'POST' });
      setAviso({ tipo: 'ok', texto: 'El último cierre de año fue deshecho.' });
      await cargar();
    } catch (e) {
      setAviso({ tipo: 'error', texto: e.message });
    } finally { setAplicando(false); }
  };

  return (
    <>
      <h2>Cierre de año</h2>
      <p className="sub">Elige qué grados pasan, marca a los que repiten y aplica. Los egresados van al Archivo, no se borran.</p>

      <div className="tabs">
        <button className={`tab ${tab === 'pasar' ? 'on' : ''}`} onClick={() => setTab('pasar')}><FiArrowUp size={15} /> Pasar de año</button>
        <button className={`tab ${tab === 'archivo' ? 'on' : ''}`} onClick={() => setTab('archivo')}><FiArchive size={15} /> Archivo</button>
      </div>

      {tab === 'archivo' ? <Archivo /> : (
        <>
          <Aviso aviso={aviso} />
          {cargando ? <p className="muted">Cargando alumnos…</p> : (
            <>
              {vista?.ultimaPromocion && (
                <div className="card fila between" style={{ alignItems: 'center' }}>
                  <span>
                    Último cierre: <strong>año {vista.ultimaPromocion.anio}</strong> · {fechaCorta(vista.ultimaPromocion.realizada_en)} ·{' '}
                    {vista.ultimaPromocion.promovidos} pasaron, {vista.ultimaPromocion.egresados} egresaron
                  </span>
                  <Btn icon={FiRotateCcw} variant="sec sm" onClick={deshacer} disabled={aplicando}>Deshacer último cierre</Btn>
                </div>
              )}

              <div className="card fila" style={{ alignItems: 'flex-end' }}>
                <label>Año escolar que termina
                  <input type="number" min="2000" max="2100" value={anio} onChange={(e) => setAnio(parseInt(e.target.value, 10) || '')} style={{ width: 130 }} />
                </label>
                <span className="muted" style={{ flex: 1 }}>
                  Último grado de este colegio: <strong>{gradoFinal}°</strong> (los alumnos de ese grado egresan).
                </span>
                <Btn variant="soft sm" type="button" onClick={marcarTodos}>Marcar todos los grados</Btn>
                <Btn variant="soft sm" type="button" onClick={() => setPasan({})}>Quitar marcas</Btn>
              </div>

              {grados.length === 0 && <div className="card"><Vacio icon={FiArrowUp} texto="No hay alumnos activos." /></div>}

              {grados.map(({ grado, alumnos }) => {
                const g = parseInt(grado, 10);
                const numerico = Number.isInteger(g);
                const egresa = numerico && g >= gradoFinal;
                const a10 = numerico && !egresa && g + 1 >= 10;
                const nRepiten = alumnos.filter((a) => repiten[a.cedula]).length;
                const hayCiclo = a10 && alumnos.some((a) => esCiclo(a.carrera));
                return (
                  <div className="grado-card" key={grado}>
                    <div className="grado-head">
                      <label className="chk">
                        <input type="checkbox" disabled={!numerico} checked={!!pasan[grado]}
                          onChange={(e) => setPasan({ ...pasan, [grado]: e.target.checked })} />
                        {numerico ? `${grado}°` : grado} · {alumnos.length} alumnos
                      </label>
                      <span className={`destino ${egresa ? 'egresa' : ''}`}>
                        {!numerico ? 'Este grado no se puede pasar automáticamente'
                          : egresa ? 'Egresan → van al Archivo' : `Pasan a ${g + 1}°`}
                      </span>
                      {nRepiten > 0 && <span className="muted">{nRepiten} repiten</span>}
                      <button type="button" className="link" style={{ marginLeft: 'auto' }}
                        onClick={() => setAbierto(abierto === grado ? null : grado)}>
                        {abierto === grado ? <FiChevronUp /> : <FiChevronDown />} Ver alumnos
                      </button>
                    </div>

                    {abierto === grado && (
                      <div className="alumnos-grado">
                        {hayCiclo && (
                          <div className="fila" style={{ marginBottom: 10, alignItems: 'center' }}>
                            <span className="muted">Estos alumnos vienen de ciclo común: elige su carrera para {g + 1}°.</span>
                            <select defaultValue="" onChange={(e) => {
                              if (!e.target.value) return;
                              const nuevo = { ...carreras };
                              alumnos.filter((a) => esCiclo(a.carrera) && !repiten[a.cedula]).forEach((a) => { nuevo[a.cedula] = e.target.value; });
                              setCarreras(nuevo);
                              e.target.value = '';
                            }}>
                              <option value="">Asignar la misma carrera a todos…</option>
                              {opcionesCarrera.map((c) => <option key={c} value={c}>{c}</option>)}
                            </select>
                          </div>
                        )}
                        <table>
                          <thead>
                            <tr>
                              <th>Alumno</th><th>Sección</th><th>Carrera</th><th>Repite</th>
                              {hayCiclo && <th>Carrera en {g + 1}°</th>}
                            </tr>
                          </thead>
                          <tbody>
                            {alumnos.map((a) => (
                              <tr key={a.cedula}>
                                <td><strong>{a.nombre} {a.apellido}</strong></td>
                                <td>{a.seccion}</td>
                                <td>{a.carrera}</td>
                                <td>
                                  <input type="checkbox" className="check" checked={!!repiten[a.cedula]}
                                    onChange={(e) => setRepiten({ ...repiten, [a.cedula]: e.target.checked })} />
                                </td>
                                {hayCiclo && (
                                  <td>
                                    {esCiclo(a.carrera) && !repiten[a.cedula] ? (
                                      <select value={carreras[a.cedula] || ''} onChange={(e) => setCarreras({ ...carreras, [a.cedula]: e.target.value })}>
                                        <option value="">Elegir…</option>
                                        {opcionesCarrera.map((c) => <option key={c} value={c}>{c}</option>)}
                                      </select>
                                    ) : '—'}
                                  </td>
                                )}
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                );
              })}

              {grados.length > 0 && (
                <div className="card fila between" style={{ alignItems: 'center', position: 'sticky', bottom: 12 }}>
                  <span>
                    <strong>{resumen.promueven}</strong> pasan de grado · <strong>{resumen.egresan}</strong> egresan ·{' '}
                    <strong>{resumen.repiten}</strong> repiten
                    {resumen.faltan > 0 && <span className="rojo"> · faltan {resumen.faltan} carreras por elegir</span>}
                  </span>
                  <Btn icon={FiArrowUp} variant="s"
                    disabled={aplicando || !anio || resumen.faltan > 0 || (resumen.promueven + resumen.egresan) === 0}
                    onClick={aplicar}>
                    {aplicando ? 'Aplicando…' : 'Aplicar cierre de año'}
                  </Btn>
                </div>
              )}
            </>
          )}
        </>
      )}
    </>
  );
}