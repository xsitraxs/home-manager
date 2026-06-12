import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAppStore } from '../../store/useAppStore';
import { WaterStats } from './WaterStats';
import { AddWaterModal } from './AddWaterModal';

// Страница трекера воды
export function WaterPage() {
  const {
    todayWater,
    waterGoal,
    loadTodayWater,
    addWater,
    showAddWaterModal,
    setShowAddWaterModal,
  } = useAppStore();

  const [showConfetti, setShowConfetti] = useState(false);
  const [showCongrats, setShowCongrats] = useState(false);
  const [justCompleted, setJustCompleted] = useState(false);

  const waterProgress = Math.min(1, todayWater / waterGoal);
  const remaining = Math.max(0, waterGoal - todayWater);

  // Загрузка данных при монтировании
  useEffect(() => {
    loadTodayWater();
  }, []);

  // Быстрые кнопки для добавления воды
  const quickAmounts = [
    { ml: 150, icon: '🥤', label: 'Стакан' },
    { ml: 250, icon: '🥛', label: 'Большой стакан' },
    { ml: 350, icon: '☕', label: 'Кружка' },
    { ml: 500, icon: '🍶', label: 'Бутылка' },
  ];

  // Обработка горячей клавиши Ctrl+W
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.key === 'w') {
        e.preventDefault();
        handleAddWater(250);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [todayWater, waterGoal]);

  // Добавление воды с проверкой на достижение нормы
  const handleAddWater = async (ml: number) => {
    const prevWater = todayWater;
    await addWater(ml);

    // Проверяем, достигнута ли норма
    if (prevWater < waterGoal && prevWater + ml >= waterGoal) {
      setShowConfetti(true);
      setShowCongrats(true);
      setTimeout(() => {
        setShowConfetti(false);
        setShowCongrats(false);
      }, 5000);
    }
  };

  return (
    <div className="h-full flex flex-col items-center justify-center relative">
      {/* Конфетти */}
      <AnimatePresence>
        {showConfetti && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 pointer-events-none z-10"
          >
            {Array.from({ length: 50 }).map((_, i) => (
              <motion.div
                key={i}
                initial={{
                  x: '50%',
                  y: '50%',
                  scale: 0,
                }}
                animate={{
                  x: `${Math.random() * 100}%`,
                  y: `${Math.random() * 100}%`,
                  scale: [0, 1, 0],
                  rotate: Math.random() * 360,
                }}
                transition={{
                  duration: 2,
                  delay: Math.random() * 0.5,
                }}
                className="absolute text-2xl"
              >
                {['🎉', '🎊', '✨', '💧', '🏆'][Math.floor(Math.random() * 5)]}
              </motion.div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Поздравление */}
      <AnimatePresence>
        {showCongrats && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="absolute top-10 z-20 bg-success text-white px-6 py-3 rounded-xl shadow-lg text-lg font-semibold"
          >
            🎉 Поздравляем! Вы выполнили дневную норму воды!
          </motion.div>
        )}
      </AnimatePresence>

      {/* Круговой прогресс-бар */}
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="relative w-64 h-64 mb-8"
      >
        <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
          {/* Фоновый круг */}
          <circle
            cx="50"
            cy="50"
            r="40"
            fill="none"
            stroke="currentColor"
            strokeWidth="8"
            className="circle-bg"
          />
          {/* Прогресс */}
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
            transition={{ duration: 0.8, ease: 'easeOut' }}
          />
          {/* Анимированная капля на конце прогресса */}
          {waterProgress > 0 && (
            <motion.circle
              cx={50 + 40 * Math.cos(2 * Math.PI * waterProgress - Math.PI / 2)}
              cy={50 + 40 * Math.sin(2 * Math.PI * waterProgress - Math.PI / 2)}
              r="3"
              fill="currentColor"
              className="text-primary"
              initial={{ scale: 0 }}
              animate={{ scale: [1, 1.2, 1] }}
              transition={{ duration: 1, repeat: Infinity }}
            />
          )}
        </svg>
        {/* Текст в центре */}
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <motion.span
            key={todayWater}
            initial={{ scale: 1.2 }}
            animate={{ scale: 1 }}
            className="text-4xl font-bold"
          >
            {todayWater}
          </motion.span>
          <span className="text-gray-500 text-sm">из {waterGoal} мл</span>
          <span className="text-primary text-sm font-medium mt-1">
            {Math.round(waterProgress * 100)}%
          </span>
        </div>
      </motion.div>

      {/* Быстрые кнопки */}
      <div className="grid grid-cols-4 gap-3 mb-6">
        {quickAmounts.map(({ ml, icon, label }) => (
          <motion.button
            key={ml}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => handleAddWater(ml)}
            className="flex flex-col items-center gap-1 p-4 rounded-xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 hover:border-primary transition-colors"
          >
            <span className="text-2xl">{icon}</span>
            <span className="text-sm font-medium">{ml} мл</span>
            <span className="text-xs text-gray-500">{label}</span>
          </motion.button>
        ))}
      </div>

      {/* Кнопка "свой объём" */}
      <motion.button
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        onClick={() => setShowAddWaterModal(true)}
        className="px-6 py-3 rounded-xl border-2 border-dashed border-gray-300 dark:border-gray-600 hover:border-primary text-gray-600 dark:text-gray-400 hover:text-primary transition-colors"
      >
        + Свой объём
      </motion.button>

      {/* Статистика */}
      <div className="w-full max-w-md mt-8">
        <WaterStats />
      </div>

      {/* Модальное окно для ввода своего объёма */}
      <AddWaterModal />
    </div>
  );
}
