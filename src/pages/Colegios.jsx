import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  IoPeopleOutline, IoPersonOutline, IoCheckmarkCircleOutline, IoTimeOutline,
  IoRefreshOutline, IoArrowForward, IoSchoolOutline,
} from 'react-icons/io5';
import { useAuth } from '../context/AuthContext';
import { Btn, Vacio } from '../components/ui';

export default function Colegios() {
  const { perfil, colegios, elegirColegio, recargarColegios } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    const t = setInterval(recargarColegios, 60000);
    return () => clearInterval(t);
  }, [recargarColegios]);

  const entrar = (c) => { elegirColegio(c); navigate('/'); };

  return (
    <>
      <div className="top">
        <div>
          <h2>{perfil.red?.nombre || 'Mis colegios'}</h2>
          <p className="sub" style={{ margin: 0 }}>Elige un colegio para administrar sus maestros, alumnos, reportes y estadísticas.</p>
        </div>
        <Btn icon={IoRefreshOutline} variant="sec sm" onClick={recargarColegios}>Actualizar</Btn>
      </div>

      {colegios.length === 0 ? (
        <div className="card"><Vacio icon={IoSchoolOutline} texto="Tu red todavía no tiene colegios asignados." /></div>
      ) : (
        <div className="colegios">
          {colegios.map((c) => {
            const color = c.color_primario || '#143C65';
            return (
              <div key={c.id} className="colegio" style={{ '--c': color }}>
                <div className="col-head">
                  <span className="col-logo">{c.logo_url ? <img src={c.logo_url} alt="" /> : (c.nombre || '?')[0]}</span>
                  <div>
                    <strong>{c.nombre}</strong>
                    {c.es_rural && <div className="muted">Colegio rural</div>}
                  </div>
                </div>

                <div className="col-stats">
                  <div><b>{c.estudiantes}</b><small><IoPeopleOutline /> Alumnos</small></div>
                  <div><b>{c.profesores}</b><small><IoPersonOutline /> Maestros</small></div>
                  <div><b>{c.presentesHoy}</b><small>Presentes hoy</small></div>
                </div>

                {c.requiere_evidencia && (
                  <div className={`col-evid ${c.evidenciaHoy > 0 ? 'ok' : 'no'}`}>
                    {c.evidenciaHoy > 0
                      ? <><IoCheckmarkCircleOutline size={16} /> Evidencia de hoy enviada</>
                      : <><IoTimeOutline size={16} /> Evidencia de hoy pendiente</>}
                  </div>
                )}

                <Btn icon={IoArrowForward} style={{ background: color }} onClick={() => entrar(c)}>Entrar</Btn>
              </div>
            );
          })}
        </div>
      )}
    </>
  );
}