/**
 * 日志查看器组件
 * 用于显示转码任务的详细日志和生成诊断报告
 */

import React, { useState, useEffect } from 'react';
import { 
  Modal, 
  Button, 
  Card, 
  Tag, 
  Collapse, 
  Statistic, 
  Row, 
  Col, 
  Spin, 
  Empty,
  Typography,
  Space,
  Divider,
  message
} from 'antd';
import { 
  DownloadOutlined, 
  ReloadOutlined, 
  FileTextOutlined, 
  ExclamationCircleOutlined, 
  InfoCircleOutlined, 
  WarningOutlined,
  BugOutlined,
  ClockCircleOutlined
} from '@ant-design/icons';

const { Panel } = Collapse;
const { Text, Paragraph } = Typography;

interface LogEntry {
  timestamp: string;
  level: 'DEBUG' | 'INFO' | 'WARN' | 'ERROR';
  category: string;
  message: string;
  data?: any;
  taskId?: string;
}

interface LogViewerProps {
  taskId?: string;
  isOpen: boolean;
  onClose: () => void;
}

const LogViewer: React.FC<LogViewerProps> = ({ taskId, isOpen, onClose }) => {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [filter, setFilter] = useState<string>('ALL');

  useEffect(() => {
    if (isOpen) {
      loadLogs();
    }
  }, [isOpen, taskId]);

  const loadLogs = async () => {
    setIsLoading(true);
    try {
      // 使用模拟数据展示AMD AMF问题
      const mockLogs: LogEntry[] = [
        {
          timestamp: new Date().toISOString(),
          level: 'INFO',
          category: 'SYSTEM',
          message: '系统初始化完成',
          data: { version: '1.0.0', platform: 'Windows' }
        },
        {
          timestamp: new Date().toISOString(),
          level: 'ERROR',
          category: 'HARDWARE',
          message: 'AMD AMF硬件验证失败',
          data: { 
            error: 'Input format lavfi is not available',
            encoder: 'h264_amf',
            validationTime: '2.5s'
          },
          taskId: taskId
        },
        {
          timestamp: new Date().toISOString(),
          level: 'WARN',
          category: 'HARDWARE',
          message: '硬件编码器验证失败，回退到软件编码',
          data: { 
            originalHardware: 'amf',
            fallbackEncoder: 'libx264'
          },
          taskId: taskId
        },
        {
          timestamp: new Date().toISOString(),
          level: 'INFO',
          category: 'TRANSCODE',
          message: '开始转码任务',
          data: { 
            inputFile: 'test.mp4',
            outputFormat: 'mp4',
            encoder: 'libx264'
          },
          taskId: taskId
        }
      ];
      setLogs(mockLogs);
    } catch (error) {
      console.error('加载日志失败:', error);
      message.error('加载日志失败');
    } finally {
      setIsLoading(false);
    }
  };

  const generateReport = async () => {
    setIsLoading(true);
    try {
      // 调用后端的报告生成功能
      const reportPath = await window.electronAPI.ffmpeg.generateLogReport(taskId);
      
      if (reportPath) {
        message.success(`日志报告已生成: ${reportPath}`);
        
        // 可选：显示报告路径的详细信息
        Modal.info({
          title: '报告生成成功',
          content: (
            <div>
              <p>日志报告已成功生成并保存到:</p>
              <p style={{ 
                background: '#f5f5f5', 
                padding: '8px', 
                borderRadius: '4px',
                wordBreak: 'break-all',
                fontFamily: 'monospace',
                fontSize: '12px'
              }}>
                {reportPath}
              </p>
              <p style={{ marginTop: '16px', color: '#666' }}>
                您可以在文件管理器中打开此位置查看详细的JSON格式报告文件。
              </p>
            </div>
          ),
          width: 600
        });
      } else {
        message.error('报告生成失败：未返回文件路径');
      }
    } catch (error: any) {
      console.error('生成报告失败:', error);
      message.error(`生成报告失败: ${error.message || '未知错误'}`);
      
      // 显示详细错误信息
      Modal.error({
        title: '报告生成失败',
        content: (
          <div>
            <p>生成日志报告时发生错误:</p>
            <p style={{ 
              background: '#fff2f0', 
              padding: '8px', 
              borderRadius: '4px',
              color: '#a8071a',
              fontFamily: 'monospace',
              fontSize: '12px'
            }}>
              {error.message || error.toString()}
            </p>
            <p style={{ marginTop: '16px', color: '#666' }}>
              请检查应用权限和磁盘空间，或查看应用日志获取更多信息。
            </p>
          </div>
        ),
        width: 600
      });
    } finally {
      setIsLoading(false);
    }
  };

  const getLogIcon = (level: string) => {
    switch (level) {
      case 'ERROR':
        return <ExclamationCircleOutlined style={{ color: '#ff4d4f' }} />;
      case 'WARN':
        return <WarningOutlined style={{ color: '#faad14' }} />;
      case 'DEBUG':
        return <BugOutlined style={{ color: '#8c8c8c' }} />;
      default:
        return <InfoCircleOutlined style={{ color: '#1890ff' }} />;
    }
  };

  const getLogTagColor = (level: string) => {
    switch (level) {
      case 'ERROR':
        return 'error';
      case 'WARN':
        return 'warning';
      case 'DEBUG':
        return 'default';
      default:
        return 'processing';
    }
  };

  const filteredLogs = logs.filter(log => {
    if (filter === 'ALL') return true;
    return log.level === filter;
  });

  const logStats = {
    total: logs.length,
    errors: logs.filter(log => log.level === 'ERROR').length,
    warnings: logs.filter(log => log.level === 'WARN').length,
    info: logs.filter(log => log.level === 'INFO').length,
    debug: logs.filter(log => log.level === 'DEBUG').length
  };

  return (
    <Modal
      title={taskId ? `任务日志 - ${taskId}` : '全局日志'}
      open={isOpen}
      onCancel={onClose}
      width="90%"
      style={{ top: 20 }}
      footer={[
        <Button key="refresh" icon={<ReloadOutlined />} onClick={loadLogs} loading={isLoading}>
          刷新
        </Button>,
        <Button key="report" icon={<DownloadOutlined />} onClick={generateReport} loading={isLoading}>
          生成报告
        </Button>,
        <Button key="close" onClick={onClose}>
          关闭
        </Button>
      ]}
    >
      {/* 统计信息 */}
      <Row gutter={16} style={{ marginBottom: 16 }}>
        <Col span={6}>
          <Statistic 
            title="总计" 
            value={logStats.total} 
            prefix={<FileTextOutlined />}
          />
        </Col>
        <Col span={6}>
          <Statistic 
            title="错误" 
            value={logStats.errors} 
            prefix={<ExclamationCircleOutlined />}
            valueStyle={{ color: '#ff4d4f' }}
          />
        </Col>
        <Col span={6}>
          <Statistic 
            title="警告" 
            value={logStats.warnings} 
            prefix={<WarningOutlined />}
            valueStyle={{ color: '#faad14' }}
          />
        </Col>
        <Col span={6}>
          <Statistic 
            title="信息" 
            value={logStats.info} 
            prefix={<InfoCircleOutlined />}
            valueStyle={{ color: '#1890ff' }}
          />
        </Col>
      </Row>

      <Divider />

      {/* 过滤器 */}
      <Space style={{ marginBottom: 16 }}>
        <Text strong>日志级别：</Text>
        {['ALL', 'ERROR', 'WARN', 'INFO', 'DEBUG'].map(level => (
          <Button
            key={level}
            type={filter === level ? 'primary' : 'default'}
            size="small"
            onClick={() => setFilter(level)}
          >
            {level === 'ALL' ? '全部' : level}
            {level !== 'ALL' && (
              <span style={{ marginLeft: 4 }}>
                ({logs.filter(log => log.level === level).length})
              </span>
            )}
          </Button>
        ))}
      </Space>

      {/* 日志内容 */}
      <div style={{ maxHeight: '400px', overflowY: 'auto' }}>
        {isLoading ? (
          <div style={{ textAlign: 'center', padding: 40 }}>
            <Spin size="large" />
            <div style={{ marginTop: 16 }}>加载日志中...</div>
          </div>
        ) : filteredLogs.length === 0 ? (
          <Empty 
            description={filter === 'ALL' ? '暂无日志记录' : `暂无${filter}级别的日志`}
          />
        ) : (
          <Space direction="vertical" style={{ width: '100%' }}>
            {filteredLogs.map((log, index) => (
              <Card key={index} size="small">
                <Space direction="vertical" style={{ width: '100%' }}>
                  <Space>
                    {getLogIcon(log.level)}
                    <Tag color={getLogTagColor(log.level)}>{log.level}</Tag>
                    <Tag>{log.category}</Tag>
                    <Text type="secondary">
                      <ClockCircleOutlined style={{ marginRight: 4 }} />
                      {new Date(log.timestamp).toLocaleString()}
                    </Text>
                    {log.taskId && (
                      <Tag color="blue">任务: {log.taskId}</Tag>
                    )}
                  </Space>
                  <Paragraph style={{ marginBottom: 0 }}>
                    <Text strong>{log.message}</Text>
                  </Paragraph>
                  {log.data && (
                    <Collapse size="small">
                      <Panel header="查看详细数据" key="1">
                        <pre style={{ 
                          background: '#f5f5f5', 
                          padding: 8, 
                          borderRadius: 4,
                          fontSize: 12,
                          overflow: 'auto'
                        }}>
                          {JSON.stringify(log.data, null, 2)}
                        </pre>
                      </Panel>
                    </Collapse>
                  )}
                </Space>
              </Card>
            ))}
          </Space>
        )}
      </div>

      <Divider />

      {/* 使用说明 */}
      <Card size="small" style={{ backgroundColor: '#f6ffed' }}>
        <Typography>
          <Text strong>日志使用说明：</Text>
          <ul style={{ marginTop: 8, fontSize: 12 }}>
            <li><strong>查看实时日志</strong>：点击"刷新"按钮获取最新日志</li>
            <li><strong>生成诊断报告</strong>：点击"生成报告"创建详细的JSON格式报告文件</li>
            <li><strong>过滤日志</strong>：使用级别按钮按日志级别过滤显示内容</li>
            <li><strong>提交问题</strong>：如需技术支持，请将生成的报告文件一同提供</li>
            <li><strong>日志位置</strong>：日志文件保存在应用数据目录的logs文件夹中</li>
            <li><strong>AMD AMF问题</strong>：如遇到"Input format lavfi is not available"错误，这是已知问题，系统会自动回退到软件编码</li>
          </ul>
        </Typography>
      </Card>
    </Modal>
  );
};

export default LogViewer; 