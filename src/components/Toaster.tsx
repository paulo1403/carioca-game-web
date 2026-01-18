'use client';

import React from 'react';
import { useToast, Toast } from '@/hooks/use-toast';
import { X, CheckCircle, AlertCircle, Info, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';

export const Toaster = () => {
  const { toasts, dismiss } = useToast();

  return (
    <div className="fixed bottom-4 right-4 z-[100] flex flex-col gap-2 w-full max-w-[350px] p-4 pointer-events-none">
      {toasts.map((t) => (
        <ToastItem key={t.id} toast={t} onDismiss={() => dismiss(t.id)} />
      ))}
    </div>
  );
};

const ToastItem = ({ toast, onDismiss }: { toast: Toast; onDismiss: () => void }) => {
  const { type = 'info', title, description } = toast;

  const icons = {
    success: <CheckCircle className="w-5 h-5 text-green-400" />,
    error: <AlertCircle className="w-5 h-5 text-red-400" />,
    warning: <AlertTriangle className="w-5 h-5 text-yellow-400" />,
    info: <Info className="w-5 h-5 text-blue-400" />,
  };

  const bgColors = {
    success: 'bg-green-950/90 border-green-500/50',
    error: 'bg-red-950/90 border-red-500/50',
    warning: 'bg-yellow-950/90 border-yellow-500/50',
    info: 'bg-slate-900/90 border-slate-700/50',
  };

  return (
    <div
      className={cn(
        "pointer-events-auto flex w-full items-start gap-3 rounded-lg border p-4 shadow-lg backdrop-blur-md transition-all animate-in slide-in-from-right-full duration-300",
        bgColors[type]
      )}
    >
      <div className="flex-shrink-0 mt-0.5">{icons[type]}</div>
      <div className="flex-1 grid gap-1">
        {title && <h3 className="font-semibold text-white text-sm leading-none">{title}</h3>}
        {description && <p className="text-sm text-white/80 leading-relaxed">{description}</p>}
      </div>
      <button
        onClick={onDismiss}
        className="flex-shrink-0 text-white/50 hover:text-white transition-colors"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
};
