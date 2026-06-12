import React from 'react';
import { motion } from 'framer-motion';
import { useAppStore } from '../../store/useAppStore';

interface SidebarProps {
  collapsed: boolean;
  onToggle: () => void;
}

// Пункты навигации
const navItems = [
  { id: 'dashboard', label: 'Главная', icon: '🏠' },
  { id: 'chores', label: 'Дела', icon: '🧹' },
  { id: 'water', label: 'Вода', icon: '💧' },
  { id: 'settings', label: 'Настройки', icon: '⚙️' },
] as const;

// Боковая панель навигации
export function Sidebar({ collapsed, onToggle }: SidebarProps) {
  const { currentPage, setCurrentPage, todayWater, waterGoal } = useAppStore();
  const waterProgress = Math.min(1, todayWater / waterGoal);

  return (
    <motion.aside
      initial={false}
      animate={{ width: collapsed ? 64 : 200 }}
      className="h-full bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 flex flex-col"
    >
      {/* Заголовок */}
      <div className="p-4 flex items-center justify-between border-b border-gray-200 dark:border-gray-700">
        {!collapsed && (
          <motion.span
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="font-semibold text-lg"
          >
            Home
          </motion.span>
        )}
        <button
          onClick={onToggle}
          className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
        >
          {collapsed ? '→' : '←'}
        </button>
      </div>

      {/* Навигация */}
      <nav className="flex-1 p-2 space-y-1" aria-label="Навигация">
        {navItems.map((item) => {
          const isActive = currentPage === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setCurrentPage(item.id as any)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 ${
                isActive
                  ? 'bg-primary/10 text-primary font-medium'
                  : 'hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-400'
              }`}
            >
              <span className="text-xl flex-shrink-0">{item.icon}</span>
              {!collapsed && (
                <motion.span
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="whitespace-nowrap"
                >
                  {item.label}
                </motion.span>
              )}
            </button>
          );
        })}
      </nav>

      {/* Мини-виджет воды в сайдбаре */}
      {!collapsed && (
        <div className="p-3 m-2 rounded-lg bg-gray-50 dark:bg-gray-800">
          <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Вода сегодня</div>
          <div className="h-2 bg-gray-200 dark:bg-gray-600 rounded-full overflow-hidden">
            <motion.div
              className="h-full bg-primary rounded-full"
              initial={{ width: 0 }}
              animate={{ width: `${waterProgress * 100}%` }}
              transition={{ duration: 0.5 }}
            />
          </div>
          <div className="text-xs mt-1 text-gray-600 dark:text-gray-300">
            {todayWater} / {waterGoal} мл
          </div>
        </div>
      )}
    </motion.aside>
  );
}
