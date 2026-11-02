import { useEffect, useState } from 'react';
import { IoCameraOutline, IoLocationOutline, IoTimeOutline, IoWarningOutline } from 'react-icons/io5';
import { api } from '../lib/api';
import { Vacio } from './ui';

const TZ = 'America/Tegucigalpa';
const fechaHN = (iso) => new Date(iso).toLocaleDateString('en-CA', { timeZone: TZ });
const horaHN = (iso) => (iso
  ? new Date(iso).toLocaleTimeString('es-HN', { hour: '2-digit', minute: '2-digit', timeZone: TZ })
  : '—');
const diaLargo = (f) => new Date(`${f}T12:00:00`)
  .toLocaleDateString('es-HN', { weekday: 'long', day: 'numeric', month: 'long' });

export default function EvidenciasColegio({ desde, hasta, refresco }) {
  const [d, setD] = useState(null);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!refresco) return undefined; // se carga cuando la página consulta
    let activo = true;
    (async () => {
      setCargando(true); setError('');
      try {
        const r = await api('/asistencia/evidencias', { params: { fechaInicio: desde, fechaFin: hasta } });
        if (activo) setD(r);
      } catch (e) {
        if (activo) setError(e.message);
      } finally {
        if (activo) setCargando(false);
      }
    })();
    return () => { activo = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refresco]);

  // Agrupa por día (el backend ya las manda de la más reciente a la más antigua)
  const dias = [];
  for (const e of d?.evidencias || []) {
    let g = dias[dias.length - 1];
    if (!g || g.fecha !== e.fecha) { g = { fecha: e.fecha, items: [] }; dias.push(g); }
    g.items.push(e);
  }

  return (
    <div className="card">
      <div className="secth">
        <h3>Evidencias de las clases</h3>
        {d && <span className="muted">{d.total} foto(s) · {d.desde} al {d.hasta}</span>}
      </div>

      {error && <div className="aviso error">{error}</div>}
      {cargando && !d && <p className="muted">Cargando evidencias…</p>}

      {d?.sinEvidencia?.length > 0 && (
        <div className="aviso error" style={{ marginTop: 0, marginBottom: 14 }}>
          <strong><IoWarningOutline size={15} /> Días con lista pero sin evidencia</strong>
          <ul style={{ margin: '6px 0 0', paddingLeft: 18 }}>
            {d.sinEvidencia.map((s, i) => (
              <li key={i}>{diaLargo(s.fecha)} · {s.clase}{s.profesor ? ` (${s.profesor})` : ''} · {s.presentes} presentes</li>
            ))}
          </ul>
        </div>
      )}

      {d && dias.length === 0 && !cargando && (
        <Vacio icon={IoCameraOutline} texto="No hay evidencias en este período." />
      )}

      {dias.map((g) => (
        <div key={g.fecha}>
          <h4 className="evid-dia">{diaLargo(g.fecha)}</h4>
          <div className="evid-lista">
            {g.items.map((e) => {
              const tarde = e.subido_en && fechaHN(e.subido_en) !== e.fecha;
              return (
                <div className="evid-card" key={e.id}>
                  <a href={e.url || undefined} target="_blank" rel="noreferrer">
                    {e.url
                      ? <img src={e.url} alt={`Evidencia de ${e.clase}`} loading="lazy" />
                      : <div className="evid-sin">Sin vista previa</div>}
                  </a>
                  <div className="evid-info">
                    <strong>{e.clase}</strong>
                    <span className="muted">{e.profesor || '—'}</span>
                    <span><IoTimeOutline size={14} /> Tomada {horaHN(e.capturado_en || e.subido_en)}</span>
                    <span>
                      {e.presentes}{d.totalAlumnos ? ` de ${d.totalAlumnos}` : ''} alumnos presentes
                    </span>
                    {tarde && <span className="evid-alerta">Enviada con retraso ({fechaHN(e.subido_en)})</span>}
                    {e.latitud != null && e.longitud != null
                      ? (
                        <a href={`https://www.google.com/maps?q=${e.latitud},${e.longitud}`} target="_blank" rel="noreferrer">
                          <IoLocationOutline size={14} /> Ver ubicación{e.precision_m ? ` (±${Math.round(e.precision_m)} m)` : ''}
                        </a>
                      )
                      : <span className="muted">Sin ubicación</span>}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ))}

      {d?.truncado && (
        <p className="muted" style={{ marginBottom: 0 }}>
          Se muestran las 150 más recientes de {d.total}. Acota el rango de fechas para ver las demás.
        </p>
      )}
    </div>
  );
}