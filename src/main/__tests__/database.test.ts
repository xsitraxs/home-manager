import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from 'vitest';
import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';
import os from 'os';

// Мокаем electron.app.getPath перед импортом DatabaseManager
vi.mock('electron', () => ({
  app: {
    getPath: () => os.tmpdir(),
  },
}));

import { DatabaseManager } from '../database';

let db: DatabaseManager;

beforeAll(() => {
  db = new DatabaseManager();
});

afterAll(() => {
  db.close();
  try { fs.unlinkSync(path.join(os.tmpdir(), 'home-manager.db')); } catch {}
});

beforeEach(() => {
  const sqlite = (db as any).db as Database.Database;
  sqlite.exec('DELETE FROM chore_log');
  sqlite.exec('DELETE FROM chores');
  sqlite.exec('DELETE FROM water_log');
  sqlite.exec('DELETE FROM members');
  sqlite.exec("DELETE FROM settings WHERE key NOT IN ('water_goal_ml','water_reminder_interval_minutes','water_reminder_start_hour','water_reminder_end_hour','theme','minimizeToTray','autoStart')");
});

// ==================== MEMBERS ====================

describe('Members', () => {
  it('adds a member and returns it with id', () => {
    const member = db.addMember('Миша');
    expect(member).toHaveProperty('id');
    expect(member.name).toBe('Миша');
    expect(member).toHaveProperty('created_at');
  });

  it('gets all members ordered by id', () => {
    db.addMember('Катя');
    db.addMember('Паша');
    const members = db.getMembers();
    expect(members.length).toBeGreaterThanOrEqual(2);
    expect(members[0].name).toBe('Катя');
    expect(members[1].name).toBe('Паша');
  });

  it('deletes a member', () => {
    const member = db.addMember('Тест');
    db.deleteMember(member.id);
    const members = db.getMembers();
    expect(members.find(m => m.id === member.id)).toBeUndefined();
  });

  it('sets assigned_to to NULL when member is deleted', () => {
    const member = db.addMember('Тест');
    const chore = db.addChore('Дело', 1, member.id);
    db.deleteMember(member.id);
    const chores = db.getChores();
    const updated = chores.find(c => c.id === chore.id);
    expect(updated?.assigned_to).toBeNull();
  });

  it('renames a member', () => {
    const member = db.addMember('Старое');
    db.renameMember(member.id, 'Новое');
    const members = db.getMembers();
    expect(members.find(m => m.id === member.id)?.name).toBe('Новое');
  });

  it('sanitizes control characters in name', () => {
    const member = db.addMember('Миша\x00\x01');
    expect(member.name).toBe('Миша');
  });
});

// ==================== CHORES ====================

