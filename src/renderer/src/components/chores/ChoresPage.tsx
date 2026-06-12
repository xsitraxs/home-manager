import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAppStore } from '../../store/useAppStore';
import { ChoresList } from './ChoresList';
import { ChoreModal } from './ChoreModal';
import { Leaderboard } from './Leaderboard';
import { FamilyManager } from './FamilyManager';

// Страница планировщика домашних дел
export function ChoresPage() {
  const { loadChores, loadMembers, loadLeaderboard, chores } = useAppStore();
  const [showModal, setShowModal] = useState(false);
  const [editingChore, setEditingChore] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<'chores' | 'leaderboard' | 'family'>('chores');

  // Загрузка данных при монтировании
  useEffect(() => {
    loadMembers();
    loadChores();
    loadLeaderboard();
  }, []);

  // Обработка горячей клавиши Ctrl+N
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.key === 'n') {
        e.preventDefault();
        setEditingChore(null);
        setShowModal(true);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Открытие модального окна для редактирования
  const handleEdit = (chore: any) => {
    setEditingChore(chore);
    setShowModal(true);
  };

  // Статистика на сегодня
  const today = new Date().toISOString().split('T')[0];
  const todayChores = chores.filter((c) => c.next_due <= today);
  const overdueChores = chores.filter((c) => c.next_due < today);

  return (
    <div className="h-full flex flex-col">
      {/* Заголовок и кнопки */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">🧹 Домашние дела</h1>
          <p className="text-gray-500 text-sm mt-1">
            {overdueChores.length > 0 && (
              <span className="text-danger">{overdueChores.length} просрочено</span>
            )}
            {overdueChores.length > 0 && todayChores.length > overdueChores.length && ' • '}
            {todayChores.length} дел на сегодня
          </p>
        </div>
        <div className="flex gap-2">
          {chores.length > 0 && (
            <button
              onClick={() => {
                const rows = [['Название', 'Периодичность (дн)', 'Назначено', 'Следующее выполнение', 'Статус']];
                const statusMap: Record<string, string> = { overdue: 'Просрочено', today: 'Сегодня', future: 'Не скоро' };
                for (const c of chores) {
                  const status = c.next_due < today ? 'overdue' : c.next_due === today ? 'today' : 'future';
                  rows.push([c.title, String(c.frequency_days), c.assigned_name || '—', c.next_due, statusMap[status]]);
                }
                const csv = rows.map(r => r.join(',')).join('\n');
                const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = 'chores.csv';
                a.click();
                URL.revokeObjectURL(url);
              }}
              className="px-4 py-2 rounded-lg bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-sm font-medium transition-colors"
            >
              📥 CSV
            </button>
          )}
          <button
            onClick={() => { setEditingChore(null); setShowModal(true); }}
            className="btn-primary"
          >
            + Добавить дело
          </button>
        </div>
      </div>

      {/* Табы */}
      <div className="flex gap-2 mb-4">
        {[
          { id: 'chores', label: 'Дела' },
          { id: 'leaderboard', label: '🏆 Рейтинг' },
          { id: 'family', label: '👥 Семья' },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              activeTab === tab.id
                ? 'bg-primary text-white'
                : 'bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Содержимое табов */}
      <div className="flex-1 overflow-auto">
        <AnimatePresence mode="wait">
          {activeTab === 'chores' && (
            <motion.div
              key="chores"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
            >
              <ChoresList onEdit={handleEdit} />
            </motion.div>
          )}
          {activeTab === 'leaderboard' && (
            <motion.div
              key="leaderboard"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
            >
              <Leaderboard />
            </motion.div>
          )}
          {activeTab === 'family' && (
            <motion.div
              key="family"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
            >
              <FamilyManager />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Модальное окно добавления/редактирования */}
      <ChoreModal
        isOpen={showModal}
        onClose={() => { setShowModal(false); setEditingChore(null); }}
        chore={editingChore}
      />
    </div>
  );
}
