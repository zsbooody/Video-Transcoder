/**
 * 存储管理器
 * 负责管理应用的预设配置和设置的持久化存储
 */

import Store from 'electron-store';

// 预设配置接口
interface Preset {
  id: string;
  name: string;
  description?: string;
  outputFormat: string;
  videoCodec?: string;
  audioCodec?: string;
  videoBitrate?: string;
  audioBitrate?: string;
  resolution?: string;
  fps?: number;
  preset?: string;
  createdAt: Date;
  updatedAt: Date;
}

// 应用设置接口
interface AppSettings {
  outputDirectory: string;
  theme: 'light' | 'dark';
  language: 'zh-CN' | 'en-US';
  autoStart: boolean;
  maxConcurrentTasks: number;
  hardwareAcceleration: boolean;
  preserveMetadata: boolean;
  notifyOnComplete: boolean;
}

export class StoreManager {
  private store: Store<any>;
  
  constructor() {
    // 初始化electron-store
    this.store = new Store({
      name: 'video-transcoder-config',
      defaults: {
        presets: this.getDefaultPresets(),
        settings: this.getDefaultSettings()
      }
    });
  }

  /**
   * 获取默认预设
   */
  private getDefaultPresets(): Preset[] {
    const now = new Date();
    return [
      {
        id: 'preset_1',
        name: '高质量MP4',
        description: '适合高质量视频存储',
        outputFormat: 'mp4',
        videoCodec: 'libx264',
        audioCodec: 'aac',
        videoBitrate: '5000k',
        audioBitrate: '192k',
        resolution: '1920x1080',
        fps: 30,
        preset: 'slow',
        createdAt: now,
        updatedAt: now
      },
      {
        id: 'preset_2',
        name: '快速压缩',
        description: '快速压缩，文件较小',
        outputFormat: 'mp4',
        videoCodec: 'libx264',
        audioCodec: 'aac',
        videoBitrate: '2000k',
        audioBitrate: '128k',
        resolution: '1280x720',
        fps: 30,
        preset: 'fast',
        createdAt: now,
        updatedAt: now
      },
      {
        id: 'preset_3',
        name: 'Web优化',
        description: '适合网页播放的视频格式',
        outputFormat: 'mp4',
        videoCodec: 'libx264',
        audioCodec: 'aac',
        videoBitrate: '1500k',
        audioBitrate: '128k',
        resolution: '1280x720',
        fps: 30,
        preset: 'medium',
        createdAt: now,
        updatedAt: now
      },
      {
        id: 'preset_4',
        name: '音频提取',
        description: '从视频中提取音频',
        outputFormat: 'mp3',
        audioCodec: 'libmp3lame',
        audioBitrate: '320k',
        createdAt: now,
        updatedAt: now
      },
      {
        id: 'preset_5',
        name: 'MKV复制封装',
        description: '🚀 快速复制封装到MKV容器，速度极快，质量无损',
        outputFormat: 'mkv',
        // 不设置videoCodec和audioCodec，触发复制封装模式
        createdAt: now,
        updatedAt: now
      },
      {
        id: 'preset_6',
        name: 'MP4复制封装',
        description: '🚀 快速复制封装到MP4容器，速度极快，质量无损',
        outputFormat: 'mp4',
        // 不设置videoCodec和audioCodec，触发复制封装模式
        createdAt: now,
        updatedAt: now
      },
      {
        id: 'preset_7',
        name: 'AVI复制封装',
        description: '🚀 快速复制封装到AVI容器，速度极快，质量无损',
        outputFormat: 'avi',
        // 不设置videoCodec和audioCodec，触发复制封装模式
        createdAt: now,
        updatedAt: now
      }
    ];
  }

  /**
   * 获取默认设置
   */
  private getDefaultSettings(): AppSettings {
    return {
      outputDirectory: '',
      theme: 'light',
      language: 'zh-CN',
      autoStart: false,
      maxConcurrentTasks: 2,
      hardwareAcceleration: true,
      preserveMetadata: true,
      notifyOnComplete: true
    };
  }

  /**
   * 获取所有预设
   */
  getPresets(): Preset[] {
    const presets = this.store.get('presets', []) as Preset[];
    
    // 检查是否有复制封装预设，如果没有则添加
    const hasStreamCopyPresets = presets.some(p => p.name.includes('复制封装'));
    if (!hasStreamCopyPresets) {
      console.log('检测到缺少复制封装预设，正在添加...');
      const updatedPresets = this.addStreamCopyPresets(presets);
      this.store.set('presets', updatedPresets);
      return updatedPresets;
    }
    
    return presets;
  }

