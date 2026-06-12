import React, { useEffect } from 'react';
import { motion } from 'framer-motion';
import { useAppStore } from '../../store/useAppStore';

// Главный экран — компактный обзор обоих модулей
export function Dashboard() {
  const {
    todayWater,
    waterGoal,
    chores,
    loadTodayWater,
    loadChores,
    loadLeaderboard,
    setCurrentPage,
  } = useAppStore();

  useEffect(() => {
    loadTodayWater();
    loadChores();
    loadLeaderboard();
  }, []);

  const waterProgress = Math.min(1, todayWater / waterGoal);
  const today = new Date().toISOString().split('T')[0];

  // Дела на сегодня (просроченные + на сегодня)
  const todayChores = chores.filter((chore) => {
    return chore.next_due <= today;
  });

  // Вычисляем статус дела
  const getChoreStatus = (nextDue: string) => {
    if (nextDue < today) return 'overdue';
    if (nextDue === today) return 'today';
    return 'future';
  };

  const statusColors = {
    overdue: 'bg-danger',
    today: 'bg-warning',
    future: 'bg-success',
  };

  return (
    <div className="space-y-6">
      {/* Приветствие */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-2xl font-bold"
      >
        Добро пожаловать! 👋
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Мини-виджет воды */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.1 }}
          className="card cursor-pointer hover:shadow-md transition-shadow"
          onClick={() => setCurrentPage('water')}
        >
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold flex items-center gap-2">
              💧 Вода сегодня
            </h2>
            <span className="text-sm text-gray-500">{Math.round(waterProgress * 100)}%</span>
          </div>

          {/* Круговой прогресс */}
          <div className="flex justify-center py-4">
            <div className="relative w-32 h-32">
              <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                <circle
                  cx="50"
                  cy="50"
                  r="40"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="8"
                  className="circle-bg"
                />
                <motion.circle
                  cx="50"
                  cy="50"
                  r="40"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="8"
                  strokeLinecap="round"
                  strokeDasharray={`${2 * Math.PI * 40}`}
                  initial={{ strokeDashoffset: 2 * Math.PI * 40 }}
                  animate={{
                    strokeDashoffset: 2 * Math.PI * 40 * (1 - waterProgress),
                  }}
                  className="text-primary"
                  transition={{ duration: 1 }}
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-2xl font-bold">{todayWater}</span>
                <span className="text-xs text-gray-500">из {waterGoal} мл</span>
              </div>
            </div>
          </div>

          <div className="text-center text-sm text-gray-500">
            Нажмите чтобы открыть трекер воды
          </div>
        </motion.div>

        {/* Мини-виджет дел на сегодня */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.2 }}
          className="card cursor-pointer hover:shadow-md transition-shadow"
          onClick={() => setCurrentPage('chores')}
        >
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold flex items-center gap-2">
              🧹 Дела на сегодня
            </h2>
            <span className="text-sm text-gray-500">
              {todayChores.length} {todayChores.length === 1 ? 'дело' : 'дел'}
            </span>
          </div>

          {/* Список дел */}
          <div className="space-y-2 max-h-48 overflow-auto">
            {todayChores.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                На сегодня дел нет! 🎉
              </div>
            ) : (
              todayChores.slice(0, 5).map((chore) => (
                <div
                  key={chore.id}
                  className="flex items-center gap-3 p-2 rounded-lg bg-gray-50 dark:bg-gray-800"
                >
                  <div
                    className={`w-3 h-3 rounded-full ${
                      statusColors[getChoreStatus(chore.next_due)]
                    }`}
                  />
                  <span className="flex-1 truncate">{chore.title}</span>
                  {chore.assigned_name && (
                    <span className="text-xs text-gray-500">
                      {chore.assigned_name}
                    </span>
                  )}
                </div>
              ))
            )}
            {todayChores.length > 5 && (
              <div className="text-center text-sm text-primary">
                +{todayChores.length - 5} дел
              </div>
            )}
          </div>

          <div className="text-center text-sm text-gray-500 mt-2">
            Нажмите чтобы открыть планировщик
          </div>
        </motion.div>
      </div>
    </div>
  );
}
