/**
 * Electron主进程入口文件
 * 负责创建应用窗口、管理应用生命周期、处理系统级事件
 */

import { app, BrowserWindow, ipcMain, dialog, Menu, globalShortcut } from 'electron';
import * as path from 'path';
import { FFmpegManager } from './ffmpeg-manager';
import { StoreManager } from './store-manager';

// 保持窗口对象的全局引用
let mainWindow: BrowserWindow | null = null;
let ffmpegManager: FFmpegManager;
let storeManager: StoreManager;

/**
 * 创建主窗口
 */
function createWindow() {
  // 创建浏览器窗口
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 1000,
    minHeight: 600,
    center: true,        // 窗口居中显示
    show: false,         // 先不显示，等加载完成后再显示
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js')
    },
    icon: path.join(__dirname, 'assets/icon.png'),
    title: '视频转码工具'
  });

  // 加载应用的index.html
  const indexPath = path.join(__dirname, 'index.html');
  console.log('加载页面路径:', indexPath);
  
  mainWindow.loadFile(indexPath).catch((error) => {
    console.error('页面加载失败:', error);
    // 如果页面加载失败，仍然显示窗口以便调试
    mainWindow?.show();
  });

  // 页面加载完成后显示窗口
  mainWindow.once('ready-to-show', () => {
    console.log('页面准备就绪，显示窗口');
    mainWindow?.show();
    mainWindow?.focus(); // 确保窗口获得焦点
  });

  // 添加超时保护，确保窗口一定会显示
  setTimeout(() => {
    if (mainWindow && !mainWindow.isVisible()) {
      console.log('超时保护：强制显示窗口');
      mainWindow.show();
    }
  }, 3000);

  // 打开开发者工具（开发模式）- 默认关闭，可通过F12或菜单打开
  // if (process.env.NODE_ENV === 'development') {
  //   mainWindow.webContents.openDevTools();
  // }

  // 当窗口关闭时触发
  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  // 创建应用菜单
  createApplicationMenu();
  
  // 注册全局快捷键
  registerGlobalShortcuts();
}

/**
 * 注册全局快捷键
 */
function registerGlobalShortcuts() {
  // F1 - 显示帮助
  globalShortcut.register('F1', () => {
    mainWindow?.webContents.send('menu-show-help');
  });
  
  // Ctrl+O - 添加文件
  globalShortcut.register('CmdOrCtrl+O', () => {
    mainWindow?.webContents.send('menu-add-files');
  });
  
  // Ctrl+Shift+C - 清空队列
  globalShortcut.register('CmdOrCtrl+Shift+C', () => {
    mainWindow?.webContents.send('menu-clear-queue');
  });
  
  // Ctrl+, - 设置
  globalShortcut.register('CmdOrCtrl+,', () => {
    mainWindow?.webContents.send('menu-show-settings');
  });
}

/**
 * 创建应用菜单
 */
function createApplicationMenu() {
  const template: any[] = [
    {
      label: '文件',
      submenu: [
        {
          label: '添加视频文件',
          accelerator: 'CmdOrCtrl+O',
          click: () => {
            mainWindow?.webContents.send('menu-add-files');
          }
        },
        {
          label: '清空任务队列',
          accelerator: 'CmdOrCtrl+Shift+C',
          click: () => {
            mainWindow?.webContents.send('menu-clear-queue');
          }
        },
        {
          label: '设置',
          accelerator: 'CmdOrCtrl+,',
          click: () => {
            mainWindow?.webContents.send('menu-show-settings');
          }
        },
        { type: 'separator' },
        {
          label: '退出',
          accelerator: process.platform === 'darwin' ? 'Cmd+Q' : 'Ctrl+Q',
          click: () => {
            app.quit();
          }
        }
      ]
    },
    {
      label: '编辑',
      submenu: [
        { label: '撤销', accelerator: 'CmdOrCtrl+Z', role: 'undo' },
        { label: '重做', accelerator: 'Shift+CmdOrCtrl+Z', role: 'redo' },
        { type: 'separator' },
        { label: '剪切', accelerator: 'CmdOrCtrl+X', role: 'cut' },
        { label: '复制', accelerator: 'CmdOrCtrl+C', role: 'copy' },
        { label: '粘贴', accelerator: 'CmdOrCtrl+V', role: 'paste' }
      ]
    },
    {
      label: '视图',
      submenu: [
        { label: '重新加载', accelerator: 'CmdOrCtrl+R', role: 'reload' },
        { label: '强制重新加载', accelerator: 'CmdOrCtrl+Shift+R', role: 'forceReload' },
        { label: '开发者工具', accelerator: 'F12', role: 'toggleDevTools' },
        { type: 'separator' },
        { label: '实际大小', accelerator: 'CmdOrCtrl+0', role: 'resetZoom' },
        { label: '放大', accelerator: 'CmdOrCtrl+Plus', role: 'zoomIn' },
        { label: '缩小', accelerator: 'CmdOrCtrl+-', role: 'zoomOut' },
        { type: 'separator' },
        { label: '全屏', accelerator: 'F11', role: 'togglefullscreen' }
      ]
    },
    {
      label: '帮助',
      submenu: [
        {
          label: '使用教程',
          accelerator: 'F1',
          click: () => {
            mainWindow?.webContents.send('menu-show-help');
          }
        },
        {
          label: '关于',
          click: () => {
            mainWindow?.webContents.send('menu-show-about');
          }
        }
      ]
    }
  ];

  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);
}

