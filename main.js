const { app, BrowserWindow, ipcMain, clipboard, dialog } = require('electron');
const path = require('path');
const fs = require('fs');

const DB_PATH = path.join(app.getPath('userData'), 'prompts-db.json');

function readDatabase() {
  try {
    if (!fs.existsSync(DB_PATH)) {
      // Seed default data if empty so the user starts with a guide folder and prompt
      const defaultData = {
        folders: [
          {
            id: 'folder-welcome',
            name: 'Getting Started 🚀',
            createdAt: new Date().toISOString()
          }
        ],
        prompts: [
          {
            id: 'prompt-welcome-1',
            folderId: 'folder-welcome',
            title: 'Welcome to PromptBox!',
            content: 'Hello! This is your prompt management dashboard.\n\nYou can:\n1. Organize your prompts into folders on the left panel.\n2. Filter your prompts using tags in the middle panel.\n3. Click the copy button to instantly copy prompts.\n4. Create, edit, and delete elements easily.\n\nEnjoy writing better prompts!',
            tags: ['guide', 'welcome'],
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          }
        ]
      };
      fs.writeFileSync(DB_PATH, JSON.stringify(defaultData, null, 2), 'utf-8');
      return defaultData;
    }
    const data = fs.readFileSync(DB_PATH, 'utf-8');
    return JSON.parse(data);
  } catch (error) {
    console.error('Error reading database:', error);
    return { folders: [], prompts: [] };
  }
}

function writeDatabase(data) {
  try {
    fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2), 'utf-8');
    return { success: true };
  } catch (error) {
    console.error('Error writing database:', error);
    return { success: false, error: error.message };
  }
}

function createWindow() {
  const win = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 950,
    minHeight: 650,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false
    },
    // Hide standard menu bar for a cleaner modern app look
    autoHideMenuBar: true,
    backgroundColor: '#0b0f19'
  });

  win.loadFile('index.html');
}

app.whenReady().then(() => {
  // IPC handlers
  ipcMain.handle('db:load', async () => {
    return readDatabase();
  });

  ipcMain.handle('db:save', async (event, data) => {
    return writeDatabase(data);
  });

  ipcMain.handle('clipboard:copy', async (event, text) => {
    clipboard.writeText(text);
    return true;
  });

  ipcMain.handle('db:export', async (event, data) => {
    const win = BrowserWindow.fromWebContents(event.sender);
    const dateStamp = new Date().toISOString().slice(0, 10);
    const { canceled, filePath } = await dialog.showSaveDialog(win, {
      title: 'Export PromptBox Backup',
      defaultPath: `promptbox-backup-${dateStamp}.json`,
      filters: [{ name: 'JSON Files', extensions: ['json'] }]
    });
    if (canceled || !filePath) return { canceled: true };
    try {
      const backup = {
        app: 'promptbox',
        exportedAt: new Date().toISOString(),
        folders: data.folders,
        prompts: data.prompts
      };
      fs.writeFileSync(filePath, JSON.stringify(backup, null, 2), 'utf-8');
      return { canceled: false, path: filePath };
    } catch (error) {
      console.error('Error exporting backup:', error);
      return { canceled: false, error: error.message };
    }
  });

  ipcMain.handle('db:import', async (event) => {
    const win = BrowserWindow.fromWebContents(event.sender);
    const { canceled, filePaths } = await dialog.showOpenDialog(win, {
      title: 'Import PromptBox Backup',
      filters: [{ name: 'JSON Files', extensions: ['json'] }],
      properties: ['openFile']
    });
    if (canceled || filePaths.length === 0) return { canceled: true };
    try {
      const raw = fs.readFileSync(filePaths[0], 'utf-8');
      return { canceled: false, data: JSON.parse(raw) };
    } catch (error) {
      console.error('Error importing backup:', error);
      return { canceled: false, error: 'Could not read the file as JSON.' };
    }
  });

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
