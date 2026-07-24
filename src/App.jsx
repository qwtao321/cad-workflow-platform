import { useCallback, useEffect, useRef, useState } from "react";
import { BrowserRouter, NavLink, Route, Routes, useNavigate, useParams } from "react-router-dom";
import {
  ReactFlow,
  Background,
  MiniMap,
  Handle,
  Position,
  addEdge,
  useEdgesState,
  useNodesState,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import {
  ArrowCounterClockwise,
  ArrowsOut,
  BookOpen,
  CaretDown,
  Check,
  CheckCircle,
  ClockCounterClockwise,
  CloudArrowUp,
  Code,
  Cube,
  Database,
  DownloadSimple,
  File,
  FileArrowUp,
  FloppyDisk,
  FolderOpen,
  Gear,
  GridFour,
  House,
  Info,
  MagnifyingGlass,
  Minus,
  PaperPlaneTilt,
  Play,
  Plus,
  RocketLaunch,
  Selection,
  SidebarSimple,
  SlidersHorizontal,
  Sparkle,
  Stack,
  Trash,
  UploadSimple,
  WarningCircle,
  X,
} from "@phosphor-icons/react";
import { changes, documents, industryTemplates, initialDrawings, initialEdges, initialNodes, nodeCatalog, workflows } from "./data";

const beforeImage = "/assets/cad-before.png";
const afterImage = "/assets/cad-after.png";

function Brand() {
  return (
    <div className="brand">
      <span className="brand-mark"><Cube weight="fill" size={18} /></span>
      <span className="brand-name">CAD WorkFlow平台</span>
    </div>
  );
}

const navItems = [
  ["/", "工作台", House],
  ["/workflows", "工作流", GridFour],
  ["/knowledge", "知识库", BookOpen],
  ["/cloud", "云空间", FolderOpen],
  ["/templates", "模板", Stack],
  ["/settings", "设置", Gear],
];

function AppShell({ children, editor = false, editorHeader = null }) {
  return (
    <div className="app-shell">
      {editorHeader || <header className="topbar">
        <Brand />
        <div className="topbar-spacer" />
        <button className="icon-button" aria-label="帮助"><Info size={19} /></button>
        <div className="avatar">张工</div>
      </header>}
      <div className="app-body">
        <aside className="global-nav" aria-label="全局导航">
          <nav>
            {navItems.map(([to, label, Icon]) => (
              <NavLink key={to} to={to} end={to === "/"} className={({ isActive }) => `nav-item ${isActive ? "active" : ""}`}>
                <Icon size={21} weight={label === "工作流" ? "fill" : "regular"} />
                <span>{label}</span>
              </NavLink>
            ))}
          </nav>
          <button className="nav-collapse"><SidebarSimple size={20} /><span>收起</span></button>
        </aside>
        <main className={editor ? "main editor-main" : "main"}>{children}</main>
      </div>
    </div>
  );
}

function Toast({ message, onClose }) {
  useEffect(() => {
    const timer = setTimeout(onClose, 2400);
    return () => clearTimeout(timer);
  }, [onClose]);
  return <div className="toast"><CheckCircle size={19} weight="fill" />{message}</div>;
}

function PageHeader({ eyebrow, title, description, action }) {
  return (
    <div className="page-header">
      <div><div className="eyebrow">{eyebrow}</div><h1>{title}</h1><p>{description}</p></div>
      {action}
    </div>
  );
}

function DashboardPage() {
  const navigate = useNavigate();
  return <AppShell><div className="page-content">
    <PageHeader eyebrow="工作台" title="早上好，张工" description="从一张图纸开始，或继续最近的 AI 工作流。" action={<button className="primary" onClick={() => navigate("/workflows/drawing-standardizer/editor")}><Play size={17} weight="fill" />继续编辑</button>} />
    <section className="hero-strip">
      <div><span className="soft-tag"><Sparkle size={15} weight="fill" />推荐演示</span><h2>让每一次 CAD 修改都有依据、可预览、可确认</h2><p>运行“图纸规范化助手”，查看 AI 如何依据企业制图规范生成安全修改方案。</p><button className="primary" onClick={() => navigate("/workflows/drawing-standardizer/editor")}>打开工作流 <PaperPlaneTilt size={17} /></button></div>
      <div className="hero-flow"><span>读取图纸</span><b>→</b><span>规范检查</span><b>→</b><span>安全确认</span></div>
    </section>
    <div className="section-title"><h2>最近工作流</h2><button className="text-button" onClick={() => navigate("/workflows")}>查看全部</button></div>
    <div className="workflow-grid">{workflows.slice(0, 3).map((w) => <WorkflowCard key={w.id} workflow={w} onOpen={() => navigate(`/workflows/${w.id}/editor`)} />)}</div>
  </div></AppShell>;
}

function WorkflowCard({ workflow, onOpen }) {
  return <article className="workflow-card" onClick={onOpen} tabIndex={0} onKeyDown={(e) => e.key === "Enter" && onOpen()}>
    <div className={`workflow-icon ${workflow.color}`}><GridFour size={21} weight="fill" /></div>
    <div className="workflow-card-top"><span className={`status ${workflow.status === "已发布" ? "published" : "draft"}`}>{workflow.status}</span><button className="more">•••</button></div>
    <h3>{workflow.name}</h3><p>{workflow.desc}</p>
    <footer><span>运行 {workflow.runs} 次</span><span>{workflow.updated}</span></footer>
  </article>;
}

function WorkflowsPage() {
  const navigate = useNavigate();
  const [tab, setTab] = useState("我的工作流");
  const [query, setQuery] = useState("");
  const list = workflows.filter((w) => w.name.includes(query));
  return <AppShell><div className="page-content">
    <PageHeader eyebrow="工作流中心" title="工作流" description="创建、发布并管理团队的 CAD AI 自动化流程。" action={<button className="primary" onClick={() => navigate("/workflows/drawing-standardizer/editor")}><Plus size={17} />新建工作流</button>} />
    <div className="toolbar-row"><div className="tabs">{["我的工作流", "官方模板", "我的模板", "运行记录"].map((t) => <button className={tab === t ? "active" : ""} onClick={() => setTab(t)} key={t}>{t}</button>)}</div><label className="search"><MagnifyingGlass size={17} /><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="搜索工作流" /></label></div>
    {tab === "运行记录" ? <RunsTable /> : <div className="workflow-grid">{list.map((w) => <WorkflowCard key={w.id} workflow={w} onOpen={() => navigate(`/workflows/${w.id}/editor`)} />)}</div>}
  </div></AppShell>;
}

function RunsTable() {
  return <div className="table-card"><table><thead><tr><th>工作流</th><th>图纸</th><th>状态</th><th>修改项</th><th>运行时间</th></tr></thead><tbody>
    <tr><td>图纸规范化助手</td><td>办公楼二层平面图.dwg</td><td><span className="status published">执行成功</span></td><td>12 项</td><td>今天 09:42</td></tr>
    <tr><td>标注完整性检查</td><td>地下车库综合图.dwg</td><td><span className="status published">检查完成</span></td><td>7 项</td><td>昨天 18:20</td></tr>
  </tbody></table></div>;
}

const fileSize = (bytes) => bytes < 1024 * 1024 ? `${Math.max(1, Math.ceil(bytes / 1024))} KB` : `${(bytes / 1024 / 1024).toFixed(1)} MB`;
const extensionOf = (name) => name.split(".").pop()?.toUpperCase() || "FILE";

function KnowledgePage() {
  const inputRef = useRef(null);
  const [uploading, setUploading] = useState(false);
  const [toast, setToast] = useState("");
  const [localDocs, setLocalDocs] = useState([]);
  const handleFiles = (event) => {
    const files = [...event.target.files || []];
    if (!files.length) return;
    setUploading(true);
    setTimeout(() => {
      setLocalDocs((items) => [...files.map((file) => [file.name, "本地上传", String(Math.max(1, Math.round(file.size / 18000))), "已索引", file]) , ...items]);
      setUploading(false);
      setToast(`已读取 ${files.length} 个本地文档并开始索引`);
      event.target.value = "";
    }, 650);
  };
  const allDocs = [...localDocs, ...documents];
  return <AppShell><div className="page-content">
    <PageHeader eyebrow="知识库中心" title="企业制图规范库" description="将企业规范、国家标准和项目经验转化为可检索的 RAG 知识。" action={<><input ref={inputRef} className="visually-hidden" type="file" multiple accept=".pdf,.doc,.docx,.xls,.xlsx,.txt,.md" onChange={handleFiles} /><button className="primary" onClick={() => inputRef.current?.click()} disabled={uploading}>{uploading ? "正在索引..." : <><UploadSimple size={17} />上传文档</>}</button></>} />
    {uploading && <div className="upload-progress"><span style={{ width: "68%" }} /></div>}
    <div className="knowledge-layout"><section className="knowledge-summary"><div className="knowledge-logo"><Database size={27} weight="fill" /></div><h2>企业制图规范库 v3.2</h2><p>用于建筑施工图图层、标注、尺寸和文字规范检查。</p><div className="summary-stats"><div><b>{allDocs.length}</b><span>文档</span></div><div><b>{343 + localDocs.length * 12}</b><span>知识片段</span></div><div><b>98.2%</b><span>索引成功率</span></div></div><h3>RAG 参数</h3><label>召回数量 Top K <input type="number" defaultValue="8" /></label><label>相似度阈值 <input type="text" defaultValue="0.72" /></label><button className="secondary" onClick={() => setToast("RAG 参数已保存")}>保存参数</button></section>
    <section className="table-card table-section"><div className="section-title"><div><h2>知识文档</h2><span className="muted">支持 PDF、Word、Excel、Markdown 与 TXT</span></div><span className="muted">本地文件仅保留在当前浏览器会话</span></div><table><thead><tr><th>文件名</th><th>分类</th><th>片段数</th><th>状态</th></tr></thead><tbody>{allDocs.map((d, index) => <tr key={`${d[0]}-${index}`}><td><span className="file-name"><File size={18} />{d[0]}</span></td><td>{d[1]}</td><td>{d[2]}</td><td><span className="status published">{d[3]}</span></td></tr>)}</tbody></table></section></div>
    {toast && <Toast message={toast} onClose={() => setToast("")} />}
  </div></AppShell>;
}

function CloudPage() {
  const inputRef = useRef(null);
  const [uploading, setUploading] = useState(false);
  const [toast, setToast] = useState("");
  const [drawings, setDrawings] = useState(initialDrawings);
  const [expanded, setExpanded] = useState("office-floor-2");
  const [query, setQuery] = useState("");
  const [preview, setPreview] = useState(null);
  const handleFiles = (event) => {
    const files = [...event.target.files || []];
    if (!files.length) return;
    setUploading(true);
    setTimeout(() => {
      const uploaded = files.map((file) => ({ id: `local-${file.name}-${Date.now()}`, name: file.name, format: extensionOf(file.name), size: fileSize(file.size), updated: "刚刚", file, versions: [{ id: `local-version-${file.name}`, label: "v1.0", note: "本地上传原始图纸", updated: "刚刚", changes: "原始版本", current: true }] }));
      setDrawings((items) => [...uploaded, ...items]);
      setExpanded(uploaded[0].id);
      setUploading(false);
      setToast(`已读取 ${files.length} 张本地图纸`);
      event.target.value = "";
    }, 650);
  };
  const download = (drawing, version) => {
    const source = drawing.file || new Blob([`CAD WorkFlow平台 演示下载\n图纸：${drawing.name}\n版本：${version.label}\n说明：${version.note}\n`], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(source);
    const anchor = document.createElement("a");
    anchor.href = url; anchor.download = drawing.file ? drawing.name : `${drawing.name.replace(/\.[^.]+$/, "")}-${version.label}.txt`; anchor.click();
    setTimeout(() => URL.revokeObjectURL(url), 1200);
    setToast(`已下载 ${drawing.name} ${version.label}`);
  };
  const removeDrawing = (drawing) => {
    if (!window.confirm(`删除“${drawing.name}”及其 ${drawing.versions.length} 个版本？`)) return;
    setDrawings((items) => items.filter((item) => item.id !== drawing.id));
    setToast(`已从当前会话移除 ${drawing.name}`);
  };
  const list = drawings.filter((drawing) => drawing.name.toLowerCase().includes(query.toLowerCase()));
  return <AppShell><div className="page-content">
    <PageHeader eyebrow="CAD 云空间" title="图纸文件" description="按原始图纸管理版本；每一次安全执行或保存都会形成可追溯版本。" action={<><input ref={inputRef} className="visually-hidden" type="file" multiple accept=".dwg,.dxf" onChange={handleFiles} /><button className="primary" onClick={() => inputRef.current?.click()} disabled={uploading}>{uploading ? "正在读取..." : <><CloudArrowUp size={18} />上传图纸</>}</button></>} />
    {uploading && <div className="upload-progress"><span style={{ width: "68%" }} /></div>}
    <div className="cloud-toolbar"><div className="tabs"><button className="active">全部图纸</button><button>最近使用</button><button>我的收藏</button></div><label className="search"><MagnifyingGlass size={17} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="搜索图纸" /></label></div>
    <div className="drawing-list"><div className="drawing-head"><span>图纸与版本</span><span>格式</span><span>当前版本</span><span>大小</span><span>更新时间</span><span>操作</span></div>{list.map((drawing) => <section className="drawing-group" key={drawing.id}><div className="drawing-row"><button className={`expand-button ${expanded === drawing.id ? "open" : ""}`} onClick={() => setExpanded(expanded === drawing.id ? "" : drawing.id)} aria-label={`展开 ${drawing.name} 版本`}><CaretDown size={16} /></button><span className="file-name"><span className="dwg-icon">{drawing.format}</span>{drawing.name}</span><span>{drawing.format}</span><span><button className="version-chip" onClick={() => setExpanded(drawing.id)}>{drawing.versions.find((version) => version.current)?.label || drawing.versions[0].label}</button></span><span>{drawing.size}</span><span>{drawing.updated}</span><span className="row-actions"><button title="下载当前版本" onClick={() => download(drawing, drawing.versions.find((version) => version.current) || drawing.versions[0])}><DownloadSimple size={17} /></button><button title="删除图纸" className="delete-action" onClick={() => removeDrawing(drawing)}><Trash size={17} /></button></span></div>{expanded === drawing.id && <div className="version-list">{drawing.versions.map((version) => <div className="version-row" key={version.id}><span className="version-rail" /><span className="version-label">{version.label}</span><span className="version-note">{version.note}</span><span className="version-changes">{version.changes}</span><span>{version.updated}</span><span className="row-actions"><button className="view-version" title={`查看 ${version.label}`} onClick={() => setPreview({ drawing, version })}><MagnifyingGlass size={16} /></button><button title={`下载 ${version.label}`} onClick={() => download(drawing, version)}><DownloadSimple size={16} /></button></span>{version.current && <span className="current-version">当前版本</span>}</div>)}</div>}</section>)}</div>
    {preview && <DrawingPreviewModal drawing={preview.drawing} version={preview.version} onClose={() => setPreview(null)} onDownload={() => download(preview.drawing, preview.version)} />}
    {toast && <Toast message={toast} onClose={() => setToast("")} />}
  </div></AppShell>;
}

function DrawingPreviewModal({ drawing, version, onClose, onDownload }) {
  const isModified = /AI|修改|调整/.test(`${version.note} ${version.changes}`);
  const image = isModified ? afterImage : beforeImage;
  useEffect(() => {
    const key = (event) => event.key === "Escape" && onClose();
    window.addEventListener("keydown", key);
    return () => window.removeEventListener("keydown", key);
  }, [onClose]);
  return <div className="modal-backdrop" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
    <section className="drawing-preview-modal" role="dialog" aria-modal="true" aria-label={`${drawing.name} ${version.label} 图纸查看`}>
      <header><div><span className="eyebrow">CAD 云空间 · 图纸版本</span><h2>{drawing.name} <b>{version.label}</b></h2><p>{version.note} · {version.changes} · {version.updated}</p></div><button className="icon-button" onClick={onClose} aria-label="关闭预览"><X size={20} /></button></header>
      <div className="drawing-preview-canvas"><img src={image} alt={`${drawing.name} ${version.label} 预览`} /><span className="drawing-preview-tag">{isModified ? "修改后预览" : "原始图纸预览"}</span></div>
      <footer><span><Info size={16} />演示图纸预览，实际 CAD 文件将在本地 CAD 中打开。</span><div><button className="secondary" onClick={onDownload}><DownloadSimple size={16} />下载版本</button><button className="primary" onClick={onClose}>完成查看</button></div></footer>
    </section>
  </div>;
}

function TemplatesPage() {
  const navigate = useNavigate();
  const [industry, setIndustry] = useState("建筑");
  const [toast, setToast] = useState("");
  return <AppShell><div className="page-content"><PageHeader eyebrow="工作流行业模版" title="工作流行业模版" description="从行业最佳实践开始，快速搭建面向 CAD 绘制、修改和审查的 AI 工作流。" /><div className="industry-tabs">{Object.keys(industryTemplates).map((item) => <button key={item} onClick={() => setIndustry(item)} className={industry === item ? "active" : ""}>{item}</button>)}</div><div className="template-grid">{industryTemplates[industry].map(([name, description, nodes]) => <article className="template-card" key={name}><div className="template-icon"><Stack size={22} weight="fill" /></div><span>{industry} · {nodes}</span><h2>{name}</h2><p>{description}</p><footer><button className="secondary" onClick={() => setToast(`已预览「${name}」`)}>查看说明</button><button className="primary" onClick={() => navigate("/workflows/drawing-standardizer/editor")}>使用模版</button></footer></article>)}</div>{toast && <Toast message={toast} onClose={() => setToast("")} />}</div></AppShell>;
}

function SettingsPage() {
  const [localConnected, setLocalConnected] = useState(false);
  const [toast, setToast] = useState("");
  return <AppShell><div className="page-content"><PageHeader eyebrow="平台设置" title="设置" description="管理账号、套餐用量和 CAD 本地连接能力。" /><div className="settings-grid"><section className="setting-card"><div className="setting-icon blue"><Cube size={22} weight="fill" /></div><div><h2>账号管理</h2><p>张工 · CAD 设计负责人</p></div><button className="secondary" onClick={() => setToast("账号资料编辑面板已打开")}>编辑资料</button><dl><div><dt>所属团队</dt><dd>建筑设计一组</dd></div><div><dt>角色权限</dt><dd>管理员</dd></div><div><dt>登录邮箱</dt><dd>zhang.gong@example.com</dd></div></dl></section><section className="setting-card"><div className="setting-icon purple"><SlidersHorizontal size={22} weight="fill" /></div><div><h2>套餐用量</h2><p>专业版 · 2026 年度订阅</p></div><button className="secondary" onClick={() => setToast("套餐详情已打开")}>查看套餐</button><div className="usage-row"><div><span>工作流运行次数</span><b>128 / 500</b></div><i><em style={{ width: "26%" }} /></i></div><div className="usage-row"><div><span>知识库存储</span><b>1.4 GB / 10 GB</b></div><i><em style={{ width: "14%" }} /></i></div></section><section className="setting-card connection-card"><div className={`setting-icon ${localConnected ? "green" : "orange"}`}><CloudArrowUp size={22} weight="fill" /></div><div><h2>CAD 本地连接</h2><p>{localConnected ? "已连接到 AutoCAD 桌面端" : "连接本地 CAD，读取当前图纸与选择集"}</p></div><button className={localConnected ? "secondary" : "primary"} onClick={() => { setLocalConnected(!localConnected); setToast(localConnected ? "已断开 CAD 本地连接" : "已连接 CAD 本地插件"); }}>{localConnected ? "断开连接" : "连接 CAD"}</button><div className="connection-status"><span className={localConnected ? "online" : "offline"} />{localConnected ? "AutoCAD 2025 · 当前图纸：办公楼二层平面图.dwg" : "尚未连接本地 CAD"}</div></section></div>{toast && <Toast message={toast} onClose={() => setToast("")} />}</div></AppShell>;
}

function WorkflowNode({ data, selected }) {
  return <div className={`flow-node ${selected ? "selected" : ""} ${data.running ? "running" : ""}`} style={{ "--node-color": data.color }}>
    <Handle type="target" position={Position.Left} />
    <div className="flow-node-header"><span className="node-symbol"><Sparkle size={14} weight="fill" /></span><div><strong>{data.title}</strong><small>{data.subtitle}</small></div><NodeStatus status={data.status} /></div>
    <div className="flow-node-body">{data.rows?.map(([k, v]) => <div key={k}><span>{k}</span><b>{v}</b></div>)}</div>
    <Handle type="source" position={Position.Right} />
  </div>;
}

const workflowNodeTypes = { workflow: WorkflowNode };

function NodeStatus({ status }) {
  if (status === "success") return <CheckCircle size={16} weight="fill" className="node-success" />;
  if (status === "warning") return <WarningCircle size={16} weight="fill" className="node-warning" />;
  if (status === "running") return <span className="spinner small" />;
  return <span className="node-dot" />;
}

function NodePalette({ onDragStart }) {
  const [query, setQuery] = useState("");
  return <aside className="node-palette"><div className="panel-title"><b>节点库</b><CaretDown size={15} /></div><label className="palette-search"><MagnifyingGlass size={15} /><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="搜索节点" /></label><div className="catalog-scroll">
    {nodeCatalog.map((group) => <section key={group.group}><h4><CaretDown size={12} />{group.group}</h4>{group.items.filter((x) => x[1].toLowerCase().includes(query.toLowerCase())).map(([type, name, desc]) => <button draggable onDragStart={(e) => onDragStart(e, { type, name, desc, color: group.color })} className="catalog-item" key={type}><span style={{ background: group.color }}><Cube size={14} weight="fill" /></span><div><b>{name}</b><small>{desc}</small></div></button>)}</section>)}
  </div><div className="palette-hint">拖拽节点到画布，双击可添加</div></aside>;
}

function Inspector({ node, onChange, onDelete, running }) {
  const [tab, setTab] = useState("配置");
  useEffect(() => setTab("配置"), [node?.id]);
  if (!node) return <aside className="inspector"><div className="panel-title"><b>节点属性</b></div><div className="inspector-empty"><Selection size={30} /><p>选择画布中的节点<br />以编辑参数</p></div></aside>;
  const title = node.data.title;
  const kind = node.data.kind || inferNodeKind(node);
  return <aside className="inspector"><div className="panel-title"><b>节点属性</b><X size={16} /></div><div className="inspector-scroll"><div className="inspector-node"><span className="node-symbol" style={{ background: node.data.color }}><Sparkle size={14} weight="fill" /></span><div><b>{title}</b><small>{node.data.subtitle}</small></div></div><div className="inspector-tabs">{["配置", "输出", "日志"].map((item) => <button key={item} className={tab === item ? "active" : ""} onClick={() => setTab(item)}>{item}</button>)}</div>
    {tab === "配置" && <><div className="form-section"><label>节点名称<input value={title} onChange={(e) => onChange("title", e.target.value)} /></label><label>说明<textarea defaultValue={node.data.subtitle === "人工介入" ? "在写入图纸前等待指定人员确认。" : "配置节点输入、处理规则与输出变量。"} /></label></div><NodeConfig kind={kind} /><button className="danger-button" onClick={onDelete}><Trash size={16} />删除节点</button></>}
    {tab === "输出" && <NodeOutput kind={kind} />}
    {tab === "日志" && <NodeLogPanel node={node} running={running} />}
  </div></aside>;
}

function inferNodeKind(node) {
  const label = `${node.data.title} ${node.data.subtitle}`.toLowerCase();
  if (label.includes("知识库") || label.includes("rag")) return "rag";
  if (label.includes("读取") || label.includes("输入")) return "cad-input";
  if (label.includes("查询")) return "cad-query";
  if (label.includes("处理")) return "cad-process";
  if (label.includes("写入")) return "cad-write";
  if (label.includes("分类")) return "classifier";
  if (label.includes("prompt")) return "prompt";
  if (label.includes("分支")) return "branch";
  if (label.includes("循环")) return "loop";
  if (label.includes("代码")) return "code";
  if (label.includes("人工") || label.includes("确认")) return "human";
  return "llm";
}

function NodeConfig({ kind }) {
  const sections = {
    "cad-input": <><CadInputConfig /><OutputSection items="drawing / selection_set / entities" /></>,
    "cad-query": <><ConfigSection title="查询条件"><Field label="输入图纸变量"><select><option>读取图纸.drawing</option></select></Field><Field label="查询目标"><select defaultValue="图层与图元"><option>图层与图元</option><option>块与属性</option><option>尺寸与文字</option></select></Field><Field label="过滤表达式"><textarea defaultValue={'layer =~ "A-*" AND type IN [TEXT, DIMENSION]'} /></Field></ConfigSection><OutputSection items="query_result / matched_entities" /></>,
    "cad-process": <><ConfigSection title="处理规则"><Field label="输入集合"><select><option>CAD 查询.query_result</option></select></Field><Field label="处理方式"><select defaultValue="按图层分组"><option>按图层分组</option><option>按类型分组</option><option>属性映射</option><option>单位转换</option></select></Field><Field label="异常对象策略"><select><option>保留并标记</option><option>跳过</option><option>终止流程</option></select></Field></ConfigSection><OutputSection items="processed_entities / exceptions" /></>,
    "cad-write": <><ConfigSection title="写入策略"><Field label="目标图纸"><select><option>读取图纸.drawing</option></select></Field><Field label="修改动作"><select defaultValue="更新图层与属性"><option>更新图层与属性</option><option>创建文字或标注</option><option>插入块</option><option>高亮对象</option></select></Field><Field label="写入范围"><select><option>仅修改方案中的对象</option><option>当前选择集</option></select></Field></ConfigSection><ConfigSection title="安全控制"><Field label="执行前确认"><select><option>必须人工确认</option><option>低风险自动执行</option></select></Field></ConfigSection><OutputSection items="change_set / preview_drawing" /></>,
    rag: <><ConfigSection title="知识检索"><Field label="知识库"><select><option>企业制图规范库 v3.2</option></select></Field><Field label="查询变量"><select><option>读取图纸.drawing_summary</option></select></Field><Field label="检索模式"><select><option>混合检索（向量 + 全文）</option><option>向量检索</option><option>全文检索</option></select></Field><Field label="Top K"><input type="number" defaultValue="8" /></Field><Field label="相似度阈值"><input defaultValue="0.72" /></Field></ConfigSection><OutputSection items="documents / retrieval_context" /></>,
    llm: <><ConfigSection title="模型"><Field label="模型供应商"><select><option>通义千问</option><option>OpenAI</option></select></Field><Field label="模型"><select defaultValue="Qwen-Max"><option>Qwen-Max</option><option>GPT-5</option></select></Field></ConfigSection><ConfigSection title="提示词与上下文"><Field label="系统提示词"><textarea defaultValue="依据企业制图规范检查输入图纸，输出结构化问题与建议。" /></Field><Field label="上下文变量"><select><option>规范知识库.retrieval_context</option></select></Field><Field label="温度"><span className="range-row"><input type="range" min="0" max="1" step="0.1" defaultValue="0.3" /><b>0.3</b></span></Field><Field label="最大输出 Token"><input type="number" defaultValue="2048" /></Field></ConfigSection><OutputSection items="text / structured_result" /></>,
    classifier: <><ConfigSection title="分类规则"><Field label="输入变量"><select><option>LLM.structured_result</option></select></Field><Field label="分类标签"><textarea defaultValue="图层异常\n标注异常\n尺寸异常\n文字异常" /></Field><Field label="多标签"><select><option>允许多标签</option><option>仅返回最高置信度</option></select></Field></ConfigSection><OutputSection items="class / confidence" /></>,
    prompt: <><ConfigSection title="提示词模板"><Field label="模板内容"><textarea defaultValue={'请基于 {{drawing}} 和 {{rules}} 生成 CAD 修改建议。'} /></Field><Field label="变量"><input defaultValue="drawing, rules, check_result" /></Field><Field label="缺失变量处理"><select><option>提示并终止</option><option>使用空值继续</option></select></Field></ConfigSection><OutputSection items="prompt_text" /></>,
    branch: <><ConfigSection title="分支条件"><Field label="判断变量"><select><option>检查图层与标注.risk_level</option></select></Field><Field label="运算符"><select><option>等于</option><option>包含</option><option>大于</option></select></Field><Field label="比较值"><input defaultValue="low" /></Field></ConfigSection><OutputSection items="true / false" /></>,
    loop: <><ConfigSection title="迭代设置"><Field label="迭代数组"><select><option>CAD 查询.matched_entities</option></select></Field><Field label="并发数"><input type="number" defaultValue="5" /></Field><Field label="错误处理"><select><option>记录并继续</option><option>立即终止</option></select></Field></ConfigSection><OutputSection items="item / results" /></>,
    code: <><ConfigSection title="代码执行"><Field label="运行环境"><select><option>JavaScript</option><option>Python</option></select></Field><Field label="输入变量"><input defaultValue="entities, rules" /></Field><Field label="代码"><textarea defaultValue="return entities.filter(item => item.layer);" /></Field></ConfigSection><OutputSection items="result / logs" /></>,
    human: <><ConfigSection title="人工确认"><Field label="确认说明"><textarea defaultValue="请审阅修改前后差异，确认后才会写入新版本。" /></Field><Field label="处理人"><select><option>当前工作流运行人</option><option>指定审批人：张工</option></select></Field><Field label="超时策略"><select><option>24 小时后提醒</option><option>超时自动终止</option></select></Field></ConfigSection><OutputSection items="approved / comment" /></>,
  };
  return sections[kind] || sections.llm;
}

function CadInputConfig() {
  const [source, setSource] = useState("cloud");
  const [connecting, setConnecting] = useState(false);
  useEffect(() => {
    if (source !== "local") return undefined;
    setConnecting(true);
    const timer = setTimeout(() => setConnecting(false), 650);
    return () => clearTimeout(timer);
  }, [source]);
  return <ConfigSection title="图纸输入">
    <Field label="文件来源"><select value={source} onChange={(event) => setSource(event.target.value)}><option value="cloud">云空间文件</option><option value="local">本地 CAD 文件</option></select></Field>
    {source === "cloud" ? <Field label="选择云空间图纸"><select defaultValue="办公楼二层平面图.dwg"><option>办公楼二层平面图.dwg · v1.1</option><option>地下车库综合图.dwg · v2.3</option><option>园区总平面图.dxf · v1.4</option></select></Field> : <div className="local-cad-source"><Field label="本地 CAD 文件"><select defaultValue="办公楼二层平面图.dwg"><option>办公楼二层平面图.dwg（当前打开）</option><option>当前 CAD 选择集</option></select></Field><div className={`cad-connection ${connecting ? "connecting" : "connected"}`}><span>{connecting ? <i className="spinner small" /> : <CheckCircle size={15} weight="fill" />}</span><div><b>{connecting ? "正在连接本地 CAD…" : "已连接本地 CAD"}</b><small>{connecting ? "正在读取当前打开的图纸" : "AutoCAD 2025 · 办公楼二层平面图.dwg"}</small></div><button type="button" onClick={() => { setConnecting(true); setTimeout(() => setConnecting(false), 650); }}>重新连接</button></div></div>}
    <Field label="读取范围"><select defaultValue="当前选择集"><option>当前选择集</option><option>全部模型空间</option><option>指定图层</option></select></Field><Field label="对象类型"><input defaultValue="图层、图元、块、标注" /></Field>
  </ConfigSection>;
}

function ConfigSection({ title, children }) { return <div className="form-section"><h4>{title}</h4>{children}</div>; }
function Field({ label, children }) { return <label>{label}{children}</label>; }
function OutputSection({ items }) { return <ConfigSection title="输出变量"><div className="output-vars">{items.split("/").map((item) => <code key={item}>{item.trim()}</code>)}</div></ConfigSection>; }

function NodeOutput({ kind }) {
  const outputs = { "cad-input": "drawing, selection_set, entities", rag: "documents, retrieval_context", llm: "text, structured_result", human: "approved, comment" };
  return <div className="node-output-panel"><span className="status published">最近一次运行成功</span><h4>模拟输出</h4><pre>{`{\n  "${(outputs[kind] || "result, logs").split(", ")[0]}": "…",\n  "status": "ready"\n}`}</pre><p>运行工作流后，此处会显示该节点的实际输出与变量映射。</p></div>;
}

function NodeLogPanel({ node, running }) {
  const isCurrent = Boolean(node.data.running) || running;
  return <div className="node-log-panel"><div className="node-log-head"><span className={isCurrent ? "log-running" : "log-success"} />{isCurrent ? "正在执行节点" : "最近一次调试记录"}</div><div className="log-lines"><p><time>09:42:08.104</time><span>开始处理 {node.data.title}</span></p><p><time>09:42:08.387</time><span>读取输入变量并完成校验</span></p><p><time>09:42:08.816</time><span>{isCurrent ? "正在生成节点输出…" : "输出变量已写入工作流上下文"}</span></p></div><button className="secondary">查看完整节点日志</button></div>;
}

function EditorHeader({ onSave, onAction, onDebug, onRun, onVersions, running }) {
  return <header className="editor-header"><Brand /><div className="breadcrumb"><span>工作流中心</span><b>/</b><strong>图纸规范化助手</strong></div><div className="editor-actions"><button onClick={onVersions}><ClockCounterClockwise size={17} />版本</button><button onClick={onSave}><FloppyDisk size={17} />保存</button><button onClick={onDebug}><Code size={17} />调试</button><button onClick={() => onAction("工作流已发布为 v1.3")}><RocketLaunch size={17} />发布<CaretDown size={13} /></button><button className="run-button" onClick={onRun} disabled={running}>{running ? <><span className="spinner small" />运行中</> : <><Play size={16} weight="fill" />运行</>}</button></div></header>;
}

function VersionHistory({ versions, onClose }) {
  return <div className="modal-backdrop version-backdrop" onMouseDown={(event) => event.target === event.currentTarget && onClose()}><aside className="version-drawer" role="dialog" aria-modal="true" aria-label="工作流版本历史"><div className="drawer-head"><div><span className="eyebrow">图纸规范化助手</span><h2>版本历史</h2><p>每次保存都会创建可恢复的工作流快照。</p></div><button className="icon-button" onClick={onClose}><X size={19} /></button></div><div className="drawer-timeline">{versions.map((version, index) => <div className="workflow-version" key={version.id}><span className="timeline-dot"><Check size={12} weight="bold" /></span>{index < versions.length - 1 && <i /> }<div className="workflow-version-main"><div><b>{version.label}</b>{index === 0 && <span>当前版本</span>}</div><p>{version.note}</p><small>{version.updated} · {version.nodes} 个节点 · {version.editor}</small></div><button className="secondary" onClick={() => onClose()}>查看</button></div>)}</div><footer><Info size={16} />仅展示当前浏览器会话内的工作流保存记录。</footer></aside></div>;
}

function ReviewPanel({ onCompare, onConfirm, onClose, success }) {
  if (success) return <div className="review-panel success-panel"><div className="success-icon"><Check size={26} weight="bold" /></div><div><h3>12 项修改已安全执行</h3><p>已保留原图，并创建新版本 <b>v1.1</b>。你可以在历史记录中查看或回滚。</p></div><div className="success-actions"><button className="secondary">查看执行记录</button><button className="primary">返回画布</button></div></div>;
  return <section className="review-panel"><div className="review-head"><div className="review-title"><ClockCounterClockwise size={22} /><h3>执行确认</h3><span>等待您的确认</span></div><div className="risk">风险等级：<b>低风险</b></div><button className="icon-button" onClick={onClose}><X size={16} /></button></div><p className="review-note">AI 将基于修改方案对图纸执行写入操作，请在确认前查看预览结果。</p>
    <div className="review-content"><button className="preview-card" onClick={onCompare}><span>修改前（当前图纸）</span><div className="preview-image"><img src={beforeImage} alt="修改前 CAD 图纸" /><i><ArrowsOut size={17} />点击放大</i></div></button><div className="preview-arrow">→</div><button className="preview-card" onClick={onCompare}><span>修改后（预览结果）</span><div className="preview-image"><img src={afterImage} alt="修改后 CAD 图纸" /><i><ArrowsOut size={17} />点击放大</i></div></button>
      <div className="change-summary"><h4>发现 <b>12</b> 项可修改内容</h4><dl><div><dt>图层</dt><dd>5 项</dd></div><div><dt>标注</dt><dd>4 项</dd></div><div><dt>尺寸</dt><dd>2 项</dd></div><div><dt>文字</dt><dd>1 项</dd></div></dl></div>
      <div className="review-warning"><h4>重要提示</h4><p>• 确认后自动应用修改并更新图纸。</p><p>• 原图不会被覆盖，将自动创建新版本。</p></div></div>
    <div className="review-footer"><div className="legend"><span><i className="green" />新增</span><span><i className="amber" />修改</span><span><i className="blue" />移动</span><span><i className="red" />删除</span></div><div><button className="secondary" onClick={onCompare}>查看差异</button><button className="primary" onClick={onConfirm}>确认执行</button></div></div></section>;
}

function DebugPanel({ running, onClose, onReview }) {
  const steps = running ? [
    ["编译工作流", "正在校验节点连接与变量引用", "running"],
    ["读取图纸", "已加载办公楼二层平面图.dwg", "done"],
    ["检索企业规范", "等待上游节点输出", "waiting"],
  ] : [
    ["编译工作流", "5 个节点、4 条连接，校验通过", "done"],
    ["节点级调试", "可在右侧节点属性的「日志」查看输入输出", "done"],
    ["运行准备", "图纸写入将在人工确认后执行", "waiting"],
  ];
  return <section className="debug-panel"><div className="debug-head"><div><Code size={19} /><div><h3>{running ? "编译与运行调试" : "工作流调试"}</h3><p>{running ? "正在实时输出流程执行日志" : "已完成编译检查，可查看各节点的调试记录"}</p></div></div><div><span className={running ? "debug-status running" : "debug-status"}>{running ? "运行中" : "编译通过"}</span><button className="icon-button" onClick={onClose}><X size={16} /></button></div></div><div className="debug-content"><div className="debug-steps">{steps.map(([title, detail, state]) => <div className={`debug-step ${state}`} key={title}><span>{state === "done" ? <Check size={13} weight="bold" /> : state === "running" ? <i className="spinner small" /> : <ClockCounterClockwise size={13} />}</span><div><b>{title}</b><p>{detail}</p></div><time>{state === "done" ? "09:42:08" : "等待中"}</time></div>)}</div></div><footer><span><Info size={15} />拖动上方分隔线可调整画布与此面板的高度。</span><div>{!running && <button className="execution-entry" onClick={onReview}><WarningCircle size={16} weight="fill" />进入执行确认 <b>12 项修改</b></button>}<button className="secondary">导出调试日志</button></div></footer></section>;
}

function CompareModal({ onClose, onConfirm }) {
  const [scale, setScale] = useState(1.25);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [drag, setDrag] = useState(null);
  const [highlight, setHighlight] = useState(true);
  const [activeChange, setActiveChange] = useState(changes[0]);
  const closeRef = useRef(onClose);
  closeRef.current = onClose;
  useEffect(() => { const key = (e) => e.key === "Escape" && closeRef.current(); window.addEventListener("keydown", key); return () => window.removeEventListener("keydown", key); }, []);
  const startDrag = (e) => { e.currentTarget.setPointerCapture(e.pointerId); setDrag({ x: e.clientX - offset.x, y: e.clientY - offset.y }); };
  const moveDrag = (e) => drag && setOffset({ x: e.clientX - drag.x, y: e.clientY - drag.y });
  const reset = () => { setScale(1.25); setOffset({ x: 0, y: 0 }); };
  return <div className="modal-backdrop" onMouseDown={(e) => e.target === e.currentTarget && onClose()}><div className="compare-modal" role="dialog" aria-modal="true" aria-label="CAD 修改对比">
    <div className="compare-header"><div><span className="soft-tag"><WarningCircle size={14} weight="fill" />修改预览</span><h2>确认图纸差异</h2><p>确认前不会写入原图，执行后自动创建新版本。</p></div><div className="compare-tools"><button onClick={() => setScale((s) => Math.max(.65, s - .15))}><Minus size={17} /></button><span>{Math.round(scale * 100)}%</span><button onClick={() => setScale((s) => Math.min(2.5, s + .15))}><Plus size={17} /></button><button onClick={reset}><ArrowCounterClockwise size={17} />重置</button><label className="switch-label">差异高亮<input type="checkbox" checked={highlight} onChange={(e) => setHighlight(e.target.checked)} /><i /></label><button className="close-large" onClick={onClose}><X size={20} /></button></div></div>
    <div className="compare-body"><div className="compare-canvases" onPointerDown={startDrag} onPointerMove={moveDrag} onPointerUp={() => setDrag(null)} onPointerCancel={() => setDrag(null)}>
      <ComparePane title="修改前（当前图纸）" image={beforeImage} scale={scale} offset={offset} />
      <ComparePane title="修改后（建议结果）" image={highlight ? afterImage : beforeImage} scale={scale} offset={offset} after />
    </div><aside className="change-list"><div className="change-list-head"><div><h3>12 项修改</h3><p>企业制图规范库 v3.2</p></div><span className="low-risk"><CheckCircle size={14} weight="fill" />低风险</span></div>{changes.map((c) => <button key={c.id} className={activeChange.id === c.id ? "active" : ""} onClick={() => setActiveChange(c)}><span className={`change-number ${c.color}`}>{c.id}</span><div><b>{c.group} · {c.title}</b><small>{c.detail} · {c.count} 处对象</small></div><CaretDown size={14} /></button>)}<div className="rule-source"><b>规则来源</b><p>企业制图规范库 v3.2 › {activeChange.group}规范 › 2.1.3</p><button className="secondary">查看依据条文</button></div></aside></div>
    <div className="compare-footer"><span><Info size={16} weight="fill" />拖动画布或使用缩放按钮，两侧视图会保持同步。</span><button className="primary" onClick={onConfirm}>完成审阅</button></div>
  </div></div>;
}

function ComparePane({ title, image, scale, offset, after }) {
  return <section className="compare-pane"><div className="pane-label"><span>{title}</span>{after && <b>预览结果</b>}</div><div className="compare-image-stage"><img draggable="false" src={image} alt={title} style={{ transform: `translate(${offset.x}px, ${offset.y}px) scale(${scale})` }} /></div></section>;
}

function ConfirmDialog({ onCancel, onConfirm, executing }) {
  return <div className="modal-backdrop"><div className="confirm-dialog"><div className={`confirm-mark ${executing ? "executing" : ""}`}>{executing ? <span className="spinner" /> : <WarningCircle size={28} weight="fill" />}</div><h2>{executing ? "正在安全执行修改" : "确认执行 12 项修改？"}</h2><p>{executing ? "正在写入新版本，请勿关闭页面…" : "原图不会被覆盖。系统将在执行完成后自动创建 v1.1 新版本，并保留完整修改记录。"}</p>{executing && <div className="execution-progress"><span /></div>}<div className="dialog-actions">{!executing && <><button className="secondary" onClick={onCancel}>返回检查</button><button className="primary" onClick={onConfirm}><Check size={16} />确认并执行</button></>}</div></div></div>;
}

function EditorPage() {
  const { id } = useParams();
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);
  const [selectedId, setSelectedId] = useState("proposal");
  const [bottomOpen, setBottomOpen] = useState(false);
  const [bottomHeight, setBottomHeight] = useState(350);
  const [resizingBottom, setResizingBottom] = useState(false);
  const [compareOpen, setCompareOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [executing, setExecuting] = useState(false);
  const [executed, setExecuted] = useState(false);
  const [running, setRunning] = useState(false);
  const [toast, setToast] = useState("");
  const [versionsOpen, setVersionsOpen] = useState(false);
  const [viewMenuOpen, setViewMenuOpen] = useState(false);
  const [newNodeMenuOpen, setNewNodeMenuOpen] = useState(false);
  const [workflowVersions, setWorkflowVersions] = useState([
    { id: "wf-v1-3", label: "v1.3", note: "发布前保存", updated: "今天 09:42", nodes: 5, editor: "张工" },
    { id: "wf-v1-2", label: "v1.2", note: "补充安全确认节点", updated: "昨天 17:20", nodes: 5, editor: "张工" },
    { id: "wf-v1-1", label: "v1.1", note: "初始规范化流程", updated: "07月16日 14:08", nodes: 4, editor: "王工" },
  ]);
  const wrapperRef = useRef(null);
  const workspaceRef = useRef(null);
  const flowApiRef = useRef(null);
  const selectedNode = nodes.find((n) => n.id === selectedId);
  useEffect(() => {
    if (!resizingBottom) return undefined;
    const resize = (event) => {
      const rect = workspaceRef.current?.getBoundingClientRect();
      if (!rect) return;
      setBottomHeight(Math.min(510, Math.max(210, rect.bottom - event.clientY)));
    };
    const stop = () => setResizingBottom(false);
    window.addEventListener("pointermove", resize);
    window.addEventListener("pointerup", stop);
    return () => { window.removeEventListener("pointermove", resize); window.removeEventListener("pointerup", stop); };
  }, [resizingBottom]);
  const onConnect = useCallback((params) => setEdges((eds) => addEdge({ ...params, style: { stroke: "#53a3ff", strokeWidth: 2 } }, eds)), [setEdges]);
  const onDragStart = (event, item) => { event.dataTransfer.setData("application/blueprint-node", JSON.stringify(item)); event.dataTransfer.effectAllowed = "move"; };
  const onDrop = useCallback((event) => {
    event.preventDefault();
    const raw = event.dataTransfer.getData("application/blueprint-node");
    if (!raw) return;
    const item = JSON.parse(raw);
    const rect = wrapperRef.current.getBoundingClientRect();
    const id = `node-${Date.now()}`;
    setNodes((nds) => [...nds, createWorkflowNode(item, { x: event.clientX - rect.left - 90, y: event.clientY - rect.top - 60 }, id)]);
    setSelectedId(id);
  }, [setNodes]);
  const addNode = (item) => {
    const id = `node-${Date.now()}`;
    const index = nodes.length;
    setNodes((items) => [...items, createWorkflowNode(item, { x: 130 + (index % 3) * 200, y: 330 + Math.floor(index / 3) * 150 }, id)]);
    setSelectedId(id);
    setNewNodeMenuOpen(false);
    setToast(`已新增「${item.name}」节点`);
  };
  const updateSelected = (key, value) => setNodes((nds) => nds.map((n) => n.id === selectedId ? { ...n, data: { ...n.data, [key]: value } } : n));
  const deleteSelected = () => { setNodes((nds) => nds.filter((n) => n.id !== selectedId)); setEdges((eds) => eds.filter((e) => e.source !== selectedId && e.target !== selectedId)); setSelectedId(null); };
  const runWorkflow = () => {
    if (running) return;
    setRunning(true); setExecuted(false); setBottomOpen(true);
    const ids = ["read", "rag", "inspect", "proposal", "confirm"];
    ids.forEach((nodeId, index) => setTimeout(() => setNodes((nds) => nds.map((n) => n.id === nodeId ? { ...n, data: { ...n.data, status: index === ids.length - 1 ? "idle" : "success", running: index === ids.length - 1 } } : n)), index * 520));
    setTimeout(() => { setNodes((nds) => nds.map((n) => ({ ...n, data: { ...n.data, running: false, status: n.id === "proposal" ? "warning" : n.id === "confirm" ? "idle" : "success" } }))); setRunning(false); setCompareOpen(true); setToast("分析完成，已生成 12 项安全修改建议，请确认图纸差异"); }, 2900);
  };
  const executeChanges = () => { setExecuting(true); setTimeout(() => { setExecuting(false); setConfirmOpen(false); setExecuted(true); setToast("执行完成，已创建新版本 v1.1"); }, 1800); };
  const saveWorkflow = () => {
    setWorkflowVersions((items) => [{ id: `wf-v-${Date.now()}`, label: `v1.${items.length + 1}`, note: "手动保存工作流", updated: "刚刚", nodes: nodes.length, editor: "张工" }, ...items]);
    setToast("工作流已保存，并创建新版本快照");
  };
  const openDebug = () => { setBottomOpen(true); setToast("已展开工作流编译与调试模块"); };
  const editorHeader = <EditorHeader onSave={saveWorkflow} onAction={setToast} onDebug={openDebug} onRun={runWorkflow} onVersions={() => setVersionsOpen(true)} running={running} />;
  return <AppShell editor editorHeader={editorHeader}><div className="editor-page"><div className="editor-grid"><NodePalette onDragStart={onDragStart} /><div className="workspace-center" ref={workspaceRef}><div className="flow-area" ref={wrapperRef} onDrop={onDrop} onDragOver={(e) => { e.preventDefault(); e.dataTransfer.dropEffect = "move"; }}><div className="canvas-status"><span>图纸规范化流程</span><i />自动保存成功</div><div className="canvas-toolbar"><div className="canvas-tool-wrap"><button className="canvas-tool" onClick={() => { setViewMenuOpen((open) => !open); setNewNodeMenuOpen(false); }} aria-label="画布缩放"><MagnifyingGlass size={17} /></button>{viewMenuOpen && <div className="canvas-popover zoom-popover"><button onClick={() => flowApiRef.current?.zoomIn()}>放大画布 <Plus size={14} /></button><button onClick={() => flowApiRef.current?.zoomOut()}>缩小画布 <Minus size={14} /></button><button onClick={() => flowApiRef.current?.fitView({ padding: .12 })}>适配画布 <ArrowsOut size={14} /></button></div>}</div><div className="canvas-tool-wrap"><button className="canvas-add-node" onClick={() => { setNewNodeMenuOpen((open) => !open); setViewMenuOpen(false); }}><Plus size={16} />新增节点</button>{newNodeMenuOpen && <div className="canvas-popover add-node-popover">{nodeCatalog.map((group) => <div key={group.group}><b>{group.group}</b>{group.items.map(([type, name, desc]) => <button key={type} onClick={() => addNode({ type, name, desc, color: group.color })}><span style={{ background: group.color }}><Cube size={12} weight="fill" /></span><div><strong>{name}</strong><small>{desc}</small></div></button>)}</div>)}</div>}</div></div><ReactFlow nodes={nodes} edges={edges} onNodesChange={onNodesChange} onEdgesChange={onEdgesChange} onConnect={onConnect} onNodeClick={(_, n) => setSelectedId(n.id)} onInit={(instance) => { flowApiRef.current = instance; }} nodeTypes={workflowNodeTypes} fitView fitViewOptions={{ padding: .055 }} minZoom={.5} maxZoom={1.5} deleteKeyCode={["Backspace", "Delete"]} proOptions={{ hideAttribution: true }}><Background color="#3d4651" gap={18} size={1} /><MiniMap position="bottom-right" style={{ width: 116, height: 78 }} pannable={false} zoomable={false} nodeColor={(n) => n.data.color} maskColor="rgba(18,24,31,.72)" /></ReactFlow>{running && <div className="run-log"><span className="spinner small" /><div><b>正在运行工作流</b><small>AI 正在依据企业规范分析图纸对象…</small></div></div>}</div>{bottomOpen && <div className="bottom-panel" style={{ flexBasis: bottomHeight }}><div className={`resize-handle ${resizingBottom ? "active" : ""}`} onPointerDown={(event) => { event.preventDefault(); setResizingBottom(true); }}><span /></div><DebugPanel running={running} onClose={() => setBottomOpen(false)} onReview={() => setCompareOpen(true)} /></div>}</div><Inspector node={selectedNode} onChange={updateSelected} onDelete={deleteSelected} running={running} /></div>{versionsOpen && <VersionHistory versions={workflowVersions} onClose={() => setVersionsOpen(false)} />}{compareOpen && <CompareModal onClose={() => setCompareOpen(false)} onConfirm={() => { setCompareOpen(false); setConfirmOpen(true); }} />}{confirmOpen && <ConfirmDialog executing={executing} onCancel={() => setConfirmOpen(false)} onConfirm={executeChanges} />}{toast && <Toast message={toast} onClose={() => setToast("")} />}</div></AppShell>;
}

function createWorkflowNode(item, position, id) {
  return { id, type: "workflow", position, data: { kind: item.type, title: item.name, subtitle: item.desc, color: item.color, rows: [["输入", "待配置"], ["输出", "output"]], status: "idle" } };
}

export function App() {
  return <BrowserRouter><Routes>
    <Route path="/" element={<DashboardPage />} />
    <Route path="/workflows" element={<WorkflowsPage />} />
    <Route path="/workflows/:id/editor" element={<EditorPage />} />
    <Route path="/knowledge" element={<KnowledgePage />} />
    <Route path="/cloud" element={<CloudPage />} />
    <Route path="/templates" element={<TemplatesPage />} />
    <Route path="/settings" element={<SettingsPage />} />
  </Routes></BrowserRouter>;
}
