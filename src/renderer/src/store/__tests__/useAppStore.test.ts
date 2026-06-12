// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest';

// Мокаем electronAPI через globalThis (до импорта store)
const mockInvoke = vi.fn();
(globalThis as any).electronAPI = {
  invoke: mockInvoke,
  on: vi.fn(),
  removeAllListeners: vi.fn(),
};

// Мокаем showToast
vi.mock('../../components/ui/Toast', () => ({
  showToast: vi.fn(),
}));

import { useAppStore } from '../useAppStore';
import { showToast } from '../../components/ui/Toast';

beforeEach(() => {
  mockInvoke.mockReset();
  (showToast as any).mockClear();
  // Сброс store
  useAppStore.setState({
    currentPage: 'dashboard',
    members: [],
    chores: [],
    leaderboard: [],
    todayWater: 0,
    waterGoal: 2000,
    waterStats: null,
    settings: {},
    loading: false,
    showAddWaterModal: false,
  });
});

// ==================== IPC WRAPPER ====================

describe('IPC wrapper', () => {
  it('returns result on success', async () => {
    mockInvoke.mockResolvedValueOnce([{ id: 1, name: 'Тест' }]);
    const result = await (useAppStore.getState().loadMembers as any)();
    expect(mockInvoke).toHaveBeenCalledWith('get-members');
  });

  it('shows toast on error and re-throws', async () => {
    mockInvoke.mockRejectedValueOnce(new Error('DB error'));
    await expect(useAppStore.getState().loadMembers()).rejects.toThrow();
    expect(showToast).toHaveBeenCalledWith('DB error', 'error');
  });
});

// ==================== MEMBERS ====================

describe('Members', () => {
  it('loadMembers sets members state', async () => {
    const members = [{ id: 1, name: 'Миша', created_at: '2024-01-01' }];
    mockInvoke.mockResolvedValueOnce(members);
    await useAppStore.getState().loadMembers();
    expect(useAppStore.getState().members).toEqual(members);
  });

  it('addMember calls IPC and reloads', async () => {
    mockInvoke.mockResolvedValueOnce({ id: 1, name: 'Катя', created_at: '2024-01-01' }); // add
    mockInvoke.mockResolvedValueOnce([]); // loadMembers
    await useAppStore.getState().addMember('Катя');
    expect(mockInvoke).toHaveBeenCalledWith('add-member', 'Катя');
    expect(showToast).toHaveBeenCalledWith('Член семьи добавлен', 'success');
  });

  it('deleteMember calls IPC and reloads', async () => {
    mockInvoke.mockResolvedValueOnce(undefined); // delete
    mockInvoke.mockResolvedValueOnce([]); // loadMembers
    await useAppStore.getState().deleteMember(1);
    expect(mockInvoke).toHaveBeenCalledWith('delete-member', 1);
    expect(showToast).toHaveBeenCalledWith('Член семьи удалён', 'success');
  });
});

// ==================== CHORES ====================

describe('Chores', () => {
  it('loadChores enriches with assigned_name', async () => {
    useAppStore.setState({
      members: [{ id: 1, name: 'Миша', created_at: '2024-01-01' }],
    });
    const chores = [{ id: 1, title: 'Дело', frequency_days: 1, assigned_to: 1, last_done: null, next_due: '2024-01-02', created_by: null, sort_order: 0 }];
    mockInvoke.mockResolvedValueOnce(chores);
    await useAppStore.getState().loadChores();
    expect(useAppStore.getState().chores[0].assigned_name).toBe('Миша');
  });

  it('loadChores sets null assigned_name when member not found', async () => {
    useAppStore.setState({ members: [] });
    const chores = [{ id: 1, title: 'Дело', frequency_days: 1, assigned_to: 99, last_done: null, next_due: '2024-01-02', created_by: null, sort_order: 0 }];
    mockInvoke.mockResolvedValueOnce(chores);
    await useAppStore.getState().loadChores();
    expect(useAppStore.getState().chores[0].assigned_name).toBeNull();
  });

  it('addChore calls IPC and shows toast', async () => {
    mockInvoke.mockResolvedValueOnce({}); // add
    mockInvoke.mockResolvedValueOnce([]); // loadChores
    await useAppStore.getState().addChore('Новое дело', 3, null);
    expect(mockInvoke).toHaveBeenCalledWith('add-chore', 'Новое дело', 3, null);
    expect(showToast).toHaveBeenCalledWith('Дело добавлено', 'success');
  });

  it('completeChore reloads chores and leaderboard', async () => {
    mockInvoke.mockResolvedValueOnce(undefined); // complete
    mockInvoke.mockResolvedValueOnce([]); // loadChores
    mockInvoke.mockResolvedValueOnce([]); // loadLeaderboard
    await useAppStore.getState().completeChore(1, null);
    expect(mockInvoke).toHaveBeenCalledWith('complete-chore', 1, null);
    expect(showToast).toHaveBeenCalledWith('Дело выполнено! 🎉', 'success');
  });
});

