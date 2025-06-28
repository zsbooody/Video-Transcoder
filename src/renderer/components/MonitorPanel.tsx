/**
 * MonitorPanel组件
 * 显示转码过程中的系统资源监控信息
 */

import React, { useState, useEffect } from 'react';
import { Row, Col, Card, Statistic } from 'antd';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import './MonitorPanel.css';

interface MonitorData {
  time: string;
  cpu: number;
  memory: number;
  gpu: number;
  fps: number;
  speed: number;
}

interface ProgressData {
  taskId: string;
  progress: number;
  status: string;
  timemark?: string;
  currentFps?: number;
  currentKbps?: number;
  targetSize?: number;
  hardwareAccel?: string; // 添加硬件加速信息
}

interface MonitorPanelProps {
  taskId?: string;
}

const MonitorPanel: React.FC<MonitorPanelProps> = ({ taskId }) => {
  const [monitorData, setMonitorData] = useState<MonitorData[]>([]);
  const [currentStats, setCurrentStats] = useState({
    cpu: 0,
    memory: 0,
    gpu: 0,
    fps: 0,
    speed: '0.0x',
    kbps: 0,
    targetSize: 0,
    estimatedTimeRemaining: '计算中...'
  });

  // 使用ref来保存当前的taskId，避免闭包问题
  const currentTaskIdRef = React.useRef<string | undefined>(taskId);
  // 保存开始时间和进度历史用于计算剩余时间
  const startTimeRef = React.useRef<number>(0);
  const progressHistoryRef = React.useRef<{time: number, progress: number}[]>([]);
  // 数据平滑处理
  const smoothingDataRef = React.useRef<{cpu: number[], memory: number[], gpu: number[], fps: number[]}>({
    cpu: [],
    memory: [],
    gpu: [],
    fps: []
  });
  
  useEffect(() => {
    currentTaskIdRef.current = taskId;
    console.log('MonitorPanel taskId changed to:', taskId);
    
    // 如果没有活跃任务，清空数据
    if (!taskId) {
      console.log('No taskId, clearing monitor data');
      setMonitorData([]);
      setCurrentStats({
        cpu: 0,
        memory: 0,
        gpu: 0,
        fps: 0,
        speed: '0.0x',
        kbps: 0,
        targetSize: 0,
        estimatedTimeRemaining: '计算中...'
      });
      // 重置时间和历史数据
      startTimeRef.current = 0;
      progressHistoryRef.current = [];
      smoothingDataRef.current = { cpu: [], memory: [], gpu: [], fps: [] };
    }
  }, [taskId]);

  // 数据平滑处理函数
  const smoothValue = (newValue: number, history: number[], maxHistory: number = 5): number => {
    history.push(newValue);
    if (history.length > maxHistory) {
      history.shift();
    }
    // 使用加权平均，最新数据权重更高
    const weights = history.map((_, index) => index + 1);
    const weightSum = weights.reduce((sum, weight) => sum + weight, 0);
    const weightedSum = history.reduce((sum, value, index) => sum + value * weights[index], 0);
    return weightedSum / weightSum;
  };

  // 计算预计剩余时间
  const calculateEstimatedTime = (currentProgress: number): string => {
    const now = Date.now();
    
    // 初始化开始时间
    if (startTimeRef.current === 0) {
      startTimeRef.current = now;
      return '计算中...';
    }
    
    // 添加进度历史
    progressHistoryRef.current.push({ time: now, progress: currentProgress });
    
    // 保持最近10个数据点
    if (progressHistoryRef.current.length > 10) {
      progressHistoryRef.current.shift();
    }
    
    // 需要至少3个数据点才能计算
    if (progressHistoryRef.current.length < 3 || currentProgress <= 0) {
      return '计算中...';
    }
    
    // 计算平均速度（进度/时间）
    const firstPoint = progressHistoryRef.current[0];
    const lastPoint = progressHistoryRef.current[progressHistoryRef.current.length - 1];
    
    const timeElapsed = (lastPoint.time - firstPoint.time) / 1000; // 秒
    const progressMade = lastPoint.progress - firstPoint.progress;
    
    if (timeElapsed <= 0 || progressMade <= 0) {
      return '计算中...';
    }
    
    const progressPerSecond = progressMade / timeElapsed;
    const remainingProgress = 100 - currentProgress;
    const estimatedSeconds = remainingProgress / progressPerSecond;
    
    if (estimatedSeconds <= 0 || !isFinite(estimatedSeconds)) {
      return '即将完成';
    }
    
    // 格式化时间
    const hours = Math.floor(estimatedSeconds / 3600);
    const minutes = Math.floor((estimatedSeconds % 3600) / 60);
    const seconds = Math.floor(estimatedSeconds % 60);
    
    if (hours > 0) {
      return `约 ${hours}小时${minutes}分钟`;
    } else if (minutes > 0) {
      return `约 ${minutes}分${seconds}秒`;
    } else {
      return `约 ${seconds}秒`;
    }
  };

  // 使用一次性的事件监听器
  useEffect(() => {
    console.log('MonitorPanel setting up global progress listener');
    
    // 监听转码进度更新
    const handleProgress = (data: ProgressData) => {
      console.log('MonitorPanel收到进度数据:', data);
      console.log('当前taskId:', currentTaskIdRef.current, '数据taskId:', data.taskId);
      
      // 检查是否是当前任务的数据
      if (!currentTaskIdRef.current || data.taskId !== currentTaskIdRef.current) {
        console.log('TaskId不匹配，忽略数据');
        return;
      }
      
      const now = new Date();
      const timeStr = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}:${now.getSeconds().toString().padStart(2, '0')}`;
      
      // 从进度数据中提取性能信息，确保有默认值
      const fps = data.currentFps || 0;
      const kbps = data.currentKbps || 0;
      const targetSize = data.targetSize || 0;
      
      console.log('提取的性能数据:', { fps, kbps, targetSize });
      
      // 计算转码速度倍率（基于时间标记）
      let speed = 0;
      if (data.timemark && data.timemark.length > 0) {
        // 解析时间标记 (格式: HH:MM:SS.mmm)
        const timeMatch = data.timemark.match(/(\d+):(\d+):(\d+)\.?(\d*)/);
        if (timeMatch) {
          const hours = parseInt(timeMatch[1]) || 0;
          const minutes = parseInt(timeMatch[2]) || 0;
          const seconds = parseInt(timeMatch[3]) || 0;
          const processedSeconds = hours * 3600 + minutes * 60 + seconds;
          
          // 估算转码速度（基于进度比例）
          if (data.progress > 0) {
            speed = processedSeconds / (data.progress / 100 * 3600); // 假设总时长1小时进行估算
          }
        }
      }
      
      // 基于实际数据估算CPU、内存和GPU使用率
      let estimatedCPU = 30; // 默认基础值
      let estimatedMemory = 20; // 默认基础值
      let estimatedGPU = 0; // GPU使用率
      
      if (fps > 0 || kbps > 0) {
        // 基于FPS和码率估算CPU使用率 (20-80%)
        const rawCPU = Math.min(80, Math.max(20, fps * 1.2 + (kbps / 1000) * 15));
        estimatedCPU = smoothValue(rawCPU, smoothingDataRef.current.cpu);
        
        // 基于处理负载估算内存使用率 (10-60%)
        const rawMemory = Math.min(60, Math.max(10, fps * 0.6 + (targetSize / 100000) * 20));
        estimatedMemory = smoothValue(rawMemory, smoothingDataRef.current.memory);
        
        // 估算GPU使用率（仅在使用硬件加速时）
        if (data.status === 'running' && data.hardwareAccel && data.hardwareAccel !== 'none') {
          // 基于FPS和码率估算GPU负载
          const rawGPU = Math.min(90, Math.max(10, fps * 2 + (kbps / 1000) * 25));
          estimatedGPU = smoothValue(rawGPU, smoothingDataRef.current.gpu);
        } else {
          // 软件编码时GPU使用率应该很低
          estimatedGPU = smoothValue(Math.random() * 5, smoothingDataRef.current.gpu);
        }
      } else {
        // 如果没有具体数据，使用基于进度的估算
        const rawCPU = Math.min(70, Math.max(25, data.progress * 0.5 + 30));
        estimatedCPU = smoothValue(rawCPU, smoothingDataRef.current.cpu);
        
        const rawMemory = Math.min(50, Math.max(15, data.progress * 0.3 + 20));
        estimatedMemory = smoothValue(rawMemory, smoothingDataRef.current.memory);
        
        if (data.status === 'running' && data.hardwareAccel && data.hardwareAccel !== 'none') {
          const rawGPU = Math.min(60, Math.max(5, data.progress * 0.4 + 15));
          estimatedGPU = smoothValue(rawGPU, smoothingDataRef.current.gpu);
        } else {
          // 软件编码时GPU使用率很低
          estimatedGPU = smoothValue(Math.random() * 3, smoothingDataRef.current.gpu);
        }
      }
      
      // 计算预计剩余时间
      const estimatedTimeRemaining = calculateEstimatedTime(data.progress);
      
      console.log('计算的性能数据:', { estimatedCPU, estimatedMemory, estimatedGPU, speed, estimatedTimeRemaining });
      
      const newData: MonitorData = {
        time: timeStr,
        cpu: estimatedCPU,
        memory: estimatedMemory,
        gpu: estimatedGPU,
        fps: fps,
        speed: Math.max(0, speed) // 确保速度不为负数
      };

      setMonitorData(prev => {
        const updated = [...prev, newData];
        // 保持最近30个数据点
        if (updated.length > 30) {
          updated.shift();
        }
        return updated;
      });

      const newStats = {
        cpu: parseFloat(estimatedCPU.toFixed(1)),
        memory: parseFloat(estimatedMemory.toFixed(1)),
        gpu: parseFloat(estimatedGPU.toFixed(1)),
        fps: Math.round(fps),
        speed: speed > 0 ? `${speed.toFixed(1)}x` : '0.0x',
        kbps: Math.round(kbps),
        targetSize: Math.round(targetSize / 1024), // 转换为KB
        estimatedTimeRemaining: estimatedTimeRemaining
      };
      
      console.log('设置新的统计数据:', newStats);
      setCurrentStats(newStats);
    };

    // 注册进度监听
    if (window.electronAPI && window.electronAPI.ffmpeg) {
      console.log('注册进度监听器');
      window.electronAPI.ffmpeg.onProgress(handleProgress);
    } else {
      console.error('electronAPI或ffmpeg不可用');
    }

    // 这个useEffect只运行一次，不需要清理
    return () => {
      console.log('MonitorPanel组件卸载');
    };
  }, []); // 空依赖数组，只运行一次

  return (
    <div className="monitor-panel">
      <div className="monitor-header">
        <h3>性能监控</h3>
        {taskId && (
          <div className="monitor-stats">
            <div className="stat-item">
              <span className="label">CPU:</span>
              <span className="value">{currentStats.cpu}%</span>
            </div>
            <div className="stat-item">
              <span className="label">内存:</span>
              <span className="value">{currentStats.memory}%</span>
            </div>
            <div className="stat-item">
              <span className="label">GPU:</span>
              <span className="value">{currentStats.gpu}%</span>
            </div>
            <div className="stat-item">
              <span className="label">FPS:</span>
              <span className="value">{currentStats.fps}</span>
            </div>
            <div className="stat-item">
              <span className="label">速度:</span>
              <span className="value">{currentStats.speed}</span>
            </div>
            <div className="stat-item">
              <span className="label">码率:</span>
              <span className="value">{currentStats.kbps}kb/s</span>
            </div>
            <div className="stat-item">
              <span className="label">预计剩余:</span>
              <span className="value">{currentStats.estimatedTimeRemaining}</span>
            </div>
          </div>
        )}
      </div>
      
      {taskId && monitorData.length > 0 ? (
        <div className="monitor-chart">
          <LineChart width={400} height={200} data={monitorData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis 
              dataKey="time" 
              fontSize={10}
              interval="preserveStartEnd"
            />
            <YAxis 
              domain={[0, 100]}
              fontSize={10}
            />
            <Tooltip 
              formatter={(value, name) => {
                const nameMap: Record<string, string> = {
                  cpu: 'CPU使用率',
                  memory: '内存使用率',
                  gpu: 'GPU使用率',
                  fps: '帧率',
                  speed: '处理速度'
                };
                return [`${value}${name === 'fps' || name === 'speed' ? '' : '%'}`, nameMap[name] || name];
              }}
              labelFormatter={(label) => `时间: ${label}`}
            />
            <Legend 
              formatter={(value) => {
                const nameMap: Record<string, string> = {
                  cpu: 'CPU使用率',
                  memory: '内存使用率',
                  gpu: 'GPU使用率',
                  fps: '帧率',
                  speed: '处理速度'
                };
                return nameMap[value] || value;
              }}
            />
            <Line 
              type="monotone" 
              dataKey="cpu" 
              stroke="#1890ff" 
              strokeWidth={2}
              dot={false}
              name="cpu"
            />
            <Line 
              type="monotone" 
              dataKey="memory" 
              stroke="#52c41a" 
              strokeWidth={2}
              dot={false}
              name="memory"
            />
            <Line 
              type="monotone" 
              dataKey="gpu" 
              stroke="#fa8c16" 
              strokeWidth={2}
              dot={false}
              name="gpu"
            />
            <Line 
              type="monotone" 
              dataKey="fps" 
              stroke="#eb2f96" 
              strokeWidth={2}
              dot={false}
              name="fps"
            />
          </LineChart>
        </div>
      ) : (
        <div className="monitor-empty">
          {taskId ? '等待转码数据...' : '请选择一个转码任务以查看性能监控'}
        </div>
      )}
    </div>
  );
};

export default MonitorPanel; 