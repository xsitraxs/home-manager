import { app, BrowserWindow, ipcMain, Notification, Tray, Menu, nativeImage, globalShortcut, session, crashReporter } from 'electron';
import path from 'path';
import { pathToFileURL } from 'url';
import { autoUpdater } from 'electron-updater';
import { DatabaseManager } from './database';
import { TrayManager } from './tray';
import { NotificationManager } from './notifications';
import { validateString, validateNumber, validateInteger, validateId } from '../shared/types';

let mainWindow: BrowserWindow | null = null;
let trayManager: TrayManager | null = null;
let notificationManager: NotificationManager | null = null;
let isQuitting = false;
let cspRegistered = false;
const db = new DatabaseManager();

// Crash reporting — локально в crashDumps
crashReporter.start({
  productName: 'Home Manager',
  submitURL: '',
  uploadToServer: false,
});

// Обработчики необработанных ошибок
process.on('uncaughtException', (err) => {
  console.error('Uncaught exception:', err);
});
process.on('unhandledRejection', (err) => {
  console.error('Unhandled rejection:', err);
});

// ========== ОКНО ==========

function createWindow(): void {
  mainWindow = new BrowserWindow({
    width: 1000,
    height: 700,
    minWidth: 800,
    minHeight: 600,
    title: 'Home Manager',
    icon: path.join(__dirname, '../../resources/icon.png'),
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true,
      preload: path.join(__dirname, 'preload.js'),
      webSecurity: true,
      allowRunningInsecureContent: false,
      spellcheck: false,
    },
    backgroundColor: '#1a1a2e',
  });

  // Content Security Policy — register once even if macOS recreates the window.
  if (!cspRegistered) {
    cspRegistered = true;
    session.defaultSession.webRequest.onHeadersReceived((details, callback) => {
    const isDev = process.env.NODE_ENV === 'development';

    // Dev: разрешаем unsafe-eval (Vite HMR) + localhost (HMR WebSocket)
    // Prod: строгая политика без unsafe-eval
    const csp = isDev
      ? "default-src 'self'; script-src 'self' 'unsafe-eval' 'unsafe-inline'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' data:; connect-src 'self' ws://localhost:* http://localhost:*;"
      : "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' data:; connect-src 'self'; worker-src 'self'; child-src 'self';";

    callback({
      responseHeaders: {
        ...details.responseHeaders,
        'Content-Security-Policy': [csp],
      },
    });
    });
  }

  // Only allow the exact app document as a top-level navigation target.
  const allowedNavigation = process.env.NODE_ENV === 'development'
    ? 'http://localhost:5173/'
    : pathToFileURL(path.resolve(__dirname, '../renderer/index.html')).href;
  mainWindow.webContents.on('will-navigate', (event, url) => {
    if (url !== allowedNavigation) event.preventDefault();
  });

  mainWindow.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));

  // Загружаем приложение
  if (process.env.NODE_ENV === 'development') {
    mainWindow.loadURL('http://localhost:5173');
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'));
  }

  trayManager?.setMainWindow(mainWindow);
  notificationManager?.setMainWindow(mainWindow);

  const closingWindow = mainWindow;
  mainWindow.on('closed', () => {
    if (mainWindow === closingWindow) mainWindow = null;
  });

  mainWindow.on('close', (event) => {
    const settings = db.getSettings();
    // Если включено "сворачивать в трей" — просто скрываем окно
    if (!isQuitting && settings.minimizeToTray === 'true') {
      event.preventDefault();
      mainWindow?.hide();
    }
  });
}

// ========== TRAY / УВЕДОМЛЕНИЯ ==========

function initTray(): void {
  trayManager = new TrayManager(mainWindow!, db, createWindow);
  trayManager.createTray();
}

function initNotifications(): void {
  notificationManager = new NotificationManager(mainWindow!, db, createWindow);
  notificationManager.start();
}

// ========== ГОРЯЧИЕ КЛАВИШИ ==========

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

// ========== IPC ==========