  /**
   * 添加复制封装预设到现有预设列表
   */
  private addStreamCopyPresets(existingPresets: Preset[]): Preset[] {
    const now = new Date();
    const streamCopyPresets: Preset[] = [
      {
        id: 'preset_stream_copy_mkv',
        name: 'MKV复制封装',
        description: '🚀 快速复制封装到MKV容器，速度极快，质量无损',
        outputFormat: 'mkv',
        // 不设置videoCodec和audioCodec，触发复制封装模式
        createdAt: now,
        updatedAt: now
      },
      {
        id: 'preset_stream_copy_mp4',
        name: 'MP4复制封装',
        description: '🚀 快速复制封装到MP4容器，速度极快，质量无损',
        outputFormat: 'mp4',
        // 不设置videoCodec和audioCodec，触发复制封装模式
        createdAt: now,
        updatedAt: now
      },
      {
        id: 'preset_stream_copy_avi',
        name: 'AVI复制封装',
        description: '🚀 快速复制封装到AVI容器，速度极快，质量无损',
        outputFormat: 'avi',
        // 不设置videoCodec和audioCodec，触发复制封装模式
        createdAt: now,
        updatedAt: now
      }
    ];

    return [...existingPresets, ...streamCopyPresets];
  }

  /**
   * 获取单个预设
   */
  getPreset(presetId: string): Preset | undefined {
    const presets = this.getPresets();
    return presets.find(p => p.id === presetId);
  }

  /**
   * 保存预设
   */
  savePreset(preset: Omit<Preset, 'id' | 'createdAt' | 'updatedAt'>): Preset {
    const presets = this.getPresets();
    const now = new Date();
    
    const newPreset: Preset = {
      ...preset,
      id: `preset_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      createdAt: now,
      updatedAt: now
    };
    
    presets.push(newPreset);
    this.store.set('presets', presets);
    
    return newPreset;
  }

  /**
   * 更新预设
   */
  updatePreset(presetId: string, updates: Partial<Preset>): Preset | undefined {
    const presets = this.getPresets();
    const index = presets.findIndex(p => p.id === presetId);
    
    if (index === -1) {
      return undefined;
    }
    
    presets[index] = {
      ...presets[index],
      ...updates,
      id: presetId,
      updatedAt: new Date()
    };
    
    this.store.set('presets', presets);
    return presets[index];
  }

  /**
   * 删除预设
   */
  deletePreset(presetId: string): boolean {
    const presets = this.getPresets();
    const filteredPresets = presets.filter(p => p.id !== presetId);
    
    if (filteredPresets.length === presets.length) {
      return false;
    }
    
    this.store.set('presets', filteredPresets);
    return true;
  }

  /**
   * 重置预设到默认状态（包含所有新预设）
   */
  resetPresets(): Preset[] {
    console.log('重置预设到默认状态...');
    const defaultPresets = this.getDefaultPresets();
    this.store.set('presets', defaultPresets);
    return defaultPresets;
  }

  /**
   * 获取应用设置
   */
  getSettings(): AppSettings {
    return this.store.get('settings', this.getDefaultSettings()) as AppSettings;
  }

  /**
   * 保存应用设置
   */
  saveSettings(settings: Partial<AppSettings>): AppSettings {
    const currentSettings = this.getSettings();
    const updatedSettings = {
      ...currentSettings,
      ...settings
    };
    
    this.store.set('settings', updatedSettings);
    return updatedSettings;
  }

  /**
   * 重置为默认设置
   */
  resetSettings(): AppSettings {
    const defaultSettings = this.getDefaultSettings();
    this.store.set('settings', defaultSettings);
    return defaultSettings;
  }

  /**
   * 导出配置
   */
  exportConfig(): { presets: Preset[]; settings: AppSettings } {
    return {
      presets: this.getPresets(),
      settings: this.getSettings()
    };
  }

  /**
   * 导入配置
   */
  importConfig(config: { presets?: Preset[]; settings?: AppSettings }): void {
    if (config.presets) {
      this.store.set('presets', config.presets);
    }
    
    if (config.settings) {
      this.store.set('settings', config.settings);
    }
  }
} 