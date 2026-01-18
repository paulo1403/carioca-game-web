import React from 'react';

interface ModalProps {
  isOpen: boolean;
  title: string;
  children: React.ReactNode;
  onClose: () => void;
  onConfirm?: () => void;
  confirmText?: string;
  cancelText?: string;
  type?: 'info' | 'confirm' | 'danger';
  size?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '3xl';
}

export const Modal: React.FC<ModalProps> = ({ 
  isOpen, 
  title, 
  children, 
  onClose, 
  onConfirm, 
  confirmText = 'Aceptar', 
  cancelText = 'Cancelar',
  type = 'info',
  size = 'sm'
}) => {
  if (!isOpen) return null;

  const sizeClass = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-lg',
    xl: 'max-w-xl',
    '2xl': 'max-w-2xl',
    '3xl': 'max-w-3xl',
  }[size];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div 
        className={`bg-slate-900/70 backdrop-blur-xl border border-slate-700/80 rounded-2xl shadow-2xl ${sizeClass} w-full relative animate-in zoom-in-95 duration-200`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="bg-slate-950/50 border-b border-slate-800 p-4 rounded-t-2xl">
          <h2 className="text-xl font-bold text-slate-100">
            {title}
          </h2>
        </div>

        {/* Content */}
        <div className="p-6 text-slate-100 text-sm">
          {children}
        </div>
        
        {/* Footer */}
        <div className="p-4 border-t border-slate-800 bg-slate-950/30 flex justify-end gap-2 rounded-b-2xl">
          {type !== 'info' && (
            <button 
                onClick={onClose}
                className="bg-transparent hover:bg-white/10 text-slate-100 font-semibold py-2 px-4 rounded-lg transition-colors"
            >
                {cancelText}
            </button>
          )}
          
          <button 
            onClick={() => {
                if (onConfirm) onConfirm();
                else onClose();
            }}
            className={`font-bold py-2 px-6 rounded-lg transition-transform active:scale-95 shadow-lg ${
                type === 'danger' 
                ? 'bg-red-600 hover:bg-red-500 text-white' 
                : 'bg-blue-600 hover:bg-blue-500 text-white'
            }`}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
};
