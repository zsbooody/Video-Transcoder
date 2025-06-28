/**
 * FFmpeg管理器
 * 负责管理FFmpeg进程、处理视频转码任务、生成详细日志报告
 */

import * as path from 'path';
import * as fs from 'fs';
import ffmpeg from 'fluent-ffmpeg';
import { app } from 'electron';

// 日志级别枚举
enum LogLevel {
  DEBUG = 'DEBUG',
  INFO = 'INFO',
  WARN = 'WARN',
  ERROR = 'ERROR'
}

// 日志条目接口
interface LogEntry {
  timestamp: string;
  level: LogLevel;
  category: string;
  message: string;
  data?: any;
  taskId?: string;
}

// 硬件验证结果接口
interface HardwareValidationResult {
  isValid: boolean;
  encoder: string;
  hardwareType: string;
  errorMessage?: string;
  validationTime: number;
  systemInfo?: any;
}

// 转码统计信息接口
interface TranscodeStats {
  inputSize: number;
  outputSize: number;
  compressionRatio: number;
  averageSpeed: number;
  peakSpeed: number;
  duration: number;
  hardwareAccel: string;
  actualEncoder: string;
  errorCount: number;
  warnings: string[];
}

// 转码任务接口定义
interface TranscodeTask {
  id: string;
  inputFile: string;
  outputFile: string;
  options: TranscodeOptions;
  status: 'pending' | 'running' | 'paused' | 'completed' | 'failed' | 'cancelled';
  progress: number;
  startTime?: Date;
  endTime?: Date;
  error?: string;
  command?: any;
  stats?: TranscodeStats;
  logs: LogEntry[];
}

// 转码选项接口定义
interface TranscodeOptions {
  outputFormat: string;
  videoCodec?: string;
  audioCodec?: string;
  videoBitrate?: string;
  audioBitrate?: string;
  resolution?: string;
  fps?: number;
  preset?: string;
  hardwareAccel?: string; // 硬件加速类型
  hwaccelDevice?: string; // 硬件加速设备
}

// 视频信息接口定义
interface VideoInfo {
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

export class FFmpegManager {
  private tasks: Map<string, TranscodeTask>;
  private ffmpegPath: string;
  private ffprobePath: string;
  private globalLogs: LogEntry[];
  private logFilePath: string;

  constructor() {
    this.tasks = new Map();
    this.globalLogs = [];
    
    // 设置日志文件路径
    const userDataPath = app.getPath('userData');
    const logsDir = path.join(userDataPath, 'logs');
    if (!fs.existsSync(logsDir)) {
      fs.mkdirSync(logsDir, { recursive: true });
    }
    this.logFilePath = path.join(logsDir, `ffmpeg-${new Date().toISOString().split('T')[0]}.log`);
    
    // 设置FFmpeg路径
    const isProduction = app.isPackaged;
    if (isProduction) {
      // 生产环境：从应用目录读取（便携版）
      const appPath = path.dirname(app.getPath('exe'));
      this.ffmpegPath = path.join(appPath, 'ffmpeg', 'ffmpeg.exe');
      this.ffprobePath = path.join(appPath, 'ffmpeg', 'ffprobe.exe');
    } else {
      // 开发环境：使用当前工作目录
      const cwd = process.cwd();
      this.ffmpegPath = path.join(cwd, 'ffmpeg', 'ffmpeg.exe');
      this.ffprobePath = path.join(cwd, 'ffmpeg', 'ffprobe.exe');
    }
    
    this.log(LogLevel.INFO, 'SYSTEM', '系统初始化', {
      cwd: process.cwd(),
      ffmpegPath: this.ffmpegPath,
      ffprobePath: this.ffprobePath,
      isProduction,
      logFilePath: this.logFilePath
    });
    
    // 检验文件是否存在
    if (!fs.existsSync(this.ffmpegPath)) {
      const error = `FFmpeg executable not found at: ${this.ffmpegPath}`;
      this.log(LogLevel.ERROR, 'SYSTEM', 'FFmpeg可执行文件未找到', { path: this.ffmpegPath });
      
      // 尝试列出ffmpeg目录的内容
      const ffmpegDir = path.dirname(this.ffmpegPath);
      if (fs.existsSync(ffmpegDir)) {
        const dirContents = fs.readdirSync(ffmpegDir);
        this.log(LogLevel.DEBUG, 'SYSTEM', 'FFmpeg目录内容', { directory: ffmpegDir, contents: dirContents });
      }
      throw new Error(error);
    }
    
    if (!fs.existsSync(this.ffprobePath)) {
      const error = `FFprobe executable not found at: ${this.ffprobePath}`;
      this.log(LogLevel.ERROR, 'SYSTEM', 'FFprobe可执行文件未找到', { path: this.ffprobePath });
      throw new Error(error);
    }
    
    this.log(LogLevel.INFO, 'SYSTEM', 'FFmpeg二进制文件验证成功');
    
    // 设置fluent-ffmpeg路径
    ffmpeg.setFfmpegPath(this.ffmpegPath);
    ffmpeg.setFfprobePath(this.ffprobePath);
    
    this.log(LogLevel.DEBUG, 'SYSTEM', 'Fluent-ffmpeg路径设置完成');
  }

  /**
   * 记录日志
   */
  private log(level: LogLevel, category: string, message: string, data?: any, taskId?: string) {
    const logEntry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      category,
      message,
      data,
      taskId
    };

    // 添加到全局日志
    this.globalLogs.push(logEntry);

    // 如果有任务ID，也添加到任务日志
    if (taskId) {
      const task = this.tasks.get(taskId);
      if (task) {
        task.logs.push(logEntry);
      }
    }

    // 写入日志文件
    const logLine = `[${logEntry.timestamp}] [${level}] [${category}] ${message}${data ? ' | ' + JSON.stringify(data) : ''}\n`;
    fs.appendFileSync(this.logFilePath, logLine);

    // 控制台输出
    const consoleMessage = `[${category}] ${message}`;
    switch (level) {
      case LogLevel.ERROR:
        console.error(consoleMessage, data);
        break;
      case LogLevel.WARN:
        console.warn(consoleMessage, data);
        break;
      case LogLevel.DEBUG:
        console.debug(consoleMessage, data);
        break;
      default:
        console.log(consoleMessage, data);
    }

    // 保持日志数量在合理范围内
    if (this.globalLogs.length > 10000) {
      this.globalLogs = this.globalLogs.slice(-5000);
    }
  }

  /**
   * 获取视频信息
   */
  async getVideoInfo(filePath: string): Promise<VideoInfo> {
    console.log('开始读取视频信息:', filePath);
    
    return new Promise((resolve, reject) => {
      // 检查文件路径
      if (!filePath || filePath.trim() === '') {
        reject(new Error('文件路径为空'));
        return;
      }

      ffmpeg.ffprobe(filePath, (err, metadata) => {
        if (err) {
          console.error('FFprobe错误:', err);
          reject(new Error(`无法读取视频文件: ${err.message}`));
          return;
        }

        const videoStream = metadata.streams.find(s => s.codec_type === 'video');
        const audioStream = metadata.streams.find(s => s.codec_type === 'audio');

        const info: VideoInfo = {
          format: metadata.format,
          streams: metadata.streams,
          duration: metadata.format.duration || 0,
          size: metadata.format.size || 0,
          bitrate: metadata.format.bit_rate || 0,
          videoCodec: videoStream?.codec_name,
          audioCodec: audioStream?.codec_name,
          resolution: videoStream ? `${videoStream.width}x${videoStream.height}` : undefined,
          fps: videoStream && videoStream.r_frame_rate ? eval(videoStream.r_frame_rate) : undefined
        };

        resolve(info);
      });
    });
  }

