import { useCallback, useEffect, useMemo, useState } from 'react';
import { FiCopy, FiUser, FiTrash2, FiRefreshCw, FiCheckCircle } from 'react-icons/fi';
import { api } from '../../lib/api';
import { Btn, Vacio, Aviso } from '../../components/ui';

export default function Duplicados() {
  const [materias, setMaterias] = useState([]);
  const [profesores, setProfesores] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [trabajando, setTrabajando] = useState('');
  const [aviso, setAviso] = useState(null);

  const cargar = useCallback(async () => {
    setCargando(true);
    try {
      const [m, p] = await Promise.all([api('/materias'), api('/admin/profesores')]);
      setMaterias(m); setProfesores(p);
    } catch (e) { setAviso({ tipo: 'error', texto: e.message }); }
    finally { setCargando(false); }
  }, []);
  useEffect(() => { cargar(); }, [cargar]);

  const grupos = useMemo(() => {
    const mapa = new Map();
    materias.forEach((m) => {
      const k = `${m.profesor_id}|${m.nombre}|${m.grado}|${m.seccion}`;
      if (!mapa.has(k)) mapa.set(k, []);
      mapa.get(k).push(m);
    });
    return [...mapa.entries()]
      .filter(([, g]) => g.length > 1)
      .map(([clave, g]) => ({
        clave, materias: g,
        profesor: profesores.find((p) => p.id === g[0].profesor_id)?.nombre || 'Desconocido',
      }));
  }, [materias, profesores]);

  const limpiar = async (g) => {
    const [, ...sobran] = g.materias;
    if (!window.confirm(`Se eliminarán ${sobran.length} copia(s) de "${g.materias[0].nombre}" y se conservará una.`)) return;
    setTrabajando(g.clave);
    let fallos = 0;
    for (const m of sobran) {
      try { await api(`/materias/${m.id}`, { method: 'DELETE' }); } catch { fallos++; }
    }
    setTrabajando('');
    setAviso(fallos
      ? { tipo: 'error', texto: `${fallos} copia(s) no se pudieron eliminar (probablemente tienen asistencias registradas).` }
      : { tipo: 'ok', texto: 'Duplicados eliminados.' });
    cargar();
  };

  return (
    <>
      <div className="top">
        <div><h2>Clases duplicadas</h2><p className="sub" style={{ margin: 0 }}>Mismo profesor, nombre, grado y sección.</p></div>
        <Btn icon={FiRefreshCw} variant="sec" onClick={cargar}>Actualizar</Btn>
      </div>
      <Aviso aviso={aviso} />
      <div style={{ height: 14 }} />

      {cargando ? <p className="muted">Cargando…</p> : grupos.length === 0
        ? <Vacio icon={FiCheckCircle} texto="No hay clases duplicadas" />
        : grupos.map((g) => (
          <div className="card" key={g.clave}>
            <div className="fila between">
              <div>
                <strong style={{ color: 'var(--p)' }}><FiUser size={14} /> {g.profesor}</strong>
                <div>{g.materias[0].nombre} — Grado {g.materias[0].grado}° Sección {g.materias[0].seccion}</div>
                <span className="rojo" style={{ fontSize: 12 }}><FiCopy size={12} /> {g.materias.length} registros duplicados</span>
              </div>
              <Btn icon={FiTrash2} variant="danger" disabled={trabajando === g.clave} onClick={() => limpiar(g)}>
                {trabajando === g.clave ? 'Eliminando…' : 'Eliminar copias'}
              </Btn>
            </div>
          </div>
        ))}
    </>
  );
}