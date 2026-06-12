// Общие типы для main и renderer процессов

export interface Member {
  id: number;
  name: string;
  created_at: string;
}

export interface Chore {
  id: number;
  title: string;
  frequency_days: number;
  assigned_to: number | null;
  last_done: string | null;
  next_due: string;
  created_by: number | null;
  sort_order: number;
  assigned_name?: string | null;
}

export interface ChoreLog {
  id: number;
  chore_id: number;
  done_by: number | null;
  done_at: string;
  chore_title?: string;
  member_name?: string;
}

export interface WaterLog {
  id: number;
  user_id: number;
  amount_ml: number;
  logged_at: string;
}

export interface Settings {
  [key: string]: string;
}

export interface LeaderboardEntry {
  member_name: string;
  completed_count: number;
  points: number;
}

export interface WaterStats {
  total_ml: number;
  days_count: number;
  avg_ml: number;
  goal_met_days: number;
  daily: { date: string; total_ml: number }[];
}

// Валидация (общая для main и renderer)
export function validateString(value: unknown, maxLength: number = 100): string {
  if (typeof value !== 'string') throw new Error('Expected string');
  const trimmed = value.trim();
  if (trimmed.length === 0) throw new Error('String cannot be empty');
  if (trimmed.length > maxLength) throw new Error(`String exceeds ${maxLength} chars`);
  return trimmed;
}

export function validateNumber(value: unknown, min: number, max: number): number {
  const num = Number(value);
  if (!Number.isFinite(num)) throw new Error('Expected finite number');
  if (num < min || num > max) throw new Error(`Number must be between ${min} and ${max}`);
  return num;
}

export function validateId(value: unknown): number {
  return validateNumber(value, 1, Number.MAX_SAFE_INTEGER);
}

export function safeInt(value: string | undefined, fallback: number): number {
  if (!value) return fallback;
  const n = parseInt(value, 10);
  return Number.isFinite(n) ? n : fallback;
}