  /**
   * 开始转码任务
   */
  async startTranscode(options: {
    inputFile: string;
    outputFile: string;
    transcodeOptions: TranscodeOptions;
  }): Promise<string> {
    const taskId = this.generateTaskId();
    
    // 处理文件路径 - 生成安全的文件名
    let outputFile = options.outputFile;
    
    // 检查文件名长度和特殊字符
    const fileName = path.basename(outputFile);
    const dir = path.dirname(outputFile);
    let nameWithoutExt = path.basename(fileName, path.extname(fileName));
    
    // 移除特殊字符和中文字符，替换为安全字符
    nameWithoutExt = nameWithoutExt
      .replace(/[^\w\s-]/g, '') // 移除特殊字符
      .replace(/\s+/g, '_')     // 空格替换为下划线
      .substring(0, 30);        // 限制长度为30字符
    
    if (nameWithoutExt.length === 0) {
      nameWithoutExt = 'converted_video';
    }
    
    // 根据输出格式确定正确的文件扩展名
    const formatExtMap: { [key: string]: string } = {
      'mp4': '.mp4',
      'avi': '.avi',
      'mov': '.mov',
      'mkv': '.mkv',
      'flv': '.flv',
      'webm': '.webm',
      'mp3': '.mp3',
      'aac': '.aac',
      'flac': '.flac',
      'wav': '.wav',
      'ogg': '.ogg'
    };
    
    const correctExt = formatExtMap[options.transcodeOptions.outputFormat] || '.mp4';
    
    // 生成简化的文件名，使用正确的扩展名
    const safeFileName = `${nameWithoutExt}_${Date.now()}${correctExt}`;
    outputFile = path.join(dir, safeFileName);
    
    console.log(`使用安全文件名: ${fileName} -> ${safeFileName}`);
    
    // 检查是否使用复制封装模式（支持所有常见容器格式）
    const isStreamCopy = !options.transcodeOptions.videoCodec && 
                        !options.transcodeOptions.audioCodec && 
                        !options.transcodeOptions.resolution &&
                        !options.transcodeOptions.fps &&
                        !options.transcodeOptions.videoBitrate &&
                        ['mp4', 'avi', 'mov', 'flv', 'mkv', 'webm'].includes(options.transcodeOptions.outputFormat);
    
    // 验证并修正格式和编码器兼容性（跳过复制封装模式）
    if (!isStreamCopy) {
      options.transcodeOptions = this.validateAndFixOptions(options.transcodeOptions);
    } else {
      console.log(`检测到${options.transcodeOptions.outputFormat.toUpperCase()}复制封装模式，跳过编码器验证`);
    }
    
    // 确保输出目录存在
    const outputDir = path.dirname(outputFile);
    if (!fs.existsSync(outputDir)) {
      try {
        fs.mkdirSync(outputDir, { recursive: true });
        console.log('创建输出目录:', outputDir);
      } catch (error) {
        throw new Error(`无法创建输出目录: ${outputDir}, 错误: ${error}`);
      }
    }
    
    // 检查输出文件是否已存在，如果存在则添加序号
    let finalOutputFile = outputFile;
    let counter = 1;
    while (fs.existsSync(finalOutputFile)) {
      const ext = path.extname(outputFile);
      const baseName = path.basename(outputFile, ext);
      const dir = path.dirname(outputFile);
      finalOutputFile = path.join(dir, `${baseName}_${counter}${ext}`);
      counter++;
    }
    
    if (finalOutputFile !== outputFile) {
      console.log(`输出文件已存在，使用新文件名: ${finalOutputFile}`);
    }
    
    const task: TranscodeTask = {
      id: taskId,
      inputFile: options.inputFile,
      outputFile: finalOutputFile,
      options: options.transcodeOptions,
      status: 'pending',
      progress: 0,
      startTime: new Date(),
      logs: []
    };

    this.tasks.set(taskId, task);

    console.log('开始转码任务:');
    console.log('- 输入文件:', options.inputFile);
    console.log('- 输出文件:', finalOutputFile);
    console.log('- 转码选项:', JSON.stringify(options.transcodeOptions, null, 2));

    // 创建FFmpeg命令
    const command = ffmpeg(options.inputFile);
    command.output(finalOutputFile);

    // 设置输出格式（使用正确的FFmpeg格式名称）
    if (options.transcodeOptions.outputFormat) {
      const formatMap: { [key: string]: string } = {
        'mkv': 'matroska',
        'mp4': 'mp4',
        'avi': 'avi',
        'mov': 'mov',
        'flv': 'flv',
        'webm': 'webm',
        'mp3': 'mp3',
        'aac': 'adts',
        'flac': 'flac',
        'wav': 'wav',
        'ogg': 'ogg'
      };
      
      const ffmpegFormat = formatMap[options.transcodeOptions.outputFormat] || options.transcodeOptions.outputFormat;
      command.format(ffmpegFormat);
      console.log(`设置输出格式: ${options.transcodeOptions.outputFormat} -> ${ffmpegFormat}`);
    }

    if (isStreamCopy) {
      // 复制封装模式：直接复制流，不重新编码
      console.log(`使用复制封装模式，直接复制音视频流到新容器`);
      command.outputOptions([
        '-c', 'copy',                    // 复制所有流
        '-avoid_negative_ts', 'make_zero', // 避免负时间戳
        '-fflags', '+genpts'             // 生成PTS
      ]);
    } else {
      // 转码模式：重新编码
      console.log(`使用转码模式，重新编码音视频流`);
      
      // 优化性能设置
      // 设置线程数为CPU核心数
      const numCPUs = require('os').cpus().length;
      command.outputOptions(['-threads', Math.min(numCPUs, 8).toString()]); // 最多8线程避免过载

      // 设置缓冲区大小优化
      command.inputOptions([
        '-fflags', '+genpts+igndts',  // 生成PTS，忽略DTS错误
        '-analyzeduration', '10000000', // 分析持续时间10秒
        '-probesize', '10000000'      // 探测大小10MB
      ]);

      // 设置硬件加速
      if (options.transcodeOptions.hardwareAccel && options.transcodeOptions.hardwareAccel !== 'none') {
        console.log(`启用硬件加速: ${options.transcodeOptions.hardwareAccel}`);
        
        switch (options.transcodeOptions.hardwareAccel) {
          case 'nvenc': // NVIDIA GPU
            // 修复：正确设置NVENC硬件加速
            command.inputOptions([
              '-hwaccel', 'cuda',
              '-hwaccel_output_format', 'cuda'
            ]);
            break;
          case 'amf': // AMD GPU (AMF)
            command.inputOptions(['-hwaccel', 'd3d11va']);
            break;
          case 'qsv': // Intel Quick Sync
            command.inputOptions(['-hwaccel', 'qsv']);
            break;
          case 'd3d11va': // Direct3D 11
            command.inputOptions(['-hwaccel', 'd3d11va']);
            break;
          case 'dxva2': // DirectX Video Acceleration 2
            command.inputOptions(['-hwaccel', 'dxva2']);
            break;
          default:
            console.log('未知的硬件加速类型:', options.transcodeOptions.hardwareAccel);
        }
      } else {
        // 软件编码优化
        command.outputOptions([
          '-preset', 'fast',           // 使用快速预设
          '-tune', 'film',            // 针对电影内容优化
          '-x264-params', 'ref=3:bframes=3:b-adapt=1:direct=auto:me=hex:subme=6:mixed-refs=1:trellis=1'
        ]);
      }

              // 智能设置视频编码器（考虑硬件加速）
        if (options.transcodeOptions.videoCodec) {
          let codec = options.transcodeOptions.videoCodec;
          
          // 根据硬件加速类型调整编码器
          if (options.transcodeOptions.hardwareAccel && options.transcodeOptions.hardwareAccel !== 'none') {
            // 先验证硬件编码器可用性
            const validationResult = await this.validateHardwareEncoder(
              options.transcodeOptions.hardwareAccel, 
              codec
            );
            
            this.log(LogLevel.INFO, 'HARDWARE', '硬件编码器验证结果', {
              hardwareAccel: options.transcodeOptions.hardwareAccel,
              codec,
              isValid: validationResult.isValid,
              validationTime: validationResult.validationTime,
              errorMessage: validationResult.errorMessage
            }, taskId);
            
            if (!validationResult.isValid) {
              this.log(LogLevel.WARN, 'HARDWARE', '硬件编码器验证失败，回退到软件编码', {
                originalHardware: options.transcodeOptions.hardwareAccel,
                error: validationResult.errorMessage
              }, taskId);
              
              // 发送硬件加速验证失败通知
              const { BrowserWindow } = require('electron');
              const mainWindow = BrowserWindow.getAllWindows()[0];
              if (mainWindow) {
                mainWindow.webContents.send('ffmpeg:hardware-validation-failed', {
                  taskId,
                  hardwareAccel: options.transcodeOptions.hardwareAccel,
                  videoCodec: codec,
                  validationResult
                });
              }
              // 使用软件编码
              options.transcodeOptions.hardwareAccel = 'none';
            } else {
              // 硬件验证成功，调整编码器
              switch (options.transcodeOptions.hardwareAccel) {
                case 'nvenc':
                  if (codec === 'libx264') codec = 'h264_nvenc';
                  if (codec === 'libx265') codec = 'hevc_nvenc';
                  break;
                case 'amf':
                  if (codec === 'libx264') codec = 'h264_amf';
                  if (codec === 'libx265') codec = 'hevc_amf';
                  break;
                case 'qsv':
                  if (codec === 'libx264') codec = 'h264_qsv';
                  if (codec === 'libx265') codec = 'hevc_qsv';
                  break;
              }
              
              this.log(LogLevel.INFO, 'HARDWARE', '硬件编码器验证成功', {
                finalCodec: codec,
                hardwareType: validationResult.hardwareType
              }, taskId);
            }
          }
          
          console.log(`使用视频编码器: ${codec}`);
          command.videoCodec(codec);
          
          // 应用相同的编码器优化逻辑
          this.applyEncoderOptimizations(command, codec, options.transcodeOptions);
        }

      // 设置音频编码器优化
      if (options.transcodeOptions.audioCodec) {
        command.audioCodec(options.transcodeOptions.audioCodec);
        
        // 音频编码优化
        if (options.transcodeOptions.audioCodec === 'aac') {
          command.outputOptions(['-aac_coder', 'twoloop']); // 使用twoloop编码器提高质量
        }
      }

      // 智能设置视频码率（根据分辨率）
      if (options.transcodeOptions.videoBitrate) {
        command.videoBitrate(options.transcodeOptions.videoBitrate);
      } else if (options.transcodeOptions.resolution) {
        // 根据分辨率自动设置合适的码率
        const resolution = options.transcodeOptions.resolution;
        let autoBitrate = '1000k'; // 默认码率
        
        if (resolution.includes('640x360') || resolution.includes('360p')) {
          autoBitrate = '500k';  // 360p使用500k码率
        } else if (resolution.includes('1280x720') || resolution.includes('720p')) {
          autoBitrate = '1500k'; // 720p使用1.5M码率
        } else if (resolution.includes('1920x1080') || resolution.includes('1080p')) {
          autoBitrate = '3000k'; // 1080p使用3M码率
        } else if (resolution.includes('2560x1440') || resolution.includes('1440p')) {
          autoBitrate = '6000k'; // 1440p使用6M码率
        } else if (resolution.includes('3840x2160') || resolution.includes('4K')) {
          autoBitrate = '12000k'; // 4K使用12M码率
        }
        
        console.log(`自动设置视频码率: ${autoBitrate} (基于分辨率: ${resolution})`);
        command.videoBitrate(autoBitrate);
      }

      // 设置音频码率
      if (options.transcodeOptions.audioBitrate) {
        command.audioBitrate(options.transcodeOptions.audioBitrate);
      } else {
        // 默认音频码率
        command.audioBitrate('128k');
      }

      // 设置分辨率
      if (options.transcodeOptions.resolution) {
        command.size(options.transcodeOptions.resolution);
      }

      // 设置帧率
      if (options.transcodeOptions.fps) {
        command.fps(options.transcodeOptions.fps);
      }
    }

    // 监听进度
    command.on('progress', (progress: any) => {
      task.progress = progress.percent || 0;
      task.status = 'running';
      this.tasks.set(taskId, task);
      
      console.log(`转码进度: ${task.progress}%`);
      
      // 发送进度更新到渲染进程
      const { BrowserWindow } = require('electron');
      const mainWindow = BrowserWindow.getAllWindows()[0];
      if (mainWindow) {
        mainWindow.webContents.send('ffmpeg:progress', {
          taskId,
          progress: task.progress,
          status: task.status,
          timemark: progress.timemark,
          currentFps: progress.currentFps,
          currentKbps: progress.currentKbps,
          targetSize: progress.targetSize,
          hardwareAccel: task.options.hardwareAccel || 'none'
        });
      }
    });

    // 监听结束
    command.on('end', () => {
      task.status = 'completed';
      task.progress = 100;
      task.endTime = new Date();
      this.tasks.set(taskId, task);
      
      // 计算转码统计信息
      const duration = task.endTime.getTime() - task.startTime!.getTime();
      const durationSeconds = Math.round(duration / 1000);
      
      // 获取文件大小信息
      let inputSize = 0;
      let outputSize = 0;
      try {
        inputSize = fs.statSync(task.inputFile).size;
        outputSize = fs.statSync(task.outputFile).size;
      } catch (error) {
        console.warn('无法获取文件大小信息:', error);
      }
      
      const compressionRatio = inputSize > 0 ? ((inputSize - outputSize) / inputSize * 100).toFixed(1) : '0';
      const inputSizeMB = (inputSize / 1024 / 1024).toFixed(1);
      const outputSizeMB = (outputSize / 1024 / 1024).toFixed(1);
      
      console.log(`转码任务 ${taskId} 已完成`);
      console.log(`输出文件: ${task.outputFile}`);
      console.log(`转码时间: ${durationSeconds}秒`);
      console.log(`文件大小: ${inputSizeMB}MB -> ${outputSizeMB}MB (压缩率: ${compressionRatio}%)`);
      
      // 发送完成通知到渲染进程
      const { BrowserWindow } = require('electron');
      const mainWindow = BrowserWindow.getAllWindows()[0];
      if (mainWindow) {
        mainWindow.webContents.send('ffmpeg:progress', {
          taskId,
          progress: 100,
          status: 'completed'
        });
        
        // 发送详细完成通知
        mainWindow.webContents.send('ffmpeg:completed', {
          taskId,
          outputFile: task.outputFile,
          duration: duration,
          durationSeconds: durationSeconds,
          inputSize: inputSize,
          outputSize: outputSize,
          compressionRatio: parseFloat(compressionRatio),
          inputSizeMB: parseFloat(inputSizeMB),
          outputSizeMB: parseFloat(outputSizeMB)
        });
      }
    });

    // 监听错误
    command.on('error', async (err: any) => {
      // 检查是否是正常的暂停操作导致的终止
      if (task.status === 'paused') {
        console.log(`任务 ${taskId} 正常暂停`);
        return; // 不处理为错误
      }
      
      // 检查是否是取消操作导致的终止（取消后状态已改为pending）
      if (err.message && err.message.includes('SIGTERM') && task.status === 'pending') {
        console.log(`任务 ${taskId} 正常取消`);
        return; // 不处理为错误
      }
      
      // 检查是否是硬件加速参数不支持的错误
      const isHardwareAccelError = this.isHardwareAccelError(err.message);
      const currentHardwareAccel = options.transcodeOptions.hardwareAccel;
      
      if (isHardwareAccelError && currentHardwareAccel && currentHardwareAccel !== 'none') {
        console.log(`检测到硬件加速错误，尝试自动回退到软件编码: ${err.message}`);
        
        // 清理失败的输出文件
        if (fs.existsSync(task.outputFile)) {
          try {
            fs.unlinkSync(task.outputFile);
            console.log(`已删除失败的输出文件: ${task.outputFile}`);
          } catch (deleteError) {
            console.warn(`删除失败文件时出错: ${deleteError}`);
          }
        }
        
        // 发送硬件加速回退通知
        const { BrowserWindow } = require('electron');
        const mainWindow = BrowserWindow.getAllWindows()[0];
        if (mainWindow) {
          mainWindow.webContents.send('ffmpeg:hardware-fallback', {
            taskId,
            originalHardwareAccel: currentHardwareAccel,
            error: err.message,
            inputFile: task.inputFile
          });
        }
        
        // 自动重试，使用软件编码
        try {
          console.log(`任务 ${taskId} 自动回退到软件编码重试`);
          
          // 修改转码选项，禁用硬件加速
          const fallbackOptions = {
            ...options,
            transcodeOptions: {
              ...options.transcodeOptions,
              hardwareAccel: 'none'
            }
          };
          
          // 重新开始转码（使用软件编码）
          const newTaskId = await this.startTranscode(fallbackOptions);
          
          // 更新原任务状态为已取消，新任务继承原任务ID
          task.status = 'cancelled';
          task.error = `硬件加速失败，已自动切换到软件编码 (新任务ID: ${newTaskId})`;
          this.tasks.set(taskId, task);
          
          return; // 不继续处理为失败
          
        } catch (fallbackError) {
          console.error(`软件编码回退也失败了:`, fallbackError);
          task.status = 'pending'; // 即使回退失败也允许重试
          task.progress = 0;
          task.error = `硬件加速失败: ${err.message}，软件编码回退也失败: ${fallbackError}`;
        }
      } else {
          // 非硬件加速错误，设置为pending状态允许重新开始
          task.status = 'pending';
          task.progress = 0; // 重置进度
          task.error = err.message;
        }
        
        task.endTime = new Date();
        
        // 清理失败的输出文件
        if (fs.existsSync(task.outputFile)) {
          try {
            fs.unlinkSync(task.outputFile);
            console.log(`已删除失败的输出文件: ${task.outputFile}`);
          } catch (deleteError) {
            console.warn(`删除失败文件时出错: ${deleteError}`);
          }
        }
        
        this.tasks.set(taskId, task);
        
        console.error(`转码任务 ${taskId} 失败:`, err.message);
        
        // 发送错误通知到渲染进程
        const { BrowserWindow } = require('electron');
        const mainWindow = BrowserWindow.getAllWindows()[0];
        if (mainWindow) {
          mainWindow.webContents.send('ffmpeg:progress', {
            taskId,
            progress: task.progress,
            status: task.status,
            error: task.error,
            hardwareAccel: task.options.hardwareAccel || 'none'
          });
          
          // 发送失败通知
          mainWindow.webContents.send('ffmpeg:failed', {
            taskId,
            error: task.error,
            inputFile: task.inputFile
          });
        }
    });

    // 保存命令引用
    task.command = command;
    task.status = 'running';
    this.tasks.set(taskId, task);

    // 开始转码
    command.run();

    return taskId;
  }

