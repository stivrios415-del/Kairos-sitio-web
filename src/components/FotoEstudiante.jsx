import { useEffect, useRef, useState } from 'react';
import { IoImageOutline, IoTrashOutline } from 'react-icons/io5';
import { Btn } from './ui';

// Recorta al centro (cuadrado), reduce a 480 px y convierte a JPEG.
// Al redibujar en un canvas también se eliminan los datos EXIF (p. ej. la ubicación de la foto).
async function prepararFoto(file) {
  const bmp = await createImageBitmap(file);
  const lado = Math.min(bmp.width, bmp.height);
  const salida = Math.min(480, lado);
  const c = document.createElement('canvas');
  c.width = salida;
  c.height = salida;
  c.getContext('2d').drawImage(bmp, (bmp.width - lado) / 2, (bmp.height - lado) / 2, lado, lado, 0, 0, salida, salida);
  bmp.close?.();
  return new Promise((ok, fallo) =>
    c.toBlob((b) => (b ? ok(b) : fallo(new Error('No se pudo procesar la imagen'))), 'image/jpeg', 0.75)
  );
}

export default function FotoEstudiante({ urlActual, iniciales, pendiente, onElegida, onQuitar }) {
  const inputRef = useRef(null);
  const [preview, setPreview] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!pendiente) { setPreview(null); return; }
    const u = URL.createObjectURL(pendiente);
    setPreview(u);
    return () => URL.revokeObjectURL(u);
  }, [pendiente]);

  const elegir = async (e) => {
    const f = e.target.files?.[0];
    e.target.value = '';
    if (!f) return;
    if (!f.type.startsWith('image/')) return setError('Elige un archivo de imagen.');
    setError('');
    try { onElegida(await prepararFoto(f)); }
    catch { setError('No se pudo leer esa imagen. Prueba con otra (JPG o PNG).'); }
  };

  const src = preview || urlActual;
  return (
    <div>
      <span className="lbl">Foto (opcional)</span>
      <div className="foto-edit">
        <span className="avatar">{src ? <img src={src} alt="" /> : iniciales}</span>
        <div className="btns">
          <input ref={inputRef} type="file" accept="image/*" hidden onChange={elegir} />
          <Btn type="button" icon={IoImageOutline} variant="soft sm" onClick={() => inputRef.current.click()}>
            {src ? 'Cambiar foto' : 'Elegir foto'}
          </Btn>
          {src && <Btn type="button" icon={IoTrashOutline} variant="danger sm" onClick={onQuitar}>Quitar</Btn>}
        </div>
      </div>
      {error && <div className="aviso error">{error}</div>}
    </div>
  );
}