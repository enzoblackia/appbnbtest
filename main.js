const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const axios = require('axios');

let mainWindow;
let appConfig = {
    openaiApiKey: '',
    openaiModel: 'gpt-4'
};

function createWindow() {
    mainWindow = new BrowserWindow({
        width: 1400,
        height: 900,
        webPreferences: {
            preload: path.join(__dirname, 'preload.js'),
            contextIsolation: true,
            nodeIntegration: false
        },
        titleBarStyle: 'hiddenInset',
        backgroundColor: '#ffffff'
    });

    mainWindow.loadFile('index.html');
}

ipcMain.handle('openai-chat', async (event, { messages, config }) => {
    try {
        if (config && config.openaiApiKey) {
            appConfig = { ...appConfig, ...config };
        }

        if (!appConfig.openaiApiKey) {
            throw new Error('API Key non configurata');
        }

        const response = await axios.post(
            'https://api.openai.com/v1/chat/completions',
            {
                model: appConfig.openaiModel || 'gpt-4',
                messages: messages,
                temperature: 0.7,
                max_tokens: 500
            },
            {
                headers: {
                    'Authorization': `Bearer ${appConfig.openaiApiKey}`,
                    'Content-Type': 'application/json'
                }
            }
        );

        return { success: true, data: response.data };
    } catch (error) {
        console.error('OpenAI API Error:', error);
        return { success: false, error: error.message || 'Errore nella chiamata API' };
    }
});

ipcMain.handle('save-config', async (event, config) => {
    appConfig = { ...appConfig, ...config };
    return { success: true };
});

ipcMain.handle('browser-automation', async (event, { action, data }) => {
    console.log('Automazione richiesta:', action, data);
    return { success: true, message: 'Automazione simulata' };
});

app.whenReady().then(() => {
    createWindow();
    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) {
            createWindow();
        }
    });
});

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});
