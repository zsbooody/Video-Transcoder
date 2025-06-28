/**
 * 主应用组件
 * 管理应用的整体布局和状态
 */

import React, { useState, useEffect } from 'react';
import { Layout, message, ConfigProvider, theme } from 'antd';
import Header from './components/Header';
import Sidebar from './components/Sidebar';
import MainContent from './components/MainContent';
import AboutModal from './components/AboutModal';
import HelpModal from './components/HelpModal';
import LogViewer from './components/LogViewer';
import { TranscodeTask, AppSettings, HardwareFallbackData } from './types';
import './styles/App.css';

const { Content } = Layout;

const App: React.FC = () => {
  // 状态管理
  const [tasks, setTasks] = useState<TranscodeTask[]>([]);
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [isDragging, setIsDragging] = useState(false);
  const [processingFiles, setProcessingFiles] = useState(false);
  const [helpVisible, setHelpVisible] = useState(false);
  const [aboutVisible, setAboutVisible] = useState(false);
  const [settingsVisible, setSettingsVisible] = useState(false);
  const [logViewerVisible, setLogViewerVisible] = useState(false);
  const [logViewerTaskId, setLogViewerTaskId] = useState<string | undefined>(undefined);

  // 初始化应用
  useEffect(() => {
    initializeApp();
    setupMenuListeners();
    setupDragAndDrop();
    setupTranscodeListeners();
    return () => {
      // 清理事件监听器
    };
  }, []);

  /**
   * 初始化应用设置
   */
  const initializeApp = async () => {
    try {
      // 加载应用设置
      const appSettings = await window.electronAPI.store.getSettings();
      setSettings(appSettings);
      setLoading(false);
    } catch (error) {
      message.error('初始化失败');
      console.error(error);
      setLoading(false);
    }
  };

  /**
   * 设置菜单事件监听
   */
  const setupMenuListeners = () => {
    window.electronAPI.menu.onAddFiles(() => {
      handleAddFiles();
    });

    window.electronAPI.menu.onClearQueue(() => {
      handleClearQueue();
    });

    window.electronAPI.menu.onShowHelp(() => {
      setHelpVisible(true);
    });

    window.electronAPI.menu.onShowAbout(() => {
      setAboutVisible(true);
    });

    window.electronAPI.menu.onShowSettings(() => {
      setSettingsVisible(true);
    });
  };

  /**
   * 设置拖拽功能
   */
  const setupDragAndDrop = () => {
    const handleDragOver = (e: DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      if (e.dataTransfer?.types.includes('Files')) {
        e.dataTransfer.dropEffect = 'copy';
      }
    };

    const handleDragEnter = (e: DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      if (e.dataTransfer?.types.includes('Files')) {
        setIsDragging(true);
      }
    };

    const handleDragLeave = (e: DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      // 只在真正离开应用窗口时取消拖拽状态
      if (!e.relatedTarget || !(e.relatedTarget as Element).closest('.app-layout')) {
        setIsDragging(false);
      }
    };

    const handleDrop = async (e: DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragging(false);
      
      // 防止重复处理
      if (processingFiles) {
        console.log('正在处理文件，忽略重复拖拽');
        return;
      }

      setProcessingFiles(true);
      
      try {
        const files = Array.from(e.dataTransfer!.files);
        console.log('拖拽的原始文件:', files.map(f => ({ name: f.name, path: f.path, size: f.size })));
        
        const videoFiles = files.filter(file => {
          const ext = file.name.toLowerCase().split('.').pop();
          return ['mp4', 'avi', 'mkv', 'mov', 'wmv', 'flv', 'webm'].includes(ext || '');
        });

        if (videoFiles.length === 0) {
          if (files.length > 0) {
            message.warning('请拖拽视频文件（支持格式：MP4, AVI, MKV, MOV, WMV, FLV, WebM）');
          }
          return;
        }

        console.log('筛选后的视频文件:', videoFiles.map(f => ({ name: f.name, path: f.path })));
        const newTasks: TranscodeTask[] = [];
        
        for (const file of videoFiles) {
          try {
            // 使用 file.path 获取完整路径
            const filePath = file.path;
            if (!filePath) {
              console.warn('文件路径为空:', file.name);
              continue;
            }
            
            console.log('正在读取文件:', filePath);
            
            const videoInfo = await window.electronAPI.ffmpeg.getVideoInfo(filePath);
            const task: TranscodeTask = {
              id: `task_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
              inputFile: filePath,
              outputFile: '',
              status: 'pending',
              progress: 0,
              videoInfo: videoInfo
            };
            newTasks.push(task);
            console.log('成功读取文件:', file.name);
          } catch (error) {
            console.error('读取文件失败:', file.name, error);
            message.error(`无法读取文件信息: ${file.name}`);
          }
        }
        
        if (newTasks.length > 0) {
          setTasks(prevTasks => {
            // 去重：检查是否已存在相同路径的文件
            const existingPaths = new Set(prevTasks.map(task => task.inputFile));
            const uniqueNewTasks = newTasks.filter(task => !existingPaths.has(task.inputFile));
            
            if (uniqueNewTasks.length === 0) {
              message.warning('所有文件都已存在');
              return prevTasks;
            }
            
            if (uniqueNewTasks.length !== newTasks.length) {
              message.warning(`${newTasks.length - uniqueNewTasks.length} 个文件已存在，已跳过`);
            }
            
            return [...prevTasks, ...uniqueNewTasks];
          });
          message.success(`已添加 ${newTasks.filter((task, index, arr) => 
            arr.findIndex(t => t.inputFile === task.inputFile) === index
          ).length} 个文件`);
        }
      } finally {
        setProcessingFiles(false);
      }
    };

    document.addEventListener('dragover', handleDragOver);
    document.addEventListener('dragenter', handleDragEnter);
    document.addEventListener('dragleave', handleDragLeave);
    document.addEventListener('drop', handleDrop);

    return () => {
      document.removeEventListener('dragover', handleDragOver);
      document.removeEventListener('dragenter', handleDragEnter);
      document.removeEventListener('dragleave', handleDragLeave);
      document.removeEventListener('drop', handleDrop);
    };
  };

  /**
   * 设置转码事件监听
   */
  const setupTranscodeListeners = () => {
    // 监听转码进度
    window.electronAPI.ffmpeg.onProgress((data) => {
      console.log('App收到进度数据:', data);
      setTasks(prevTasks => prevTasks.map(t => 
        t.transcodeId === data.taskId 
          ? { ...t, progress: data.progress, status: data.status as TranscodeTask['status'] }
          : t
      ));
    });

    // 监听转码完成
    window.electronAPI.ffmpeg.onCompleted((data) => {
      setTasks(prevTasks => prevTasks.map(t => 
        t.transcodeId === data.taskId 
          ? { ...t, status: 'completed' as const, progress: 100 }
          : t
      ));
      
      // 显示完成通知
      const task = tasks.find(t => t.transcodeId === data.taskId);
      if (task) {
        const fileName = task.inputFile.split(/[\\\\\\/]/).pop();
        const compressionText = data.compressionRatio > 0 
          ? `，压缩了${data.compressionRatio}%` 
          : `，文件大小：${data.inputSizeMB}MB → ${data.outputSizeMB}MB`;
        
        message.success({
          content: `转码完成：${fileName}（耗时：${data.durationSeconds}秒${compressionText}）`,
          duration: 8 // 显示8秒
        });
      }
    });

    // 监听转码失败
    window.electronAPI.ffmpeg.onFailed((data) => {
      // 不要在这里设置状态，因为后端已经通过progress事件发送了正确的状态
      // 只显示失败通知即可
      
      // 显示失败通知
      const fileName = data.inputFile.split(/[\\\\\\/]/).pop();
      message.error({
        content: `转码失败：${fileName}（错误：${data.error}）`,
        duration: 10 // 显示10秒
      });
    });

    // 监听硬件加速回退
    window.electronAPI.ffmpeg.onHardwareFallback((data: HardwareFallbackData) => {
      // 显示硬件加速回退通知
      const fileName = data.inputFile.split(/[\\\\\\/]/).pop();
      const hardwareAccelNames: { [key: string]: string } = {
        'nvenc': 'NVIDIA NVENC',
        'amf': 'AMD AMF', 
        'qsv': 'Intel Quick Sync',
        'd3d11va': 'Direct3D 11',
        'dxva2': 'DirectX Video Acceleration'
      };
      
      const hardwareName = hardwareAccelNames[data.originalHardwareAccel] || data.originalHardwareAccel;
      
      message.warning({
        content: `${fileName}：${hardwareName} 硬件加速不可用，已自动切换到软件编码继续转码`,
        duration: 8
      });
      
      console.log('硬件加速回退:', data);
    });
    
    // 监听硬件验证失败
    window.electronAPI.ffmpeg.onHardwareValidationFailed((data: any) => {
      const hardwareAccelNames: { [key: string]: string } = {
        'nvenc': 'NVIDIA NVENC',
        'amf': 'AMD AMF', 
        'qsv': 'Intel Quick Sync',
        'd3d11va': 'Direct3D 11',
        'dxva2': 'DirectX Video Acceleration'
      };
      
      const hardwareName = hardwareAccelNames[data.hardwareAccel] || data.hardwareAccel;
      
      message.warning({
        content: `硬件编码器验证失败：${hardwareName} 不可用，已切换到软件编码`,
        duration: 6
      });
      
      console.log('硬件验证失败:', data);
    });
  };

  /**
   * 添加文件
   */
  const handleAddFiles = async () => {
    try {
      const result = await window.electronAPI.dialog.openFile();
      if (!result.canceled && result.filePaths.length > 0) {
        // 处理选中的文件
        const newTasks: TranscodeTask[] = [];
        
        for (const filePath of result.filePaths) {
          try {
            const videoInfo = await window.electronAPI.ffmpeg.getVideoInfo(filePath);
            const task: TranscodeTask = {
              id: `task_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
              inputFile: filePath,
              outputFile: '',
              status: 'pending',
              progress: 0,
              videoInfo: videoInfo
            };
            newTasks.push(task);
          } catch (error) {
            message.error(`无法读取文件信息: ${filePath}`);
            console.error(error);
          }
        }
        
        setTasks([...tasks, ...newTasks]);
        message.success(`已添加 ${newTasks.length} 个文件`);
      }
    } catch (error) {
      message.error('选择文件失败');
      console.error(error);
    }
  };

  /**
   * 清空任务队列
   */
  const handleClearQueue = () => {
    setTasks([]);
    setSelectedTaskId(null);
    message.success('任务队列已清空');
  };

  /**
   * 开始转码
   */
  const handleStartTranscode = async (taskId: string, options: any) => {
    try {
      const task = tasks.find(t => t.id === taskId);
      if (!task) return;

      // 调用FFmpeg开始转码
      const transcodeId = await window.electronAPI.ffmpeg.startTranscode({
        inputFile: task.inputFile,
        outputFile: options.outputFile,
        transcodeOptions: options.transcodeOptions
      });

      // 更新任务状态
      setTasks(tasks.map(t => 
        t.id === taskId 
          ? { ...t, status: 'running', transcodeId, outputFile: options.outputFile }
          : t
      ));

      // 监听进度更新
      window.electronAPI.ffmpeg.onProgress((data) => {
        if (data.taskId === transcodeId) {
          setTasks(prevTasks => prevTasks.map(t => 
            t.transcodeId === transcodeId 
              ? { ...t, progress: data.progress }
              : t
          ));
        }
      });

    } catch (error) {
      message.error('开始转码失败');
      console.error(error);
    }
  };

  /**
   * 暂停转码
   */
  const handlePauseTranscode = async (taskId: string) => {
    try {
      const task = tasks.find(t => t.id === taskId);
      if (!task || !task.transcodeId) return;

      await window.electronAPI.ffmpeg.pauseTranscode(task.transcodeId);
      
      setTasks(tasks.map(t => 
        t.id === taskId ? { ...t, status: 'paused' } : t
      ));
    } catch (error) {
      message.error('暂停失败');
      console.error(error);
    }
  };

  /**
   * 恢复转码
   */
  const handleResumeTranscode = async (taskId: string) => {
    try {
      const task = tasks.find(t => t.id === taskId);
      if (!task || !task.transcodeId) return;

      await window.electronAPI.ffmpeg.resumeTranscode(task.transcodeId);
      
      setTasks(tasks.map(t => 
        t.id === taskId ? { ...t, status: 'running' } : t
      ));
    } catch (error) {
      message.error('恢复失败');
      console.error(error);
    }
  };

  /**
   * 取消转码
   */
  const handleCancelTranscode = async (taskId: string) => {
    try {
      const task = tasks.find(t => t.id === taskId);
      if (!task || !task.transcodeId) return;

      await window.electronAPI.ffmpeg.cancelTranscode(task.transcodeId);
      
      // 不要立即设置状态，等待后端的进度更新来设置正确的状态
      // 后端会发送 status: 'pending', progress: 0 的更新
      console.log('取消转码请求已发送，等待状态更新');
    } catch (error) {
      message.error('取消失败');
      console.error(error);
    }
  };

  /**
   * 删除任务
   */
  const handleDeleteTask = (taskId: string) => {
    setTasks(tasks.filter(t => t.id !== taskId));
    if (selectedTaskId === taskId) {
      setSelectedTaskId(null);
    }
    message.success('任务已删除');
  };

  if (loading) {
    return null; // HTML中已有加载动画
  }

  const appClassName = `app-layout ${isDragging ? 'app-dragging' : ''} ${processingFiles ? 'app-processing' : ''}`;
  
  // 根据设置决定主题
  const isDarkMode = settings?.theme === 'dark';

  return (
    <ConfigProvider
      theme={{
        algorithm: isDarkMode ? theme.darkAlgorithm : theme.defaultAlgorithm,
        token: {
          colorPrimary: '#1890ff',
        },
      }}
    >
      <div data-theme={isDarkMode ? 'dark' : 'light'}>
        <Layout className={appClassName}>
          <Header 
            onAddFiles={handleAddFiles}
            settings={settings}
            onSettingsChange={setSettings}
            settingsVisible={settingsVisible}
            onSettingsVisibleChange={setSettingsVisible}
          />
          <Layout>
            <Sidebar 
              tasks={tasks}
              selectedTaskId={selectedTaskId}
              onSelectTask={setSelectedTaskId}
              onDeleteTask={handleDeleteTask}
            />
            <Content className="main-content">
              <MainContent 
                tasks={tasks}
                selectedTaskId={selectedTaskId}
                settings={settings}
                onStartTranscode={handleStartTranscode}
                onPauseTranscode={handlePauseTranscode}
                onResumeTranscode={handleResumeTranscode}
                onCancelTranscode={handleCancelTranscode}
              />
            </Content>
          </Layout>
        </Layout>
        
        <AboutModal
          visible={aboutVisible}
          onClose={() => setAboutVisible(false)}
        />
        
        <HelpModal
          visible={helpVisible}
          onClose={() => setHelpVisible(false)}
          onShowLogs={() => {
            setLogViewerVisible(true);
            setLogViewerTaskId(undefined);
          }}
        />
        
        <LogViewer
          isOpen={logViewerVisible}
          taskId={logViewerTaskId}
          onClose={() => {
            setLogViewerVisible(false);
            setLogViewerTaskId(undefined);
          }}
        />
      </div>
    </ConfigProvider>
  );
};

export default App; 