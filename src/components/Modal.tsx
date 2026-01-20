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
  size?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '3xl' | '4xl' | '5xl';
  showHeader?: boolean;
  showFooter?: boolean;
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
  size = 'sm',
  showHeader = true,
  showFooter = true
}) => {
  if (!isOpen) return null;

  const sizeClass = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-lg',
    xl: 'max-w-xl',
    '2xl': 'max-w-2xl',
    '3xl': 'max-w-3xl',
    '4xl': 'max-w-4xl',
    '5xl': 'max-w-5xl',
  }[size];

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/70 backdrop-blur-md animate-in fade-in duration-200">
      <div
        className={`bg-slate-900/80 backdrop-blur-2xl border border-white/10 rounded-3xl shadow-[0_0_50px_rgba(0,0,0,0.5)] ${sizeClass} w-full relative animate-in zoom-in-95 duration-200 overflow-hidden`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        {showHeader && (
          <div className="bg-white/5 border-b border-white/5 p-5">
            <h2 className="text-xl md:text-2xl font-black text-white tracking-tight">
              {title}
            </h2>
          </div>
        )}

        {/* Content */}
        <div className="p-6 text-slate-200 text-sm overflow-y-auto max-h-[75vh] custom-scrollbar">
          {children}
        </div>

        {/* Footer */}
        {showFooter && (
          <div className="p-5 border-t border-white/5 bg-black/20 flex justify-end gap-3">
            {type !== 'info' && (
              <button
                onClick={onClose}
                className="bg-white/5 hover:bg-white/10 text-white font-bold py-2.5 px-6 rounded-xl transition-all active:scale-95 border border-white/5"
              >
                {cancelText}
              </button>
            )}

            <button
              onClick={() => {
                if (onConfirm) onConfirm();
                else onClose();
              }}
              className={`font-black py-2.5 px-8 rounded-xl transition-all active:scale-95 shadow-xl ${type === 'danger'
                ? 'bg-red-600 hover:bg-red-500 text-white shadow-red-500/20'
                : 'bg-blue-600 hover:bg-blue-500 text-white shadow-blue-500/20'
                }`}
            >
              {confirmText}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
