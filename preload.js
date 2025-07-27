// preload.js - Bridge tra renderer e main process
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
    // Chiamata chat
    callChatRequest: async (params) => {
        return await ipcRenderer.invoke('chat-request', params);
    },
    
    // Salva configurazione
    saveConfig: async (config) => {
        return await ipcRenderer.invoke('save-config', config);
    },
    
    // PropertyFinder API
    executePropertySearch: async () => {
        return await ipcRenderer.invoke('property-search');
    },

    updateScheduleConfig: async (config) => {
        return await ipcRenderer.invoke('update-schedule', config);
    },

    getPropertyReports: async () => {
        return await ipcRenderer.invoke('get-reports');
    },

    openFile: async (path) => {
        return await ipcRenderer.invoke('open-file', path);
    },
    
    // Automazione browser
    browserAutomation: async (action, data) => {
        return await ipcRenderer.invoke('browser-automation', { action, data });
    }
});