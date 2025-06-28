/**
 * Sidebar组件
 * 显示任务列表，支持选择和删除任务
 */

import React from 'react';
import { Layout, List, Badge, Button, Empty, Tooltip, Progress } from 'antd';
import {
  DeleteOutlined,
  VideoCameraOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  LoadingOutlined,
  PauseCircleOutlined
} from '@ant-design/icons';
import { TranscodeTask } from '../types';
import './Sidebar.css';

const { Sider } = Layout;

interface SidebarProps {
  tasks: TranscodeTask[];
  selectedTaskId: string | null;
  onSelectTask: (taskId: string) => void;
  onDeleteTask: (taskId: string) => void;
}

const Sidebar: React.FC<SidebarProps> = ({
  tasks,
  selectedTaskId,
  onSelectTask,
  onDeleteTask
}) => {
  /**
   * 获取任务状态图标
   */
  const getStatusIcon = (status: TranscodeTask['status']) => {
    switch (status) {
      case 'pending':
        return <VideoCameraOutlined style={{ color: '#8c8c8c' }} />;
      case 'running':
        return <LoadingOutlined style={{ color: '#1890ff' }} spin />;
      case 'paused':
        return <PauseCircleOutlined style={{ color: '#faad14' }} />;
      case 'completed':
        return <CheckCircleOutlined style={{ color: '#52c41a' }} />;
      case 'failed':
        return <CloseCircleOutlined style={{ color: '#f5222d' }} />;
      case 'cancelled':
        return <CloseCircleOutlined style={{ color: '#8c8c8c' }} />;
      default:
        return <VideoCameraOutlined />;
    }
  };

  /**
   * 获取任务状态文本
   */
  const getStatusText = (status: TranscodeTask['status']) => {
    const statusMap = {
      pending: '等待中',
      running: '转码中',
      paused: '已暂停',
      completed: '已完成',
      failed: '失败',
      cancelled: '已取消'
    };
    return statusMap[status] || status;
  };

  /**
   * 获取文件名
   */
  const getFileName = (filePath: string) => {
    return filePath.split(/[\\\/]/).pop() || filePath;
  };

  return (
    <Sider className="app-sidebar" width={300}>
      <div className="sidebar-header">
        <h3>任务列表</h3>
        <Badge count={tasks.length} showZero />
      </div>
      
      <div className="sidebar-content">
        {tasks.length === 0 ? (
          <Empty
            description="暂无任务"
            image={Empty.PRESENTED_IMAGE_SIMPLE}
          />
        ) : (
          <List
            dataSource={tasks}
            renderItem={(task) => (
              <List.Item
                className={`task-item ${selectedTaskId === task.id ? 'selected' : ''}`}
                onClick={() => onSelectTask(task.id)}
                actions={[
                  <Tooltip title="删除任务" key="delete">
                    <Button
                      type="text"
                      size="small"
                      danger
                      icon={<DeleteOutlined />}
                      onClick={(e) => {
                        e.stopPropagation();
                        onDeleteTask(task.id);
                      }}
                    />
                  </Tooltip>
                ]}
              >
                <List.Item.Meta
                  avatar={getStatusIcon(task.status)}
                  title={
                    <div className="task-title">
                      <span className="text-ellipsis">{getFileName(task.inputFile)}</span>
                      <span className="task-status">{getStatusText(task.status)}</span>
                    </div>
                  }
                  description={
                    task.status === 'running' || task.status === 'paused' ? (
                      <Progress
                        percent={Math.round(task.progress)}
                        size="small"
                        status={task.status === 'paused' ? 'exception' : 'active'}
                      />
                    ) : task.videoInfo ? (
                      <div className="task-info">
                        <span>{task.videoInfo.resolution}</span>
                        <span>{Math.round(task.videoInfo.duration)}秒</span>
                      </div>
                    ) : null
                  }
                />
              </List.Item>
            )}
          />
        )}
      </div>
    </Sider>
  );
};

export default Sidebar; 