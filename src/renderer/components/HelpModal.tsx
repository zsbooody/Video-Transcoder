/**
 * 帮助教程模态组件
 * 提供详细的使用说明和教程
 */

import React, { useState } from 'react';
import { Modal, Typography, Steps, Space, Card, Alert, Tag, Divider } from 'antd';
import { 
  QuestionCircleOutlined, 
  FileAddOutlined, 
  SettingOutlined, 
  PlayCircleOutlined,
  ThunderboltOutlined,
  BulbOutlined,
  WarningOutlined
} from '@ant-design/icons';

const { Title, Paragraph, Text } = Typography;
const { Step } = Steps;

interface HelpModalProps {
  visible: boolean;
  onClose: () => void;
  onShowLogs?: () => void;
}

const HelpModal: React.FC<HelpModalProps> = ({ visible, onClose, onShowLogs }) => {
  const [currentStep, setCurrentStep] = useState(0);

  const steps = [
    {
      title: '添加视频文件',
      icon: <FileAddOutlined />,
      content: (
        <Space direction="vertical" size="middle" style={{ width: '100%' }}>
          <Alert
            message="支持两种方式添加文件"
            type="info"
            showIcon
          />
          <Card size="small">
            <Title level={5}>方式一：拖拽添加</Title>
            <Paragraph>
              直接将视频文件拖拽到应用窗口中，支持同时拖拽多个文件。
            </Paragraph>
            <Text type="secondary">支持格式：MP4、AVI、MKV、MOV、WMV、FLV、WebM</Text>
          </Card>
          <Card size="small">
            <Title level={5}>方式二：点击添加</Title>
            <Paragraph>
              点击顶部的"添加文件"按钮，在弹出的文件选择器中选择视频文件。
            </Paragraph>
          </Card>
        </Space>
      )
    },
    {
      title: '选择输出格式',
      icon: <SettingOutlined />,
      content: (
        <Space direction="vertical" size="middle" style={{ width: '100%' }}>
          <Alert
            message="在右侧面板中配置转码参数"
            type="info"
            showIcon
          />
          <Card size="small">
            <Title level={5}>输出格式</Title>
            <Space wrap>
              <Tag color="blue">MP4</Tag>
              <Tag color="green">AVI</Tag>
              <Tag color="purple">MKV</Tag>
              <Tag color="orange">MOV</Tag>
              <Tag color="cyan">WebM</Tag>
              <Tag color="red">FLV</Tag>
            </Space>
          </Card>
          <Card size="small">
            <Title level={5}>编码选项</Title>
            <ul>
              <li><strong>视频编码器：</strong>H.264、H.265、VP9等</li>
              <li><strong>音频编码器：</strong>AAC、MP3、Opus等</li>
              <li><strong>分辨率：</strong>可自定义或选择预设</li>
              <li><strong>码率：</strong>控制文件大小和质量</li>
            </ul>
          </Card>
        </Space>
      )
    },
    {
      title: '硬件加速',
      icon: <ThunderboltOutlined />,
      content: (
        <Space direction="vertical" size="middle" style={{ width: '100%' }}>
          <Alert
            message="硬件加速可以大幅提升转码速度"
            type="success"
            showIcon
          />
          <Card size="small">
            <Title level={5}>支持的硬件加速</Title>
            <ul>
              <li><Tag color="green">NVIDIA NVENC</Tag> - 适用于NVIDIA显卡</li>
              <li><Tag color="red">AMD AMF</Tag> - 适用于AMD显卡</li>
              <li><Tag color="blue">Intel QSV</Tag> - 适用于Intel核显</li>
              <li><Tag color="purple">通用加速</Tag> - Direct3D 11、DirectX等</li>
            </ul>
          </Card>
          <Alert
            message="如果硬件加速失败，系统会自动回退到软件编码"
            type="warning"
            showIcon
          />
        </Space>
      )
    },
    {
      title: '开始转码',
      icon: <PlayCircleOutlined />,
      content: (
        <Space direction="vertical" size="middle" style={{ width: '100%' }}>
          <Alert
            message="配置完成后即可开始转码"
            type="info"
            showIcon
          />
          <Card size="small">
            <Title level={5}>转码控制</Title>
            <ul>
              <li><strong>开始：</strong>点击"开始转码"按钮</li>
              <li><strong>暂停：</strong>可随时暂停转码进程</li>
              <li><strong>取消：</strong>取消后可重新开始</li>
              <li><strong>进度：</strong>实时显示转码进度和性能数据</li>
            </ul>
          </Card>
          <Card size="small">
            <Title level={5}>批量处理</Title>
            <Paragraph>
              可以同时添加多个文件，逐个进行转码处理。
            </Paragraph>
          </Card>
        </Space>
      )
    }
  ];

  const tips = [
    {
      icon: <BulbOutlined style={{ color: '#faad14' }} />,
      title: '复制封装模式',
      content: '如果只是改变容器格式而不重新编码，转码速度会非常快且无质量损失。'
    },
    {
      icon: <ThunderboltOutlined style={{ color: '#52c41a' }} />,
      title: '硬件加速',
      content: '启用硬件加速可以将转码速度提升3-10倍，建议优先使用。'
    },
    {
      icon: <WarningOutlined style={{ color: '#f5222d' }} />,
      title: '文件大小',
      content: '转码后的文件大小取决于码率设置，较高的码率会产生更大的文件。'
    }
  ];

  return (
    <Modal
      title={
        <Space>
          <QuestionCircleOutlined />
          <span>使用教程</span>
        </Space>
      }
      open={visible}
      onCancel={onClose}
      footer={null}
      width={800}
      centered
      style={{ minHeight: '600px' }}
    >
      <div style={{ padding: '20px 0' }}>
        <Steps
          current={currentStep}
          onChange={setCurrentStep}
          direction="vertical"
          size="small"
        >
          {steps.map((step, index) => (
            <Step
              key={index}
              title={step.title}
              icon={step.icon}
              description={
                currentStep === index ? (
                  <div style={{ marginTop: '16px' }}>
                    {step.content}
                  </div>
                ) : null
              }
            />
          ))}
        </Steps>

        <Divider />

        {/* 使用技巧 */}
        <Title level={4}>
          <BulbOutlined style={{ marginRight: '8px' }} />
          使用技巧
        </Title>
        <Space direction="vertical" size="middle" style={{ width: '100%' }}>
          {tips.map((tip, index) => (
            <Card key={index} size="small">
              <Space>
                {tip.icon}
                <div>
                  <Text strong>{tip.title}</Text>
                  <br />
                  <Text type="secondary">{tip.content}</Text>
                </div>
              </Space>
            </Card>
          ))}
        </Space>

        <Divider />

        {/* 快捷键 */}
        <Title level={4}>快捷键</Title>
        <Space direction="vertical" size="small">
          <Text><Tag>Ctrl + O</Tag> 添加文件</Text>
          <Text><Tag>Ctrl + Shift + C</Tag> 清空队列</Text>
          <Text><Tag>F1</Tag> 显示帮助</Text>
          <Text><Tag>Ctrl + ,</Tag> 打开设置</Text>
        </Space>

        <Divider />

        {/* 日志和故障排除 */}
        <Title level={4}>日志和故障排除</Title>
        <Space direction="vertical" size="middle" style={{ width: '100%' }}>
          <Card size="small">
            <Title level={5}>查看详细日志</Title>
            <Paragraph>
              如果遇到转码问题，可以查看详细的日志信息来诊断问题。日志包含系统信息、硬件检测结果、转码过程等详细信息。
            </Paragraph>
            {onShowLogs && (
              <Space>
                <Text strong>操作：</Text>
                <a onClick={onShowLogs}>查看系统日志</a>
              </Space>
            )}
          </Card>
          <Card size="small">
            <Title level={5}>常见问题</Title>
            <ul>
              <li><strong>AMD AMF硬件加速失败</strong>：这是已知问题，系统会自动回退到软件编码</li>
              <li><strong>转码速度慢</strong>：尝试启用硬件加速或降低输出质量</li>
              <li><strong>文件无法读取</strong>：确保文件格式受支持且文件未损坏</li>
              <li><strong>输出文件过大</strong>：降低视频码率或分辨率</li>
            </ul>
          </Card>
          <Alert
            message="故障排除提示"
            description="如需技术支持，请生成日志报告并提供给开发者。日志报告包含了诊断问题所需的所有信息。"
            type="info"
            showIcon
          />
        </Space>
      </div>
    </Modal>
  );
};

export default HelpModal; 