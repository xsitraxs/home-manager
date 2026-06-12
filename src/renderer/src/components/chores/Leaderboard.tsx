import React from 'react';
import { motion } from 'framer-motion';
import { useAppStore } from '../../store/useAppStore';

// Таблица лидеров — кто сколько дел выполнил за последние 30 дней
export function Leaderboard() {
  const { leaderboard } = useAppStore();

  // Медали для топ-3
  const medals = ['🥇', '🥈', '🥉'];

  if (leaderboard.length === 0) {
    return (
      <div className="text-center py-12 text-gray-500">
        <div className="text-4xl mb-4">🏆</div>
        <p>Пока нет данных. Выполните хотя бы одно дело!</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold">🏆 Рейтинг за последние 30 дней</h2>

      <div className="space-y-3">
        {leaderboard.map((entry, index) => (
          <motion.div
            key={entry.member_name}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.1 }}
            className={`card flex items-center gap-4 ${
              index === 0 ? 'border-2 border-warning/50 bg-warning/5' : ''
            }`}
          >
            {/* Место или медаль */}
            <div className="w-12 h-12 flex items-center justify-center text-2xl">
              {index < 3 ? medals[index] : (
                <span className="text-lg font-bold text-gray-400">{index + 1}</span>
              )}
            </div>

            {/* Имя */}
            <div className="flex-1">
              <div className="font-semibold">{entry.member_name}</div>
              <div className="text-sm text-gray-500">
                {entry.completed_count} дел выполнено
              </div>
            </div>

            {/* Очки */}
            <div className="text-right">
              <div className="text-xl font-bold text-primary">{entry.points}</div>
              <div className="text-xs text-gray-500">очков</div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Пояснение к очкам */}
      <div className="text-xs text-gray-500 text-center mt-4">
        10 очков за каждое выполненное дело
      </div>
    </div>
  );
}
