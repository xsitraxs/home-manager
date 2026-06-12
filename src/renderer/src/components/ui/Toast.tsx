import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

type ToastType = 'error' | 'success' | 'info';

interface Toast {
  id: number;
  message: string;
  type: ToastType;
}

let toastId = 0;
const listeners: ((toasts: Toast[]) => void)[] = [];
let toastsState: Toast[] = [];

function notifyListeners() {
  listeners.forEach((l) => l([...toastsState]));
}

// Глобальная функция для показа тостов из любого места
export function showToast(message: string, type: ToastType = 'error') {
  const id = ++toastId;
  toastsState = [...toastsState, { id, message, type }];
  notifyListeners();
  setTimeout(() => {
    toastsState = toastsState.filter((t) => t.id !== id);
    notifyListeners();
  }, 4000);
}

// Компонент контейнера тостов
export function ToastContainer() {
  const [toasts, setToasts] = useState<Toast[]>([]);

  useEffect(() => {
    listeners.push(setToasts);
    return () => {
      const idx = listeners.indexOf(setToasts);
      if (idx >= 0) listeners.splice(idx, 1);
    };
  }, []);

  return (
    <div className="fixed bottom-4 right-4 z-[100] flex flex-col gap-2 pointer-events-none">
      <AnimatePresence>
        {toasts.map((toast) => (
          <motion.div
            key={toast.id}
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, x: 100 }}
            className={`pointer-events-auto px-4 py-3 rounded-xl shadow-lg text-sm font-medium max-w-sm ${
              toast.type === 'error'
                ? 'bg-danger text-white'
                : toast.type === 'success'
                ? 'bg-success text-white'
                : 'bg-primary text-white'
            }`}
          >
            {toast.message}
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
