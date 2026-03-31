import { contextBridge, ipcRenderer } from 'electron';

// ── Engine functions: MUST be synchronous because App.tsx calls them without await ──
// Use sendSync so the return value is available immediately.
contextBridge.exposeInMainWorld('startReceiver', (port: number): boolean =>
  ipcRenderer.sendSync('engine:startReceiver', port)
);
contextBridge.exposeInMainWorld('startSender', (filePath: string, ip: string, port: number): boolean =>
  ipcRenderer.sendSync('engine:startSender', filePath, ip, port)
);
contextBridge.exposeInMainWorld('getProgress', (): number =>
  ipcRenderer.sendSync('engine:getProgress')
);
contextBridge.exposeInMainWorld('cancelTransfer', (): void =>
  ipcRenderer.sendSync('engine:cancelTransfer')
);
contextBridge.exposeInMainWorld('getCurrentFileName', (): string =>
  ipcRenderer.sendSync('engine:getCurrentFileName')
);
contextBridge.exposeInMainWorld('getCurrentFileSize', (): number =>
  ipcRenderer.sendSync('engine:getCurrentFileSize')
);

// ── IPC helpers for mock modules (async is fine here) ──
contextBridge.exposeInMainWorld('swiftshareIPC', {
  platform: () => process.platform,
  getDeviceName: () => ipcRenderer.invoke('getDeviceName'),
  getLocalIP: () => ipcRenderer.invoke('getLocalIP'),
  pickDocument: () => ipcRenderer.invoke('pickDocument'),
  fsUnlink: (path: string) => ipcRenderer.invoke('fs:unlink', path),
  fsCopyToCache: (path: string) => ipcRenderer.invoke('fs:copyToCache', path),
  openDownloadsFolder: () => ipcRenderer.invoke('openDownloadsFolder'),
  udpCreateSocket: (id: string) => ipcRenderer.invoke('udp:createSocket', id),
  udpBind: (id: string, port: number) => ipcRenderer.invoke('udp:bind', id, port),
  udpSend: (id: string, msg: string, port: number, address: string) =>
    ipcRenderer.invoke('udp:send', id, msg, port, address),
  udpClose: (id: string) => ipcRenderer.invoke('udp:close', id),
  onUdpMessage: (id: string, callback: (msg: string, rinfo: any) => void) => {
    ipcRenderer.on(`udp:message:${id}`, (_, msg, rinfo) => callback(msg, rinfo));
  },
  onUdpError: (id: string, callback: (err: string) => void) => {
    ipcRenderer.on(`udp:error:${id}`, (_, err) => callback(err));
  },
});