function setupIPC(): void {
  ipcMain.handle('get-members', () => db.getMembers());

  ipcMain.handle('add-member', (_, name: unknown) => {
    return db.addMember(validateString(name, 50));
  });

  ipcMain.handle('delete-member', (_, id: unknown) => {
    return db.deleteMember(validateId(id));
  });

  ipcMain.handle('rename-member', (_, id: unknown, name: unknown) => {
    return db.renameMember(validateId(id), validateString(name, 50));
  });

  ipcMain.handle('get-chores', () => db.getChores());

  ipcMain.handle('add-chore', (_, title: unknown, frequencyDays: unknown, assignedTo: unknown) => {
    return db.addChore(
      validateString(title, 100),
      validateInteger(frequencyDays, 1, 365),
      assignedTo === null ? null : validateId(assignedTo)
    );
  });

  ipcMain.handle('update-chore', (_, id: unknown, title: unknown, frequencyDays: unknown, assignedTo: unknown) => {
    return db.updateChore(
      validateId(id),
      validateString(title, 100),
      validateInteger(frequencyDays, 1, 365),
      assignedTo === null ? null : validateId(assignedTo)
    );
  });

  ipcMain.handle('delete-chore', (_, id: unknown) => {
    return db.deleteChore(validateId(id));
  });

  ipcMain.handle('complete-chore', (_, choreId: unknown, doneBy: unknown) => {
    return db.completeChore(
      validateId(choreId),
      doneBy === null ? null : validateId(doneBy)
    );
  });

  ipcMain.handle('update-chore-order', (_, orders: unknown) => {
    if (!Array.isArray(orders) || orders.length > 1000) throw new Error('Expected an array of at most 1000 items');
    return db.updateChoreOrder(
      orders.map((o: any) => ({
        id: validateId(o.id),
        sort_order: validateInteger(o.sort_order, 0, 10000),
      }))
    );
  });

  ipcMain.handle('get-chore-log', (_, days?: unknown) => {
    return db.getChoreLog(days !== undefined ? validateInteger(days, 1, 365) : 30);
  });

  ipcMain.handle('get-leaderboard', () => db.getLeaderboard());

  ipcMain.handle('add-water', (_, amountMl: unknown, userId?: unknown) => {
    const uid = userId !== undefined ? validateInteger(userId, 0, Number.MAX_SAFE_INTEGER) : 0;
    return db.addWater(validateInteger(amountMl, 1, 5000), uid);
  });

  ipcMain.handle('get-today-water', (_, userId?: unknown) => {
    const uid = userId !== undefined ? validateInteger(userId, 0, Number.MAX_SAFE_INTEGER) : 0;
    return db.getTodayWater(uid);
  });

  ipcMain.handle('get-water-stats', (_, days?: unknown) => {
    return db.getWaterStats(days !== undefined ? validateInteger(days, 1, 365) : 30, 0);
  });

  ipcMain.handle('reset-water-today', () => db.resetWaterToday());

  ipcMain.handle('get-settings', () => db.getSettings());

  const ALLOWED_SETTINGS = new Set([
    'water_goal_ml', 'water_reminder_interval_minutes',
    'water_reminder_start_hour', 'water_reminder_end_hour',
    'theme', 'minimizeToTray', 'autoStart',
  ]);

  ipcMain.handle('set-setting', (_, key: unknown, value: unknown) => {
    const validKey = validateString(key, 50);
    if (!ALLOWED_SETTINGS.has(validKey)) throw new Error(`Setting "${validKey}" not allowed`);
    let safeValue: string;
    switch (validKey) {
      case 'water_goal_ml': safeValue = String(validateInteger(value, 500, 5000)); break;
      case 'water_reminder_interval_minutes': safeValue = String(validateInteger(value, 15, 180)); break;
      case 'water_reminder_start_hour':
      case 'water_reminder_end_hour': safeValue = String(validateInteger(value, 0, 23)); break;
      case 'theme':
        if (value !== 'dark' && value !== 'light') throw new Error('Invalid theme');
        safeValue = value;
        break;
      case 'minimizeToTray':
      case 'autoStart':
        if (value !== 'true' && value !== 'false') throw new Error('Expected boolean string');
        safeValue = value;
        break;
      default: throw new Error(`Setting "${validKey}" not allowed`);
    }
    return db.setSetting(validKey, safeValue);
  });

  ipcMain.handle('update-tray-icon', (_, progress: unknown) => {
    trayManager?.updateIcon(validateNumber(progress, 0, 1));
  });

  // Автозапуск — реальное включение/выключение в ОС
  ipcMain.handle('set-auto-start', (_, enabled: unknown) => {
    if (typeof enabled !== 'boolean') throw new Error('Expected boolean');
    const isEnabled = enabled;
    app.setLoginItemSettings({
      openAtLogin: isEnabled,
      name: 'Home Manager',
    });
    db.setSetting('autoStart', String(isEnabled));
  });

  // Полный выход из приложения (из tray или renderer)
  ipcMain.handle('app-quit', () => {
    app.quit();
  });
}

// ========== ЗАПУСК ==========

// Блокировка второго экземпляра
const gotLock = app.requestSingleInstanceLock();
if (!gotLock) {
  app.quit();
} else {
  app.whenReady().then(() => {
    createWindow();
    setupIPC();
    registerShortcuts();

    if (mainWindow) {
      initTray();
      initNotifications();
    }

    // Проверка обновлений (только в production)
    if (process.env.NODE_ENV !== 'development') {
      autoUpdater.checkForUpdatesAndNotify().catch(() => {});
    }

    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) createWindow();
    });
  });

  app.on('second-instance', () => {
    if (!mainWindow || mainWindow.isDestroyed()) {
      createWindow();
      return;
    }
    if (mainWindow.isMinimized()) mainWindow.restore();
    if (!mainWindow.isVisible()) mainWindow.show();
    mainWindow.focus();
  });

  app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') app.quit();
  });

  app.on('before-quit', () => {
    isQuitting = true;
  });

  app.on('will-quit', () => {
    globalShortcut.unregisterAll();
    notificationManager?.stop();
    db.close();
  });
}
