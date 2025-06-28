/**
 * Preload脚本
 * 在渲染进程加载之前执行，用于安全地暴露主进程API给渲染进程
 */

import { contextBridge, ipcRenderer } from 'electron';

// 定义暴露给渲染进程的API
const api = {
  // 对话框相关
  dialog: {
    openFile: () => ipcRenderer.invoke('dialog:openFile'),
    selectDirectory: () => ipcRenderer.invoke('dialog:selectDirectory')
  },
  
  // FFmpeg相关
  ffmpeg: {
    getVideoInfo: (filePath: string) => ipcRenderer.invoke('ffmpeg:getVideoInfo', filePath),
    startTranscode: (options: any) => ipcRenderer.invoke('ffmpeg:startTranscode', options),
    pauseTranscode: (taskId: string) => ipcRenderer.invoke('ffmpeg:pauseTranscode', taskId),
    resumeTranscode: (taskId: string) => ipcRenderer.invoke('ffmpeg:resumeTranscode', taskId),
    cancelTranscode: (taskId: string) => ipcRenderer.invoke('ffmpeg:cancelTranscode', taskId),
    detectHardwareAccel: () => ipcRenderer.invoke('ffmpeg:detectHardwareAccel'),
    getLogReport: (taskId?: string) => ipcRenderer.invoke('ffmpeg:getLogReport', taskId),
    generateLogReport: (taskId?: string) => ipcRenderer.invoke('ffmpeg:generateLogReport', taskId),
    onProgress: (callback: (data: any) => void) => {
      ipcRenderer.on('ffmpeg:progress', (event, data) => callback(data));
    },
    onCompleted: (callback: (data: any) => void) => {
      ipcRenderer.on('ffmpeg:completed', (event, data) => callback(data));
    },
    onFailed: (callback: (data: any) => void) => {
      ipcRenderer.on('ffmpeg:failed', (event, data) => callback(data));
    },
    onHardwareFallback: (callback: (data: any) => void) => {
      ipcRenderer.on('ffmpeg:hardware-fallback', (event, data) => callback(data));
    },
    onHardwareValidationFailed: (callback: (data: any) => void) => {
      ipcRenderer.on('ffmpeg:hardware-validation-failed', (event, data) => callback(data));
    }
  },
  
  // 存储相关
  store: {
    getPresets: () => ipcRenderer.invoke('store:getPresets'),
    savePreset: (preset: any) => ipcRenderer.invoke('store:savePreset', preset),
    deletePreset: (presetId: string) => ipcRenderer.invoke('store:deletePreset', presetId),
    getSettings: () => ipcRenderer.invoke('store:getSettings'),
    saveSettings: (settings: any) => ipcRenderer.invoke('store:saveSettings', settings),
    resetPresets: () => ipcRenderer.invoke('store:resetPresets')
  },
  
  // 菜单事件监听
  menu: {
    onAddFiles: (callback: () => void) => {
      ipcRenderer.on('menu-add-files', callback);
    },
    onClearQueue: (callback: () => void) => {
      ipcRenderer.on('menu-clear-queue', callback);
    },
    onShowHelp: (callback: () => void) => {
      ipcRenderer.on('menu-show-help', callback);
    },
    onShowAbout: (callback: () => void) => {
      ipcRenderer.on('menu-show-about', callback);
    },
    onShowSettings: (callback: () => void) => {
      ipcRenderer.on('menu-show-settings', callback);
    }
  }
};

// 通过contextBridge安全地暴露API
contextBridge.exposeInMainWorld('electronAPI', api); 