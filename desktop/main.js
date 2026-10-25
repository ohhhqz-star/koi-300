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
  let uiLang = 'zh';

  const T = (zh, en) => (uiLang === 'zh' ? zh : en);

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
        title: T('备份完成', 'Backup complete'),
        message: T('已在本机保存一份数据备份。', 'A backup was saved on this computer.'),
        detail: result.path,
        buttons: [T('好', 'OK')]
      });
    } catch (error) {
      await dialog.showMessageBox(mainWindow, {
        type: 'error',
        title: T('备份失败', 'Backup failed'),
        message: error.message || T('无法写入备份文件。', 'Could not write the backup file.'),
        buttons: [T('好', 'OK')]
      });
    }
  }

  function buildMenu() {
    const template = [
      {
        label: T('文件', 'File'),
        submenu: [
          {
            label: T('打开数据文件夹', 'Open data folder'),
            accelerator: 'CmdOrCtrl+D',
            click: () => shell.openPath(dataDir)
          },
          {
            label: T('立即备份数据', 'Back up now'),
            accelerator: 'CmdOrCtrl+B',
            click: () => backupFromMenu()
          },
          { type: 'separator' },
          { role: 'quit', label: T('退出', 'Quit') }
        ]
      },
      { role: 'editMenu', label: T('编辑', 'Edit') },
      {
        label: T('视图', 'View'),
        submenu: [
          { role: 'reload', label: T('重新载入', 'Reload') },
          { role: 'toggleDevTools', label: T('开发者工具', 'Developer tools') },
          { type: 'separator' },
          { role: 'resetZoom', label: T('实际大小', 'Actual size') },
          { role: 'zoomIn', label: T('放大', 'Zoom in') },
          { role: 'zoomOut', label: T('缩小', 'Zoom out') },
          { type: 'separator' },
          { role: 'togglefullscreen', label: T('全屏', 'Toggle full screen') }
        ]
      },
      {
        label: T('帮助', 'Help'),
        submenu: [
          {
            label: T('关于 锦记 Koi 300', 'About Koi 300 锦记'),
            click: () => {
              dialog.showMessageBox(mainWindow, {
                type: 'info',
                title: T('锦记', 'Koi 300'),
                message: T('锦记 · 本地优先的投资复盘', 'Koi 300 · A local-first investment review journal'),
                detail: [
                  T(`版本 ${app.getVersion()}`, `Version ${app.getVersion()}`),
                  '',
                  T('数据只保存在这台电脑，不上传云端。', 'All data stays on this computer. Nothing is uploaded.'),
                  T(`数据目录：${dataDir}`, `Data folder: ${dataDir}`),
                  '',
                  T('在买入前，先写 300 次。', 'Write 300 entries before you buy.')
                ].join('\n'),
                buttons: [T('好', 'OK')]
              });
            }
          }
        ]
      }
    ];
    Menu.setApplicationMenu(Menu.buildFromTemplate(template));
  }

  async function syncLanguage() {
    if (!mainWindow) return;
    let lang;
    try {
      lang = await mainWindow.webContents.executeJavaScript(
        "(function(){try{var v=localStorage.getItem('koi300.lang');if(v==='zh'||v==='en')return v;}catch(e){}" +
          "return (navigator.language||'').toLowerCase().indexOf('zh')===0?'zh':'en';})()",
        true
      );
    } catch {
      lang = (app.getLocale() || '').toLowerCase().startsWith('zh') ? 'zh' : 'en';
    }
    uiLang = lang === 'en' ? 'en' : 'zh';
    buildMenu();
    mainWindow.setTitle(uiLang === 'zh' ? '锦记' : 'Koi 300');
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
      mainWindow.setTitle(uiLang === 'zh' ? '锦记' : 'Koi 300');
    });
    mainWindow.webContents.on('did-finish-load', syncLanguage);
    mainWindow.webContents.on('did-navigate', syncLanguage);
    mainWindow.webContents.on('did-navigate-in-page', syncLanguage);
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
    uiLang = (app.getLocale() || '').toLowerCase().startsWith('zh') ? 'zh' : 'en';
    dataDir = resolveDataDir();
    try {
      const { startWithFallback } = require(path.join(runtimeRoot, 'server', 'server.js'));
      serverInfo = await startWithFallback({ dataDir, port: 4877, open: false });
    } catch (error) {
      dialog.showErrorBox(
        T('锦记 无法启动', 'Koi 300 could not start'),
        error.message || String(error)
      );
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
