/**
 * 关于模态组件
 * 显示应用信息和致谢内容
 */

import React from 'react';
import { Modal, Typography, Space, Divider, Tag } from 'antd';
import { HeartOutlined, GithubOutlined, ToolOutlined } from '@ant-design/icons';

const { Title, Paragraph, Text } = Typography;

interface AboutModalProps {
  visible: boolean;
  onClose: () => void;
}

const AboutModal: React.FC<AboutModalProps> = ({ visible, onClose }) => {
  return (
    <Modal
      title={
        <Space>
          <ToolOutlined />
          <span>关于视频转码工具</span>
        </Space>
      }
      open={visible}
      onCancel={onClose}
      footer={null}
      width={600}
      centered
    >
      <div style={{ padding: '20px 0' }}>
        <Space direction="vertical" size="large" style={{ width: '100%' }}>
          {/* 应用信息 */}
          <div style={{ textAlign: 'center' }}>
            <ToolOutlined style={{ fontSize: '48px', color: '#1890ff', marginBottom: '16px' }} />
            <Title level={3} style={{ margin: '0 0 8px 0' }}>
              视频转码工具
            </Title>
            <Text type="secondary">基于 FFmpeg 的可视化视频转码工具</Text>
            <br />
            <Tag color="blue" style={{ marginTop: '8px' }}>版本 1.0.0</Tag>
          </div>

          <Divider />

          {/* 致加尔 */}
          <div>
            <Title level={4}>
              <HeartOutlined style={{ color: '#ff4d4f', marginRight: '8px' }} />
              致加尔
            </Title>
            <Paragraph>
              这个工具是特别为你制作的，希望能让视频转码变得更加简单和高效。
              无论是日常的视频格式转换，还是专业的编码需求，这个工具都能帮助你轻松完成。
            </Paragraph>
            <Paragraph>
              愿你在使用这个工具的每一刻都能感受到便利与快乐。
              <HeartOutlined style={{ color: '#ff4d4f', marginLeft: '8px' }} />
            </Paragraph>
          </div>

          <Divider />

          {/* 技术信息 */}
          <div>
            <Title level={4}>技术栈</Title>
            <Space wrap>
              <Tag color="blue">Electron</Tag>
              <Tag color="cyan">React</Tag>
              <Tag color="geekblue">TypeScript</Tag>
              <Tag color="purple">Ant Design</Tag>
              <Tag color="orange">FFmpeg</Tag>
              <Tag color="green">Webpack</Tag>
            </Space>
          </div>

          {/* 功能特性 */}
          <div>
            <Title level={4}>主要功能</Title>
            <ul style={{ paddingLeft: '20px' }}>
              <li>支持多种视频格式转换（MP4、AVI、MKV、MOV、WebM、FLV）</li>
              <li>硬件加速支持（NVIDIA、AMD、Intel）</li>
              <li>批量转码处理</li>
              <li>实时进度监控</li>
              <li>复制封装模式（快速格式转换）</li>
              <li>自定义转码参数</li>
              <li>预设管理</li>
              <li>深色/浅色主题</li>
            </ul>
          </div>

          <Divider />

          {/* 版权信息 */}
          <div style={{ textAlign: 'center' }}>
            <Text type="secondary">
              © 2025 视频转码工具 - 专为加尔制作
            </Text>
            <br />
            <Text type="secondary" style={{ fontSize: '12px' }}>
              基于开源 FFmpeg 项目构建
            </Text>
          </div>
        </Space>
      </div>
    </Modal>
  );
};

export default AboutModal; 