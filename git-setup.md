# Git 设置和提交指南

## 1. 首先在 GitHub 上创建仓库

1. 访问 https://github.com/new
2. 仓库名称: `Video-Transcoder`
3. 描述: "基于 FFmpeg 的专业视频转码桌面应用"
4. 设为 Public（公开）
5. 不要初始化 README、.gitignore 或 LICENSE（我们已经有了）
6. 点击 "Create repository"

## 2. 更新文档中的用户名

将所有文档中的 `your-github-username` 替换为你的实际 GitHub 用户名。

## 3. 初始化并提交代码

在项目根目录（C:\Users\zs\Desktop\转码）执行：

```bash
# 初始化 Git 仓库
git init

# 添加所有文件
git add .

# 创建初始提交
git commit -m "feat: 初始化视频转码工具项目

- 基于 Electron + React + TypeScript 构建
- 支持多种视频格式转换和硬件加速
- 包含完整的预设管理和批量处理功能
- 为用户提供便捷的视频处理体验"

# 设置主分支
git branch -M main

# 添加远程仓库
git remote add origin https://github.com/zsbooody/Video-Transcoder.git

# 推送到 GitHub
git push -u origin main
```

## 4. 后续步骤

1. 在 GitHub 仓库页面添加 Topics: `electron`, `react`, `typescript`, `ffmpeg`, `video-converter`
2. 在 Settings > Options 中设置项目描述和网站链接
3. 考虑添加 GitHub Actions 自动构建
4. 创建第一个 Release 版本

## 5. 注意事项

- 确保 `ffmpeg.exe` 和 `ffprobe.exe` 不会被提交（已在 .gitignore 中排除）
- 记得添加应用截图到 `docs/screenshot.png`
- 可以在 README 中添加更多使用示例和 GIF 动图

祝贺你的开源项目发布！🎉 