import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAppStore } from '../../store/useAppStore';

// Модальное окно для ввода произвольного объёма воды
export function AddWaterModal() {
  const { showAddWaterModal, setShowAddWaterModal, addWater } = useAppStore();
  const [amount, setAmount] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const modalRef = useRef<HTMLDivElement>(null);

  const handleClose = useCallback(() => {
    setAmount('');
    setShowAddWaterModal(false);
  }, [setShowAddWaterModal]);

  // Escape закрывает модалку
  useEffect(() => {
    if (!showAddWaterModal) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') handleClose();
    };
    document.addEventListener('keydown', handleKeyDown);
    setTimeout(() => inputRef.current?.focus(), 100);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [showAddWaterModal, handleClose]);

  // Фокус-трэп
  const handleTrapFocus = (e: React.KeyboardEvent) => {
    if (e.key !== 'Tab' || !modalRef.current) return;
    const focusable = modalRef.current.querySelectorAll<HTMLElement>(
      'input, button, [tabindex]:not([tabindex="-1"])'
    );
    if (focusable.length === 0) return;
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  };

  const handleSubmit = async () => {
    const ml = parseInt(amount);
    if (ml > 0 && ml <= 5000) {
      await addWater(ml);
      setAmount('');
      setShowAddWaterModal(false);
    }
  };

  return (
    <AnimatePresence>
      {showAddWaterModal && (
        <>
          {/* Затемнённый фон */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={handleClose}
            className="fixed inset-0 bg-black/50 z-40"
          />

          {/* Модальное окно */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
          >
            <div
              ref={modalRef}
              onKeyDown={handleTrapFocus}
              className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl w-full max-w-sm"
              onClick={(e) => e.stopPropagation()}
              role="dialog"
              aria-modal="true"
              aria-label="Свой объём воды"
            >
              <div className="p-6">
                <h2 className="text-xl font-bold text-center mb-6">
                  💧 Свой объём
                </h2>

                {/* Поле ввода */}
                <div className="relative mb-6">
                  <input
                    ref={inputRef}
                    type="number"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="0"
                    min="1"
                    max="5000"
                    className="w-full text-center text-4xl font-bold py-4 px-4 rounded-xl border-2 border-gray-200 dark:border-gray-600 focus:border-primary focus:outline-none bg-white dark:bg-gray-700 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                    autoFocus
                    onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
                  />
                  <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 text-lg">
                    мл
                  </span>
                </div>

                {/* Быстрые подсказки */}
                <div className="grid grid-cols-4 gap-2 mb-6">
                  {[100, 200, 300, 500].map((ml) => (
                    <button
                      key={ml}
                      onClick={() => setAmount(String(ml))}
                      className="py-2 rounded-lg bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-sm font-medium transition-colors"
                    >
                      {ml}
                    </button>
                  ))}
                </div>

                {/* Кнопки */}
                <div className="flex gap-3">
                  <button
                    onClick={handleClose}
                    className="flex-1 px-4 py-2.5 rounded-xl border border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                  >
                    Отмена
                  </button>
                  <button
                    onClick={handleSubmit}
                    disabled={!amount || parseInt(amount) <= 0}
                    className="flex-1 btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Добавить
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
