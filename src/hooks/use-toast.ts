import { useState, useEffect, useCallback } from 'react';

// Simple unique ID generator
let count = 0;
function genId() {
  count = (count + 1) % Number.MAX_SAFE_INTEGER;
  return count.toString();
}

type ToastType = 'success' | 'error' | 'info' | 'warning';

export interface Toast {
  id: string;
  title?: string;
  description?: string;
  type?: ToastType;
  duration?: number;
}

// Event system to communicate between hook and component
const listeners: Array<(state: Toast[]) => void> = [];
let memoryState: Toast[] = [];

function dispatch(action: { type: 'ADD'; toast: Toast } | { type: 'REMOVE'; toastId: string } | { type: 'REMOVE_ALL' }) {
  if (action.type === 'ADD') {
    memoryState = [...memoryState, action.toast];
  } else if (action.type === 'REMOVE') {
    memoryState = memoryState.filter((t) => t.id !== action.toastId);
  } else if (action.type === 'REMOVE_ALL') {
    memoryState = [];
  }
  listeners.forEach((listener) => listener(memoryState));
}

export function toast(props: Omit<Toast, 'id'>) {
  const id = genId();
  const newToast = {
    ...props,
    id,
    duration: props.duration ?? 5000,
  };
  
  dispatch({ type: 'ADD', toast: newToast });

  if (newToast.duration !== Infinity) {
    setTimeout(() => {
      dispatch({ type: 'REMOVE', toastId: id });
    }, newToast.duration);
  }

  return id;
}

export function useToast() {
  const [state, setState] = useState<Toast[]>(memoryState);

  useEffect(() => {
    listeners.push(setState);
    return () => {
      const index = listeners.indexOf(setState);
      if (index > -1) {
        listeners.splice(index, 1);
      }
    };
  }, []);

  return {
    toasts: state,
    toast,
    dismiss: (toastId: string) => dispatch({ type: 'REMOVE', toastId }),
    dismissAll: () => dispatch({ type: 'REMOVE_ALL' }),
  };
}
