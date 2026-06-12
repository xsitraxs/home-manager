import { app, BrowserWindow, ipcMain, Notification, Tray, Menu, nativeImage, globalShortcut, session } from 'electron';
import path from 'path';
import { DatabaseManager } from './database';
import { TrayManager } from './tray';
import { NotificationManager } from './notifications';

// НЕ отключаем предупреждения безопасности!

let mainWindow: BrowserWindow | null = null;
let trayManager: TrayManager | null = null;
let notificationManager: NotificationManager | null = null;
const db = new DatabaseManager();

// ========== ВАЛИДАЦИЯ ВХОДНЫХ ДАННЫХ ==========

// Валидация строки (имя, название дела)
function validateString(value: unknown, maxLength: number = 100): string {
  if (typeof value !== 'string') throw new Error('Expected string');
  const trimmed = value.trim();
  if (trimmed.length === 0) throw new Error('String cannot be empty');
  if (trimmed.length > maxLength) throw new Error(`String exceeds ${maxLength} chars`);
  return trimmed;
}

// Валидация числа
function validateNumber(value: unknown, min: number, max: number): number {
  const num = Number(value);
  if (!Number.isFinite(num)) throw new Error('Expected finite number');
  if (num < min || num > max) throw new Error(`Number must be between ${min} and ${max}`);
  return num;
}

// Валидация ID (целое положительное число)
function validateId(value: unknown): number {
  return validateNumber(value, 1, Number.MAX_SAFE_INTEGER);
}

// Создание главного окна приложения
function createWindow(): void {
  mainWindow = new BrowserWindow({
    width: 1000,
    height: 700,
    minWidth: 800,
    minHeight: 600,
    title: 'Home Manager',
    icon: path.join(__dirname, '../../resources/icon.png'),
    webPreferences: {
      nodeIntegration: false,        // ВЫКЛЮЧЕНО — критично для безопасности
      contextIsolation: true,        // ВКЛЮЧЕНО — изолирует renderer от Node
      sandbox: true,                 // ВКЛЮЧЕНО — ограничивает системные вызовы
      preload: path.join(__dirname, 'preload.js'),
      webSecurity: true,             // ВКЛЮЧЕНО — запрещает cross-origin запросы
      allowRunningInsecureContent: false,
      spellcheck: false,
    },
    titleBarStyle: 'hiddenInset',
    backgroundColor: '#1a1a2e',
  });

  // Настраиваем Content Security Policy
  session.defaultSession.webRequest.onHeadersReceived((details, callback) => {
    callback({
      responseHeaders: {
        ...details.responseHeaders,
        'Content-Security-Policy': [
          "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' data:; connect-src 'self';"
        ],
      },
    });
  });

  // Ограничиваем навигацию — запрещаем переход на внешние сайты
  mainWindow.webContents.on('will-navigate', (event, url) => {
    const parsedUrl = new URL(url);
    // Разрешаем только localhost в dev и file:// в prod
    if (process.env.NODE_ENV === 'development') {
      if (parsedUrl.hostname !== 'localhost') {
        event.preventDefault();
      }
    } else {
      if (parsedUrl.protocol !== 'file:') {
        event.preventDefault();
      }
    }
  });

  // Запрещаем открытие новых окон/ссылок
  mainWindow.webContents.setWindowOpenHandler(() => {
    return { action: 'deny' };
  });

  // Загружаем приложение
  if (process.env.NODE_ENV === 'development') {
    mainWindow.loadURL('http://localhost:5173');
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'));
  }

  // Обработка закрытия окна
  mainWindow.on('close', (event) => {
    const settings = db.getSettings();
    if (settings.minimizeToTray === 'true') {
      event.preventDefault();
      mainWindow?.hide();
    }
  });
}

// Инициализация трея
function initTray(): void {
  trayManager = new TrayManager(mainWindow!, db);
  trayManager.createTray();
}

// Инициализация уведомлений
function initNotifications(): void {
  notificationManager = new NotificationManager(mainWindow!, db);
  notificationManager.start();
}

// Регистрация горячих клавиш
function registerShortcuts(): void {
  globalShortcut.register('CommandOrControl+N', () => {
    mainWindow?.webContents.send('shortcut', 'add-chore');
  });
  globalShortcut.register('CommandOrControl+W', () => {
    mainWindow?.webContents.send('shortcut', 'add-water');
  });
  globalShortcut.register('CommandOrControl+D', () => {
    mainWindow?.webContents.send('shortcut', 'go-chores');
  });
  globalShortcut.register('CommandOrControl+Shift+D', () => {
    mainWindow?.webContents.send('shortcut', 'go-water');
  });
  globalShortcut.register('CommandOrControl+,', () => {
    mainWindow?.webContents.send('shortcut', 'go-settings');
  });
}

