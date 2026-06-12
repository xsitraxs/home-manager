import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAppStore } from '../../store/useAppStore';

interface ChoreModalProps {
  isOpen: boolean;
  onClose: () => void;
  chore?: any; // Если передано — режим редактирования
}

// Модальное окно добавления/редактирования дела
export function ChoreModal({ isOpen, onClose, chore }: ChoreModalProps) {
  const { addChore, updateChore, members } = useAppStore();
  const [title, setTitle] = useState('');
  const [frequencyDays, setFrequencyDays] = useState(1);
  const [assignedTo, setAssignedTo] = useState<number | null>(null);

  // Заполнение формы при редактировании
  useEffect(() => {
    if (chore) {
      setTitle(chore.title);
      setFrequencyDays(chore.frequency_days);
      setAssignedTo(chore.assigned_to);
    } else {
      setTitle('');
      setFrequencyDays(1);
      setAssignedTo(null);
    }
  }, [chore, isOpen]);

  // Обработка отправки формы
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    if (chore) {
      await updateChore(chore.id, title, frequencyDays, assignedTo);
    } else {
      await addChore(title, frequencyDays, assignedTo);
    }
    onClose();
  };

  // Варианты периодичности
  const frequencyOptions = [
    { value: 1, label: 'Каждый день' },
    { value: 2, label: 'Раз в 2 дня' },
    { value: 3, label: 'Раз в 3 дня' },
    { value: 7, label: 'Раз в неделю' },
    { value: 14, label: 'Раз в 2 недели' },
    { value: 30, label: 'Раз в месяц' },
  ];

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Затемнённый фон */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/50 z-40"
          />

          {/* Модальное окно */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
          >
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl w-full max-w-md" onClick={(e) => e.stopPropagation()}>
              {/* Заголовок */}
              <div className="p-6 pb-0">
                <h2 className="text-xl font-bold">
                  {chore ? 'Редактировать дело' : 'Новое дело'}
                </h2>
              </div>

              {/* Форма */}
              <form onSubmit={handleSubmit} className="p-6 space-y-4">
                {/* Название */}
                <div>
                  <label className="block text-sm font-medium mb-1">Название</label>
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Например: Мыть посуду"
                    className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-primary"
                    autoFocus
                  />
                </div>

                {/* Периодичность */}
                <div>
                  <label className="block text-sm font-medium mb-1">Периодичность</label>
                  <select
                    value={frequencyDays}
                    onChange={(e) => setFrequencyDays(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-primary"
                  >
                    {frequencyOptions.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Назначение */}
                {members.length > 0 && (
                  <div>
                    <label className="block text-sm font-medium mb-1">Назначить</label>
                    <select
                      value={assignedTo || ''}
                      onChange={(e) => setAssignedTo(e.target.value ? Number(e.target.value) : null)}
                      className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-primary"
                    >
                      <option value="">Без назначения</option>
                      {members.map((member) => (
                        <option key={member.id} value={member.id}>
                          {member.name}
                        </option>
                      ))}
                      <option value="rotate">🔄 Автоматическая ротация</option>
                    </select>
                  </div>
                )}

                {/* Кнопки */}
                <div className="flex gap-3 pt-2">
                  <button
                    type="button"
                    onClick={onClose}
                    className="flex-1 px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                  >
                    Отмена
                  </button>
                  <button type="submit" className="flex-1 btn-primary">
                    {chore ? 'Сохранить' : 'Добавить'}
                  </button>
                </div>
              </form>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
