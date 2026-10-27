import { useEffect, useState } from 'react';
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { IoStatsChartOutline, IoDownloadOutline } from 'react-icons/io5';
import { api, fmt } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import { Btn } from '../components/ui';

const COLORES = ['#2E86AB', '#A23B72', '#F18F01', '#C73E1D', '#6A994E', '#BC4A6C', '#F4D03F', '#5D576B', '#00A8A8', '#E65C4F'];

const periodo = (tipo) => {
  const h = new Date();
  if (tipo === 'semana') {
    const l = new Date(h); l.setDate(h.getDate() - ((h.getDay() + 6) % 7));
    return [fmt(l), fmt(h)];
  }
  if (tipo === 'mes') return [fmt(new Date(h.getFullYear(), h.getMonth(), 1)), fmt(new Date(h.getFullYear(), h.getMonth() + 1, 0))];
  if (tipo === 'trimestre') {
    const m = Math.floor(h.getMonth() / 3) * 3;
    return [fmt(new Date(h.getFullYear(), m, 1)), fmt(new Date(h.getFullYear(), m + 3, 0))];
  }
  return [fmt(new Date(h.getFullYear(), 0, 1)), fmt(new Date(h.getFullYear(), 11, 31))];
};

const PERIODOS = [['semana', 'Esta semana'], ['mes', 'Este mes'], ['trimestre', 'Trimestre'], ['año', 'Este año']];

export default function Estadisticas({ global = false }) {
  const { perfil } = useAuth();
  const email = global ? '' : perfil.email;

  const [rango, setRango] = useState(() => periodo('mes'));
  const [datos, setDatos] = useState({ masFaltas: [], mejorRecord: [], resumenGradoCarrera: [] });
  const [cargando, setCargando] = useState(false);
  const [archivo, setArchivo] = useState(null);
  const [error, setError] = useState('');

  const consultar = async (r = rango) => {
    setCargando(true); setError(''); setArchivo(null);
    try {
      setDatos(await api('/asistencia/estadisticas', {
        params: { profesorEmail: email, fechaInicio: r[0], fechaFin: r[1] },
      }));
    } catch (e) { setError(e.message); }
    finally { setCargando(false); }
  };

  const exportar = async () => {
    setCargando(true); setError('');
    try {
      const r = await api('/asistencia/estadisticas/excel', {
        params: { profesorEmail: email, fechaInicio: rango[0], fechaFin: rango[1] },
      });
      setArchivo(r.url);
    } catch (e) { setError(e.message); }
    finally { setCargando(false); }
  };

  useEffect(() => { consultar(); /* eslint-disable-next-line */ }, []);

  const elegir = (t) => { const r = periodo(t); setRango(r); consultar(r); };
  const pie = (datos.resumenGradoCarrera || [])
    .filter((x) => x.totalAsistencias > 0)
    .map((x) => ({ name: `${x.grado}° ${x.carrera}`, value: x.totalAsistencias }));

  return (
    <>
      <h2>{global ? 'Estadísticas globales' : 'Estadísticas'}</h2>
      <p className="sub">{global ? 'Resumen de toda la institución.' : 'Resumen de tus clases.'}</p>

      <div className="card">
        <div className="fila">
          {PERIODOS.map(([k, l]) => <Btn key={k} variant="soft sm" onClick={() => elegir(k)} disabled={cargando}>{l}</Btn>)}
        </div>
        <div className="fila" style={{ marginTop: 12 }}>
          <label>Desde <input type="date" value={rango[0]} onChange={(e) => setRango([e.target.value, rango[1]])} /></label>
          <label>Hasta <input type="date" value={rango[1]} onChange={(e) => setRango([rango[0], e.target.value])} /></label>
          <Btn icon={IoStatsChartOutline} variant="s" onClick={() => consultar()} disabled={cargando}>{cargando ? 'Cargando…' : 'Consultar'}</Btn>
          <Btn icon={IoDownloadOutline} variant="warn" onClick={exportar} disabled={cargando}>Exportar Excel</Btn>
        </div>
        {error && <div className="aviso error">{error}</div>}
        {archivo && <div className="aviso ok"><a href={archivo} target="_blank" rel="noreferrer">Descargar Excel</a></div>}
      </div>

      {pie.length > 0 && (
        <div className="card">
          <h3>Asistencias por grado y carrera</h3>
          <div style={{ height: 300 }}>
            <ResponsiveContainer>
              <PieChart>
                <Pie data={pie} dataKey="value" nameKey="name" outerRadius={110} label>
                  {pie.map((_, i) => <Cell key={i} fill={COLORES[i % COLORES.length]} />)}
                </Pie>
                <Tooltip /><Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {global && datos.resumenGradoCarrera?.length > 0 && (
        <div className="card">
          <h3>Resumen por grado y carrera</h3>
          <div className="scroll">
            <table>
              <thead><tr><th>Grado / Carrera</th><th>Alumnos</th><th>Asistencias</th><th>Promedio</th></tr></thead>
              <tbody>
                {datos.resumenGradoCarrera.map((x, i) => (
                  <tr key={i}>
                    <td>{x.grado}° {x.seccion ? `Sec. ${x.seccion}` : ''} — {x.carrera}</td>
                    <td>{x.totalEstudiantes}</td>
                    <td className="verde">{x.totalAsistencias}</td>
                    <td>{x.promedioAsistencias}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <div className="dos">
        <div className="card">
          <h3>Alumnos con más faltas</h3>
          {datos.masFaltas?.length === 0 && <p className="muted">Sin datos para este período.</p>}
          {datos.masFaltas?.map((x, i) => (
            <div key={i} className="item">
              <strong>{x.nombre} {x.apellido}</strong>
              <span className="muted">{x.grado}° {x.seccion} · {x.carrera}</span>
              <span className="rojo">Faltas: {x.faltas} / {x.totalDias} días</span>
            </div>
          ))}
        </div>
        <div className="card">
          <h3>Alumnos con mejor récord</h3>
          {datos.mejorRecord?.length === 0 && <p className="muted">Sin datos para este período.</p>}
          {datos.mejorRecord?.map((x, i) => (
            <div key={i} className="item">
              <strong>{x.nombre} {x.apellido}</strong>
              <span className="muted">{x.grado}° {x.seccion} · {x.carrera}</span>
              <span className="verde">Asistencias: {x.asistencias} / {x.totalDias}</span>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}