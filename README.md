# 蓝图工坊 Demo

CAD AI Workflow 前端交互原型，覆盖工作流编排、RAG 知识库、CAD 云空间和“预览—确认—执行”的安全修改闭环。

## 页面

- `/workflows` 工作流中心
- `/workflows/drawing-standardizer/editor` 图纸规范化工作流编辑器
- `/knowledge` 企业制图规范知识库
- `/cloud` CAD 云空间

## 开发

```bash
pnpm install
pnpm dev
```

生产构建：

```bash
pnpm build
```

所有 CAD、AI、RAG 和文件操作均为浏览器内模拟，不连接真实后端。
