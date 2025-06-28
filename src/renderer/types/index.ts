/**
 * 应用类型定义
 * 定义应用中使用的所有TypeScript接口和类型
 */

// 视频信息接口
export interface VideoInfo {
  format: any;
  streams: any[];
  duration: number;
  size: number;
  bitrate: number;
  videoCodec?: string;
  audioCodec?: string;
  resolution?: string;
  fps?: number;
}

// 转码任务接口
export interface TranscodeTask {
  id: string;
  inputFile: string;
  outputFile: string;
  status: 'pending' | 'running' | 'paused' | 'completed' | 'failed' | 'cancelled';
  progress: number;
  startTime?: Date;
  endTime?: Date;
  error?: string;
  transcodeId?: string;
  videoInfo?: VideoInfo;
}

// 转码选项接口
export interface TranscodeOptions {
  outputFormat: string;
  videoCodec?: string;
  audioCodec?: string;
  videoBitrate?: string;
  audioBitrate?: string;
  resolution?: string;
  fps?: number;
  preset?: string;
  hardwareAccel?: string;
  hwaccelDevice?: string;
}

// 预设配置接口
export interface Preset {
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
export interface AppSettings {
  outputDirectory: string;
  theme: 'light' | 'dark';
  language: 'zh-CN' | 'en-US';
  autoStart: boolean;
  maxConcurrentTasks: number;
  hardwareAcceleration: boolean;
  preserveMetadata: boolean;
  notifyOnComplete: boolean;
}

// 文件选择结果接口
export interface FileDialogResult {
  canceled: boolean;
  filePaths: string[];
}

// 目录选择结果接口
export interface DirectoryDialogResult {
  canceled: boolean;
  filePaths: string[];
}

// 进度数据接口
export interface ProgressData {
  taskId: string;
  progress: number;
  status: string;
  timemark?: string;
  currentFps?: number;
  currentKbps?: number;
  targetSize?: number;
  error?: string;
  hardwareAccel?: string;
}

// 硬件加速选项接口
export interface HardwareAccelOption {
  name: string;
  type: string;
  description: string;
}

// 硬件加速回退数据接口
export interface HardwareFallbackData {
  taskId: string;
  originalHardwareAccel: string;
  error: string;
  inputFile: string;
}

// 扩展Window接口，添加electronAPI
declare global {
  interface Window {
    electronAPI: {
      dialog: {
        openFile: () => Promise<FileDialogResult>;
        selectDirectory: () => Promise<DirectoryDialogResult>;
      };
      ffmpeg: {
        getVideoInfo: (filePath: string) => Promise<VideoInfo>;
        startTranscode: (options: any) => Promise<string>;
        pauseTranscode: (taskId: string) => Promise<boolean>;
        resumeTranscode: (taskId: string) => Promise<boolean>;
        cancelTranscode: (taskId: string) => Promise<boolean>;
        detectHardwareAccel: () => Promise<HardwareAccelOption[]>;
        getLogReport: (taskId?: string) => Promise<any>;
        generateLogReport: (taskId?: string) => Promise<string>;
        onProgress: (callback: (data: ProgressData) => void) => void;
        onCompleted: (callback: (data: any) => void) => void;
        onFailed: (callback: (data: any) => void) => void;
        onHardwareFallback: (callback: (data: HardwareFallbackData) => void) => void;
        onHardwareValidationFailed: (callback: (data: {
          taskId: string;
          hardwareAccel: string;
          videoCodec: string;
        }) => void) => void;
      };
      store: {
        getPresets: () => Promise<Preset[]>;
        savePreset: (preset: any) => Promise<Preset>;
        deletePreset: (presetId: string) => Promise<boolean>;
        getSettings: () => Promise<AppSettings>;
        saveSettings: (settings: Partial<AppSettings>) => Promise<AppSettings>;
        resetPresets: () => Promise<Preset[]>;
      };
      menu: {
        onAddFiles: (callback: () => void) => void;
        onClearQueue: (callback: () => void) => void;
        onShowHelp: (callback: () => void) => void;
        onShowAbout: (callback: () => void) => void;
        onShowSettings: (callback: () => void) => void;
      };
    };
  }
} 