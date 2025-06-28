/**
 * VideoInfo组件
 * 显示视频文件的详细信息
 */

import React from 'react';
import { Card, Descriptions, Tag } from 'antd';
import { VideoInfo as VideoInfoType } from '../types';
import './VideoInfo.css';

interface VideoInfoProps {
  videoInfo: VideoInfoType;
}

const VideoInfo: React.FC<VideoInfoProps> = ({ videoInfo }) => {
  /**
   * 格式化文件大小
   */
  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  /**
   * 格式化时长
   */
  const formatDuration = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    
    if (hours > 0) {
      return `${hours}小时 ${minutes}分钟 ${secs}秒`;
    } else if (minutes > 0) {
      return `${minutes}分钟 ${secs}秒`;
    } else {
      return `${secs}秒`;
    }
  };

  /**
   * 格式化码率
   */
  const formatBitrate = (bitrate: number): string => {
    if (bitrate >= 1000000) {
      return `${(bitrate / 1000000).toFixed(2)} Mbps`;
    } else if (bitrate >= 1000) {
      return `${(bitrate / 1000).toFixed(0)} Kbps`;
    } else {
      return `${bitrate} bps`;
    }
  };

  return (
    <Card className="video-info-card">
      <Descriptions title="基本信息" bordered column={2}>
        <Descriptions.Item label="格式">
          <Tag color="blue">{videoInfo.format.format_name?.toUpperCase()}</Tag>
        </Descriptions.Item>
        <Descriptions.Item label="文件大小">
          {formatFileSize(videoInfo.size)}
        </Descriptions.Item>
        <Descriptions.Item label="时长">
          {formatDuration(videoInfo.duration)}
        </Descriptions.Item>
        <Descriptions.Item label="总码率">
          {formatBitrate(videoInfo.bitrate)}
        </Descriptions.Item>
      </Descriptions>

      <Descriptions title="视频流信息" bordered column={2} style={{ marginTop: 24 }}>
        <Descriptions.Item label="编码格式">
          <Tag color="green">{videoInfo.videoCodec?.toUpperCase()}</Tag>
        </Descriptions.Item>
        <Descriptions.Item label="分辨率">
          {videoInfo.resolution}
        </Descriptions.Item>
        <Descriptions.Item label="帧率">
          {videoInfo.fps ? `${videoInfo.fps} fps` : '-'}
        </Descriptions.Item>
        <Descriptions.Item label="像素格式">
          {videoInfo.streams.find(s => s.codec_type === 'video')?.pix_fmt || '-'}
        </Descriptions.Item>
      </Descriptions>

      <Descriptions title="音频流信息" bordered column={2} style={{ marginTop: 24 }}>
        <Descriptions.Item label="编码格式">
          <Tag color="orange">{videoInfo.audioCodec?.toUpperCase()}</Tag>
        </Descriptions.Item>
        <Descriptions.Item label="采样率">
          {videoInfo.streams.find(s => s.codec_type === 'audio')?.sample_rate || '-'} Hz
        </Descriptions.Item>
        <Descriptions.Item label="声道">
          {videoInfo.streams.find(s => s.codec_type === 'audio')?.channels || '-'}
        </Descriptions.Item>
        <Descriptions.Item label="音频码率">
          {videoInfo.streams.find(s => s.codec_type === 'audio')?.bit_rate 
            ? formatBitrate(videoInfo.streams.find(s => s.codec_type === 'audio')?.bit_rate)
            : '-'}
        </Descriptions.Item>
      </Descriptions>

      {/* 其他流信息 */}
      {videoInfo.streams.filter(s => s.codec_type !== 'video' && s.codec_type !== 'audio').length > 0 && (
        <Descriptions title="其他流信息" bordered column={1} style={{ marginTop: 24 }}>
          {videoInfo.streams
            .filter(s => s.codec_type !== 'video' && s.codec_type !== 'audio')
            .map((stream, index) => (
              <Descriptions.Item key={index} label={`流 #${stream.index}`}>
                类型: {stream.codec_type}, 编码: {stream.codec_name}
              </Descriptions.Item>
            ))}
        </Descriptions>
      )}
    </Card>
  );
};

export default VideoInfo; 