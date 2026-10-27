import { Link, Navigate } from 'react-router-dom';
import { IoBarChart, IoSchool, IoPerson, IoArrowForward } from 'react-icons/io5';
import { useAuth } from '../context/AuthContext';

export default function Bienvenida() {
  const { session, perfil, loading } = useAuth();
  if (loading) return <div className="center">Cargando…</div>;
  if (session && perfil) return <Navigate to="/" replace />;

  return (
    <div className="welcome">
      <div className="w-logo">
        <span className="w-circle"><IoBarChart size={36} color="#0B2545" /></span>
        <h1>KAIROS ASSIST</h1>
        <p>Gestión del Tiempo y Asistencia</p>
      </div>

      <div className="w-card">
        <div className="w-head">
          <h2>¡Bienvenido!</h2>
          <p>Por favor, selecciona la modalidad con la que deseas interactuar hoy</p>
        </div>

        <Link to="/entrar/instituto" className="w-opt f1">
          <span className="w-ico" style={{ background: '#EEF2FF' }}><IoSchool size={26} color="#4F46E5" /></span>
          <span className="w-txt"><b>Código de Instituto</b><small>Ingresa a tu Instituto</small></span>
          <span className="w-arrow"><IoArrowForward size={16} color="#0B2545" /></span>
        </Link>

        <Link to="/entrar/independiente" className="w-opt f2">
          <span className="w-ico" style={{ background: '#E6FFFA' }}><IoPerson size={26} color="#0D9488" /></span>
          <span className="w-txt"><b>Profesor Independiente</b><small>Puedes ser independiente ¡anímate!</small></span>
          <span className="w-arrow"><IoArrowForward size={16} color="#0B2545" /></span>
        </Link>
      </div>

      <p className="w-foot">Desarrollado por: Ronald Matute.</p>
    </div>
  );
}