// IPC обработчики с валидацией входных данных
function setupIPC(): void {
  // === Члены семьи ===
  ipcMain.handle('get-members', () => db.getMembers());

  ipcMain.handle('add-member', (_, name: unknown) => {
    const validName = validateString(name, 50);
    return db.addMember(validName);
  });

  ipcMain.handle('delete-member', (_, id: unknown) => {
    const validId = validateId(id);
    return db.deleteMember(validId);
  });

  ipcMain.handle('rename-member', (_, id: unknown, name: unknown) => {
    const validId = validateId(id);
    const validName = validateString(name, 50);
    return db.renameMember(validId, validName);
  });

  // === Домашние дела ===
  ipcMain.handle('get-chores', () => db.getChores());

  ipcMain.handle('add-chore', (_, title: unknown, frequencyDays: unknown, assignedTo: unknown) => {
    const validTitle = validateString(title, 100);
    const validFreq = validateNumber(frequencyDays, 1, 365);
    const validAssigned = assignedTo === null ? null : validateId(assignedTo);
    return db.addChore(validTitle, validFreq, validAssigned);
  });

  ipcMain.handle('update-chore', (_, id: unknown, title: unknown, frequencyDays: unknown, assignedTo: unknown) => {
    const validId = validateId(id);
    const validTitle = validateString(title, 100);
    const validFreq = validateNumber(frequencyDays, 1, 365);
    const validAssigned = assignedTo === null ? null : validateId(assignedTo);
    return db.updateChore(validId, validTitle, validFreq, validAssigned);
  });

  ipcMain.handle('delete-chore', (_, id: unknown) => {
    const validId = validateId(id);
    return db.deleteChore(validId);
  });

  ipcMain.handle('complete-chore', (_, choreId: unknown, doneBy: unknown) => {
    const validChoreId = validateId(choreId);
    const validDoneBy = doneBy === null ? null : validateId(doneBy);
    return db.completeChore(validChoreId, validDoneBy);
  });

  ipcMain.handle('update-chore-order', (_, orders: unknown) => {
    if (!Array.isArray(orders)) throw new Error('Expected array');
    const validOrders = orders.map((o: any) => ({
      id: validateId(o.id),
      sort_order: validateNumber(o.sort_order, 0, 10000),
    }));
    return db.updateChoreOrder(validOrders);
  });

  ipcMain.handle('get-chore-log', (_, days?: unknown) => {
    const validDays = days !== undefined ? validateNumber(days, 1, 365) : 30;
    return db.getChoreLog(validDays);
  });

  ipcMain.handle('get-leaderboard', () => db.getLeaderboard());

  // === Трекер воды ===
  ipcMain.handle('add-water', (_, amountMl: unknown) => {
    const validAmount = validateNumber(amountMl, 1, 5000);
    return db.addWater(validAmount);
  });

  ipcMain.handle('get-today-water', () => db.getTodayWater());

  ipcMain.handle('get-water-stats', (_, days?: unknown) => {
    const validDays = days !== undefined ? validateNumber(days, 1, 365) : 30;
    return db.getWaterStats(validDays);
  });

  ipcMain.handle('reset-water-today', () => db.resetWaterToday());

  // === Настройки ===
  ipcMain.handle('get-settings', () => db.getSettings());

  // Ограниченный список разрешённых ключей настроек
  const ALLOWED_SETTINGS = new Set([
    'water_goal_ml', 'water_reminder_interval_minutes',
    'water_reminder_start_hour', 'water_reminder_end_hour',
    'theme', 'minimizeToTray', 'autoStart',
  ]);

  ipcMain.handle('set-setting', (_, key: unknown, value: unknown) => {
    const validKey = validateString(key, 50);
    if (!ALLOWED_SETTINGS.has(validKey)) throw new Error(`Setting "${validKey}" not allowed`);
    const validValue = validateString(value, 200);
    return db.setSetting(validKey, validValue);
  });

  // === Трей ===
  ipcMain.handle('update-tray-icon', (_, progress: unknown) => {
    const validProgress = validateNumber(progress, 0, 1);
    trayManager?.updateIcon(validProgress);
  });
}

// Когда Electron готов к запуску
app.whenReady().then(() => {
  createWindow();
  setupIPC();
  registerShortcuts();

  if (mainWindow) {
    initTray();
    initNotifications();
  }

  // На macOS пересоздаём окно при клике на иконку в доке
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

// Выход из приложения
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// Очистка при выходе
app.on('will-quit', () => {
  globalShortcut.unregisterAll();
  notificationManager?.stop();
});
