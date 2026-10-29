import { useCallback, useEffect, useState } from 'react';
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  AreaChart, Area, PieChart, Pie, Cell,
} from 'recharts';
import {
  IoPeopleOutline, IoCheckmarkCircleOutline, IoCloseCircleOutline, IoSchoolOutline,
  IoRefreshOutline, IoClipboardOutline, IoTimeOutline
} from 'react-icons/io5';
import { api } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import { Btn, Vacio } from '../components/ui';

const VERDE = '#10B981';
const AZUL = '#0EA5E9';
const ROJO = '#EF4444';
const ddmm = (f) => `${f.slice(8, 10)}/${f.slice(5, 7)}`;

function Kpi({ icon: Icon, color, titulo, valor, detalle }) {
  return (
    <div className="kpi">
      <span className="kpi-ico" style={{ background: `${color}1A`, color }}><Icon size={22} /></span>
      <div><small>{titulo}</small><b>{valor}</b>{detalle && <em>{detalle}</em>}</div>
    </div>
  );
}

function Hace({ iso }) {
  const [, tick] = useState(0);
  useEffect(() => { const t = setInterval(() => tick((n) => n + 1), 1000); return () => clearInterval(t); }, []);
  if (!iso) return null;
  const s = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 1000));
  return <>{s < 60 ? `hace ${s} s` : `hace ${Math.floor(s / 60)} min`}</>;
}

