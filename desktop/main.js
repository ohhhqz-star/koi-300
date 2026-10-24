'use strict';

const { app, BrowserWindow, Menu, dialog, shell } = require('electron');
const path = require('path');
const fs = require('fs');

app.setName('Koi 300');
app.setAppUserModelId('com.koi300.app');

const gotLock = app.requestSingleInstanceLock();
if (!gotLock) {
  app.quit();
} else {
  let mainWindow = null;
  let serverInfo = null;
  let dataDir = '';

  const runtimeRoot = app.isPackaged
    ? process.resourcesPath
    : path.resolve(__dirname, '..');

  function resolveDataDir() {
    const dir = path.join(app.getPath('userData'), 'data');
    fs.mkdirSync(dir, { recursive: true });
    return dir;
  }

  // Carry data over from the previous Chinese app name so a rename never
  // leaves existing records behind in an orphaned folder.
  function migrateLegacyUserData() {
    const current = app.getPath('userData');
    const parent = path.dirname(current);
    const targetData = path.join(current, 'data');
    if (fs.existsSync(path.join(targetData, 'portfolio.json'))) return;
    for (const legacyName of ['复盘 300', 'fupan300-desktop']) {
      const legacyData = path.join(parent, legacyName, 'data');
      if (path.resolve(path.join(parent, legacyName)) === path.resolve(current)) continue;
      if (!fs.existsSync(path.join(legacyData, 'portfolio.json'))) continue;
      fs.mkdirSync(targetData, { recursive: true });
      for (const entry of fs.readdirSync(legacyData)) {
        const from = path.join(legacyData, entry);
        const to = path.join(targetData, entry);
        if (!fs.existsSync(to)) fs.cpSync(from, to, { recursive: true });
      }
      return;
    }
  }

  async function backupFromMenu() {
    try {
      const result = await serverInfo.api.backup();
      await dialog.showMessageBox(mainWindow, {
        type: 'info',
        title: '备份完成',
        message: '已在本机保存一份数据备份。',
        detail: result.path,
        buttons: ['好']
      });
    } catch (error) {
      await dialog.showMessageBox(mainWindow, {
        type: 'error',
        title: '备份失败',
        message: error.message || '无法写入备份文件。',
        buttons: ['好']
      });
    }
  }

  function buildMenu() {
    const template = [
      {
        label: '文件',
        submenu: [
          {
            label: '打开数据文件夹',
            accelerator: 'CmdOrCtrl+D',
            click: () => shell.openPath(dataDir)
          },
          {
            label: '立即备份数据',
            accelerator: 'CmdOrCtrl+B',
            click: () => backupFromMenu()
          },
          { type: 'separator' },
          { role: 'quit', label: '退出' }
        ]
      },
      { role: 'editMenu', label: '编辑' },
      {
        label: '视图',
        submenu: [
          { role: 'reload', label: '重新载入' },
          { role: 'toggleDevTools', label: '开发者工具' },
          { type: 'separator' },
          { role: 'resetZoom', label: '实际大小' },
          { role: 'zoomIn', label: '放大' },
          { role: 'zoomOut', label: '缩小' },
          { type: 'separator' },
          { role: 'togglefullscreen', label: '全屏' }
        ]
      },
      {
        label: '帮助',
        submenu: [
          {
            label: '关于 Koi 300',
            click: () => {
              dialog.showMessageBox(mainWindow, {
                type: 'info',
                title: 'Koi 300',
                message: 'Koi 300 · 本地优先的投资复盘',
                detail: [
                  `版本 ${app.getVersion()}`,
                  '',
                  '数据只保存在这台电脑，不上传云端。',
                  `数据目录：${dataDir}`,
                  '',
                  '在买入前，先写 300 次。'
                ].join('\n'),
                buttons: ['好']
              });
            }
          }
        ]
      }
    ];
    Menu.setApplicationMenu(Menu.buildFromTemplate(template));
  }

  function createWindow() {
    mainWindow = new BrowserWindow({
      width: 1360,
      height: 900,
      minWidth: 1060,
      minHeight: 700,
      title: 'Koi 300',
      backgroundColor: '#F6F2EA',
      autoHideMenuBar: false,
      webPreferences: {
        contextIsolation: true,
        nodeIntegration: false,
        sandbox: true,
        spellcheck: false
      }
    });

    mainWindow.loadURL(serverInfo.url);
    mainWindow.on('page-title-updated', (event) => {
      event.preventDefault();
      mainWindow.setTitle('Koi 300');
    });
    mainWindow.on('closed', () => { mainWindow = null; });
    mainWindow.webContents.setWindowOpenHandler(({ url }) => {
      shell.openExternal(url);
      return { action: 'deny' };
    });
    mainWindow.webContents.on('will-navigate', (event, url) => {
      if (!url.startsWith(serverInfo.url)) event.preventDefault();
    });
  }

  async function boot() {
    migrateLegacyUserData();
    dataDir = resolveDataDir();
    try {
      const { startWithFallback } = require(path.join(runtimeRoot, 'server', 'server.js'));
      serverInfo = await startWithFallback({ dataDir, port: 4877, open: false });
    } catch (error) {
      dialog.showErrorBox('Koi 300 无法启动', error.message || String(error));
      app.quit();
      return;
    }
    buildMenu();
    createWindow();
    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) createWindow();
    });
  }

  app.whenReady().then(boot);

  app.on('second-instance', () => {
    if (!mainWindow) return;
    if (mainWindow.isMinimized()) mainWindow.restore();
    mainWindow.show();
    mainWindow.focus();
  });

  app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') app.quit();
  });

  app.on('before-quit', () => {
    if (serverInfo?.server) {
      serverInfo.server.close();
      serverInfo = null;
    }
  });
}
