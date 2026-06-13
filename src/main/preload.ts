import { contextBridge, ipcRenderer } from 'electron';

// Whitelist IPC channels — renderer может вызывать только эти каналы
const VALID_CHANNELS = {
  send: [] as string[],
  invoke: [
    'get-members', 'add-member', 'delete-member', 'rename-member',
    'get-chores', 'add-chore', 'update-chore', 'delete-chore',
    'complete-chore', 'update-chore-order', 'get-chore-log', 'get-leaderboard',
    'add-water', 'get-today-water', 'get-water-stats', 'reset-water-today',
    'get-settings', 'set-setting', 'update-tray-icon', 'set-auto-start', 'app-quit',
  ],
  receive: ['shortcut', 'water-added'],
};

// Валидация имени канала
function isValidChannel(channel: string, type: 'invoke' | 'receive' | 'send'): boolean {
  return VALID_CHANNELS[type].includes(channel);
}

// Безопасная обёртка над ipcRenderer.invoke
function safeInvoke(channel: string, ...args: any[]): Promise<any> {
  if (!isValidChannel(channel, 'invoke')) {
    return Promise.reject(new Error(`Blocked IPC invoke: ${channel}`));
  }
  return ipcRenderer.invoke(channel, ...args);
}

// Безопасная обёртка над ipcRenderer.on
function safeOn(channel: string, listener: (...args: any[]) => void): void {
  if (!isValidChannel(channel, 'receive')) {
    console.warn(`Blocked IPC receive: ${channel}`);
    return;
  }
  ipcRenderer.on(channel, (_event, ...args) => listener(...args));
}

function safeRemoveAllListeners(channel: string): void {
  if (isValidChannel(channel, 'receive')) {
    ipcRenderer.removeAllListeners(channel);
  }
}

// Предоставляем безопасный API renderer-процессу
contextBridge.exposeInMainWorld('electronAPI', {
  invoke: safeInvoke,
  on: safeOn,
  removeAllListeners: safeRemoveAllListeners,
});