  /**
   * 暂停转码任务
   */
  async pauseTranscode(taskId: string): Promise<boolean> {
    const task = this.tasks.get(taskId);
    if (!task || !task.command || task.status !== 'running') {
      return false;
    }

    try {
      // 暂停：保存当前进度，不删除输出文件
      task.command.kill('SIGTERM');
      task.status = 'paused';
      task.endTime = new Date();
      this.tasks.set(taskId, task);
      
      console.log(`任务 ${taskId} 已暂停在 ${task.progress}%`);
      
      // 发送暂停通知到渲染进程
      const { BrowserWindow } = require('electron');
      const mainWindow = BrowserWindow.getAllWindows()[0];
      if (mainWindow) {
        mainWindow.webContents.send('ffmpeg:progress', {
          taskId,
          progress: task.progress,
          status: 'paused'
        });
      }
      
      return true;
    } catch (error) {
      console.error(`暂停任务 ${taskId} 失败:`, error);
      return false;
    }
  }

  /**
   * 恢复转码任务
   */
  async resumeTranscode(taskId: string): Promise<boolean> {
    const task = this.tasks.get(taskId);
    if (!task || task.status !== 'paused') {
      return false;
    }

    try {
      console.log(`尝试恢复任务 ${taskId}，重新开始转码到原文件`);
      
      // 删除暂停时的不完整文件（如果存在）
      if (fs.existsSync(task.outputFile)) {
        await this.safeDeleteFile(task.outputFile);
        console.log(`已删除暂停时的不完整文件: ${task.outputFile}`);
      }
      
      // 确保输出目录存在
      const path = require('path');
      const outputDir = path.dirname(task.outputFile);
      if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
        console.log(`创建输出目录: ${outputDir}`);
      }

      // 重新创建FFmpeg命令
      const ffmpeg = require('fluent-ffmpeg');
      
      // 设置FFmpeg和FFprobe路径
      ffmpeg.setFfmpegPath(this.ffmpegPath);
      ffmpeg.setFfprobePath(this.ffprobePath);
      
      const command = ffmpeg(task.inputFile);
      
      // 重置任务状态 - 从0%重新开始
      task.status = 'running';
      task.progress = 0; // 重新开始
      task.startTime = new Date();
      task.endTime = undefined;
      task.error = undefined;
      task.command = command;
      
      // 监听进度
      command.on('progress', (progress: any) => {
        task.progress = progress.percent || 0;
        task.status = 'running';
        this.tasks.set(taskId, task);
        
        console.log(`转码进度: ${task.progress}%`);
        
        // 发送进度更新到渲染进程
        const { BrowserWindow } = require('electron');
        const mainWindow = BrowserWindow.getAllWindows()[0];
        if (mainWindow) {
          mainWindow.webContents.send('ffmpeg:progress', {
            taskId,
            progress: task.progress,
            status: task.status,
            timemark: progress.timemark,
            currentFps: progress.currentFps,
            currentKbps: progress.currentKbps,
            targetSize: progress.targetSize,
            hardwareAccel: task.options.hardwareAccel || 'none'
          });
        }
      });

      // 监听结束
      command.on('end', () => {
        task.status = 'completed';
        task.progress = 100;
        task.endTime = new Date();
        this.tasks.set(taskId, task);
        
        console.log(`转码任务 ${taskId} 已完成`);
        
        // 发送完成通知到渲染进程
        const { BrowserWindow } = require('electron');
        const mainWindow = BrowserWindow.getAllWindows()[0];
        if (mainWindow) {
          mainWindow.webContents.send('ffmpeg:progress', {
            taskId,
            progress: 100,
            status: 'completed'
          });
        }
      });

      // 监听错误
      command.on('error', async (err: any) => {
        // 检查是否是正常的暂停操作导致的终止
        if (task.status === 'paused') {
          console.log(`任务 ${taskId} 正常暂停`);
          return;
        }
        
        // 检查是否是取消操作导致的终止
        if (err.message && err.message.includes('SIGTERM') && task.status === 'pending') {
          console.log(`任务 ${taskId} 正常取消`);
          return;
        }
        
        // 检查是否是硬件加速参数不支持的错误
        const isHardwareAccelError = this.isHardwareAccelError(err.message);
        const currentHardwareAccel = task.options.hardwareAccel;
        
        if (isHardwareAccelError && currentHardwareAccel && currentHardwareAccel !== 'none') {
          console.log(`检测到硬件加速错误，尝试自动回退到软件编码: ${err.message}`);
          
          // 清理失败的输出文件
          if (fs.existsSync(task.outputFile)) {
            try {
              fs.unlinkSync(task.outputFile);
              console.log(`已删除失败的输出文件: ${task.outputFile}`);
            } catch (deleteError) {
              console.warn(`删除失败文件时出错: ${deleteError}`);
            }
          }
          
          // 发送硬件加速回退通知
          const { BrowserWindow } = require('electron');
          const mainWindow = BrowserWindow.getAllWindows()[0];
          if (mainWindow) {
            mainWindow.webContents.send('ffmpeg:hardware-fallback', {
              taskId,
              originalHardwareAccel: currentHardwareAccel,
              error: err.message,
              inputFile: task.inputFile
            });
          }
          
          // 自动重试，使用软件编码
          try {
            console.log(`任务 ${taskId} 自动回退到软件编码重试`);
            
            // 修改转码选项，禁用硬件加速
            const fallbackOptions = {
              inputFile: task.inputFile,
              outputFile: task.outputFile,
              transcodeOptions: {
                ...task.options,
                hardwareAccel: 'none'
              }
            };
            
            // 重新开始转码（使用软件编码）
            const newTaskId = await this.startTranscode(fallbackOptions);
            
            // 更新原任务状态为已取消，新任务继承原任务ID
            task.status = 'cancelled';
            task.error = `硬件加速失败，已自动切换到软件编码 (新任务ID: ${newTaskId})`;
            this.tasks.set(taskId, task);
            
            return; // 不继续处理为失败
            
          } catch (fallbackError) {
            console.error(`软件编码回退也失败了:`, fallbackError);
            task.status = 'pending'; // 即使回退失败也允许重试
            task.progress = 0;
            task.error = `硬件加速失败: ${err.message}，软件编码回退也失败: ${fallbackError}`;
          }
        } else {
             // 非硬件加速错误，设置为pending状态允许重新开始
             task.status = 'pending';
             task.progress = 0; // 重置进度
             task.error = err.message;
           }
           
           task.endTime = new Date();
           this.tasks.set(taskId, task);
           
           console.error(`转码任务 ${taskId} 失败:`, err.message);
           
           // 发送错误通知到渲染进程
           const { BrowserWindow } = require('electron');
           const mainWindow = BrowserWindow.getAllWindows()[0];
           if (mainWindow) {
             mainWindow.webContents.send('ffmpeg:progress', {
               taskId,
               progress: task.progress,
               status: task.status,
               error: task.error,
               hardwareAccel: task.options.hardwareAccel || 'none'
             });
           }
      });
      
      // 应用转码选项
      this.applyTranscodeOptions(command, task.options, task.outputFile);
      
      // 保存更新的任务
      this.tasks.set(taskId, task);

      // 开始转码
      command.run();
      
      console.log(`任务 ${taskId} 已恢复转码，输出到原文件: ${task.outputFile}`);
      return true;
      
    } catch (error) {
      console.error(`恢复任务 ${taskId} 失败:`, error);
      return false;
    }
  }

  /**
   * 应用转码选项到命令（提取公共逻辑）
   */
  private applyTranscodeOptions(command: any, options: TranscodeOptions, outputFile: string) {
    const path = require('path');
    const os = require('os');
    
    // 优化性能设置
    const numCPUs = os.cpus().length;
    command.outputOptions(['-threads', Math.min(numCPUs, 8).toString()]);

    // 设置缓冲区大小优化
    command.inputOptions([
      '-fflags', '+genpts+igndts',
      '-analyzeduration', '10000000',
      '-probesize', '10000000'
    ]);

    // 检查是否是纯音频提取
    const isAudioOnly = !options.videoCodec && options.audioCodec;
    
    // 检查是否使用复制封装（stream copy）- 支持多种格式
    const isStreamCopy = !options.videoCodec && !options.audioCodec && 
                        ['mkv', 'mp4', 'avi', 'mov', 'flv', 'webm'].includes(options.outputFormat);
    
    // 设置硬件加速（仅用于视频处理，不包括复制封装）
    if (!isAudioOnly && !isStreamCopy && options.hardwareAccel && options.hardwareAccel !== 'none') {
      switch (options.hardwareAccel) {
        case 'nvenc':
          command.inputOptions(['-hwaccel', 'cuda', '-hwaccel_output_format', 'cuda']);
          break;
        case 'amf':
          command.inputOptions(['-hwaccel', 'd3d11va']);
          break;
        case 'qsv':
          command.inputOptions(['-hwaccel', 'qsv']);
          break;
        case 'd3d11va':
          command.inputOptions(['-hwaccel', 'd3d11va']);
          break;
        case 'dxva2':
          command.inputOptions(['-hwaccel', 'dxva2']);
          break;
      }
    } else if (isAudioOnly) {
      console.log('音频提取模式：跳过硬件加速设置');
    }

    command.output(outputFile);

    if (isStreamCopy) {
      // 复制封装模式：直接复制流，不重新编码
      console.log(`🚀 使用${options.outputFormat.toUpperCase()}复制封装模式：直接复制视频和音频流，速度极快！`);
      
      // 设置格式和复制所有流
      const formatMap: { [key: string]: string } = {
        'mkv': 'matroska',
        'mp4': 'mp4',
        'avi': 'avi',
        'mov': 'mov',
        'flv': 'flv',
        'webm': 'webm'
      };
      
      const ffmpegFormat = formatMap[options.outputFormat] || options.outputFormat;
      command.format(ffmpegFormat);
      command.videoCodec('copy').audioCodec('copy'); // 复制流，不重新编码
      
      // 基础复制参数
      const baseOptions = [
        '-avoid_negative_ts', 'make_zero',    // 避免负时间戳问题
        '-map_metadata', '0',                 // 复制所有元数据
        '-map', '0',                          // 复制所有流
        '-c:s', 'copy'                        // 复制字幕流
      ];
      
      // 根据输出格式添加特定优化
      switch (options.outputFormat) {
        case 'mkv':
          // Matroska/MKV特定优化
          baseOptions.push(
            '-c:d', 'copy',                   // 复制数据流
            '-c:t', 'copy',                   // 复制附件流
            '-write_crc32', '0',              // 禁用CRC32校验提高速度
            '-reserve_index_space', '200k'    // 预留索引空间优化搜索
          );
          break;
        case 'mp4':
          // MP4特定优化
          baseOptions.push(
            '-movflags', '+faststart',        // 快速启动（元数据前置）
            '-fflags', '+genpts'              // 生成PTS时间戳
          );
          break;
        case 'avi':
          // AVI特定优化
          baseOptions.push(
            '-vtag', 'XVID'                   // 设置视频标签
          );
          break;
        case 'webm':
          // WebM特定优化（基于Matroska）
          baseOptions.push(
            '-c:d', 'copy'                    // 复制数据流
          );
          break;
      }
      
      command.outputOptions(baseOptions);
      
    } else {
      // 设置输出格式（非复制封装模式）
      if (options.outputFormat) {
        // 格式名称映射
        const formatMap: { [key: string]: string } = {
          'mkv': 'matroska',
          'mp4': 'mp4',
          'avi': 'avi',
          'mov': 'mov',
          'flv': 'flv',
          'webm': 'webm',
          'mp3': 'mp3',
          'aac': 'adts',
          'flac': 'flac',
          'wav': 'wav',
          'ogg': 'ogg'
        };
        
                 const ffmpegFormat = formatMap[options.outputFormat] || options.outputFormat;
         command.format(ffmpegFormat);
         console.log(`设置输出格式: ${options.outputFormat} -> ${ffmpegFormat}`);
       }
    }
    
    if (isAudioOnly) {
      // 纯音频提取：禁用视频流，只处理音频
      command.noVideo();
      console.log('音频提取模式：已禁用视频流');
    } else if (options.videoCodec) {
      // 视频转码模式
      let codec = options.videoCodec;
      
      // 根据硬件加速类型调整编码器
      if (options.hardwareAccel && options.hardwareAccel !== 'none') {
        switch (options.hardwareAccel) {
          case 'nvenc':
            if (codec === 'libx264') codec = 'h264_nvenc';
            if (codec === 'libx265') codec = 'hevc_nvenc';
            break;
          case 'amf':
            if (codec === 'libx264') codec = 'h264_amf';
            if (codec === 'libx265') codec = 'hevc_amf';
            break;
          case 'qsv':
            if (codec === 'libx264') codec = 'h264_qsv';
            if (codec === 'libx265') codec = 'hevc_qsv';
            break;
        }
      }
      
      command.videoCodec(codec);
      
      // 应用相同的编码器优化逻辑
      this.applyEncoderOptimizations(command, codec, options);
    }

    // 设置音频编码器
    if (options.audioCodec) {
      command.audioCodec(options.audioCodec);
      
      // 音频编码器特殊优化
      if (options.audioCodec === 'aac') {
        command.outputOptions(['-aac_coder', 'twoloop']);
      }
      
      // 如果是纯音频提取，添加音频专用优化
      if (isAudioOnly) {
        command.outputOptions([
          '-vn',                    // 明确禁用视频
          '-map', '0:a:0',         // 只映射第一个音频流
          '-avoid_negative_ts', 'make_zero'  // 避免负时间戳
        ]);
        console.log('音频提取优化：添加音频专用参数');
      }
    }

    // 设置码率
    if (options.videoBitrate) {
      command.videoBitrate(options.videoBitrate);
    }
    if (options.audioBitrate) {
      command.audioBitrate(options.audioBitrate);
    } else {
      command.audioBitrate('128k');
    }

    // 设置分辨率
    if (options.resolution) {
      command.size(options.resolution);
    }

    // 设置帧率
    if (options.fps) {
      command.fps(options.fps);
    }
  }

  /**
   * 应用编码器特定的优化（提取公共逻辑）
   */
  private applyEncoderOptimizations(command: any, codec: string, options: TranscodeOptions) {
    const presetValue = options.preset || 'medium';
    
    if (codec.includes('nvenc')) {
      // NVIDIA NVENC优化
      let nvencPreset = 'p4';
      let qualityLevel = '23';
      
      switch (presetValue) {
        case 'ultrafast':
        case 'superfast':
        case 'veryfast':
          nvencPreset = 'p1';
          qualityLevel = '28';
          break;
        case 'faster':
        case 'fast':
          nvencPreset = 'p2';
          qualityLevel = '25';
          break;
        case 'medium':
          nvencPreset = 'p4';
          qualityLevel = '23';
          break;
        case 'slow':
          nvencPreset = 'p6';
          qualityLevel = '20';
          break;
        case 'slower':
        case 'veryslow':
          nvencPreset = 'p7';
          qualityLevel = '18';
          break;
      }
      
      // 使用NVIDIA NVENC确实支持的参数，移除可能导致冲突的参数
      command.outputOptions([
        '-preset', nvencPreset,
        '-tune', 'hq',
        '-profile:v', 'high',
        '-rc', 'vbr_hq',
        '-cq', qualityLevel,
        '-spatial_aq', '1',
        '-rc-lookahead', '32'
      ]);
    } else if (codec.includes('amf')) {
      // AMD AMF优化 - 根据预设大幅调整性能
      const presetValue = options.preset || 'medium';
      let amfUsage = 'transcoding';
      let amfQuality = 'balanced';
      let qminValue = '18';
      let qmaxValue = '28';
      let additionalParams: string[] = [];
      
      // 根据预设激进调整AMF参数
      switch (presetValue) {
        case 'ultrafast':
        case 'superfast':
        case 'veryfast':
          amfUsage = 'ultralowlatency';     // 超低延迟模式
          amfQuality = 'speed';             // 速度优先
          qminValue = '28';                 // 大幅提高最小质量换取速度
          qmaxValue = '40';                 // 允许更低质量
          additionalParams = [
            '-bf', '0',                     // 禁用B帧
            '-gop_size', '30'               // 较小GOP提高速度
          ];
          break;
        case 'faster':
        case 'fast':
          amfUsage = 'lowlatency';          // 低延迟模式
          amfQuality = 'speed';             // 速度优先
          qminValue = '22';
          qmaxValue = '32';
          additionalParams = [
            '-bf', '1',                     // 少量B帧
            '-gop_size', '60'
          ];
          break;
        case 'medium':
          amfUsage = 'transcoding';         // 转码模式
          amfQuality = 'balanced';          // 平衡
          qminValue = '18';
          qmaxValue = '28';
          additionalParams = [
            '-bf', '2',                     // 标准B帧
            '-gop_size', '120'
          ];
          break;
        case 'slow':
          amfUsage = 'transcoding';         // 转码模式
          amfQuality = 'quality';           // 质量优先
          qminValue = '12';                 // 更低最小质量获得更高质量
          qmaxValue = '22';
          additionalParams = [
            '-bf', '3',                     // 更多B帧
            '-gop_size', '250'              // 更大GOP提高质量
          ];
          break;
        case 'slower':
        case 'veryslow':
          amfUsage = 'webcam';              // 高质量模式
          amfQuality = 'quality';           // 质量优先
          qminValue = '8';                  // 极低最小质量
          qmaxValue = '18';                 // 严格质量控制
          additionalParams = [
            '-bf', '4',                     // 最多B帧
            '-gop_size', '300'              // 最大GOP
          ];
          break;
      }
      
      // 只使用AMF确实支持的基本参数，移除可能不兼容的参数
      command.outputOptions([
        '-rc', 'vbr_peak',
        '-qmin', qminValue,
        '-qmax', qmaxValue
      ]);
    }
    // 其他编码器的优化可以在这里添加
  }

  /**
   * 安全删除文件（带重试机制）
   */
  private async safeDeleteFile(filePath: string, maxRetries: number = 3): Promise<boolean> {
    for (let i = 0; i < maxRetries; i++) {
      try {
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
          console.log(`已删除文件: ${filePath}`);
          return true;
        }
        return true; // 文件不存在，认为删除成功
      } catch (error: any) {
        console.warn(`删除文件失败 (尝试 ${i + 1}/${maxRetries}): ${error.message}`);
        
        if (i < maxRetries - 1) {
          // 等待一段时间后重试
          await new Promise(resolve => setTimeout(resolve, 1000 * (i + 1)));
        }
      }
    }
    
    console.error(`删除文件最终失败: ${filePath}`);
    return false;
  }

  /**
   * 取消转码任务
   */
  async cancelTranscode(taskId: string): Promise<boolean> {
    const task = this.tasks.get(taskId);
    if (!task || !task.command) {
      return false;
    }

    try {
      // 取消：终止进程并清理不完整的输出文件
      task.command.kill('SIGTERM');
      task.status = 'pending'; // 改为pending状态，允许重新开始
      task.progress = 0; // 重置进度
      task.endTime = new Date();
      
      // 异步清理不完整的输出文件
      setTimeout(async () => {
        await this.safeDeleteFile(task.outputFile);
      }, 500); // 等待500ms让FFmpeg进程完全退出
      
      this.tasks.set(taskId, task);
      
      console.log(`任务 ${taskId} 已取消，状态重置为pending`);
      
      // 发送取消通知到渲染进程
      const { BrowserWindow } = require('electron');
      const mainWindow = BrowserWindow.getAllWindows()[0];
      if (mainWindow) {
        mainWindow.webContents.send('ffmpeg:progress', {
          taskId,
          progress: 0,
          status: 'pending'
        });
      }
      
      return true;
    } catch (error) {
      console.error(`取消任务 ${taskId} 失败:`, error);
      return false;
    }
  }

  /**
   * 获取任务状态
   */
  getTaskStatus(taskId: string): TranscodeTask | undefined {
    return this.tasks.get(taskId);
  }

  /**
   * 获取任务进度
   */
  getTaskProgress(taskId: string): { progress: number; status: string } | null {
    const task = this.tasks.get(taskId);
    if (!task) return null;
    
    return {
      progress: task.progress,
      status: task.status
    };
  }

  /**
   * 检测可用的硬件加速
   */
  async detectHardwareAccel(): Promise<{name: string, type: string, description: string}[]> {
    console.log('开始检测硬件加速选项...');
    
    // 直接返回常见的硬件加速选项，让用户自己选择
    // 实际可用性会在转码时验证
    const availableAccel: {name: string, type: string, description: string}[] = [
      // NVIDIA GPU选项
      {name: 'nvenc', type: 'nvidia', description: 'NVIDIA NVENC (推荐用于NVIDIA显卡)'},
      
      // AMD GPU选项
      {name: 'amf', type: 'amd', description: 'AMD AMF (推荐用于AMD显卡)'},
      
      // Intel GPU选项
      {name: 'qsv', type: 'intel', description: 'Intel Quick Sync Video (推荐用于Intel核显)'},
      
      // 通用Windows硬件加速
      {name: 'd3d11va', type: 'universal', description: 'Direct3D 11 Video Acceleration (通用)'},
      {name: 'dxva2', type: 'universal', description: 'DirectX Video Acceleration 2 (通用)'},
      
      // 软件编码（作为对比）
      {name: 'none', type: 'software', description: '软件编码 (兼容性最好，速度较慢)'}
    ];
    
    console.log('硬件加速选项:', availableAccel);
    return availableAccel;
  }

  /**
   * 获取所有任务
   */
  getAllTasks(): TranscodeTask[] {
    return Array.from(this.tasks.values());
  }

  /**
   * 验证并修正格式和编码器兼容性
   */
  private validateAndFixOptions(options: TranscodeOptions): TranscodeOptions {
    const fixedOptions = { ...options };
    
    // 检查是否是纯音频提取
    const isAudioOnly = !options.videoCodec && options.audioCodec;
    
    if (isAudioOnly) {
      // 纯音频提取的支持格式和编码器
      const supportedAudioFormats = ['mp3', 'aac', 'flac', 'wav', 'ogg', 'mp4', 'm4a'];
      const supportedAudioCodecs = ['aac', 'libmp3lame', 'flac', 'pcm_s16le', 'libvorbis'];
      
      // 音频格式验证
      if (!supportedAudioFormats.includes(fixedOptions.outputFormat)) {
        console.log(`音频提取：不支持的格式 ${fixedOptions.outputFormat}，改为 mp3`);
        fixedOptions.outputFormat = 'mp3';
      }
      
      // 音频编码器验证
      if (fixedOptions.audioCodec && !supportedAudioCodecs.includes(fixedOptions.audioCodec)) {
        console.log(`音频提取：不支持的音频编码器 ${fixedOptions.audioCodec}，改为 libmp3lame`);
        fixedOptions.audioCodec = 'libmp3lame';
      }
      
      // 根据输出格式自动设置合适的编码器
      if (!fixedOptions.audioCodec) {
        switch (fixedOptions.outputFormat) {
          case 'mp3':
            fixedOptions.audioCodec = 'libmp3lame';
            break;
          case 'aac':
          case 'mp4':
          case 'm4a':
            fixedOptions.audioCodec = 'aac';
            break;
          case 'flac':
            fixedOptions.audioCodec = 'flac';
            break;
          case 'wav':
            fixedOptions.audioCodec = 'pcm_s16le';
            break;
          case 'ogg':
            fixedOptions.audioCodec = 'libvorbis';
            break;
          default:
            fixedOptions.audioCodec = 'libmp3lame';
        }
      }
      
      console.log(`音频提取优化：格式=${fixedOptions.outputFormat}, 编码器=${fixedOptions.audioCodec}`);
    } else {
      // 视频转码的支持格式和编码器
      const supportedFormats = ['mp4', 'avi', 'mov', 'flv', 'mkv', 'webm'];
      const supportedVideoCodecs = ['libx264', 'libx265', 'libvpx', 'libvpx-vp9', 'h264_nvenc', 'hevc_nvenc', 'h264_amf', 'hevc_amf', 'h264_qsv', 'hevc_qsv'];
      const supportedAudioCodecs = ['aac', 'opus', 'flac', 'libvorbis'];
      
      // 修正输出格式
      if (!supportedFormats.includes(fixedOptions.outputFormat)) {
        console.log(`不支持的格式 ${fixedOptions.outputFormat}，改为 mp4`);
        fixedOptions.outputFormat = 'mp4';
      }
      
      // 修正视频编码器
      if (fixedOptions.videoCodec && !supportedVideoCodecs.includes(fixedOptions.videoCodec)) {
        console.log(`不支持的视频编码器 ${fixedOptions.videoCodec}，改为 libx264`);
        fixedOptions.videoCodec = 'libx264';
      }
      
      // 修正音频编码器
      if (fixedOptions.audioCodec && !supportedAudioCodecs.includes(fixedOptions.audioCodec)) {
        console.log(`不支持的音频编码器 ${fixedOptions.audioCodec}，改为 aac`);
        fixedOptions.audioCodec = 'aac';
      }
      
      // 格式特定的修正
      if (fixedOptions.outputFormat === 'flv') {
        // FLV格式限制
        if (fixedOptions.audioCodec === 'opus' || fixedOptions.audioCodec === 'flac') {
          console.log(`FLV格式不支持 ${fixedOptions.audioCodec}，改为 aac`);
          fixedOptions.audioCodec = 'aac';
        }
      } else if (fixedOptions.outputFormat === 'webm') {
        // WebM格式优化
        if (!fixedOptions.videoCodec || !['libvpx', 'libvpx-vp9'].includes(fixedOptions.videoCodec)) {
          console.log(`WebM格式推荐使用VP9编码器，设置为 libvpx-vp9`);
          fixedOptions.videoCodec = 'libvpx-vp9';
        }
        if (!fixedOptions.audioCodec || !['opus', 'libvorbis'].includes(fixedOptions.audioCodec)) {
          console.log(`WebM格式推荐使用Opus音频编码器，设置为 opus`);
          fixedOptions.audioCodec = 'opus';
        }
      }
    }
    
    return fixedOptions;
  }

  /**
   * 检测是否是硬件加速相关的错误
   */
  private isHardwareAccelError(errorMessage: string): boolean {
    if (!errorMessage) return false;
    
    const hardwareAccelErrorPatterns = [
      // NVENC特定错误
      'No NVENC capable devices found',
      'Driver does not support the required nvenc API version',
      'NVENC initialization failed',
      'NV_ENC_ERR_OUT_OF_MEMORY',
      'NV_ENC_ERR_INVALID_PARAM',
      'NV_ENC_ERR_INVALID_VERSION',
      'CUDA error',
      'CUDA initialization failed',
      
      // AMD AMF特定错误
      'AMF initialization failed',
      'AMF encoder not available',
      'AMF context creation failed',
      
      // Intel QSV特定错误
      'QSV initialization failed',
      'MFX_ERR_UNSUPPORTED',
      'MFX_ERR_DEVICE_FAILED',
      
      // 通用硬件加速错误
      'Hardware acceleration not available',
      'No device available',
      'Failed to initialize hardware',
      'Unknown encoder',
      'Encoder not found',
      'hwaccel',
      'Invalid hwaccel type'
    ];
    
    const lowerErrorMessage = errorMessage.toLowerCase();
    return hardwareAccelErrorPatterns.some(pattern => 
      lowerErrorMessage.includes(pattern.toLowerCase())
    );
  }

  /**
   * 生成任务ID
   */
  private generateTaskId(): string {
    return `task_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * 验证硬件加速编码器可用性（修复AMD AMF验证问题）
   */
  private async validateHardwareEncoder(hardwareAccel: string, videoCodec: string): Promise<HardwareValidationResult> {
    const startTime = Date.now();
    
    return new Promise((resolve) => {
      // 根据硬件加速类型设置相应的编码器
      let testCodec = videoCodec;
      switch (hardwareAccel) {
        case 'nvenc':
          if (videoCodec === 'libx264') testCodec = 'h264_nvenc';
          if (videoCodec === 'libx265') testCodec = 'hevc_nvenc';
          break;
        case 'amf':
          if (videoCodec === 'libx264') testCodec = 'h264_amf';
          if (videoCodec === 'libx265') testCodec = 'hevc_amf';
          break;
        case 'qsv':
          if (videoCodec === 'libx264') testCodec = 'h264_qsv';
          if (videoCodec === 'libx265') testCodec = 'hevc_qsv';
          break;
        default:
          resolve({
            isValid: true,
            encoder: videoCodec,
            hardwareType: hardwareAccel,
            validationTime: Date.now() - startTime
          });
          return;
      }

      this.log(LogLevel.INFO, 'HARDWARE', `开始验证硬件编码器: ${testCodec}`, { hardwareAccel, videoCodec });

      // 修复：使用FFmpeg命令行实际测试编码器，改用更兼容的方法
      const { spawn } = require('child_process');
      
      // 构建FFmpeg验证命令：先检查编码器是否存在，避免使用lavfi
      const args = [
        '-hide_banner',
        '-encoders'
      ];
      
      const ffmpegProcess = spawn(this.ffmpegPath, args, {
        stdio: ['pipe', 'pipe', 'pipe']
      });

      let stdout = '';
      let stderr = '';

      ffmpegProcess.stdout.on('data', (data: Buffer) => {
        stdout += data.toString();
      });

      ffmpegProcess.stderr.on('data', (data: Buffer) => {
        stderr += data.toString();
      });

      let validationTimeout = setTimeout(() => {
        this.log(LogLevel.WARN, 'HARDWARE', `硬件编码器验证超时: ${testCodec}`, { timeout: 10000 });
        ffmpegProcess.kill('SIGTERM');
        resolve({
          isValid: false,
          encoder: testCodec,
          hardwareType: hardwareAccel,
          errorMessage: 'Validation timeout',
          validationTime: Date.now() - startTime
        });
      }, 10000); // 10秒超时

      ffmpegProcess.on('close', (code: number) => {
        clearTimeout(validationTimeout);
        const validationTime = Date.now() - startTime;

        if (code === 0) {
          // 检查编码器是否在输出中存在
          const encoderExists = stdout.includes(testCodec) || stderr.includes(testCodec);
          
          if (encoderExists) {
            this.log(LogLevel.INFO, 'HARDWARE', `硬件编码器验证成功: ${testCodec}`, { 
              validationTime: `${validationTime}ms`,
              method: 'encoder_list_check'
            });
            resolve({
              isValid: true,
              encoder: testCodec,
              hardwareType: hardwareAccel,
              validationTime
            });
          } else {
            this.log(LogLevel.WARN, 'HARDWARE', `硬件编码器不存在: ${testCodec}`, { 
              validationTime: `${validationTime}ms`,
              availableEncoders: stdout.includes('h264') ? 'h264 encoders found' : 'no h264 encoders'
            });
            resolve({
              isValid: false,
              encoder: testCodec,
              hardwareType: hardwareAccel,
              errorMessage: `Encoder ${testCodec} not available in this FFmpeg build`,
              validationTime
            });
          }
        } else {
          this.log(LogLevel.ERROR, 'HARDWARE', `硬件编码器验证失败: ${testCodec}`, { 
            error: `FFmpeg command failed (exit code: ${code})`,
            validationTime: `${validationTime}ms`,
            exitCode: code,
            stderr: stderr.substring(0, 500) // 限制错误信息长度
          });
          resolve({
            isValid: false,
            encoder: testCodec,
            hardwareType: hardwareAccel,
            errorMessage: `FFmpeg command failed (exit code: ${code})`,
            validationTime
          });
        }
      });

      ffmpegProcess.on('error', (err: any) => {
        clearTimeout(validationTimeout);
        const validationTime = Date.now() - startTime;
        this.log(LogLevel.ERROR, 'HARDWARE', `硬件编码器验证失败: ${testCodec}`, { 
          error: err.message,
          validationTime: `${validationTime}ms`
        });
        resolve({
          isValid: false,
          encoder: testCodec,
          hardwareType: hardwareAccel,
          errorMessage: err.message,
          validationTime
        });
      });
    });
  }

  /**
   * 生成详细的日志报告（修复报告生成失败问题）
   */
  async generateLogReport(taskId?: string): Promise<string> {
    try {
      // 获取用户数据目录，如果失败则使用临时目录
      let userDataPath: string;
      try {
        userDataPath = app.getPath('userData');
      } catch (error) {
        userDataPath = require('os').tmpdir();
        this.log(LogLevel.WARN, 'REPORT', '无法获取用户数据目录，使用临时目录', { 
          tempDir: userDataPath,
          error: (error as Error).message 
        });
      }

      const reportData: any = {
        reportGenerated: new Date().toISOString(),
        systemInfo: {
          platform: process.platform,
          arch: process.arch,
          nodeVersion: process.version,
          ffmpegPath: this.ffmpegPath,
          logFilePath: this.logFilePath,
          userDataPath
        },
        summary: {
          totalTasks: this.tasks.size,
          completedTasks: Array.from(this.tasks.values()).filter(t => t.status === 'completed').length,
          failedTasks: Array.from(this.tasks.values()).filter(t => t.status === 'failed').length,
          totalLogs: this.globalLogs.length
        }
      };

      if (taskId) {
        // 单任务报告
        const task = this.tasks.get(taskId);
        if (task) {
          reportData.taskDetails = {
            id: task.id,
            inputFile: task.inputFile,
            outputFile: task.outputFile,
            status: task.status,
            progress: task.progress,
            options: task.options,
            stats: task.stats,
            duration: task.endTime && task.startTime ? 
              (task.endTime.getTime() - task.startTime.getTime()) : null,
            logs: task.logs
          };
        }
      } else {
        // 全局报告
        reportData.allTasks = Array.from(this.tasks.values()).map(task => ({
          id: task.id,
          status: task.status,
          progress: task.progress,
          inputFile: path.basename(task.inputFile),
          outputFile: path.basename(task.outputFile),
          options: task.options,
          stats: task.stats,
          duration: task.endTime && task.startTime ? 
            (task.endTime.getTime() - task.startTime.getTime()) : null,
          errorCount: task.logs.filter(log => log.level === LogLevel.ERROR).length,
          warningCount: task.logs.filter(log => log.level === LogLevel.WARN).length
        }));
        
        reportData.recentLogs = this.globalLogs.slice(-100); // 最近100条日志
      }

      // 硬件加速统计
      const hardwareStats: { [key: string]: number } = {};
      Array.from(this.tasks.values()).forEach(task => {
        const hwAccel = task.options.hardwareAccel || 'none';
        hardwareStats[hwAccel] = (hardwareStats[hwAccel] || 0) + 1;
      });
      reportData.hardwareAccelStats = hardwareStats;

      // 错误统计
      const errorStats: { [key: string]: number } = {};
      this.globalLogs.filter(log => log.level === LogLevel.ERROR).forEach(log => {
        errorStats[log.category] = (errorStats[log.category] || 0) + 1;
      });
      reportData.errorStats = errorStats;

      // 保存报告到文件 - 使用更安全的路径处理
      let reportsDir: string;
      try {
        // 尝试使用日志文件目录
        reportsDir = path.join(path.dirname(this.logFilePath), 'reports');
      } catch (error) {
        // 如果失败，使用用户数据目录或临时目录
        const fallbackDir = userDataPath || require('os').tmpdir();
        reportsDir = path.join(fallbackDir, 'video-transcoder-reports');
        this.log(LogLevel.WARN, 'REPORT', '使用备用报告目录', { 
          originalPath: path.dirname(this.logFilePath),
          fallbackDir: reportsDir,
          error: (error as Error).message
        });
      }
      
      try {
        if (!fs.existsSync(reportsDir)) {
          fs.mkdirSync(reportsDir, { recursive: true });
        }
      } catch (dirError: any) {
        this.log(LogLevel.ERROR, 'REPORT', '无法创建报告目录', { 
          reportsDir, 
          error: dirError.message 
        });
        // 最后的备用方案：使用系统临时目录
        reportsDir = require('os').tmpdir();
        this.log(LogLevel.WARN, 'REPORT', '使用系统临时目录作为最后备用方案', { 
          tempDir: reportsDir 
        });
      }
      
      const reportFileName = taskId ? 
        `task-${taskId}-report-${Date.now()}.json` : 
        `global-report-${Date.now()}.json`;
      const reportPath = path.join(reportsDir, reportFileName);
      
      try {
        fs.writeFileSync(reportPath, JSON.stringify(reportData, null, 2), 'utf8');
      } catch (writeError: any) {
        this.log(LogLevel.ERROR, 'REPORT', '无法写入报告文件', { 
          reportPath, 
          error: writeError.message 
        });
        throw new Error(`无法写入报告文件: ${writeError.message}`);
      }
      
      this.log(LogLevel.INFO, 'REPORT', '日志报告已生成', { 
        reportPath, 
        taskId: taskId || 'global',
        fileSize: fs.statSync(reportPath).size
      });

      return reportPath;
    } catch (error: any) {
      this.log(LogLevel.ERROR, 'REPORT', '生成日志报告失败', { 
        error: error.message,
        taskId: taskId || 'global'
      });
      throw error;
    }
  }

  /**
   * 获取日志报告（供前端调用）
   */
  getLogReport(taskId?: string): any {
    if (taskId) {
      const task = this.tasks.get(taskId);
      return task ? {
        taskId,
        logs: task.logs,
        stats: task.stats,
        options: task.options,
        status: task.status
      } : null;
    }
    
    return {
      globalLogs: this.globalLogs.slice(-200), // 最近200条全局日志
      tasks: Array.from(this.tasks.values()).map(task => ({
        id: task.id,
        status: task.status,
        options: task.options,
        logCount: task.logs.length,
        errorCount: task.logs.filter(log => log.level === LogLevel.ERROR).length
      })),
      logFilePath: this.logFilePath
    };
  }
} 