// 禁用 GPU 加速以解决 Windows 上的 GPU 错误
app.commandLine.appendSwitch('disable-gpu');
app.commandLine.appendSwitch('disable-gpu-sandbox');

// 当Electron完成初始化并准备创建浏览器窗口时调用
app.whenReady().then(() => {
  console.log('Electron应用已准备就绪');
  console.log('应用路径:', app.getAppPath());
  console.log('__dirname:', __dirname);
  
  // 初始化管理器
  try {
    ffmpegManager = new FFmpegManager();
    storeManager = new StoreManager();
    console.log('管理器初始化成功');
  } catch (error) {
    console.error('管理器初始化失败:', error);
  }
  
  createWindow();

  app.on('activate', () => {
    // 在macOS上，当dock图标被点击并且没有其他窗口打开时，重新创建窗口
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
}).catch((error) => {
  console.error('应用启动失败:', error);
});

// 当所有窗口都关闭时退出应用（除了macOS）
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// 应用即将退出时清理全局快捷键
app.on('will-quit', () => {
  globalShortcut.unregisterAll();
});

// IPC通信处理
// 选择文件对话框
ipcMain.handle('dialog:openFile', async () => {
  const result = await dialog.showOpenDialog(mainWindow!, {
    properties: ['openFile', 'multiSelections'],
    filters: [
      { name: '视频文件', extensions: ['mp4', 'avi', 'mkv', 'mov', 'wmv', 'flv', 'webm'] },
      { name: '所有文件', extensions: ['*'] }
    ]
  });
  return result;
});

// 选择输出目录对话框
ipcMain.handle('dialog:selectDirectory', async () => {
  const result = await dialog.showOpenDialog(mainWindow!, {
    properties: ['openDirectory']
  });
  return result;
});

// FFmpeg相关操作
ipcMain.handle('ffmpeg:getVideoInfo', async (event, filePath: string) => {
  try {
    console.log('主进程收到getVideoInfo请求:', filePath);
    const result = await ffmpegManager.getVideoInfo(filePath);
    console.log('视频信息获取成功');
    return result;
  } catch (error) {
    console.error('主进程getVideoInfo错误:', error);
    throw error;
  }
});

ipcMain.handle('ffmpeg:startTranscode', async (event, options: any) => {
  return await ffmpegManager.startTranscode(options);
});

ipcMain.handle('ffmpeg:pauseTranscode', async (event, taskId: string) => {
  return await ffmpegManager.pauseTranscode(taskId);
});

ipcMain.handle('ffmpeg:resumeTranscode', async (event, taskId: string) => {
  return await ffmpegManager.resumeTranscode(taskId);
});

ipcMain.handle('ffmpeg:cancelTranscode', async (event, taskId: string) => {
  return await ffmpegManager.cancelTranscode(taskId);
});

ipcMain.handle('ffmpeg:getTaskProgress', async (event, taskId: string) => {
  return ffmpegManager.getTaskProgress(taskId);
});

ipcMain.handle('ffmpeg:detectHardwareAccel', async () => {
  return await ffmpegManager.detectHardwareAccel();
});

ipcMain.handle('ffmpeg:getLogReport', async (event, taskId?: string) => {
  return ffmpegManager.getLogReport(taskId);
});

ipcMain.handle('ffmpeg:generateLogReport', async (event, taskId?: string) => {
  return await ffmpegManager.generateLogReport(taskId);
});

// 配置存储相关操作
ipcMain.handle('store:getPresets', async () => {
  return storeManager.getPresets();
});

ipcMain.handle('store:savePreset', async (event, preset: any) => {
  return storeManager.savePreset(preset);
});

ipcMain.handle('store:deletePreset', async (event, presetId: string) => {
  return storeManager.deletePreset(presetId);
});

ipcMain.handle('store:getSettings', async () => {
  return storeManager.getSettings();
});

ipcMain.handle('store:saveSettings', async (event, settings: any) => {
  return storeManager.saveSettings(settings);
});

ipcMain.handle('store:resetPresets', async () => {
  return storeManager.resetPresets();
});

// 进度更新事件转发
ipcMain.on('ffmpeg:progress', (event, data) => {
  mainWindow?.webContents.send('ffmpeg:progress', data);
}); 