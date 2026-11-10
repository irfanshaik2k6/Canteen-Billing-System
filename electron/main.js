const { app, BrowserWindow, dialog } = require('electron');
const path = require('path');

let mainWindow = null;
let serverInstance = null;
const PORT = process.env.PORT || 3000;
const SERVER_URL = `http://localhost:${PORT}`;

function startBackendAndWindow() {
  try {
    // Require Express app from backend
    const { app: expressApp } = require('../backend/server');

    serverInstance = expressApp.listen(PORT, () => {
      console.log(`[Electron] Canteen Backend successfully running on ${SERVER_URL}`);
      createWindow();
    });

    serverInstance.on('error', (err) => {
      if (err.code === 'EADDRINUSE') {
        console.log(`[Electron] Port ${PORT} already in use; attaching to existing server...`);
        createWindow();
      } else {
        console.error('[Electron] Server error:', err);
        dialog.showErrorBox('Backend Error', 'Failed to start Canteen server: ' + err.message);
      }
    });
  } catch (err) {
    console.error('[Electron] Failed to start backend server:', err);
    dialog.showErrorBox('Startup Error', 'Could not start Canteen server: ' + err.message);
  }
}

function createWindow() {
  if (mainWindow) return;

  mainWindow = new BrowserWindow({
    width: 1366,
    height: 900,
    minWidth: 1024,
    minHeight: 700,
    title: 'Canteen Ordering & Billing POS',
    icon: path.join(__dirname, '..', 'web', 'icons', 'icon-512.png'),
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true
    },
    autoHideMenuBar: true
  });

  mainWindow.loadURL(SERVER_URL);

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.whenReady().then(() => {
  startBackendAndWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('before-quit', () => {
  if (serverInstance) {
    console.log('[Electron] Shutting down backend server...');
    serverInstance.close();
  }
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
