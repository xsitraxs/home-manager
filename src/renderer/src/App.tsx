import React, { useEffect, useState } from 'react';
import { Sidebar } from './components/ui/Sidebar';
import { Dashboard } from './components/dashboard/Dashboard';
import { ChoresPage } from './components/chores/ChoresPage';
import { WaterPage } from './components/water/WaterPage';
import { SettingsPage } from './components/settings/SettingsPage';
import { useAppStore } from './store/useAppStore';

// Главный компонент приложения
export default function App() {
  const { currentPage, setCurrentPage, theme } = useAppStore();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  // Применение темы
  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [theme]);

  // Обработка горячих клавиш (через безопасный preload API)
  useEffect(() => {
    const api = (window as any).electronAPI;
    if (!api) return;

    api.on('shortcut', (action: string) => {
      switch (action) {
        case 'add-chore':
          setCurrentPage('chores');
          break;
        case 'add-water':
          useAppStore.getState().setShowAddWaterModal(true);
          break;
        case 'go-chores':
          setCurrentPage('chores');
          break;
        case 'go-water':
          setCurrentPage('water');
          break;
        case 'go-settings':
          setCurrentPage('settings');
          break;
      }
    });

    return () => {
      api.removeAllListeners('shortcut');
    };
  }, [setCurrentPage]);

  // Рендер текущей страницы
  const renderPage = () => {
    switch (currentPage) {
      case 'dashboard':
        return <Dashboard />;
      case 'chores':
        return <ChoresPage />;
      case 'water':
        return <WaterPage />;
      case 'settings':
        return <SettingsPage />;
      default:
        return <Dashboard />;
    }
  };

  return (
    <div className="flex h-screen bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100">
      {/* Боковая панель */}
      <Sidebar
        collapsed={sidebarCollapsed}
        onToggle={() => setSidebarCollapsed(!sidebarCollapsed)}
      />

      {/* Кастомный заголовок окна */}
      <div className="flex-1 flex flex-col">
        <div className="titlebar h-8 bg-transparent" />

        {/* Основной контент */}
        <main className="flex-1 overflow-auto p-6">
          {renderPage()}
        </main>
      </div>
    </div>
  );
}