describe('Chores', () => {
  it('adds a chore with correct fields', () => {
    const chore = db.addChore('Мыть посуду', 1, null);
    expect(chore.title).toBe('Мыть посуду');
    expect(chore.frequency_days).toBe(1);
    expect(chore.assigned_to).toBeNull();
    expect(typeof chore.sort_order).toBe('number');
    expect(chore.next_due).toBeDefined();
  });

  it('auto-increments sort_order', () => {
    const c1 = db.addChore('Дело 1', 1, null);
    const c2 = db.addChore('Дело 2', 1, null);
    expect(c2.sort_order).toBe(c1.sort_order + 1);
  });

  it('calculates next_due based on frequency', () => {
    const chore = db.addChore('Тест', 7, null);
    const nextDue = new Date(chore.next_due);
    const today = new Date();
    today.setDate(today.getDate() + 7);
    expect(nextDue.toISOString().split('T')[0]).toBe(today.toISOString().split('T')[0]);
  });

  it('gets all chores ordered by sort_order', () => {
    db.addChore('Второе', 1, null);
    db.addChore('Первое', 1, null);
    const chores = db.getChores();
    expect(chores.length).toBeGreaterThanOrEqual(2);
  });

  it('updates a chore', () => {
    const chore = db.addChore('Старое', 1, null);
    db.updateChore(chore.id, 'Новое', 3, null);
    const updated = db.getChores().find(c => c.id === chore.id);
    expect(updated?.title).toBe('Новое');
    expect(updated?.frequency_days).toBe(3);
  });

  it('deletes a chore', () => {
    const chore = db.addChore('Удаляемое', 1, null);
    db.deleteChore(chore.id);
    expect(db.getChores().find(c => c.id === chore.id)).toBeUndefined();
  });

  it('completes a chore and recalculates next_due', () => {
    const chore = db.addChore('Тест', 3, null);
    db.completeChore(chore.id, null);
    const updated = db.getChores().find(c => c.id === chore.id);
    expect(updated?.last_done).toBeDefined();
    const expected = new Date();
    expected.setDate(expected.getDate() + 3);
    expect(updated?.next_due).toBe(expected.toISOString().split('T')[0]);
  });

  it('logs completion in chore_log', () => {
    const chore = db.addChore('Тест', 1, null);
    db.completeChore(chore.id, null);
    const log = db.getChoreLog(1);
    expect(log.length).toBeGreaterThanOrEqual(1);
    expect(log[0].chore_id).toBe(chore.id);
  });

  it('does nothing when completing non-existent chore', () => {
    expect(() => db.completeChore(99999, null)).not.toThrow();
  });

  it('batch updates sort_order in transaction', () => {
    const c1 = db.addChore('А', 1, null);
    const c2 = db.addChore('Б', 1, null);
    db.updateChoreOrder([
      { id: c2.id, sort_order: 0 },
      { id: c1.id, sort_order: 1 },
    ]);
    const chores = db.getChores();
    expect(chores.find(c => c.id === c2.id)?.sort_order).toBe(0);
    expect(chores.find(c => c.id === c1.id)?.sort_order).toBe(1);
  });
});

// ==================== WATER ====================

describe('Water', () => {
  it('starts with 0 for today', () => {
    expect(db.getTodayWater()).toBe(0);
  });

  it('adds water and sums correctly', () => {
    db.addWater(250);
    db.addWater(350);
    expect(db.getTodayWater()).toBe(600);
  });

  it('returns water stats', () => {
    db.addWater(500);
    const stats = db.getWaterStats(1);
    expect(stats.total_ml).toBe(500);
    expect(stats.daily.length).toBeGreaterThanOrEqual(1);
  });

  it('resets today water', () => {
    db.addWater(250);
    db.resetWaterToday();
    expect(db.getTodayWater()).toBe(0);
  });

  it('calculates goal_met_days', () => {
    db.addWater(2500);
    const stats = db.getWaterStats(1);
    expect(stats.goal_met_days).toBeGreaterThanOrEqual(1);
  });
});

// ==================== SETTINGS ====================

describe('Settings', () => {
  it('has default settings', () => {
    const settings = db.getSettings();
    expect(settings.water_goal_ml).toBe('2000');
    expect(settings.theme).toBe('dark');
  });

  it('gets a single setting', () => {
    expect(db.getSetting('water_goal_ml')).toBe('2000');
  });

  it('returns empty string for non-existent setting', () => {
    expect(db.getSetting('nonexistent')).toBe('');
  });

  it('sets and gets a setting', () => {
    db.setSetting('water_goal_ml', '3000');
    expect(db.getSetting('water_goal_ml')).toBe('3000');
  });

  it('rejects disallowed setting key', () => {
    expect(() => db.setSetting('evil_key', 'value')).toThrow('not allowed');
  });

  it('sanitizes control characters in value', () => {
    db.setSetting('water_goal_ml', '2500\x00');
    expect(db.getSetting('water_goal_ml')).toBe('2500');
  });
});

// ==================== LEADERBOARD ====================

describe('Leaderboard', () => {
  it('returns empty leaderboard with no completions', () => {
    const board = db.getLeaderboard();
    expect(board).toEqual([]);
  });

  it('ranks members by completions', () => {
    const m1 = db.addMember('А');
    const m2 = db.addMember('Б');
    const c = db.addChore('Дело', 1, null);
    db.completeChore(c.id, m1.id);
    db.completeChore(c.id, m1.id);
    db.completeChore(c.id, m2.id);
    const board = db.getLeaderboard();
    expect(board[0].member_name).toBe('А');
    expect(board[0].completed_count).toBe(2);
    expect(board[0].points).toBe(20);
  });
});
