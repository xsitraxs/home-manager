# Home Manager

Десктопное приложение для управления домашними делами и трекинга воды. Построено на Electron + React + TypeScript.

## Возможности

### Планировщик домашних дел

- Добавление дел с названием и периодичностью
- Цветовые индикаторы статуса: 🔴 просрочено, 🟡 сегодня, 🟢 не скоро
- Автоматический пересчёт следующей даты после выполнения
- Drag & Drop для изменения порядка
- Автоматическая ротация назначений в семье
- Рейтинг/лидерборд за 30 дней с медалями 🥇🥈🥉
- Очки и streak за выполненные дела

### Трекер воды

- Круговой прогресс-бар с анимацией
- Быстрые кнопки: 150, 250, 350, 500 мл
- Произвольный объём через модальное окно
- Конфетти при достижении дневной нормы
- Системные уведомления (каждый час, 8:00–22:00)
- Статистика: сегодня, неделя (bar chart), месяц

### Общее

- Боковая панель с навигацией (сворачиваемая)
- Тёмная и светлая тема
- Системный трей с контекстным меню
- Горячие клавиши (Ctrl+N, Ctrl+W, Ctrl+D, Ctrl+Shift+D, Ctrl+,)

## Стек

| Технология | Назначение |
|------------|-----------|
| Electron 35 | Десктопный фреймворк |
| React 18 + TypeScript | UI |
| Tailwind CSS | Стили |
| Zustand | Стейт-менеджмент |
| better-sqlite3 | Локальная БД |
| framer-motion | Анимации |
| recharts | Графики |

## Установка и запуск

```bash
# Клонировать
git clone https://github.com/xsitraxs/home-manager.git
cd home-manager

# Установить зависимости
npm install

# Пересобрать native-модули под Electron
npx @electron/rebuild -f -w better-sqlite3

# Запустить dev-режим (два терминала)

# Терминал 1: Vite dev-сервер
npx vite --host

# Терминал 2: Electron
npx electron .
```

Или одним скриптом:

```bash
npm run dev
```

## Сборка

```bash
npm run build
npm run package
```

Результат: `.exe` (Windows), `.dmg` (macOS), `.AppImage` (Linux) в папке `release/`.

## Структура проекта

```
home-manager/
├── src/
│   ├── main/                    # Electron main process
│   │   ├── main.ts              # Точка входа, IPC, окна
│   │   ├── preload.ts           # Безопасный бридж (contextBridge)
│   │   ├── database.ts          # SQLite (better-sqlite3)
│   │   ├── tray.ts              # Системный трей
│   │   └── notifications.ts     # Напоминания о воде
│   └── renderer/                # React приложение
│       └── src/
│           ├── App.tsx           # Корневой компонент
│           ├── store/            # Zustand store
│           ├── components/
│           │   ├── dashboard/    # Главный дашборд
│           │   ├── chores/       # Планировщик дел
│           │   ├── water/        # Трекер воды
│           │   ├── settings/     # Настройки
│           │   └── ui/           # Sidebar
│           └── styles/
├── package.json
├── tsconfig.json
├── tsconfig.main.json
├── vite.config.ts
└── tailwind.config.js
```

## Горячие клавиши

| Комбинация | Действие |
|-----------|----------|
| Ctrl+N | Добавить новое дело |
| Ctrl+W | Быстро +250 мл воды |
| Ctrl+D | Переключиться на "Дела" |
| Ctrl+Shift+D | Переключиться на "Вода" |
| Ctrl+, | Открыть настройки |

## Структура БД

```sql
members     (id, name, created_at)
chores      (id, title, frequency_days, assigned_to, last_done, next_due, sort_order)
chore_log   (id, chore_id, done_by, done_at)
water_log   (id, user_id, amount_ml, logged_at)
settings    (key, value)
```

## Лицензия

MIT
