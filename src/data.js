export const nodeCatalog = [
  {
    group: "CAD 节点",
    color: "#1677ff",
    items: [
      ["cad-input", "CAD 输入读取", "获取当前图纸与选择集"],
      ["cad-query", "CAD 查询", "查询图层、图元与属性"],
      ["cad-process", "CAD 处理", "过滤、分组与坐标转换"],
      ["cad-write", "CAD 写入", "修改图层与图元属性"],
    ],
  },
  {
    group: "AI 节点",
    color: "#17a673",
    items: [
      ["llm", "LLM", "理解任务并生成方案"],
      ["rag", "RAG 知识库", "检索企业规范"],
      ["classifier", "问题分类器", "识别问题类型"],
      ["prompt", "Prompt", "组织模型上下文"],
    ],
  },
  {
    group: "逻辑节点",
    color: "#7457d9",
    items: [
      ["branch", "条件分支", "按条件路由"],
      ["loop", "迭代循环", "批量处理图元"],
      ["code", "代码节点", "执行自定义逻辑"],
      ["human", "人工介入", "等待人工确认"],
    ],
  },
];

export const initialNodes = [
  {
    id: "read",
    type: "workflow",
    position: { x: 24, y: 145 },
    data: {
      kind: "cad-input",
      title: "读取图纸",
      subtitle: "CAD 输入读取",
      color: "#1677ff",
      rows: [["文件来源", "本地上传"], ["文件名", "办公楼二层平面图.dwg"], ["输出", "图纸对象"]],
      status: "success",
    },
  },
  {
    id: "rag",
    type: "workflow",
    position: { x: 216, y: 145 },
    data: {
      kind: "rag",
      title: "规范知识库",
      subtitle: "RAG 知识库",
      color: "#17a673",
      rows: [["知识库", "企业制图规范库"], ["Top K", "8"], ["输出", "规范条款"]],
      status: "success",
    },
  },
  {
    id: "inspect",
    type: "workflow",
    position: { x: 408, y: 145 },
    data: {
      kind: "llm",
      title: "检查图层与标注",
      subtitle: "LLM + 规则检查",
      color: "#7457d9",
      rows: [["模型", "通用大模型"], ["任务", "图纸合规检查"], ["重点", "图层 / 标注 / 尺寸"]],
      status: "success",
    },
  },
  {
    id: "proposal",
    type: "workflow",
    position: { x: 600, y: 145 },
    data: {
      kind: "llm",
      title: "生成修改方案",
      subtitle: "LLM",
      color: "#f59e0b",
      rows: [["模型", "通用大模型"], ["任务", "生成修改建议"], ["依据", "规范条款 + 检查结果"]],
      status: "warning",
    },
  },
  {
    id: "confirm",
    type: "workflow",
    position: { x: 792, y: 145 },
    data: {
      kind: "human",
      title: "安全确认",
      subtitle: "人工介入",
      color: "#1677ff",
      rows: [["策略", "人工确认"], ["风险等级", "低风险"], ["输出", "执行许可"]],
      status: "idle",
    },
  },
];

export const initialEdges = [
  ["read", "rag"], ["rag", "inspect"], ["inspect", "proposal"], ["proposal", "confirm"],
].map(([source, target], index) => ({
  id: `edge-${index}`,
  source,
  target,
  animated: false,
  style: { stroke: "#53a3ff", strokeWidth: 2 },
}));

export const changes = [
  { id: 1, group: "图层", title: "窗户图层命名不规范", detail: "C-WIND → A-WIND", count: 2, color: "green" },
  { id: 2, group: "标注", title: "标注样式不一致", detail: "统一为 ISO-25", count: 2, color: "amber" },
  { id: 3, group: "尺寸", title: "尺寸精度不符合规范", detail: "精度调整为整数", count: 2, color: "amber" },
  { id: 4, group: "文字", title: "房间文字高度不统一", detail: "统一文字高度 3.5", count: 1, color: "red" },
];

export const workflows = [
  { id: "drawing-standardizer", name: "图纸规范化助手", desc: "依据企业制图规范检查并安全修正图层、标注与尺寸", status: "已发布", runs: 28, updated: "今天 09:42", color: "blue" },
  { id: "layer-cleanup", name: "图层清理与映射", desc: "批量识别冗余图层并按项目标准映射", status: "草稿", runs: 7, updated: "昨天 16:20", color: "purple" },
  { id: "annotation-check", name: "标注完整性检查", desc: "定位遗漏标注和样式异常，输出问题清单", status: "已发布", runs: 15, updated: "07月16日", color: "green" },
];

export const documents = [
  ["建筑制图统一标准 GB/T 50001-2017.pdf", "国家标准", "186", "已索引"],
  ["企业 CAD 图层命名规范 v3.2.docx", "企业规范", "74", "已索引"],
  ["建筑施工图标注样式说明.pdf", "设计规范", "52", "已索引"],
  ["项目交付检查清单.xlsx", "项目资料", "31", "已索引"],
];

export const initialDrawings = [
  {
    id: "office-floor-2",
    name: "办公楼二层平面图.dwg",
    format: "DWG",
    size: "8.4 MB",
    updated: "今天 09:38",
    versions: [
      { id: "office-v11", label: "v1.1", note: "AI 规范化修改", updated: "今天 09:42", changes: "12 项修改", current: true },
      { id: "office-v10", label: "v1.0", note: "原始图纸", updated: "今天 09:38", changes: "原始版本" },
    ],
  },
  {
    id: "parking", name: "地下车库综合图.dwg", format: "DWG", size: "16.7 MB", updated: "昨天 18:12",
    versions: [{ id: "parking-v23", label: "v2.3", note: "最新保存版本", updated: "昨天 18:12", changes: "原始版本", current: true }, { id: "parking-v22", label: "v2.2", note: "人工调整", updated: "07月16日", changes: "7 项修改" }],
  },
  {
    id: "site-plan", name: "园区总平面图.dxf", format: "DXF", size: "12.1 MB", updated: "07月16日",
    versions: [{ id: "site-v14", label: "v1.4", note: "最新保存版本", updated: "07月16日", changes: "原始版本", current: true }],
  },
  {
    id: "frame", name: "标准图框-A1.dwg", format: "DWG", size: "2.8 MB", updated: "07月15日",
    versions: [{ id: "frame-v30", label: "v3.0", note: "标准图框", updated: "07月15日", changes: "原始版本", current: true }],
  },
];

export const industryTemplates = {
  建筑: [
    ["建筑施工图规范化", "自动检查图层、标注、尺寸与文字，生成可确认的修改方案。", "8 节点"],
    ["建筑图纸完整性审查", "识别缺失标注、尺寸冲突与图框问题。", "6 节点"],
    ["门窗图层批量映射", "按企业标准批量映射门窗、墙体和轴网图层。", "5 节点"],
  ],
  机械: [
    ["机械 BOM 属性校验", "检查图块属性、零件编号与物料表一致性。", "7 节点"],
    ["机械图层标准化", "统一零件、中心线、尺寸和剖面线图层。", "6 节点"],
    ["尺寸公差检查", "识别公差标注缺失与格式异常。", "5 节点"],
  ],
  暖通: [
    ["风管图纸规则检查", "校验风管尺寸、标高、风口编号与图层。", "8 节点"],
    ["暖通设备标注整理", "批量规范设备编号、文字高度和引线样式。", "6 节点"],
    ["管线碰撞初筛", "根据图层和对象范围生成碰撞问题清单。", "7 节点"],
  ],
};
