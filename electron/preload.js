import { contextBridge } from 'electron';

contextBridge.exposeInMainWorld('texasHoldEmApp', {
  version: () => process.versions.electron,
});
