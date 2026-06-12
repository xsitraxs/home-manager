import { Tray, Menu, BrowserWindow, nativeImage, app } from 'electron';
import { DatabaseManager } from './database';

// Создание простой иконки для трея (16x16 px)
function createTrayIcon(): Electron.NativeImage {
  // Создаём 16x16 иконку программно
  const size = 16;
  const canvas = Buffer.alloc(size * size * 4);

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const idx = (y * size + x) * 4;
      // Круглая капля воды — синяя
      const cx = x - size / 2 + 0.5;
      const cy = y - size / 2 + 0.5;
      const dist = Math.sqrt(cx * cx + cy * cy);
      if (dist < 5) {
        canvas[idx] = 74;     // R
        canvas[idx + 1] = 144; // G
        canvas[idx + 2] = 217; // B
        canvas[idx + 3] = 255; // A
      } else {
        canvas[idx + 3] = 0; // transparent
      }
    }
  }

  return nativeImage.createFromBuffer(canvas, { width: size, height: size });
}

// Менеджер системного трея
export class TrayManager {
  private tray: Tray | null = null;
  private mainWindow: BrowserWindow;
  private db: DatabaseManager;

  constructor(mainWindow: BrowserWindow, db: DatabaseManager) {
    this.mainWindow = mainWindow;
    this.db = db;
  }

  createTray(): void {
    const icon = createTrayIcon();
    this.tray = new Tray(icon);
    this.tray.setToolTip('Home Manager');
    this.updateTrayMenu();

    this.tray.on('click', () => {
      if (this.mainWindow.isVisible()) {
        this.mainWindow.hide();
      } else {
        this.mainWindow.show();
        this.mainWindow.focus();
      }
    });
  }

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
          (this.mainWindow as any)._forceClose = true;
          this.mainWindow.destroy();
          app.quit();
        },
      },
    ]);

    this.tray.setContextMenu(contextMenu);
  }

  updateIcon(progress: number): void {
    if (!this.tray) return;
    const percent = Math.min(100, Math.round(progress * 100));
    this.tray.setToolTip(`Home Manager — Выпито ${percent}% воды`);
    this.updateTrayMenu();
  }
}
