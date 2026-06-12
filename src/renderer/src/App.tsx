import React, { Suspense, useEffect, useState } from 'react';
import { Sidebar } from './components/ui/Sidebar';
import { useAppStore } from './store/useAppStore';
import { ToastContainer } from './components/ui/Toast';
import { ErrorBoundary } from './components/ui/ErrorBoundary';

// Lazy-loading страниц для code splitting
const Dashboard = React.lazy(() => import('./components/dashboard/Dashboard').then(m => ({ default: m.Dashboard })));
const ChoresPage = React.lazy(() => import('./components/chores/ChoresPage').then(m => ({ default: m.ChoresPage })));
const WaterPage = React.lazy(() => import('./components/water/WaterPage').then(m => ({ default: m.WaterPage })));
const SettingsPage = React.lazy(() => import('./components/settings/SettingsPage').then(m => ({ default: m.SettingsPage })));

// Спиннер загрузки
function LoadingSpinner() {
  return (
    <div className="flex items-center justify-center h-64">
      <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
    </div>
  );
}

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
        case 'refresh-water':
          useAppStore.getState().loadTodayWater();
          break;
      }
    });

    // Обновление UI при добавлении воды через трей
    api.on('water-added', () => {
      useAppStore.getState().loadTodayWater();
    });

    return () => {
      api.removeAllListeners('shortcut');
      api.removeAllListeners('water-added');
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
      <ToastContainer />
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
          <ErrorBoundary>
            <Suspense fallback={<LoadingSpinner />}>
              {renderPage()}
            </Suspense>
          </ErrorBoundary>
        </main>
      </div>
    </div>
  );
}
