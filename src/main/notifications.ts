import { BrowserWindow, Notification } from 'electron';
import { DatabaseManager } from './database';

// Менеджер системных уведомлений о воде
export class NotificationManager {
  private mainWindow: BrowserWindow;
  private db: DatabaseManager;
  private intervalId: NodeJS.Timeout | null = null;
  private openWindow: () => void;

  constructor(mainWindow: BrowserWindow, db: DatabaseManager, openWindow: () => void) {
    this.mainWindow = mainWindow;
    this.db = db;
    this.openWindow = openWindow;
  }

  setMainWindow(mainWindow: BrowserWindow): void {
    this.mainWindow = mainWindow;
  }

  // Запуск проверки уведомлений
  start(): void {
    // Проверяем каждую минуту
    this.intervalId = setInterval(() => this.check(), 60000);
    this.check();
  }

  // Остановка проверки
  stop(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }

  // Проверка необходимости отправки уведомления
  // Безопасный parseInt
  private safeInt(value: string | undefined, fallback: number): number {
    if (!value) return fallback;
    if (!/^\d+$/.test(value)) return fallback;
    const n = Number(value);
    return Number.isFinite(n) ? n : fallback;
  }

  private check(): void {
    const settings = this.db.getSettings();
    const intervalMinutes = Math.min(180, Math.max(15, this.safeInt(settings.water_reminder_interval_minutes, 60)));
    const startHour = Math.min(23, Math.max(0, this.safeInt(settings.water_reminder_start_hour, 8)));
    const endHour = Math.min(23, Math.max(0, this.safeInt(settings.water_reminder_end_hour, 22)));
    const goalMl = Math.min(5000, Math.max(500, this.safeInt(settings.water_goal_ml, 2000)));
    if (startHour === endHour) return;

    const now = new Date();
    const currentHour = now.getHours();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, '0');
    const d = String(now.getDate()).padStart(2, '0');
    const today = `${y}-${m}-${d}`;

    // Проверяем, в рабочем ли мы интервале
    const inReminderWindow = startHour < endHour
      ? currentHour >= startHour && currentHour < endHour
      : currentHour >= startHour || currentHour < endHour;
    if (!inReminderWindow) return;

    // Проверяем, не выполнена ли уже норма
    const todayWater = this.db.getTodayWater();
    if (todayWater >= goalMl) {
      // Норма выполнена — не беспокоим до следующего дня
      if (this.db.getSetting('last_goal_notification_date') !== today) {
        this.sendNotification(
          'Поздравляем!',
          `Вы выполнили дневную норму воды: ${todayWater} из ${goalMl} мл`
        );
        this.db.setSetting('last_goal_notification_date', today);
      }
      return;
    }

    // Проверяем, прошло ли достаточно времени с последнего уведомления
    const lastNotificationKey = 'last_water_notification';
    const lastTime = this.db.getSetting(lastNotificationKey);
    const lastDate = lastTime ? new Date(lastTime) : null;

    if (lastDate) {
      const diffMinutes = (now.getTime() - lastDate.getTime()) / 60000;
      if (diffMinutes < intervalMinutes) {
        return;
      }
    }

    // Отправляем уведомление
    this.sendNotification(
      'Пора попить воды!',
      `Сегодня выпито ${todayWater} из ${goalMl} мл`
    );

    // Сохраняем время последнего уведомления
    this.db.setSetting(lastNotificationKey, now.toISOString());
  }

  // Отправка системного уведомления
  private sendNotification(title: string, body: string): void {
    if (Notification.isSupported()) {
      const notification = new Notification({
        title,
        body,
        silent: false,
        icon: undefined, // В реальном приложении — путь к иконке
      });

      notification.show();

      notification.on('click', () => {
        if (this.mainWindow.isDestroyed()) this.openWindow();
        this.mainWindow.show();
        this.mainWindow.focus();
      });
    }
  }
}
