import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { useAppStore } from '../../store/useAppStore';

// Статистика потребления воды
export function WaterStats() {
  const { loadWaterStats, waterStats, waterGoal } = useAppStore();
  const [activeTab, setActiveTab] = useState<'today' | 'week' | 'month'>('today');

  useEffect(() => {
    loadWaterStats(activeTab === 'today' ? 1 : activeTab === 'week' ? 7 : 30);
  }, [activeTab]);

  // Форматирование даты для графика
  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' });
  };

  // Данные для графика недели
  const weekData = waterStats?.daily.map((d) => ({
    date: formatDate(d.date),
    amount: d.total_ml,
    goal: waterGoal,
  })) || [];

  return (
    <div className="space-y-4">
      {/* Табы статистики */}
      <div className="flex gap-2 justify-center">
        {[
          { id: 'today', label: 'Сегодня' },
          { id: 'week', label: 'Неделя' },
          { id: 'month', label: 'Месяц' },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              activeTab === tab.id
                ? 'bg-primary text-white'
                : 'bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Содержимое */}
      <motion.div
        key={activeTab}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="card"
      >
        {activeTab === 'today' && (
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-gray-500">Выпито</span>
              <span className="font-semibold">{waterStats?.total_ml || 0} мл</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Осталось</span>
              <span className="font-semibold">
                {Math.max(0, waterGoal - (waterStats?.total_ml || 0))} мл
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Норма</span>
              <span className="font-semibold">{waterGoal} мл</span>
            </div>
          </div>
        )}

        {activeTab === 'week' && (
          <div>
            <div className="text-center mb-4">
              <span className="text-sm text-gray-500">
                Среднее: {waterStats?.avg_ml || 0} мл/день
              </span>
            </div>
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={weekData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                  <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip />
                  <Bar dataKey="amount" fill="#4A90D9" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {activeTab === 'month' && (
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-gray-500">Среднее потребление</span>
              <span className="font-semibold">{waterStats?.avg_ml || 0} мл</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Дней с выполнением нормы</span>
              <span className="font-semibold text-success">
                {waterStats?.goal_met_days || 0} из {waterStats?.days_count || 0}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Всего выпито за месяц</span>
              <span className="font-semibold">{waterStats?.total_ml || 0} мл</span>
            </div>
            {/* График за месяц */}
            <div className="h-48 mt-4">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={weekData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                  <XAxis dataKey="date" tick={{ fontSize: 10 }} />
                  <YAxis tick={{ fontSize: 10 }} />
                  <Tooltip />
                  <Bar dataKey="amount" fill="#4CAF50" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}
      </motion.div>
    </div>
  );
}