// ==================== WATER ====================

describe('Water', () => {
  it('loadTodayWater sets todayWater', async () => {
    mockInvoke.mockResolvedValueOnce(1500);
    await useAppStore.getState().loadTodayWater();
    expect(useAppStore.getState().todayWater).toBe(1500);
  });

  it('addWater calls IPC and updates tray icon', async () => {
    mockInvoke.mockResolvedValueOnce(undefined); // add
    mockInvoke.mockResolvedValueOnce(500); // loadTodayWater
    await useAppStore.getState().addWater(250);
    expect(mockInvoke).toHaveBeenCalledWith('add-water', 250);
    expect(mockInvoke).toHaveBeenCalledWith('update-tray-icon', expect.any(Number));
  });

  it('loadWaterStats sets waterStats', async () => {
    const stats = { total_ml: 5000, days_count: 5, avg_ml: 1000, goal_met_days: 3, daily: [] };
    mockInvoke.mockResolvedValueOnce(stats);
    await useAppStore.getState().loadWaterStats(7);
    expect(useAppStore.getState().waterStats).toEqual(stats);
    expect(mockInvoke).toHaveBeenCalledWith('get-water-stats', 7);
  });
});

// ==================== SETTINGS ====================

describe('Settings', () => {
  it('loadSettings extracts waterGoal safely', async () => {
    mockInvoke.mockResolvedValueOnce({
      water_goal_ml: '3000',
      theme: 'dark',
    });
    await useAppStore.getState().loadSettings();
    expect(useAppStore.getState().waterGoal).toBe(3000);
    expect(useAppStore.getState().theme).toBe('dark');
  });

  it('loadSettings handles NaN in water_goal_ml', async () => {
    mockInvoke.mockResolvedValueOnce({
      water_goal_ml: 'invalid',
    });
    await useAppStore.getState().loadSettings();
    expect(useAppStore.getState().waterGoal).toBe(2000); // fallback
  });

  it('setSetting calls IPC and updates local state', async () => {
    mockInvoke.mockResolvedValueOnce(undefined);
    await useAppStore.getState().setSetting('water_goal_ml', '2500');
    expect(useAppStore.getState().settings.water_goal_ml).toBe('2500');
    expect(useAppStore.getState().waterGoal).toBe(2500);
  });

  it('setSetting does not update waterGoal for other keys', async () => {
    mockInvoke.mockResolvedValueOnce(undefined);
    await useAppStore.getState().setSetting('theme', 'light');
    expect(useAppStore.getState().waterGoal).toBe(2000); // unchanged
  });
});

// ==================== NAVIGATION ====================

describe('Navigation', () => {
  it('setCurrentPage updates currentPage', () => {
    useAppStore.getState().setCurrentPage('water');
    expect(useAppStore.getState().currentPage).toBe('water');
  });

  it('setShowAddWaterModal toggles modal', () => {
    useAppStore.getState().setShowAddWaterModal(true);
    expect(useAppStore.getState().showAddWaterModal).toBe(true);
    useAppStore.getState().setShowAddWaterModal(false);
    expect(useAppStore.getState().showAddWaterModal).toBe(false);
  });
});
