import { create } from 'zustand';
import { showToast } from '../components/ui/Toast';
import type { Member, Chore, LeaderboardEntry, Settings, WaterStats } from '../../../shared/types';
import { safeInt } from '../../../shared/types';

// Безопасный доступ к Electron API через preload
const api = (window as Window & { electronAPI: any }).electronAPI;

type Page = 'dashboard' | 'chores' | 'water' | 'settings';

// Интерфейс состояния приложения
interface AppState {
  // Навигация
  currentPage: Page;
  setCurrentPage: (page: Page) => void;

  // Тема
  theme: 'dark' | 'light';
  setTheme: (theme: 'dark' | 'light') => void;

  // Загрузка
  loading: boolean;

  // Члены семьи
  members: Member[];
  loadMembers: () => Promise<void>;
  addMember: (name: string) => Promise<void>;
  deleteMember: (id: number) => Promise<void>;
  renameMember: (id: number, name: string) => Promise<void>;

  // Домашние дела
  chores: Chore[];
  loadChores: () => Promise<void>;
  addChore: (title: string, frequencyDays: number, assignedTo: number | null) => Promise<void>;
  updateChore: (id: number, title: string, frequencyDays: number, assignedTo: number | null) => Promise<void>;
  deleteChore: (id: number) => Promise<void>;
  completeChore: (choreId: number, doneBy: number | null) => Promise<void>;
  updateChoreOrder: (orders: { id: number; sort_order: number }[]) => Promise<void>;

  // Лидерборд
  leaderboard: LeaderboardEntry[];
  loadLeaderboard: () => Promise<void>;

  // Трекер воды
  todayWater: number;
  waterGoal: number;
  loadTodayWater: () => Promise<void>;
  addWater: (amountMl: number) => Promise<void>;
  waterStats: WaterStats | null;
  loadWaterStats: (days?: number) => Promise<void>;
  setShowAddWaterModal: (show: boolean) => void;
  showAddWaterModal: boolean;

  // Настройки
  settings: Settings;
  loadSettings: () => Promise<void>;
  setSetting: (key: string, value: string) => Promise<void>;
}

// Обёртка для IPC-вызовов с обработкой ошибок
async function ipc<T>(channel: string, ...args: any[]): Promise<T> {
  try {
    return await api.invoke(channel, ...args);
  } catch (err: any) {
    const msg = err?.message || 'Неизвестная ошибка';
    showToast(msg, 'error');
    throw err;
  }
}

// Создание хранилища Zustand
export const useAppStore = create<AppState>((set, get) => ({
  // Навигация
  currentPage: 'dashboard',
  setCurrentPage: (page) => set({ currentPage: page }),

  // Тема
  theme: (localStorage.getItem('theme') as 'dark' | 'light') || 'dark',
  setTheme: (theme) => {
    localStorage.setItem('theme', theme);
    get().setSetting('theme', theme);
    set({ theme });
  },

  // Загрузка
  loading: false,

  // Члены семьи
  members: [],
  loadMembers: async () => {
    const members = await ipc<Member[]>('get-members');
    set({ members });
    const state = get();
    if (state.chores.length > 0) {
      const enriched = state.chores.map((chore) => ({
        ...chore,
        assigned_name: chore.assigned_to
          ? members.find((m) => m.id === chore.assigned_to)?.name || null
          : null,
      }));
      set({ chores: enriched });
    }
  },
  addMember: async (name) => {
    await ipc<Member>('add-member', name);
    showToast('Член семьи добавлен', 'success');
    await get().loadMembers();
  },
  deleteMember: async (id) => {
    await ipc<void>('delete-member', id);
    showToast('Член семьи удалён', 'success');
    await get().loadMembers();
  },
  renameMember: async (id, name) => {
    await ipc<void>('rename-member', id, name);
    await get().loadMembers();
  },

  // Домашние дела
  chores: [],
  loadChores: async () => {
    const chores = await ipc<Chore[]>('get-chores');
    const members = get().members;
    const enrichedChores = chores.map((chore) => ({
      ...chore,
      assigned_name: chore.assigned_to
        ? members.find((m) => m.id === chore.assigned_to)?.name || null
        : null,
    }));
    set({ chores: enrichedChores });
  },
  addChore: async (title, frequencyDays, assignedTo) => {
    await ipc<Chore>('add-chore', title, frequencyDays, assignedTo);
    showToast('Дело добавлено', 'success');
    await get().loadChores();
  },
  updateChore: async (id, title, frequencyDays, assignedTo) => {
    await ipc<void>('update-chore', id, title, frequencyDays, assignedTo);
    showToast('Дело обновлено', 'success');
    await get().loadChores();
  },
  deleteChore: async (id) => {
    await ipc<void>('delete-chore', id);
    showToast('Дело удалено', 'success');
    await get().loadChores();
  },
  completeChore: async (choreId, doneBy) => {
    await ipc<void>('complete-chore', choreId, doneBy);
    showToast('Дело выполнено! 🎉', 'success');
    await get().loadChores();
    await get().loadLeaderboard();
  },
  updateChoreOrder: async (orders) => {
    await ipc<void>('update-chore-order', orders);
    await get().loadChores();
  },

  // Лидерборд
  leaderboard: [],
  loadLeaderboard: async () => {
    const leaderboard = await ipc<LeaderboardEntry[]>('get-leaderboard');
    set({ leaderboard });
  },

  // Трекер воды
  todayWater: 0,
  waterGoal: 2000,
  waterStats: null,
  showAddWaterModal: false,
  loadTodayWater: async () => {
    const todayWater = await ipc<number>('get-today-water');
    set({ todayWater });
  },
  addWater: async (amountMl) => {
    await ipc<void>('add-water', amountMl);
    await get().loadTodayWater();
    const progress = get().todayWater / get().waterGoal;
    api.invoke('update-tray-icon', progress);
  },
  loadWaterStats: async (days = 30) => {
    const waterStats = await ipc<WaterStats>('get-water-stats', days);
    set({ waterStats });
  },
  setShowAddWaterModal: (show) => set({ showAddWaterModal: show }),

  // Настройки
  settings: {},
  loadSettings: async () => {
    set({ loading: true });
    const settings = await ipc<Settings>('get-settings');
    set({
      settings,
      waterGoal: safeInt(settings.water_goal_ml, 2000),
      loading: false,
    });
    if (settings.theme) {
      set({ theme: settings.theme as 'dark' | 'light' });
    }
  },
  setSetting: async (key, value) => {
    await ipc<void>('set-setting', key, value);
    set((state) => ({
      settings: { ...state.settings, [key]: value },
      waterGoal: key === 'water_goal_ml' ? safeInt(value, 2000) : state.waterGoal,
    }));
  },
}));
