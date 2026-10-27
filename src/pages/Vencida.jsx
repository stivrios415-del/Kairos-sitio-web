import { useState } from 'react';
import { IoLockClosedOutline } from 'react-icons/io5';
import { useAuth } from '../context/AuthContext';
import { Btn } from '../components/ui';

export default function Vencida() {
  const { perfil, logout, recargar } = useAuth();
  const [verificando, setVerificando] = useState(false);

  return (
    <div className="center">
      <div className="card login" style={{ textAlign: 'center', alignItems: 'center' }}>
        <IoLockClosedOutline size={42} color="#469de5" />
        <h2>Suscripción vencida</h2>
        <p className="muted">
          {perfil.fecha_vencimiento
            ? `Tu acceso venció el ${perfil.fecha_vencimiento}.`
            : 'Tu cuenta todavía no tiene una suscripción activa.'}{' '}
          Contacta al administrador para renovarla.
        </p>
        <Btn disabled={verificando} onClick={async () => { setVerificando(true); await recargar(); setVerificando(false); }}>
          {verificando ? 'Verificando…' : 'Verificar de nuevo'}
        </Btn>
        <button className="link" onClick={logout}>Cerrar sesión</button>
      </div>
    </div>
  );
}