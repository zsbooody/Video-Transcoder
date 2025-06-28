/**
 * SettingsModal组件
 * 应用设置对话框
 */

import React from 'react';
import { Modal, Form, Input, Select, Switch, InputNumber, Button } from 'antd';
import { AppSettings } from '../types';
import './SettingsModal.css';

const { Option } = Select;

interface SettingsModalProps {
  visible: boolean;
  settings: AppSettings;
  onClose: () => void;
  onSave: (settings: AppSettings) => void;
}

const SettingsModal: React.FC<SettingsModalProps> = ({
  visible,
  settings,
  onClose,
  onSave
}) => {
  const [form] = Form.useForm();

  // 保存设置
  const handleSave = async () => {
    try {
      const values = await form.validateFields();
      const newSettings: AppSettings = {
        ...settings,
        ...values
      };
      
      // 保存到存储
      await window.electronAPI.store.saveSettings(newSettings);
      
      // 应用主题
      if (values.theme !== settings.theme) {
        document.documentElement.setAttribute('data-theme', values.theme);
      }
      
      onSave(newSettings);
    } catch (error) {
      console.error('保存设置失败:', error);
    }
  };

  return (
    <Modal
      title="应用设置"
      open={visible}
      onCancel={onClose}
      className="settings-modal"
      footer={[
        <Button key="cancel" onClick={onClose}>
          取消
        </Button>,
        <Button key="save" type="primary" onClick={handleSave}>
          保存
        </Button>
      ]}
      width={600}
    >
      <Form
        form={form}
        layout="vertical"
        initialValues={settings}
      >
        <Form.Item label="输出目录" name="outputDirectory">
          <Input 
            placeholder="默认使用源文件目录"
            addonAfter={
              <Button
                size="small"
                onClick={async () => {
                  const result = await window.electronAPI.dialog.selectDirectory();
                  if (!result.canceled && result.filePaths.length > 0) {
                    form.setFieldsValue({ outputDirectory: result.filePaths[0] });
                  }
                }}
              >
                浏览
              </Button>
            }
          />
        </Form.Item>

        <Form.Item label="界面主题" name="theme">
          <Select>
            <Option value="light">浅色主题</Option>
            <Option value="dark">深色主题</Option>
          </Select>
        </Form.Item>

        <Form.Item label="界面语言" name="language">
          <Select>
            <Option value="zh-CN">简体中文</Option>
            <Option value="en-US">English</Option>
          </Select>
        </Form.Item>

        <Form.Item label="最大并发任务数" name="maxConcurrentTasks">
          <InputNumber min={1} max={10} />
        </Form.Item>

        <Form.Item label="硬件加速" name="hardwareAcceleration" valuePropName="checked">
          <Switch checkedChildren="开启" unCheckedChildren="关闭" />
        </Form.Item>

        <Form.Item label="保留元数据" name="preserveMetadata" valuePropName="checked">
          <Switch checkedChildren="开启" unCheckedChildren="关闭" />
        </Form.Item>

        <Form.Item label="完成后通知" name="notifyOnComplete" valuePropName="checked">
          <Switch checkedChildren="开启" unCheckedChildren="关闭" />
        </Form.Item>

        <Form.Item label="自动开始转码" name="autoStart" valuePropName="checked">
          <Switch checkedChildren="开启" unCheckedChildren="关闭" />
        </Form.Item>
      </Form>
    </Modal>
  );
};

export default SettingsModal; 