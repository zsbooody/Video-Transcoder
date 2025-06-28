/**
 * Header组件
 * 应用顶部导航栏，包含标题、操作按钮和设置
 */

import React, { useState } from 'react';
import { Layout, Button, Space, Dropdown, Switch } from 'antd';
import {
  PlusOutlined,
  SettingOutlined,
  FolderOpenOutlined,
  InfoCircleOutlined,
  QuestionCircleOutlined,
  ToolOutlined
} from '@ant-design/icons';
import type { MenuProps } from 'antd';
import { AppSettings } from '../types';
import SettingsModal from './SettingsModal';
import AboutModal from './AboutModal';
import HelpModal from './HelpModal';
import './Header.css';

const { Header: AntHeader } = Layout;

interface HeaderProps {
  onAddFiles: () => void;
  settings: AppSettings | null;
  onSettingsChange: (settings: AppSettings) => void;
  settingsVisible?: boolean;
  onSettingsVisibleChange?: (visible: boolean) => void;
}

const Header: React.FC<HeaderProps> = ({ 
  onAddFiles, 
  settings, 
  onSettingsChange,
  settingsVisible: externalSettingsVisible,
  onSettingsVisibleChange
}) => {
  const [internalSettingsVisible, setInternalSettingsVisible] = useState(false);
  const [aboutVisible, setAboutVisible] = useState(false);
  const [helpVisible, setHelpVisible] = useState(false);
  
  // 使用外部传入的状态或内部状态
  const settingsVisible = externalSettingsVisible !== undefined ? externalSettingsVisible : internalSettingsVisible;
  const setSettingsVisible = onSettingsVisibleChange || setInternalSettingsVisible;

  // 设置菜单项
  const settingsMenuItems: MenuProps['items'] = [
    {
      key: 'theme',
      label: (
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: 150 }}>
          <span>深色主题</span>
          <Switch
            size="small"
            checked={settings?.theme === 'dark'}
            onClick={(checked) => {
              if (settings) {
                const newSettings = { ...settings, theme: checked ? 'dark' : 'light' } as AppSettings;
                onSettingsChange(newSettings);
                document.documentElement.setAttribute('data-theme', newSettings.theme);
              }
            }}
          />
        </div>
      ),
    },
    {
      type: 'divider',
    },
    {
      key: 'settings',
      label: '设置',
      icon: <SettingOutlined />,
      onClick: () => setSettingsVisible(true),
    },
    {
      key: 'help',
      label: '帮助',
      icon: <QuestionCircleOutlined />,
      onClick: () => setHelpVisible(true),
    },
    {
      key: 'about',
      label: '关于',
      icon: <InfoCircleOutlined />,
      onClick: () => setAboutVisible(true),
    },
  ];

  return (
    <>
      <AntHeader className="app-header">
        <div className="header-content">
          <div className="header-left">
            <Space>
              <ToolOutlined style={{ fontSize: '20px', color: '#1890ff' }} />
              <h1 className="header-title">视频转码工具</h1>
            </Space>
          </div>
          <div className="header-right">
            <Space>
              <Button
                type="primary"
                icon={<PlusOutlined />}
                onClick={onAddFiles}
              >
                添加文件
              </Button>
              <Button
                icon={<FolderOpenOutlined />}
                onClick={async () => {
                  const result = await window.electronAPI.dialog.selectDirectory();
                  if (!result.canceled && result.filePaths.length > 0 && settings) {
                    const newSettings = { ...settings, outputDirectory: result.filePaths[0] };
                    onSettingsChange(newSettings);
                  }
                }}
              >
                输出目录
              </Button>
              <Dropdown menu={{ items: settingsMenuItems }} placement="bottomRight">
                <Button icon={<SettingOutlined />} />
              </Dropdown>
            </Space>
          </div>
        </div>
      </AntHeader>
      
      {settings && (
        <SettingsModal
          visible={settingsVisible}
          settings={settings}
          onClose={() => setSettingsVisible(false)}
          onSave={(newSettings: AppSettings) => {
            onSettingsChange(newSettings);
            setSettingsVisible(false);
          }}
        />
      )}
      
      <AboutModal
        visible={aboutVisible}
        onClose={() => setAboutVisible(false)}
      />
      
      <HelpModal
        visible={helpVisible}
        onClose={() => setHelpVisible(false)}
      />
    </>
  );
};

export default Header; 