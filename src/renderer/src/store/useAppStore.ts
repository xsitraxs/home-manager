import { create } from 'zustand';

// Безопасный доступ к Electron API через preload
const api = (window as any).electronAPI;

// Типы данных
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
  assigned_name?: string;
}

export interface LeaderboardEntry {
  member_name: string;
  completed_count: number;
  points: number;
}

export interface Settings {
  [key: string]: string;
}

export interface WaterStats {
  total_ml: number;
  days_count: number;
  avg_ml: number;
  goal_met_days: number;
  daily: { date: string; total_ml: number }[];
}

type Page = 'dashboard' | 'chores' | 'water' | 'settings';

// Интерфейс состояния приложения
interface AppState {
  // Навигация
  currentPage: Page;
  setCurrentPage: (page: Page) => void;

  // Тема
  theme: 'dark' | 'light';
  setTheme: (theme: 'dark' | 'light') => void;

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

  // Члены семьи
  members: [],
  loadMembers: async () => {
    const members = await api.invoke('get-members');
    set({ members });
  },
  addMember: async (name) => {
    await api.invoke('add-member', name);
    await get().loadMembers();
  },
  deleteMember: async (id) => {
    await api.invoke('delete-member', id);
    await get().loadMembers();
  },
  renameMember: async (id, name) => {
    await api.invoke('rename-member', id, name);
    await get().loadMembers();
  },

  // Домашние дела
  chores: [],
  loadChores: async () => {
    const chores = await api.invoke('get-chores');
    // Подтягиваем имена назначенных членов
    const members = get().members;
    const enrichedChores = chores.map((chore: Chore) => ({
      ...chore,
      assigned_name: chore.assigned_to
        ? members.find((m) => m.id === chore.assigned_to)?.name || 'Неизвестно'
        : null,
    }));
    set({ chores: enrichedChores });
  },
  addChore: async (title, frequencyDays, assignedTo) => {
    await api.invoke('add-chore', title, frequencyDays, assignedTo);
    await get().loadChores();
  },
  updateChore: async (id, title, frequencyDays, assignedTo) => {
    await api.invoke('update-chore', id, title, frequencyDays, assignedTo);
    await get().loadChores();
  },
  deleteChore: async (id) => {
    await api.invoke('delete-chore', id);
    await get().loadChores();
  },
  completeChore: async (choreId, doneBy) => {
    await api.invoke('complete-chore', choreId, doneBy);
    await get().loadChores();
    await get().loadLeaderboard();
  },
  updateChoreOrder: async (orders) => {
    await api.invoke('update-chore-order', orders);
    await get().loadChores();
  },

  // Лидерборд
  leaderboard: [],
  loadLeaderboard: async () => {
    const leaderboard = await api.invoke('get-leaderboard');
    set({ leaderboard });
  },

  // Трекер воды
  todayWater: 0,
  waterGoal: 2000,
  waterStats: null,
  showAddWaterModal: false,
  loadTodayWater: async () => {
    const todayWater = await api.invoke('get-today-water');
    set({ todayWater });
  },
  addWater: async (amountMl) => {
    await api.invoke('add-water', amountMl);
    await get().loadTodayWater();
    // Обновляем иконку в трее
    const progress = get().todayWater / get().waterGoal;
    api.invoke('update-tray-icon', progress);
  },
  loadWaterStats: async (days = 30) => {
    const waterStats = await api.invoke('get-water-stats', days);
    set({ waterStats });
  },
  setShowAddWaterModal: (show) => set({ showAddWaterModal: show }),

  // Настройки
  settings: {},
  loadSettings: async () => {
    const settings = await api.invoke('get-settings');
    set({
      settings,
      waterGoal: parseInt(settings.water_goal_ml || '2000'),
    });
    // Применяем тему
    if (settings.theme) {
      set({ theme: settings.theme as 'dark' | 'light' });
    }
  },
  setSetting: async (key, value) => {
    await api.invoke('set-setting', key, value);
    set((state) => ({
      settings: { ...state.settings, [key]: value },
      waterGoal: key === 'water_goal_ml' ? parseInt(value) : state.waterGoal,
    }));
  },
}));
