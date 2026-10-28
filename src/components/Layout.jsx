import { NavLink, Outlet } from 'react-router-dom';
// ✅ FIX: Se agregó IoHomeOutline aquí
import { IoHomeOutline, IoSchoolOutline, IoBarChartOutline, IoAnalyticsOutline, IoLogOutOutline } from 'react-icons/io5';
import { FiUsers, FiBookOpen, FiCopy, FiUser, FiFileText, FiBarChart2, FiShield } from 'react-icons/fi';
import { useAuth } from '../context/AuthContext';

const PROFESOR = [
  { to: '/', label: 'Inicio', icon: IoHomeOutline, end: true },
  { to: '/asistencia', label: 'Tomar asistencia', icon: IoSchoolOutline },
  { to: '/reportes', label: 'Reportes', icon: IoBarChartOutline },
  { to: '/estadisticas', label: 'Estadísticas', icon: IoAnalyticsOutline },
];

const INDEP = [{ to: '/', label: 'Mi panel', icon: IoSchoolOutline, end: true }];
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
  const { perfil, inst, logout } = useAuth();
  const indep = perfil.rol === 'independiente';
  const style = indep
    ? { '--p': '#469de5', '--s': '#10B981' }
    : { '--p': inst?.color_primario || '#143C65', '--s': inst?.color_secundario || '#256D5B' };

  return (
    <div className="app" style={style}>
      <aside className="side">
        <div className="brand">
          {!indep && inst?.logo_url && <img src={inst.logo_url} alt="" />}
          <div>
            <small>{indep ? 'PANEL DEL PROFESOR' : (inst?.nombre || 'Kairos Assist').toUpperCase()}</small>
            <strong>{indep ? 'Profesor Independiente' : 'Panel de Control'}</strong>
          </div>
        </div>
        <nav>
          {!indep && <span className="navsec">Profesor</span>}
          {(indep ? INDEP : PROFESOR).map((i) => <Item key={i.to} {...i} />)}
          {perfil.rol === 'admin' && (
            <>
              <span className="navsec"><FiShield size={12} /> Administración</span>
              {ADMIN.map((i) => <Item key={i.to} {...i} />)}
            </>
          )}
        </nav>
        <div className="user">
          <strong>{perfil.nombre}</strong>
          <small>{indep ? 'Profesor independiente' : perfil.rol === 'admin' ? 'Administrador' : 'Profesor'}</small>
          <button className="link" onClick={logout}><IoLogOutOutline size={16} /> Cerrar sesión</button>
        </div>
      </aside>
      <main className="main"><Outlet /></main>
    </div>
  );
}
