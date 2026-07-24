# Prototype Instructions

Run the local server yourself and open the preview in the browser available to this environment. Do not give the user server-start instructions when you can run it.

Before making substantial visual changes, use the Product Design plugin's `get-context` skill when the visual source is unclear or no longer matches the current goal. When the user gives durable prototype-specific design feedback, preferences, or decisions, record them in `AGENTS.md`.

When implementing from a selected generated mock, treat that image as the source of truth for layout, component anatomy, density, spacing, color, typography, visible content, and hierarchy.

## Durable design decisions

- The source of truth is ideation option 1 (`exec-2e8c2a0b-b370-446f-a21f-09e44838bc83.png`).
- Remove the global “节点库” navigation item, but keep the editor-local node palette.
- Clicking either CAD preview thumbnail opens a large synchronized before/after comparison view.
- Product name: CAD WorkFlow平台.
- “版本”不作为全局一级导航；版本历史从各工作流编辑器的“版本”按钮打开。
- 知识库与云空间均使用浏览器本地文件选择，在当前会话内读取文件元数据并更新列表。
- 编辑器画布使用紧凑的放大镜菜单承载缩放操作，并提供“新增节点”入口；略缩图保持小尺寸且不遮挡编排区域。
- 节点属性按 CAD、AI、逻辑节点类型展示对应的输入、检索、模型、分支、迭代或人工确认参数，而非统一的大模型表单。
- 云空间内每一图纸版本均可单独查看预览与下载。
- 工作流画布与底部执行确认/调试面板之间使用可拖动分隔线调节上下高度；调试按钮和运行过程均会展开底部编译与调试模块。
- 节点选中态使用更强的彩色外框、光晕与标题背景提示；节点属性中提供配置、输出和运行/调试日志标签页。
- 运行结束后直接以双图差异审阅弹窗呈现执行确认；关闭该弹窗不收起下方调试模块，用户可从高强调入口再次进入确认。
- CAD 读取节点的文件来源固定为“云空间文件”与“本地 CAD 文件”：云空间来源需选择具体版本图纸，本地来源需可见显示连接成功状态与当前图纸，并提供重新连接。
