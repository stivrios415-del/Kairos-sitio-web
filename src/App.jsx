import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import Layout from './components/Layout';
import Login from './pages/Login';
import Vencida from './pages/Vencida';
import Asistencia from './pages/Asistencia';
import Reportes from './pages/Reportes';
import Estadisticas from './pages/Estadisticas';
import Profesores from './pages/admin/Profesores';
import Clases from './pages/admin/Clases';
import Duplicados from './pages/admin/Duplicados';
import Estudiantes from './pages/admin/Estudiantes';
import IndepPanel from './pages/independiente/IndepPanel';
import Bienvenida from './pages/Bienvenida'; // 1. Agregado

function Protegida({ children }) {
  const { session, perfil, loading } = useAuth();
  if (loading) return <div className="center">Cargando…</div>;
  
  // 2. Redirige a la bienvenida
  if (!session || !perfil) return <Navigate to="/bienvenida" replace />;
  if (perfil.rol === 'independiente' && !perfil.activo) return <Vencida />;
  return children;
}

function SoloAdmin({ children }) {
  const { perfil } = useAuth();
  return perfil?.rol === 'admin' ? children : <Navigate to="/" replace />;
}

function SoloInstitucional({ children }) {
  const { perfil } = useAuth();
  return perfil?.rol === 'independiente' ? <Navigate to="/" replace /> : children;
}

function Inicio() {
  const { perfil } = useAuth();
  return perfil.rol === 'independiente' ? <IndepPanel /> : <Asistencia />;
}

export default function App() {
  return (
    <Routes>
      {/* 3. Reemplazo de rutas de Login */}
      <Route path="/bienvenida" element={<Bienvenida />} />
      <Route path="/entrar/:modo" element={<Login />} />
      <Route path="/login" element={<Navigate to="/bienvenida" replace />} />

      <Route element={<Protegida><Layout /></Protegida>}>
        <Route path="/" element={<Inicio />} />
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
