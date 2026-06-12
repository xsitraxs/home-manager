interface ElectronAPI {
  invoke(channel: string, ...args: any[]): Promise<any>;
  on(channel: string, listener: (...args: any[]) => void): void;
  removeAllListeners(channel: string): void;
}

interface Window {
  electronAPI: ElectronAPI;
}
