import { useRef } from 'react';
import { Scanner } from '@yudiel/react-qr-scanner';

export default function QrScanner({ onCode }) {
  const ultimo = useRef({ v: '', t: 0 });
  return (
    <div className="scanner">
      <Scanner
        constraints={{ facingMode: 'environment' }}
        onScan={(codes) => {
          const v = codes?.[0]?.rawValue;
          if (!v) return;
          const ahora = Date.now();
          if (v === ultimo.current.v && ahora - ultimo.current.t < 4000) return; // evita lecturas repetidas
          ultimo.current = { v, t: ahora };
          onCode(v);
        }}
        onError={(e) => console.warn('Cámara:', e?.message)}
      />
    </div>
  );
}