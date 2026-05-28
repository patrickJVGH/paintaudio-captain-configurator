const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("desktopApp", {
  isElectron: true,
  platform: process.platform,
  midiCaptain: {
    scan: () => ipcRenderer.invoke("midi-captain:scan"),
    readFile: (request) => ipcRenderer.invoke("midi-captain:read-file", request),
    writeFile: (request) => ipcRenderer.invoke("midi-captain:write-file", request),
  },
});
