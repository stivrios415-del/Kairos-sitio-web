import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import {
  IoHomeOutline, IoSchoolOutline, IoBarChartOutline, IoAnalyticsOutline,
  IoLogOutOutline, IoBusinessOutline, IoSwapHorizontalOutline,
} from 'react-icons/io5';
import { FiUsers, FiBookOpen, FiCopy, FiUser, FiFileText, FiBarChart2, FiShield } from 'react-icons/fi';
import { useAuth } from '../context/AuthContext';

const PROFESOR = [
  { to: '/', label: 'Inicio', icon: IoHomeOutline, end: true },
  { to: '/asistencia', label: 'Tomar asistencia', icon: IoSchoolOutline },
  { to: '/reportes', label: 'Reportes', icon: IoBarChartOutline },
  { to: '/estadisticas', label: 'Estadísticas', icon: IoAnalyticsOutline },
];
const INDEP = [{ to: '/', label: 'Mi panel', icon: IoSchoolOutline, end: true }];
const COORD_SIN_COLEGIO = [{ to: '/colegios', label: 'Mis colegios', icon: IoBusinessOutline }];
const COORD_CON_COLEGIO = [{ to: '/', label: 'Inicio', icon: IoHomeOutline, end: true }];
const ADMIN = [
  { to: '/admin/profesores', label: 'Profesores', icon: FiUsers },
  { to: '/admin/clases', label: 'Clases', icon: FiBookOpen },
  { to: '/admin/duplicados', label: 'Duplicados', icon: FiCopy },
  { to: '/admin/estudiantes', label: 'Estudiantes', icon: FiUser },
  { to: '/admin/reportes', label: 'Reportes globales', icon: FiFileText },
  { to: '/admin/estadisticas', label: 'Estadísticas globales', icon: FiBarChart2 },
];

const Item = ({ to, label, icon: Icon, end }) => (
  <NavLink to={to} end={end}><Icon size={18} />{label}</NavLink>
);

export default function Layout() {
  const { perfil, inst, logout, esAdminEfectivo, salirDeColegio } = useAuth();
  const navigate = useNavigate();
  const indep = perfil.rol === 'independiente';
  const coord = perfil.rol === 'coordinador';

  const style = indep
    ? { '--p': '#469de5', '--s': '#10B981' }
    : { '--p': inst?.color_primario || '#143C65', '--s': inst?.color_secundario || '#256D5B' };

  const items = indep ? INDEP : coord ? (inst ? COORD_CON_COLEGIO : COORD_SIN_COLEGIO) : PROFESOR;
  const rolTexto = indep ? 'Profesor independiente' : coord ? 'Coordinador de red' : perfil.rol === 'admin' ? 'Administrador' : 'Profesor';

  const cambiarColegio = () => { salirDeColegio(); navigate('/colegios'); };

  return (
    <div className="app" style={style}>
      <aside className="side">
        <div className="brand">
          {!indep && inst?.logo_url && <img src={inst.logo_url} alt="" />}
          <div>
            <small>
              {indep ? 'PANEL DEL PROFESOR'
                : coord && !inst ? (perfil.red?.nombre || 'RED DE COLEGIOS').toUpperCase()
                : (inst?.nombre || 'Kairos Assist').toUpperCase()}
            </small>
            <strong>{indep ? 'Profesor Independiente' : 'Panel de Control'}</strong>
          </div>
        </div>
        <nav>
          {!indep && !coord && <span className="navsec">Profesor</span>}
          {items.map((i) => <Item key={i.to} {...i} />)}
          {esAdminEfectivo && (
            <>
              <span className="navsec"><FiShield size={12} /> Administración</span>
              {ADMIN.map((i) => <Item key={i.to} {...i} />)}
            </>
          )}
        </nav>
        {coord && inst && (
          <button className="link" style={{ color: '#fff' }} onClick={cambiarColegio}>
            <IoSwapHorizontalOutline size={16} /> Cambiar de colegio
          </button>
        )}
        <div className="user">
          <strong>{perfil.nombre}</strong>
          <small>{rolTexto}</small>
          <button className="link" onClick={logout}><IoLogOutOutline size={16} /> Cerrar sesión</button>
        </div>
      </aside>
      <main className="main"><Outlet /></main>
    </div>
  );
}
