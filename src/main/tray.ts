import { Tray, Menu, BrowserWindow, nativeImage } from 'electron';
import path from 'path';
import { DatabaseManager } from './database';

// Менеджер системного трея
export class TrayManager {
  private tray: Tray | null = null;
  private mainWindow: BrowserWindow;
  private db: DatabaseManager;

  constructor(mainWindow: BrowserWindow, db: DatabaseManager) {
    this.mainWindow = mainWindow;
    this.db = db;
  }

  // Создание иконки в трее
  createTray(): void {
    // Создаём простую иконку (в реальном приложении — файлы иконок)
    const icon = nativeImage.createEmpty();
    this.tray = new Tray(icon);
    this.tray.setToolTip('Home Manager');
    this.updateTrayMenu();

    // Клик по трею — показать окно
    this.tray.on('click', () => {
      if (this.mainWindow.isVisible()) {
        this.mainWindow.hide();
      } else {
        this.mainWindow.show();
        this.mainWindow.focus();
      }
    });
  }

  // Обновление контекстного меню трея
  updateTrayMenu(): void {
    if (!this.tray) return;

    const contextMenu = Menu.buildFromTemplate([
      {
        label: 'Открыть',
        click: () => {
          this.mainWindow.show();
          this.mainWindow.focus();
        },
      },
      { type: 'separator' },
      {
        label: 'Быстро: +250мл воды',
        click: () => {
          this.db.addWater(250);
          this.mainWindow.webContents.send('water-added', 250);
          this.mainWindow.webContents.send('shortcut', 'refresh-water');
        },
      },
      { type: 'separator' },
      {
        label: 'Выход',
        click: () => {
          this.mainWindow.destroy();
          process.exit(0);
        },
      },
    ]);

    this.tray.setContextMenu(contextMenu);
  }

  // Обновление иконки в зависимости от прогресса воды
  updateIcon(progress: number): void {
    if (!this.tray) return;

    // В реальном приложении здесь будут разные иконки
    // Для примера создаём простую иконку с цветом
    const canvas = nativeImage.createEmpty();

    // Обновляем тултип
    const percent = Math.min(100, Math.round(progress * 100));
    this.tray.setToolTip(`Home Manager — Выпито ${percent}% воды`);

    this.updateTrayMenu();
  }
}
