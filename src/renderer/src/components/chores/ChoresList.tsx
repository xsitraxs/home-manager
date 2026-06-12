import React, { useState } from 'react';
import { motion, AnimatePresence, Reorder } from 'framer-motion';
import { useAppStore } from '../../store/useAppStore';
import { ConfirmDialog } from '../ui/ConfirmDialog';
import type { Chore } from '../../../../shared/types';

interface ChoresListProps {
  onEdit: (chore: any) => void;
}

// Список домашних дел с Drag & Drop
export function ChoresList({ onEdit }: ChoresListProps) {
  const { chores, completeChore, deleteChore, updateChoreOrder } = useAppStore();
  const [completingId, setCompletingId] = useState<number | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const today = new Date().toISOString().split('T')[0];

  const getStatus = (nextDue: string) => {
    if (nextDue < today) return 'overdue';
    if (nextDue === today) return 'today';
    return 'future';
  };

  const statusStyles = {
    overdue: { bg: 'bg-danger/10', border: 'border-danger/30', dot: 'bg-danger', label: 'Просрочено' },
    today: { bg: 'bg-warning/10', border: 'border-warning/30', dot: 'bg-warning', label: 'Сегодня' },
    future: { bg: 'bg-success/10', border: 'border-success/30', dot: 'bg-success', label: 'Не скоро' },
  };

  const handleComplete = async (choreId: number) => {
    setCompletingId(choreId);
    await completeChore(choreId, null);
    setCompletingId(null);
  };

  // Drag & Drop: сортируем ТОЛЬКО по sort_order (user-controlled)
  const handleReorder = (newOrder: Chore[]) => {
    const orders = newOrder.map((chore, index) => ({
      id: chore.id,
      sort_order: index,
    }));
    updateChoreOrder(orders);
  };

  if (chores.length === 0) {
    return (
      <div className="text-center py-12 text-gray-500">
        <div className="text-4xl mb-4">📋</div>
        <p>Пока нет дел. Нажмите "+ Добавить дело" чтобы начать!</p>
      </div>
    );
  }

  return (
    <>
      <Reorder.Group axis="y" values={chores} onReorder={handleReorder}>
        <div className="space-y-3">
          <AnimatePresence>
            {chores.map((chore) => {
              const status = getStatus(chore.next_due);
              const styles = statusStyles[status];
              const isCompleting = completingId === chore.id;

              return (
                <Reorder.Item key={chore.id} value={chore}>
                  <motion.div
                    layout
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, x: -100 }}
                    className={`card flex items-center gap-4 ${styles.bg} ${styles.border} border`}
                  >
                    {/* Цветовой индикатор */}
                    <div className={`w-3 h-3 rounded-full ${styles.dot} flex-shrink-0`} />

                    {/* Информация о деле */}
                    <div className="flex-1 min-w-0">
                      <div className="font-medium truncate">{chore.title}</div>
                      <div className="text-xs text-gray-500 flex items-center gap-2">
                        <span>Каждые {chore.frequency_days} дн.</span>
                        {chore.assigned_name && <span>• {chore.assigned_name}</span>}
                        <span className={status === 'overdue' ? 'text-danger' : status === 'today' ? 'text-warning' : 'text-success'}>
                          {styles.label}
                        </span>
                      </div>
                    </div>

                    {/* Кнопка выполнения */}
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => handleComplete(chore.id)}
                      disabled={isCompleting}
                      className="p-2 rounded-lg bg-success/20 text-success hover:bg-success/30 transition-colors disabled:opacity-50"
                    >
                      {isCompleting ? '⏳' : '✓'}
                    </motion.button>

                    {/* Кнопка редактирования */}
                    <button
                      onClick={() => onEdit(chore)}
                      className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                    >
                      ✏️
                    </button>

                    {/* Кнопка удаления */}
                    <button
                      onClick={() => setDeletingId(chore.id)}
                      className="p-2 rounded-lg hover:bg-danger/20 text-danger transition-colors"
                    >
                      🗑️
                    </button>
                  </motion.div>
                </Reorder.Item>
              );
            })}
          </AnimatePresence>
        </div>
      </Reorder.Group>

      {/* Диалог подтверждения удаления */}
      <ConfirmDialog
        isOpen={deletingId !== null}
        title="Удалить дело?"
        message="Это действие нельзя отменить."
        onConfirm={() => {
          if (deletingId !== null) deleteChore(deletingId);
          setDeletingId(null);
        }}
        onCancel={() => setDeletingId(null)}
      />
    </>
  );
}
