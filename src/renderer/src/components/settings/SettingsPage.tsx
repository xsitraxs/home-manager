import React, { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { useAppStore } from '../../store/useAppStore';

// Страница настроек приложения
export function SettingsPage() {
  const { settings, loadSettings, setSetting, theme, setTheme, loadMembers, members, currentPage } = useAppStore();
  const api = (window as any).electronAPI;
  const [waterGoal, setWaterGoal] = useState(2000);
  const [reminderInterval, setReminderInterval] = useState(60);
  const [startHour, setStartHour] = useState(8);
  const [endHour, setEndHour] = useState(22);
  const [minimizeToTray, setMinimizeToTray] = useState(false);
  const [autoStart, setAutoStart] = useState(false);
  const syncedRef = useRef(false);

  useEffect(() => {
    loadSettings();
    loadMembers();
  }, [currentPage]);

  // Синхронизация с хранилищем (только при реальном изменении settings)
  useEffect(() => {
    if (Object.keys(settings).length === 0) return;
    syncedRef.current = true;
    setWaterGoal(parseInt(settings.water_goal_ml || '2000'));
    setReminderInterval(parseInt(settings.water_reminder_interval_minutes || '60'));
    setStartHour(parseInt(settings.water_reminder_start_hour || '8'));
    setEndHour(parseInt(settings.water_reminder_end_hour || '22'));
    setMinimizeToTray(settings.minimizeToTray === 'true');
    setAutoStart(settings.autoStart === 'true');
  }, [settings]);

  // Сохранение только при пользовательских изменениях (не при mount)
  useEffect(() => {
    if (!syncedRef.current) return;
    const timer = setTimeout(() => {
      setSetting('water_goal_ml', String(waterGoal));
      setSetting('water_reminder_interval_minutes', String(reminderInterval));
      setSetting('water_reminder_start_hour', String(startHour));
      setSetting('water_reminder_end_hour', String(endHour));
      setSetting('minimizeToTray', String(minimizeToTray));
      setSetting('autoStart', String(autoStart));
    }, 500);
    return () => clearTimeout(timer);
  }, [waterGoal, reminderInterval, startHour, endHour, minimizeToTray, autoStart]);

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold">⚙️ Настройки</h1>

      {/* Настройки воды */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="card space-y-4"
      >
        <h2 className="text-lg font-semibold flex items-center gap-2">
          💧 Трекер воды
        </h2>

        {/* Дневная норма */}
        <div>
          <label className="block text-sm font-medium mb-2">
            Дневная норма: {waterGoal} мл
          </label>
          <input
            type="range"
            min="500"
            max="5000"
            step="100"
            value={waterGoal}
            onChange={(e) => setWaterGoal(Number(e.target.value))}
            className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer accent-primary"
          />
          <div className="flex justify-between text-xs text-gray-500 mt-1">
            <span>500 мл</span>
            <span>5000 мл</span>
          </div>
        </div>

        {/* Интервал напоминаний */}
        <div>
          <label className="block text-sm font-medium mb-2">
            Интервал напоминаний: {reminderInterval} мин
          </label>
          <input
            type="range"
            min="15"
            max="180"
            step="15"
            value={reminderInterval}
            onChange={(e) => setReminderInterval(Number(e.target.value))}
            className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer accent-primary"
          />
          <div className="flex justify-between text-xs text-gray-500 mt-1">
            <span>15 мин</span>
            <span>3 часа</span>
          </div>
        </div>

        {/* Время напоминаний */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-2">Начало</label>
            <select
              value={startHour}
              onChange={(e) => setStartHour(Number(e.target.value))}
              className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700"
            >
              {Array.from({ length: 24 }, (_, i) => (
                <option key={i} value={i}>
                  {String(i).padStart(2, '0')}:00
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">Конец</label>
            <select
              value={endHour}
              onChange={(e) => setEndHour(Number(e.target.value))}
              className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700"
            >
              {Array.from({ length: 24 }, (_, i) => (
                <option key={i} value={i}>
                  {String(i).padStart(2, '0')}:00
                </option>
              ))}
            </select>
          </div>
        </div>
      </motion.div>

      {/* Настройки приложения */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="card space-y-4"
      >
        <h2 className="text-lg font-semibold flex items-center gap-2">
          🎨 Интерфейс
        </h2>

        {/* Переключение темы */}
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium">Тёмная тема</span>
          <button
            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
            role="switch"
            aria-checked={theme === 'dark'}
            aria-label="Тёмная тема"
            className={`relative w-12 h-6 rounded-full transition-colors ${
              theme === 'dark' ? 'bg-primary' : 'bg-gray-300'
            }`}
          >
            <motion.div
              className="absolute top-1 w-4 h-4 bg-white rounded-full"
              animate={{ left: theme === 'dark' ? 28 : 4 }}
              transition={{ type: 'spring', stiffness: 500, damping: 30 }}
            />
          </button>
        </div>
      </motion.div>

      {/* Системные настройки */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="card space-y-4"
      >
        <h2 className="text-lg font-semibold flex items-center gap-2">
          🔧 Системные
        </h2>

        {/* Сворачивание в трей */}
        <div className="flex items-center justify-between">
          <div>
            <span className="text-sm font-medium">Сворачивать в трей</span>
            <p className="text-xs text-gray-500">При закрытии окна приложение не завершается</p>
          </div>
          <button
            onClick={() => setMinimizeToTray(!minimizeToTray)}
            role="switch"
            aria-checked={minimizeToTray}
            aria-label="Сворачивать в трей"
            className={`relative w-12 h-6 rounded-full transition-colors ${
              minimizeToTray ? 'bg-primary' : 'bg-gray-300'
            }`}
          >
            <motion.div
              className="absolute top-1 w-4 h-4 bg-white rounded-full"
              animate={{ left: minimizeToTray ? 28 : 4 }}
              transition={{ type: 'spring', stiffness: 500, damping: 30 }}
            />
          </button>
        </div>

        {/* Автозапуск */}
        <div className="flex items-center justify-between">
          <div>
            <span className="text-sm font-medium">Автозапуск</span>
            <p className="text-xs text-gray-500">Запускать при входе в систему</p>
          </div>
          <button
            onClick={() => {
              const newVal = !autoStart;
              setAutoStart(newVal);
              api?.invoke('set-auto-start', newVal);
            }}
            role="switch"
            aria-checked={autoStart}
            aria-label="Автозапуск"
            className={`relative w-12 h-6 rounded-full transition-colors ${
              autoStart ? 'bg-primary' : 'bg-gray-300'
            }`}
          >
            <motion.div
              className="absolute top-1 w-4 h-4 bg-white rounded-full"
              animate={{ left: autoStart ? 28 : 4 }}
              transition={{ type: 'spring', stiffness: 500, damping: 30 }}
            />
          </button>
        </div>
      </motion.div>

      {/* Управление семьёй */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="card"
      >
        <h2 className="text-lg font-semibold flex items-center gap-2 mb-4">
          👥 Члены семьи
        </h2>
        <p className="text-sm text-gray-500 mb-4">
          Управление членами семьи доступно на вкладке "Дела" → "Семья"
        </p>
        <div className="flex flex-wrap gap-2">
          {members.map((member) => (
            <span
              key={member.id}
              className="px-3 py-1 rounded-full bg-primary/10 text-primary text-sm font-medium"
            >
              {member.name}
            </span>
          ))}
          {members.length === 0 && (
            <span className="text-gray-500 text-sm">Пока нет членов семьи</span>
          )}
        </div>
      </motion.div>
    </div>
  );
}
