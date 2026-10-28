import { useEffect, useRef, useState } from 'react';
import { IoCameraOutline } from 'react-icons/io5';
import { Btn, Modal } from './ui';

export const obtenerUbicacionWeb = () => new Promise((resolve) => {
  if (!navigator.geolocation) return resolve(null);
  navigator.geolocation.getCurrentPosition(
    (p) => resolve(p.coords), () => resolve(null), { timeout: 8000, maximumAge: 60000 }
  );
});

export default function CamaraEvidencia({ onFoto, onCerrar }) {
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const [lista, setLista] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    let activo = true;
    if (!navigator.mediaDevices?.getUserMedia) {
      setError('Este navegador no permite abrir la cámara (se necesita HTTPS).');
      return;
    }
    navigator.mediaDevices
      .getUserMedia({ video: { facingMode: 'environment', width: { ideal: 1280 } }, audio: false })
      .then((s) => {
        if (!activo) { s.getTracks().forEach((t) => t.stop()); return; }
        streamRef.current = s;
        videoRef.current.srcObject = s;
        videoRef.current.play().then(() => setLista(true)).catch(() => {});
      })
      .catch(() => setError('No se pudo abrir la cámara. Permite el acceso en el navegador.'));
    return () => { activo = false; streamRef.current?.getTracks().forEach((t) => t.stop()); };
  }, []);

  const capturar = () => {
    const v = videoRef.current;
    if (!v?.videoWidth) return;
    const escala = Math.min(1, 1280 / v.videoWidth);
    const c = document.createElement('canvas');
    c.width = Math.round(v.videoWidth * escala);
    c.height = Math.round(v.videoHeight * escala);
    c.getContext('2d').drawImage(v, 0, 0, c.width, c.height);
    c.toBlob((b) => b && onFoto(b), 'image/jpeg', 0.6);
  };

  return (
    <Modal titulo="Foto de evidencia" icon={IoCameraOutline} onClose={onCerrar}>
      {error ? <div className="aviso error">{error}</div> : (
        <>
          <video ref={videoRef} className="cam-video" playsInline muted />
          <p className="muted">La foto se toma en este momento con la cámara; no se pueden subir archivos.</p>
          <div className="fila" style={{ justifyContent: 'flex-end' }}>
            <Btn type="button" variant="sec" onClick={onCerrar}>Cancelar</Btn>
            <Btn type="button" icon={IoCameraOutline} variant="s" onClick={capturar} disabled={!lista}>Tomar foto</Btn>
          </div>
        </>
      )}
    </Modal>
  );
}