export default function Panel() {
  const { perfil, inst } = useAuth();
  // ✅ NUEVO: Verificamos si es coordinador
  const coord = perfil.rol === 'coordinador'; 
  const esAdmin = perfil.rol === 'admin';
  const color = inst?.color_primario || '#143C65';
  
  // ✅ MODIFICADO: Por defecto, los coordinadores ven toda la institución
  const [alcance, setAlcance] = useState(coord ? 'institucion' : 'mias'); 
  
  const [d, setD] = useState(null);
  const [error, setError] = useState('');
  const [cargando, setCargando] = useState(true);

  const cargar = useCallback(async (silencioso = false) => {
    if (!silencioso) setCargando(true);
    try {
      setD(await api('/asistencia/panel', { params: { alcance } }));
      setError('');
    } catch (e) {
      setError(e.message);
    } finally {
      setCargando(false);
    }
  }, [alcance]);

  useEffect(() => { cargar(); }, [cargar]);

  // En vivo: cada 30 s mientras la pestaña esté visible, y al volver a ella
  useEffect(() => {
    const visible = () => document.visibilityState === 'visible';
    const t = setInterval(() => { if (visible()) cargar(true); }, 30000);
    const alVolver = () => { if (visible()) cargar(true); };
    document.addEventListener('visibilitychange', alVolver);
    return () => { clearInterval(t); document.removeEventListener('visibilitychange', alVolver); };
  }, [cargar]);

  if (cargando && !d) return <p className="muted">Cargando indicadores…</p>;
  if (!d) return <div className="aviso error">{error || 'No se pudo cargar el panel.'}</div>;

  const hoy = d.hoy;
  const sinLista = hoy.clasesIniciadas === 0;
  const clasesGraf = d.clases.filter((c) => c.iniciada).map((c) => ({
    nombre: `${c.nombre} ${c.grado}°${c.seccion ? ` ${c.seccion}` : ''}`,
    Presentes: c.presentes, Excusados: c.excusados, Ausentes: c.ausentes,
  }));
  const pendientes = d.clases.filter((c) => !c.iniciada);
  const donut = [
    { name: 'Presentes', value: hoy.presentes, color: VERDE },
    { name: 'Excusados', value: hoy.excusados, color: AZUL },
    { name: 'Ausentes', value: hoy.ausentes, color: ROJO },
  ].filter((x) => x.value > 0);
  const fechaLarga = new Date(`${d.fecha}T12:00:00`)
    .toLocaleDateString('es-HN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

  return (
    <>
      <div className="top">
        <div>
          <h2>Inicio</h2>
          <p className="sub" style={{ margin: 0, textTransform: 'capitalize' }}>
            {fechaLarga} · {d.alcance === 'institucion' ? 'Toda la institución' : 'Tus clases'}
          </p>
        </div>
        <div className="fila" style={{ alignItems: 'center' }}>
          {/* ✅ NOTA: Si quieres que el coordinador también vea los botones, cambia esAdmin por (esAdmin || coord) */}
          {esAdmin && (
            <div className="seg" style={{ margin: 0 }}>
              <button type="button" className={alcance === 'mias' ? 'on' : ''} onClick={() => setAlcance('mias')}>Mis clases</button>
              <button type="button" className={alcance === 'institucion' ? 'on' : ''} onClick={() => setAlcance('institucion')}>Institución</button>
            </div>
          )}
          <span className="vivo"><i /> En vivo · <Hace iso={d.actualizadoEn} /></span>
          <Btn icon={IoRefreshOutline} variant="sec sm" onClick={() => cargar()}>Actualizar</Btn>
        </div>
      </div>

      {error && <div className="aviso error" style={{ marginBottom: 14 }}>No se pudo actualizar: {error}</div>}

      <div className="kpis">
        <Kpi icon={IoClipboardOutline} color={color} titulo="Asistencia hoy"
          valor={sinLista ? '—' : `${hoy.pct}%`}
          detalle={sinLista ? 'Aún no se pasa lista' : `${hoy.presentes} de ${hoy.esperados} alumnos`} />
        <Kpi icon={IoCheckmarkCircleOutline} color={VERDE} titulo="Presentes" valor={hoy.presentes} detalle={`${hoy.excusados} excusados`} />
        <Kpi icon={IoCloseCircleOutline} color={ROJO} titulo="Ausentes" valor={hoy.ausentes} detalle="en clases con lista" />
        <Kpi icon={IoSchoolOutline} color={AZUL} titulo="Clases con lista" valor={`${hoy.clasesIniciadas}/${hoy.clasesTotal}`}
          detalle={pendientes.length ? `${pendientes.length} por iniciar` : 'Todas iniciadas'} />
      </div>

      {d.clasesTotal === 0 && null}
      {hoy.clasesTotal === 0 ? (
        <div className="card"><Vacio icon={IoSchoolOutline} texto="No tienes clases asignadas." /></div>
      ) : (
        <>
          <div className="dos">
            <div className="card">
              <h3>Hoy por clase</h3>
              {clasesGraf.length === 0 ? <Vacio icon={IoClipboardOutline} texto="Todavía no hay listas tomadas hoy." /> : (
                <ResponsiveContainer width="100%" height={Math.max(220, clasesGraf.length * 46 + 60)}>
                  <BarChart data={clasesGraf} layout="vertical" margin={{ left: 10, right: 16 }}>
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                    <XAxis type="number" allowDecimals={false} />
                    <YAxis type="category" dataKey="nombre" width={130} tick={{ fontSize: 12 }} />
                    <Tooltip /><Legend />
                    <Bar dataKey="Presentes" stackId="a" fill={VERDE} />
                    <Bar dataKey="Excusados" stackId="a" fill={AZUL} />
                    <Bar dataKey="Ausentes" stackId="a" fill={ROJO} />
                  </BarChart>
                </ResponsiveContainer>
              )}
              {pendientes.length > 0 && (
                <p className="muted" style={{ marginBottom: 0 }}>
                  Sin lista aún: {pendientes.map((c) => `${c.nombre} ${c.grado}°`).join(', ')}.
                </p>
              )}
            </div>

            <div className="card">
              <h3>Resumen de hoy</h3>
              {donut.length === 0 ? <Vacio icon={IoPeopleOutline} texto="Sin datos todavía." /> : (
                <div style={{ position: 'relative', height: 260 }}>
                  <ResponsiveContainer>
                    <PieChart>
                      <Pie data={donut} dataKey="value" nameKey="name" innerRadius={65} outerRadius={100} paddingAngle={2}>
                        {donut.map((x) => <Cell key={x.name} fill={x.color} />)}
                      </Pie>
                      <Tooltip /><Legend />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="donut-c"><b>{hoy.pct}%</b><span>asistencia</span></div>
                </div>
              )}
            </div>
          </div>

          <div className="card">
            <h3>Asistencia de los últimos días con clase</h3>
            {d.tendencia.length === 0 ? <Vacio icon={IoClipboardOutline} texto="Aún no hay suficiente historial." /> : (
              <div style={{ height: 260 }}>
                <ResponsiveContainer>
                  <AreaChart data={d.tendencia.map((t) => ({ ...t, dia: ddmm(t.fecha) }))}>
                    <defs>
                      <linearGradient id="gp" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={color} stopOpacity={0.35} />
                        <stop offset="95%" stopColor={color} stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="dia" />
                    <YAxis domain={[0, 100]} unit="%" />
                    <Tooltip formatter={(v, n, p) => [`${v}% (${p.payload.presentes} de ${p.payload.esperados})`, 'Asistencia']} />
                    <Area type="monotone" dataKey="pct" stroke={color} strokeWidth={2.5} fill="url(#gp)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>

          <div className="dos">
            <div className="card">
              <h3>Ausentes ahora ({hoy.ausentes})</h3>
              {d.ausentesHoy.length === 0 ? <p className="muted">Nadie ausente en las clases con lista.</p> : (
                <div className="scroll" style={{ maxHeight: 320 }}>
                  {d.ausentesHoy.map((a) => (
                    <div className="fila-lista" key={`${a.cedula}-${a.clase}`}>
                      <span><strong>{a.nombre} {a.apellido}</strong><br /><span className="muted">{a.grado}° {a.seccion}</span></span>
                      <span className="muted">{a.clase}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="card">
              <h3>Últimos registros</h3>
              {d.ultimosRegistros.length === 0 ? <p className="muted">Todavía no hay registros hoy.</p> : (
                d.ultimosRegistros.map((r, i) => (
                  <div className="fila-lista" key={i}>
                    <span><strong>{r.nombre}</strong><br /><span className="muted">{r.clase}</span></span>
                    <span className="verde">{r.hora?.slice(0, 5)}</span>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="card">
            <h3>Alumnos con más ausencias · últimos {d.ventanaDias} días</h3>
            {d.enRiesgo.length === 0 ? <p className="muted">Ningún alumno con 2 o más ausencias en este período.</p> : (
              <div className="scroll">
                <table>
                  <thead><tr><th>Alumno</th><th>Grado</th><th>Ausencias</th><th style={{ width: '30%' }}>Asistencia</th></tr></thead>
                  <tbody>
                    {d.enRiesgo.map((a) => (
                      <tr key={a.cedula}>
                        <td><strong>{a.nombre} {a.apellido}</strong></td>
                        <td>{a.grado}° {a.seccion}</td>
                        <td className="rojo">{a.ausencias} de {a.sesiones}</td>
                        <td>
                          <div className="barra"><span style={{ width: `${a.pctAsistencia}%`, background: a.pctAsistencia < 70 ? ROJO : AZUL }} /></div>
                          <small className="muted">{a.pctAsistencia}%</small>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}
    </>
  );
}
