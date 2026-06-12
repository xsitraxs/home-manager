import Database from 'better-sqlite3';
import path from 'path';
import { app } from 'electron';
import { Member, Chore, ChoreLog, Settings, LeaderboardEntry, WaterStats, validateString, validateNumber } from '../shared/types';

// Санитизация строки (удаление control characters)
function sanitize(value: string, maxLength: number): string {
  return value.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g, '').slice(0, maxLength);
}

// Менеджер базы данных SQLite
export class DatabaseManager {
  private db: Database.Database;

  constructor() {
    const dbPath = path.join(app.getPath('userData'), 'home-manager.db');
    this.db = new Database(dbPath);
    this.db.pragma('journal_mode = WAL');
    this.db.pragma('foreign_keys = ON');
    this.init();
  }

  // Инициализация структуры таблиц
  private init(): void {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS members (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        created_at TEXT DEFAULT (datetime('now'))
      );

      CREATE TABLE IF NOT EXISTS chores (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT NOT NULL,
        frequency_days INTEGER NOT NULL DEFAULT 1,
        assigned_to INTEGER REFERENCES members(id) ON DELETE SET NULL,
        last_done TEXT,
        next_due TEXT NOT NULL DEFAULT (date('now')),
        created_by INTEGER REFERENCES members(id),
        sort_order INTEGER DEFAULT 0
      );

      CREATE TABLE IF NOT EXISTS chore_log (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        chore_id INTEGER REFERENCES chores(id) ON DELETE CASCADE,
        done_by INTEGER REFERENCES members(id) ON DELETE SET NULL,
        done_at TEXT DEFAULT (datetime('now'))
      );

      CREATE TABLE IF NOT EXISTS water_log (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER DEFAULT 0,
        amount_ml INTEGER NOT NULL,
        logged_at TEXT DEFAULT (datetime('now'))
      );

      CREATE TABLE IF NOT EXISTS settings (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL
      );
    `);

    // Установка настроек по умолчанию
    const defaults: [string, string][] = [
      ['water_goal_ml', '2000'],
      ['water_reminder_interval_minutes', '60'],
      ['water_reminder_start_hour', '8'],
      ['water_reminder_end_hour', '22'],
      ['theme', 'dark'],
      ['minimizeToTray', 'false'],
      ['autoStart', 'false'],
    ];

    const insert = this.db.prepare('INSERT OR IGNORE INTO settings (key, value) VALUES (?, ?)');
    for (const [key, value] of defaults) {
      insert.run(key, value);
    }
  }

  // === МЕТОДЫ ДЛЯ ЧЛЕНОВ СЕМЬИ ===

  getMembers(): Member[] {
    return this.db.prepare('SELECT * FROM members ORDER BY id').all() as Member[];
  }

  addMember(name: string): Member {
    const safeName = sanitize(name, 50);
    const result = this.db.prepare('INSERT INTO members (name) VALUES (?)').run(safeName);
    return this.db.prepare('SELECT * FROM members WHERE id = ?').get(result.lastInsertRowid) as Member;
  }

  deleteMember(id: number): void {
    this.db.prepare('DELETE FROM members WHERE id = ?').run(id);
  }

  renameMember(id: number, name: string): void {
    const safeName = sanitize(name, 50);
    this.db.prepare('UPDATE members SET name = ? WHERE id = ?').run(safeName, id);
  }

  // === МЕТОДЫ ДЛЯ ДОМАШНИХ ДЕЛ ===

  getChores(): Chore[] {
    return this.db.prepare('SELECT * FROM chores ORDER BY sort_order, id').all() as Chore[];
  }

  addChore(title: string, frequencyDays: number, assignedTo: number | null): Chore {
    const safeTitle = sanitize(title, 100);
    const nextDue = this.calcNextDue(frequencyDays);
    const maxOrder = (this.db.prepare('SELECT COALESCE(MAX(sort_order), 0) as m FROM chores').get() as any).m;
    const result = this.db.prepare(
      'INSERT INTO chores (title, frequency_days, assigned_to, next_due, sort_order) VALUES (?, ?, ?, ?, ?)'
    ).run(safeTitle, frequencyDays, assignedTo, nextDue, maxOrder + 1);
    return this.db.prepare('SELECT * FROM chores WHERE id = ?').get(result.lastInsertRowid) as Chore;
  }

  updateChore(id: number, title: string, frequencyDays: number, assignedTo: number | null): void {
    const safeTitle = sanitize(title, 100);
    this.db.prepare(
      'UPDATE chores SET title = ?, frequency_days = ?, assigned_to = ? WHERE id = ?'
    ).run(safeTitle, frequencyDays, assignedTo, id);
  }

  deleteChore(id: number): void {
    this.db.prepare('DELETE FROM chores WHERE id = ?').run(id);
  }

  completeChore(choreId: number, doneBy: number | null): void {
    const chore = this.db.prepare('SELECT * FROM chores WHERE id = ?').get(choreId) as Chore;
    if (!chore) return;

    const nextDue = this.calcNextDue(chore.frequency_days);

    // Транзакция: INSERT + UPDATE атомарно
    const tx = this.db.transaction(() => {
      this.db.prepare(
        'INSERT INTO chore_log (chore_id, done_by, done_at) VALUES (?, ?, datetime(\'now\'))'
      ).run(choreId, doneBy);

      this.db.prepare(
        'UPDATE chores SET last_done = datetime(\'now\'), next_due = ? WHERE id = ?'
      ).run(nextDue, choreId);
    });
    tx();
  }

  updateChoreOrder(orders: { id: number; sort_order: number }[]): void {
    const stmt = this.db.prepare('UPDATE chores SET sort_order = ? WHERE id = ?');
    const tx = this.db.transaction((items: { id: number; sort_order: number }[]) => {
      for (const { id, sort_order } of items) {
        stmt.run(sort_order, id);
      }
    });
    tx(orders);
  }

  getChoreLog(days: number = 30): ChoreLog[] {
    return this.db.prepare(`
      SELECT cl.*, c.title as chore_title, m.name as member_name
      FROM chore_log cl
      LEFT JOIN chores c ON cl.chore_id = c.id
      LEFT JOIN members m ON cl.done_by = m.id
      WHERE cl.done_at >= datetime('now', ?)
      ORDER BY cl.done_at DESC
    `).all(`-${days} days`) as ChoreLog[];
  }

  getLeaderboard(): LeaderboardEntry[] {
    return this.db.prepare(`
      SELECT
        m.name as member_name,
        COUNT(cl.id) as completed_count,
        COUNT(cl.id) * 10 as points
      FROM members m
      LEFT JOIN chore_log cl ON cl.done_by = m.id
        AND cl.done_at >= datetime('now', '-30 days')
      GROUP BY m.id
      ORDER BY points DESC
    `).all() as LeaderboardEntry[];
  }

  // === МЕТОДЫ ДЛЯ ТРЕКЕРА ВОДЫ ===

  addWater(amountMl: number): void {
    this.db.prepare(
      'INSERT INTO water_log (user_id, amount_ml, logged_at) VALUES (0, ?, datetime(\'now\'))'
    ).run(amountMl);
  }

  getTodayWater(): number {
    const result = this.db.prepare(
      'SELECT COALESCE(SUM(amount_ml), 0) as total FROM water_log WHERE date(logged_at) = date(\'now\')'
    ).get() as { total: number };
    return result.total;
  }

  getWaterStats(days: number = 30): WaterStats {
    // Общая статистика
    const stats = this.db.prepare(`
      SELECT
        COALESCE(SUM(amount_ml), 0) as total_ml,
        COUNT(DISTINCT date(logged_at)) as days_count
      FROM water_log
      WHERE logged_at >= datetime('now', ?)
    `).get(`-${days} days`) as any;

    // Дневная статистика
    const daily = this.db.prepare(`
      SELECT date(logged_at) as date, SUM(amount_ml) as total_ml
      FROM water_log
      WHERE logged_at >= datetime('now', ?)
      GROUP BY date(logged_at)
      ORDER BY date
    `).all(`-${days} days`) as { date: string; total_ml: number }[];

    const goalMl = parseInt(this.getSetting('water_goal_ml') || '2000');
    const goalMetDays = daily.filter(d => d.total_ml >= goalMl).length;
    const avgMl = daily.length > 0 ? Math.round(daily.reduce((s, d) => s + d.total_ml, 0) / daily.length) : 0;

    return {
      total_ml: stats.total_ml,
      days_count: stats.days_count,
      avg_ml: avgMl,
      goal_met_days: goalMetDays,
      daily,
    };
  }

  resetWaterToday(): void {
    this.db.prepare('DELETE FROM water_log WHERE date(logged_at) = date(\'now\')').run();
  }

  // === МЕТОДЫ ДЛЯ НАСТРОЕК ===

  getSettings(): Settings {
    const rows = this.db.prepare('SELECT * FROM settings').all() as { key: string; value: string }[];
    const settings: Settings = {};
    for (const row of rows) {
      settings[row.key] = row.value;
    }
    return settings;
  }

  getSetting(key: string): string {
    const row = this.db.prepare('SELECT value FROM settings WHERE key = ?').get(key) as { value: string } | undefined;
    return row?.value || '';
  }

  setSetting(key: string, value: string): void {
    const safeKey = sanitize(key, 50);
    const safeValue = sanitize(value, 200);
    const allowed = ['water_goal_ml', 'water_reminder_interval_minutes', 'water_reminder_start_hour', 'water_reminder_end_hour', 'theme', 'minimizeToTray', 'autoStart'];
    if (!allowed.includes(safeKey)) throw new Error(`Setting "${safeKey}" not allowed`);
    this.db.prepare('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)').run(safeKey, safeValue);
  }

  // === ВСПОМОГАТЕЛЬНЫЕ МЕТОДЫ ===

  // Закрытие соединения с БД
  close(): void {
    this.db.close();
  }

  // Вычисление следующей даты выполнения дела (локальная дата, не UTC)
  private calcNextDue(frequencyDays: number): string {
    const now = new Date();
    now.setDate(now.getDate() + frequencyDays);
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, '0');
    const d = String(now.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }
}
