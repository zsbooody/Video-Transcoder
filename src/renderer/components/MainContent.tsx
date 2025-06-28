/**
 * MainContent组件
 * 显示选中任务的详细信息和转码设置
 */

import React, { useState, useEffect } from 'react';
import { Empty, Tabs, Card, Form, Select, Input, Button, Space, Row, Col, Statistic, Progress, message, Modal } from 'antd';
import {
  PlayCircleOutlined,
  PauseOutlined,
  StopOutlined,
  SaveOutlined,
  SettingOutlined
} from '@ant-design/icons';
import { TranscodeTask, TranscodeOptions, Preset } from '../types';
import VideoInfo from './VideoInfo';
import MonitorPanel from './MonitorPanel';
import './MainContent.css';

const { Option } = Select;
const { TextArea } = Input;

interface MainContentProps {
  tasks: TranscodeTask[];
  selectedTaskId: string | null;
  settings: any; // 添加设置参数
  onStartTranscode: (taskId: string, options: any) => void;
  onPauseTranscode: (taskId: string) => void;
  onResumeTranscode: (taskId: string) => void;
  onCancelTranscode: (taskId: string) => void;
}

const MainContent: React.FC<MainContentProps> = ({
  tasks,
  selectedTaskId,
  settings,
  onStartTranscode,
  onPauseTranscode,
  onResumeTranscode,
  onCancelTranscode
}) => {
  const [form] = Form.useForm();
  const [presets, setPresets] = useState<Preset[]>([]);
  const [selectedPreset, setSelectedPreset] = useState<string>('');
  const [outputPath, setOutputPath] = useState<string>('');
  const [hardwareAccelOptions, setHardwareAccelOptions] = useState<any[]>([]);
  const [savePresetModalVisible, setSavePresetModalVisible] = useState(false);
  const [presetForm] = Form.useForm();

  // 获取选中的任务
  const selectedTask = tasks.find(t => t.id === selectedTaskId);

  // 加载预设和硬件加速选项
  useEffect(() => {
    loadPresets();
    loadHardwareAccelOptions();
  }, []);

  // 任务切换时重置表单
  useEffect(() => {
    if (selectedTask) {
      // 生成默认输出路径 - 使用设置中的输出目录
      const fileName = selectedTask.inputFile.split(/[\\\/]/).pop() || '';
      const nameWithoutExt = fileName.substring(0, fileName.lastIndexOf('.')) || fileName;
      
      // 使用设置中的输出目录，如果没有设置则使用桌面
      const outputDir = settings?.outputDirectory || `${process.env.USERPROFILE || process.env.HOME}\\Desktop\\转码输出`;
      const defaultOutput = `${outputDir}\\${nameWithoutExt}_converted.mp4`;
      
      setOutputPath(defaultOutput);
    }
  }, [selectedTask, settings]);

  /**
   * 加载预设配置
   */
  const loadPresets = async () => {
    try {
      const presetList = await window.electronAPI.store.getPresets();
      setPresets(presetList);
    } catch (error) {
      console.error('加载预设失败:', error);
    }
  };

  /**
   * 加载硬件加速选项
   */
  const loadHardwareAccelOptions = async () => {
    try {
      const options = await window.electronAPI.ffmpeg.detectHardwareAccel();
      setHardwareAccelOptions(options);
    } catch (error) {
      console.error('加载硬件加速选项失败:', error);
    }
  };

  /**
   * 应用预设
   */
  const applyPreset = (presetId: string) => {
    const preset = presets.find(p => p.id === presetId);
    if (preset) {
      form.setFieldsValue({
        outputFormat: preset.outputFormat,
        videoCodec: preset.videoCodec,
        audioCodec: preset.audioCodec,
        videoBitrate: preset.videoBitrate,
        audioBitrate: preset.audioBitrate,
        resolution: preset.resolution,
        fps: preset.fps,
        preset: preset.preset
      });
    }
  };

  /**
   * 开始转码
   */
  const handleStart = () => {
    if (!selectedTask) return;

    form.validateFields().then(values => {
      const options = {
        outputFile: outputPath,
        transcodeOptions: values as TranscodeOptions
      };
      onStartTranscode(selectedTask.id, options);
    }).catch(error => {
      message.error('请填写必要的转码参数');
    });
  };

  /**
   * 保存为预设
   */
  const handleSavePreset = () => {
    setSavePresetModalVisible(true);
    // 预填充当前表单数据
    const values = form.getFieldsValue();
    presetForm.setFieldsValue({
      name: '',
      description: `用户自定义预设 - ${new Date().toLocaleDateString()}`,
      ...values
    });
  };

  /**
   * 确认保存预设
   */
  const handleConfirmSavePreset = async () => {
    try {
      const values = await presetForm.validateFields();
      console.log('保存预设数据:', values);
      
      const presetData = {
        name: values.name,
        description: values.description,
        outputFormat: values.outputFormat,
        videoCodec: values.videoCodec,
        audioCodec: values.audioCodec,
        videoBitrate: values.videoBitrate,
        audioBitrate: values.audioBitrate,
        resolution: values.resolution,
        fps: values.fps,
        preset: values.preset,
        hardwareAccel: values.hardwareAccel
      };

      const newPreset = await window.electronAPI.store.savePreset(presetData);
      console.log('预设保存成功:', newPreset);
      
      // 重新加载预设列表
      await loadPresets();
      message.success(`预设"${values.name}"保存成功`);
      setSavePresetModalVisible(false);
      presetForm.resetFields();
    } catch (error) {
      console.error('保存预设失败:', error);
      message.error('保存预设失败');
    }
  };

  if (!selectedTask) {
    return (
      <div className="main-content-empty">
        <Empty description="请选择一个任务" />
      </div>
    );
  }

  return (
    <div className="main-content">
      <div className="content-header">
        <h2>{selectedTask.inputFile.split(/[\\\/]/).pop()}</h2>
        <Space>
          {selectedTask.status === 'pending' && (
            <Button type="primary" icon={<PlayCircleOutlined />} onClick={handleStart}>
              开始转码
            </Button>
          )}
          {selectedTask.status === 'running' && (
            <Button icon={<PauseOutlined />} onClick={() => onPauseTranscode(selectedTask.id)}>
              暂停
            </Button>
          )}
          {selectedTask.status === 'paused' && (
            <Button type="primary" icon={<PlayCircleOutlined />} onClick={() => onResumeTranscode(selectedTask.id)}>
              继续
            </Button>
          )}
          {(selectedTask.status === 'running' || selectedTask.status === 'paused') && (
            <Button danger icon={<StopOutlined />} onClick={() => onCancelTranscode(selectedTask.id)}>
              停止
            </Button>
          )}
        </Space>
      </div>

      {selectedTask.status === 'running' || selectedTask.status === 'paused' ? (
        <div className="progress-section">
          <Progress
            percent={Math.round(selectedTask.progress)}
            status={selectedTask.status === 'paused' ? 'exception' : 'active'}
            size="default"
          />
          <MonitorPanel taskId={selectedTask.transcodeId} />
        </div>
      ) : null}

      <Tabs 
        defaultActiveKey="settings"
        items={[
          {
            key: 'settings',
            label: '转码设置',
            children: (
              <Card>
                <Form
                  form={form}
                  layout="vertical"
                  initialValues={{
                    outputFormat: 'mp4',
                    videoCodec: 'libx264',
                    audioCodec: 'aac',
                    preset: 'medium'
                  }}
                >
                  <Row gutter={16}>
                    <Col span={24}>
                      <Form.Item label="预设配置">
                        <Select
                          placeholder="选择预设配置"
                          value={selectedPreset}
                          onChange={(value) => {
                            setSelectedPreset(value);
                            applyPreset(value);
                          }}
                          allowClear
                        >
                          {presets.map(preset => (
                            <Option key={preset.id} value={preset.id}>
                              {preset.name} - {preset.description}
                            </Option>
                          ))}
                        </Select>
                      </Form.Item>
                    </Col>
                  </Row>

                  <Row gutter={16}>
                    <Col span={12}>
                      <Form.Item label="输出格式" name="outputFormat" rules={[{ required: true }]}>
                        <Select>
                          <Option value="mp4">MP4</Option>
                          <Option value="avi">AVI</Option>
                          <Option value="mkv">MKV</Option>
                          <Option value="mov">MOV</Option>
                          <Option value="webm">WebM</Option>
                          <Option value="flv">FLV</Option>
                        </Select>
                      </Form.Item>
                    </Col>
                    <Col span={12}>
                      <Form.Item label="输出路径">
                        <Input
                          value={outputPath}
                          onChange={(e) => setOutputPath(e.target.value)}
                          addonAfter={
                            <Button
                              size="small"
                              onClick={async () => {
                                const result = await window.electronAPI.dialog.selectDirectory();
                                if (!result.canceled && result.filePaths.length > 0) {
                                  const dir = result.filePaths[0];
                                  const fileName = selectedTask.inputFile.split(/[\\\/]/).pop() || '';
                                  const nameWithoutExt = fileName.substring(0, fileName.lastIndexOf('.')) || fileName;
                                  setOutputPath(`${dir}\\${nameWithoutExt}_converted.${form.getFieldValue('outputFormat')}`);
                                }
                              }}
                            >
                              浏览
                            </Button>
                          }
                        />
                      </Form.Item>
                    </Col>
                  </Row>

                  <Row gutter={16}>
                    <Col span={12}>
                      <Form.Item label="视频编码器" name="videoCodec">
                        <Select>
                          <Option value="libx264">H.264 (libx264)</Option>
                          <Option value="libx265">H.265 (libx265)</Option>
                          <Option value="libvpx">VP8 (libvpx)</Option>
                          <Option value="libvpx-vp9">VP9 (libvpx-vp9)</Option>
                          <Option value="libaom-av1">AV1 (libaom-av1)</Option>
                        </Select>
                      </Form.Item>
                    </Col>
                    <Col span={12}>
                      <Form.Item label="音频编码器" name="audioCodec">
                        <Select>
                          <Option value="aac">AAC</Option>
                          <Option value="mp3">MP3</Option>
                          <Option value="opus">Opus</Option>
                          <Option value="vorbis">Vorbis</Option>
                          <Option value="flac">FLAC</Option>
                        </Select>
                      </Form.Item>
                    </Col>
                  </Row>

                  <Row gutter={16}>
                    <Col span={12}>
                      <Form.Item label="视频码率" name="videoBitrate">
                        <Input placeholder="例如: 2000k, 5M" />
                      </Form.Item>
                    </Col>
                    <Col span={12}>
                      <Form.Item label="音频码率" name="audioBitrate">
                        <Input placeholder="例如: 128k, 320k" />
                      </Form.Item>
                    </Col>
                  </Row>

                  <Row gutter={16}>
                    <Col span={12}>
                      <Form.Item label="分辨率" name="resolution">
                        <Select allowClear>
                          <Option value="3840x2160">4K (3840x2160)</Option>
                          <Option value="2560x1440">2K (2560x1440)</Option>
                          <Option value="1920x1080">1080p (1920x1080)</Option>
                          <Option value="1280x720">720p (1280x720)</Option>
                          <Option value="854x480">480p (854x480)</Option>
                          <Option value="640x360">360p (640x360)</Option>
                        </Select>
                      </Form.Item>
                    </Col>
                    <Col span={12}>
                      <Form.Item label="帧率" name="fps">
                        <Select allowClear>
                          <Option value={24}>24 fps</Option>
                          <Option value={25}>25 fps</Option>
                          <Option value={30}>30 fps</Option>
                          <Option value={50}>50 fps</Option>
                          <Option value={60}>60 fps</Option>
                        </Select>
                      </Form.Item>
                    </Col>
                  </Row>

                  <Row gutter={16}>
                    <Col span={12}>
                      <Form.Item label="编码预设" name="preset">
                        <Select>
                          <Option value="ultrafast">超快 (质量最低)</Option>
                          <Option value="superfast">非常快</Option>
                          <Option value="veryfast">很快</Option>
                          <Option value="faster">较快</Option>
                          <Option value="fast">快速</Option>
                          <Option value="medium">中等 (默认)</Option>
                          <Option value="slow">慢速 (质量较高)</Option>
                          <Option value="slower">很慢</Option>
                          <Option value="veryslow">非常慢 (质量最高)</Option>
                        </Select>
                      </Form.Item>
                    </Col>
                    <Col span={12}>
                      <Form.Item label="硬件加速" name="hardwareAccel">
                        <Select placeholder="选择硬件加速 (可选)" allowClear>
                          {hardwareAccelOptions.map(option => (
                            <Option key={option.name} value={option.name}>
                              {option.description}
                            </Option>
                          ))}
                        </Select>
                      </Form.Item>
                    </Col>
                  </Row>

                  <Row gutter={16}>
                    <Col span={12}>
                      <Form.Item label="操作">
                        <Button icon={<SaveOutlined />} onClick={handleSavePreset}>
                          保存为预设
                        </Button>
                      </Form.Item>
                    </Col>
                    <Col span={12}>
                      <Form.Item label="预设管理">
                        <Button 
                          onClick={async () => {
                            try {
                              await window.electronAPI.store.resetPresets();
                              await loadPresets();
                              message.success('预设已重置为默认状态，现在包含所有复制封装预设！');
                            } catch (error) {
                              message.error('重置预设失败');
                            }
                          }}
                        >
                          重置预设
                        </Button>
                      </Form.Item>
                    </Col>
                  </Row>
                </Form>
              </Card>
            )
          },
          {
            key: 'info',
            label: '视频信息',
            children: selectedTask.videoInfo && <VideoInfo videoInfo={selectedTask.videoInfo} />
          },
          {
            key: 'streamcopy',
            label: '复制封装说明',
            children: (
              <Card>
                <div style={{ padding: '16px' }}>
                  <h3 style={{ color: '#1890ff', marginBottom: '16px' }}>
                    🚀 什么是复制封装？
                  </h3>
                  
                  <div style={{ marginBottom: '24px' }}>
                    <p style={{ fontSize: '16px', lineHeight: '1.6', marginBottom: '12px' }}>
                      复制封装（Stream Copy）是一种<strong>超快速的格式转换方式</strong>，它直接复制视频和音频数据流到新的容器格式中，
                      <strong>不进行重新编码</strong>，因此速度极快且质量完全无损。
                    </p>
                  </div>

                  <h4 style={{ color: '#52c41a', marginBottom: '12px' }}>✅ 复制封装的优势：</h4>
                  <ul style={{ fontSize: '14px', lineHeight: '1.8', marginBottom: '24px', paddingLeft: '20px' }}>
                    <li><strong>速度极快</strong>：通常比重新编码快 10-50 倍，接近文件复制速度</li>
                    <li><strong>质量无损</strong>：完全保持原始视频和音频质量，没有任何损失</li>
                    <li><strong>保留元数据</strong>：保持所有原始元数据、字幕、章节等信息</li>
                    <li><strong>节省资源</strong>：不消耗CPU/GPU进行编码，功耗极低</li>
                    <li><strong>支持多格式</strong>：支持 MKV、MP4、AVI、MOV、WebM、FLV 等格式</li>
                  </ul>

                  <h4 style={{ color: '#fa8c16', marginBottom: '12px' }}>⚠️ 使用场景：</h4>
                  <ul style={{ fontSize: '14px', lineHeight: '1.8', marginBottom: '24px', paddingLeft: '20px' }}>
                    <li><strong>格式转换</strong>：MP4 → MKV、AVI → MP4 等容器格式转换</li>
                    <li><strong>容器升级</strong>：升级到支持更多功能的容器（如MKV支持多音轨、字幕）</li>
                    <li><strong>兼容性调整</strong>：为不同设备或平台调整容器格式</li>
                    <li><strong>文件整理</strong>：统一视频库的容器格式</li>
                  </ul>

                  <h4 style={{ color: '#f5222d', marginBottom: '12px' }}>❌ 不适用情况：</h4>
                  <ul style={{ fontSize: '14px', lineHeight: '1.8', marginBottom: '24px', paddingLeft: '20px' }}>
                    <li>需要改变视频分辨率、码率或编码格式</li>
                    <li>需要压缩文件大小或提高压缩效率</li>
                    <li>原始编码格式与目标容器不兼容</li>
                  </ul>

                  <div style={{ 
                    background: '#f6ffed', 
                    border: '1px solid #b7eb8f', 
                    borderRadius: '6px', 
                    padding: '16px',
                    marginTop: '24px'
                  }}>
                    <h4 style={{ color: '#52c41a', marginBottom: '12px' }}>💡 如何使用复制封装？</h4>
                    <ol style={{ fontSize: '14px', lineHeight: '1.8', marginBottom: '0', paddingLeft: '20px' }}>
                      <li>在预设配置中选择任意"复制封装"预设</li>
                      <li>或者手动选择输出格式，但<strong>不要选择</strong>视频编码器和音频编码器</li>
                      <li>点击开始转码，系统会自动检测并启用复制封装模式</li>
                      <li>享受超快的转换速度！</li>
                    </ol>
                  </div>
                </div>
              </Card>
            )
          }
        ]}
      />

      <Modal
        title="保存预设"
        open={savePresetModalVisible}
        onCancel={() => setSavePresetModalVisible(false)}
        onOk={handleConfirmSavePreset}
      >
        <Form
          form={presetForm}
          layout="vertical"
        >
          <Row gutter={16}>
            <Col span={24}>
              <Form.Item label="预设名称" name="name" rules={[{ required: true }]}>
                <Input />
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={16}>
            <Col span={24}>
              <Form.Item label="预设描述" name="description">
                <Input.TextArea />
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item label="输出格式" name="outputFormat" rules={[{ required: true }]}>
                <Select>
                  <Option value="mp4">MP4</Option>
                  <Option value="avi">AVI</Option>
                  <Option value="mkv">MKV</Option>
                  <Option value="mov">MOV</Option>
                  <Option value="webm">WebM</Option>
                  <Option value="flv">FLV</Option>
                </Select>
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item label="视频编码器" name="videoCodec" rules={[{ required: true }]}>
                <Select>
                  <Option value="libx264">H.264 (libx264)</Option>
                  <Option value="libx265">H.265 (libx265)</Option>
                  <Option value="libvpx">VP8 (libvpx)</Option>
                  <Option value="libvpx-vp9">VP9 (libvpx-vp9)</Option>
                  <Option value="libaom-av1">AV1 (libaom-av1)</Option>
                </Select>
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item label="音频编码器" name="audioCodec" rules={[{ required: true }]}>
                <Select>
                  <Option value="aac">AAC</Option>
                  <Option value="mp3">MP3</Option>
                  <Option value="opus">Opus</Option>
                  <Option value="vorbis">Vorbis</Option>
                  <Option value="flac">FLAC</Option>
                </Select>
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item label="视频码率" name="videoBitrate" rules={[{ required: true }]}>
                <Input placeholder="例如: 2000k, 5M" />
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item label="音频码率" name="audioBitrate" rules={[{ required: true }]}>
                <Input placeholder="例如: 128k, 320k" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item label="分辨率" name="resolution" rules={[{ required: true }]}>
                <Select allowClear>
                  <Option value="3840x2160">4K (3840x2160)</Option>
                  <Option value="2560x1440">2K (2560x1440)</Option>
                  <Option value="1920x1080">1080p (1920x1080)</Option>
                  <Option value="1280x720">720p (1280x720)</Option>
                  <Option value="854x480">480p (854x480)</Option>
                  <Option value="640x360">360p (640x360)</Option>
                </Select>
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item label="帧率" name="fps" rules={[{ required: true }]}>
                <Select allowClear>
                  <Option value={24}>24 fps</Option>
                  <Option value={25}>25 fps</Option>
                  <Option value={30}>30 fps</Option>
                  <Option value={50}>50 fps</Option>
                  <Option value={60}>60 fps</Option>
                </Select>
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item label="编码预设" name="preset" rules={[{ required: true }]}>
                <Select>
                  <Option value="ultrafast">超快 (质量最低)</Option>
                  <Option value="superfast">非常快</Option>
                  <Option value="veryfast">很快</Option>
                  <Option value="faster">较快</Option>
                  <Option value="fast">快速</Option>
                  <Option value="medium">中等 (默认)</Option>
                  <Option value="slow">慢速 (质量较高)</Option>
                  <Option value="slower">很慢</Option>
                  <Option value="veryslow">非常慢 (质量最高)</Option>
                </Select>
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item label="硬件加速" name="hardwareAccel">
                <Select placeholder="选择硬件加速 (可选)" allowClear>
                  {hardwareAccelOptions.map(option => (
                    <Option key={option.name} value={option.name}>
                      {option.description}
                    </Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
          </Row>
        </Form>
      </Modal>
    </div>
  );
};

export default MainContent; 