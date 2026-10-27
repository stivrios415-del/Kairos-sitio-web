import { IoCloseOutline } from 'react-icons/io5';

export function Btn({ icon: Icon, variant = '', children, ...props }) {
  return (
    <button className={`btn ${variant}`} {...props}>
      {Icon && <Icon size={16} />}{children}
    </button>
  );
}

export function Modal({ titulo, icon: Icon, onClose, children }) {
  return (
    <div className="overlay" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <div className="modal-h">
          {Icon && <span className="ico"><Icon size={18} /></span>}
          <h3>{titulo}</h3>
          <button className="link" onClick={onClose} aria-label="Cerrar"><IoCloseOutline size={22} /></button>
        </div>
        {children}
      </div>
    </div>
  );
}

export function Vacio({ icon: Icon, texto }) {
  return <div className="vacio">{Icon && <Icon size={30} />}<p>{texto}</p></div>;
}

export function Aviso({ aviso }) {
  return aviso ? <div className={`aviso ${aviso.tipo}`}>{aviso.texto}</div> : null;
}