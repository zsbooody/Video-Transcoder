# 贡献指南

感谢您对视频转码工具项目的关注！我们欢迎各种形式的贡献。

## 🚀 如何贡献

### 报告问题

1. 在 [Issues](https://github.com/zsbooody/Video-Transcoder/issues) 页面搜索是否已有相似问题
2. 如果没有，创建新的 Issue
3. 使用清晰的标题和详细的描述
4. 如果是 Bug，请包含：
   - 操作系统和版本
   - 应用版本
   - 重现步骤
   - 错误信息或截图

### 提交代码

1. Fork 本仓库
2. 创建功能分支
   ```bash
   git checkout -b feature/your-feature-name
   ```
3. 编写代码并测试
4. 提交更改
   ```bash
   git commit -m "feat: 添加新功能"
   ```
5. 推送到您的 Fork
   ```bash
   git push origin feature/your-feature-name
   ```
6. 创建 Pull Request

### 代码规范

#### TypeScript/JavaScript
- 使用 TypeScript 严格模式
- 使用函数式组件
- 避免使用 `any` 类型
- 添加必要的类型注释

#### 代码风格
```typescript
// ✅ 好的示例
export const VideoConverter: React.FC<Props> = ({ file, onComplete }) => {
  const [progress, setProgress] = useState(0);
  
  // 清晰的函数命名
  const handleConversion = useCallback(async () => {
    // 实现逻辑
  }, [file]);
  
  return <div>{/* UI */}</div>;
};

// ❌ 避免
export function video_converter(props: any) {
  var prog = 0;
  // ...
}
```

#### 提交信息规范

遵循 [Conventional Commits](https://www.conventionalcommits.org/):

- `feat:` 新功能
- `fix:` 修复 Bug
- `docs:` 文档更新
- `style:` 代码格式调整
- `refactor:` 代码重构
- `test:` 测试相关
- `chore:` 构建或辅助工具相关

示例：
```
feat: 添加批量转码功能
fix: 修复硬件加速检测问题
docs: 更新 README 安装说明
```

### 文档贡献

- 保持文档简洁明了
- 添加必要的代码示例
- 更新相关的 README 部分
- 检查拼写和语法

## 🧪 测试

在提交 PR 前，请确保：

1. 所有现有测试通过
2. 新功能有相应的测试
3. 在不同环境下测试（如可能）

运行测试：
```bash
npm test
```

## 📋 Pull Request 清单

- [ ] 代码遵循项目规范
- [ ] 提交信息符合规范
- [ ] 添加了必要的测试
- [ ] 更新了相关文档
- [ ] 在本地测试通过
- [ ] PR 描述清晰完整

## 🎯 开发重点

当前我们特别欢迎以下方面的贡献：

1. **性能优化** - 提升转码速度和资源利用率
2. **新功能** - 视频编辑、滤镜效果等
3. **UI/UX 改进** - 界面美化和用户体验提升
4. **跨平台支持** - macOS 和 Linux 平台适配
5. **文档完善** - 使用教程和 API 文档

## 💬 社区交流

- 在 Issues 中讨论功能和问题
- 保持友善和专业的交流
- 尊重不同的观点和建议

## 🙏 致谢

每一位贡献者都会被列入项目的贡献者名单。感谢您让这个项目变得更好！

---

如有任何问题，请随时在 Issues 中提出或联系维护者。 