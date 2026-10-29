import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import Layout from './components/Layout';
import Bienvenida from './pages/Bienvenida';
import Login from './pages/Login';
import Vencida from './pages/Vencida';
import Panel from './pages/Panel';
import Colegios from './pages/Colegios';
import Asistencia from './pages/Asistencia';
import Reportes from './pages/Reportes';
import Estadisticas from './pages/Estadisticas';
import Profesores from './pages/admin/Profesores';
import Clases from './pages/admin/Clases';
import Duplicados from './pages/admin/Duplicados';
import Estudiantes from './pages/admin/Estudiantes';
import IndepPanel from './pages/independiente/IndepPanel';

function Protegida({ children }) {
  const { session, perfil, loading } = useAuth();
  if (loading) return <div className="center">Cargando…</div>;
  if (!session || !perfil) return <Navigate to="/bienvenida" replace />;
  if (perfil.rol === 'independiente' && !perfil.activo) return <Vencida />;
  return children;
}

function SoloAdmin({ children }) {
  const { esAdminEfectivo } = useAuth();
  return esAdminEfectivo ? children : <Navigate to="/" replace />;
}

function SoloInstitucional({ children }) {
  const { perfil } = useAuth();
  return perfil?.rol === 'independiente' ? <Navigate to="/" replace /> : children;
}

function SoloCoordinador({ children }) {
  const { perfil } = useAuth();
  return perfil?.rol === 'coordinador' ? children : <Navigate to="/" replace />;
}

function Inicio() {
  const { perfil, inst } = useAuth();
  if (perfil.rol === 'independiente') return <IndepPanel />;
  if (perfil.rol === 'coordinador') return inst ? <Panel key={inst.id} /> : <Navigate to="/colegios" replace />;
  return <Panel />;
}

export default function App() {
  return (
    <Routes>
      <Route path="/bienvenida" element={<Bienvenida />} />
      <Route path="/entrar/:modo" element={<Login />} />
      <Route path="/login" element={<Navigate to="/bienvenida" replace />} />
      <Route element={<Protegida><Layout /></Protegida>}>
        <Route path="/" element={<Inicio />} />
        <Route path="/colegios" element={<SoloCoordinador><Colegios /></SoloCoordinador>} />
        <Route path="/asistencia" element={<SoloInstitucional><Asistencia /></SoloInstitucional>} />
        <Route path="/reportes" element={<SoloInstitucional><Reportes /></SoloInstitucional>} />
        <Route path="/estadisticas" element={<SoloInstitucional><Estadisticas /></SoloInstitucional>} />

        <Route path="/admin/profesores" element={<SoloAdmin><Profesores /></SoloAdmin>} />
        <Route path="/admin/clases" element={<SoloAdmin><Clases /></SoloAdmin>} />
        <Route path="/admin/duplicados" element={<SoloAdmin><Duplicados /></SoloAdmin>} />
        <Route path="/admin/estudiantes" element={<SoloAdmin><Estudiantes /></SoloAdmin>} />
        <Route path="/admin/reportes" element={<SoloAdmin><Reportes key="global" global /></SoloAdmin>} />
        <Route path="/admin/estadisticas" element={<SoloAdmin><Estadisticas key="global" global /></SoloAdmin>} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
