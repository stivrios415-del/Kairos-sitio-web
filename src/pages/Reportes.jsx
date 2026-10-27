import { useState } from 'react';
import { IoSearchOutline, IoDownloadOutline, IoDocumentTextOutline } from 'react-icons/io5';
import { api, fechaHoy } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import { Btn } from '../components/ui';

const LIMITE = 500;

export default function Reportes({ global = false }) {
  const { perfil } = useAuth();
  const email = global ? '' : perfil.email;
  const quien = global ? 'Administrador' : perfil.nombre;

  const [inicio, setInicio] = useState(fechaHoy());
  const [fin, setFin] = useState(fechaHoy());
  const [filas, setFilas] = useState([]);
  const [consultado, setConsultado] = useState(false);
  const [archivo, setArchivo] = useState(null);
  const [cargando, setCargando] = useState('');
  const [error, setError] = useState('');

  const consultar = async () => {
    setCargando('consulta'); setError(''); setArchivo(null);
    try {
      setFilas(await api('/asistencia/reportes', {
        params: { fechaInicio: inicio, fechaFin: fin, profesorEmail: email },
      }));
      setConsultado(true);
    } catch (e) { setError(e.message); }
    finally { setCargando(''); }
  };

  const exportar = async (tipo) => {
    setCargando(tipo); setError(''); setArchivo(null);
    try {
      const mismoDia = inicio === fin;
      const p = { profesorEmail: email, nombreProfesor: quien };
      let r;
      if (tipo === 'excel') {
        r = mismoDia
          ? await api('/asistencia/reporte-completo-excel', { params: { fecha: inicio, usuario: global ? 'admin' : 'Profesor', ...p } })
          : await api('/asistencia/exportar-excel', { params: { fechaInicio: inicio, fechaFin: fin, usuario: global ? 'admin' : 'profesor' } });
      } else {
        r = mismoDia
          ? await api('/reportes-pdf/diario', { params: { fecha: inicio, ...p } })
          : await api('/reportes-pdf/rango', { params: { fechaInicio: inicio, fechaFin: fin, ...p } });
      }
      if (!r.url) setError('No hay asistencias en ese rango.');
      else setArchivo({ url: r.url, tipo });
    } catch (e) { setError(e.message); }
    finally { setCargando(''); }
  };

  return (
    <>
      <h2>{global ? 'Reportes globales' : 'Reportes de asistencia'}</h2>
      <p className="sub">{global ? 'Asistencia de toda la institución.' : 'Asistencia de tus clases.'}</p>

      <div className="card">
        <div className="fila">
          <label>Desde <input type="date" value={inicio} onChange={(e) => setInicio(e.target.value)} /></label>
          <label>Hasta <input type="date" value={fin} onChange={(e) => setFin(e.target.value)} /></label>
          <Btn icon={IoSearchOutline} variant="s" onClick={consultar} disabled={!!cargando}>
            {cargando === 'consulta' ? 'Consultando…' : 'Consultar'}
          </Btn>
          <Btn icon={IoDownloadOutline} variant="warn" onClick={() => exportar('excel')} disabled={!!cargando}>
            {cargando === 'excel' ? 'Generando…' : 'Exportar Excel'}
          </Btn>
          <Btn icon={IoDocumentTextOutline} variant="danger" onClick={() => exportar('pdf')} disabled={!!cargando}>
            {cargando === 'pdf' ? 'Generando…' : 'Exportar PDF'}
          </Btn>
        </div>
        {error && <div className="aviso error">{error}</div>}
        {archivo && (
          <div className="aviso ok">
            Archivo listo: <a href={archivo.url} target="_blank" rel="noreferrer">Descargar {archivo.tipo.toUpperCase()}</a>
          </div>
        )}
        {cargando && <p className="muted">Si el servidor estaba dormido, la primera consulta puede tardar hasta un minuto.</p>}
      </div>

      <div className="card">
        <h3>Resultados: {filas.length}</h3>
        <div className="scroll">
          <table>
            <thead><tr><th>Fecha</th><th>Hora</th><th>Estudiante</th><th>Materia</th><th>Grado</th><th>Estado</th></tr></thead>
            <tbody>
              {filas.length === 0 && (
                <tr><td colSpan="6" className="muted">
                  {consultado ? 'No hay datos en el rango seleccionado.' : 'Sin datos. Elige un rango y consulta.'}
                </td></tr>
              )}
              {filas.slice(0, LIMITE).map((i, idx) => (
                <tr key={i.id || idx}>
                  <td>{i.fecha}</td>
                  <td>{i.estado === 'excusado' ? '—' : i.hora?.slice(0, 5)}</td>
                  <td>{i.estudiantes?.nombre} {i.estudiantes?.apellido}</td>
                  <td>{i.materia_nombre}</td>
                  <td>{i.estudiantes?.grado}° {i.estudiantes?.seccion}</td>
                  <td>{i.estado === 'excusado' ? 'Excusado' : 'Presente'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {filas.length > LIMITE && (
          <p className="muted">Mostrando {LIMITE} de {filas.length}. Exporta a Excel o PDF para ver todo.</p>
        )}
      </div>
    </>
  );
}