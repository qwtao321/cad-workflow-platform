import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { BrowserRouter, NavLink, Route, Routes, useLocation, useNavigate, useParams } from "react-router-dom";
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
  CaretRight,
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
  FileText,
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
import { changes, documents, industryTemplates, initialDrawings, initialEdges, initialNodes, nodeCatalog, workflowSkills, workflows } from "./data";
import { industryAiArticleMeta, industryAiCategories, industryAiHighlights, industryAiPlaybook, industryAiProducts, industryAiSourceUrl, industryAiStages } from "./industryAiData";
import { platformApi } from "./api";
import { requirementCatalog, requirementsForPage } from "./requirements";
import prdMarkdown from "./prototypes/cad-workflow-1.0/prd.md?raw";

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

const pluginNavItems = [
  ["/", "工作台", House],
  ["/cad", "本地 CAD", Cube],
  ["/copilot", "CAD Copilot", Sparkle],
  ["/cloud", "云空间", FolderOpen],
];

const webNavItems = [
  ["/web", "工作台", House],
  ["/web/nodes", "节点中心", Cube],
  ["/web/knowledge", "知识库", BookOpen],
  ["/web/workflows", "工作流中心", GridFour],
  ["/web/cloud", "云空间", FolderOpen],
  ["/web/admin", "管理后台", Gear],
];

const v1NavItems = [
  ["/", "工作台", House],
  ["/web/admin", "管理后台", Gear],
  ["/cad", "CAD", Cube],
];

function useProductScope() {
  const [scope, setScope] = useState(() => {
    try { return localStorage.getItem("cad-workflow-product-scope") || "1.0"; } catch { return "1.0"; }
  });
  useEffect(() => {
    const syncScope = (event) => setScope(event.detail || "all");
    window.addEventListener("cad-workflow-scope-change", syncScope);
    return () => window.removeEventListener("cad-workflow-scope-change", syncScope);
  }, []);
  const selectScope = (next) => {
    setScope(next);
    try { localStorage.setItem("cad-workflow-product-scope", next); } catch { /* browser storage may be unavailable */ }
    window.dispatchEvent(new CustomEvent("cad-workflow-scope-change", { detail: next }));
  };
  return [scope, selectScope];
}

function useExecutionMode() {
  const [mode, setMode] = useState(() => {
    try { return localStorage.getItem("cad-workflow-execution-mode") || "copilot"; } catch { return "copilot"; }
  });
  useEffect(() => {
    const syncMode = (event) => setMode(event.detail || "copilot");
    window.addEventListener("cad-workflow-execution-mode-change", syncMode);
    return () => window.removeEventListener("cad-workflow-execution-mode-change", syncMode);
  }, []);
  const selectMode = (next) => {
    setMode(next);
    try { localStorage.setItem("cad-workflow-execution-mode", next); } catch { /* browser storage may be unavailable */ }
    window.dispatchEvent(new CustomEvent("cad-workflow-execution-mode-change", { detail: next }));
  };
  return [mode, selectMode];
}

const RequirementReviewContext = createContext(null);

function RequirementMarker({ id, className = "" }) {
  const review = useContext(RequirementReviewContext);
  const item = requirementCatalog[id];
  if (!review?.enabled || !item) return null;
  return <button
    type="button"
    className={`requirement-marker ${review.activeId === id ? "active" : ""} ${className}`}
    onClick={(event) => { event.stopPropagation(); review.open(id); }}
    title={`查看需求：${item.title}`}
  ><b>{item.number}</b><span>{item.short}</span></button>;
}

function RequirementDrawer({ items, activeId, onSelect, onClose, onViewAll }) {
  const active = requirementCatalog[activeId] || items[0];
  if (!active) return null;
  return <aside className="requirement-drawer" aria-label="当前原型需求说明">
    <header>
      <div><span>原型需求标注</span><b>{active.section}</b></div>
      <button className="icon-button" onClick={onClose} aria-label="收起需求面板"><X size={17} /></button>
    </header>
    <nav aria-label="当前页面需求模块">
      {items.map((item) => <button key={item.id} className={item.id === activeId ? "active" : ""} onClick={() => onSelect(item.id)}><b>{item.number}</b>{item.short}</button>)}
    </nav>
    <div className="requirement-drawer-body">
      <div className="requirement-title"><span>{active.number}</span><div><small>{active.section}</small><h2>{active.title}</h2></div></div>
      <p className="requirement-summary">{active.summary}</p>
      <section>
        <h3>用户路径</h3>
        <ol className="requirement-path">{active.path.map((step, index) => <li key={step}><span>{index + 1}</span><b>{step}</b></li>)}</ol>
      </section>
      <section>
        <h3>核心需求</h3>
        <ul>{active.requirements.map((item) => <li key={item}>{item}</li>)}</ul>
      </section>
      {active.states && <section><h3>覆盖状态</h3><div className="requirement-states">{active.states.map((state) => <span key={state}>{state}</span>)}</div></section>}
      {active.detail && <section className="requirement-detail"><h3>界面与按钮说明</h3><div className="requirement-detail-block"><b>展示内容</b><ul>{active.detail.display.map((item) => <li key={item}>{item}</li>)}</ul></div><div className="requirement-detail-block"><b>按钮行为</b><ul>{active.detail.actions.map((item) => <li key={item}>{item}</li>)}</ul></div><div className="requirement-detail-block"><b>内容逻辑</b><ul>{active.detail.logic.map((item) => <li key={item}>{item}</li>)}</ul></div></section>}
      <section className="requirement-acceptance">
        <h3>验收关注</h3>
        {active.acceptance.map((item) => <p key={item}><CheckCircle size={14} weight="fill" />{item}</p>)}
      </section>
    </div>
    <footer><BookOpen size={14} /><span>完整内容见 1.0 PRD，对应章节 {active.section.replace("PRD ", "")}</span><button className="requirement-view-all" onClick={() => onViewAll(activeId)}>查看全部 <CaretRight size={13} /></button></footer>
  </aside>;
}

const prdAnchorMap = {
  "execution-modes": "prd-section-3-3",
  "workbench-my": "prd-section-9-2",
  "workbench-templates": "prd-section-9-3",
  "workbench-runs": "prd-section-9-4",
  "cad-entry": "prd-section-8",
  "login": "prd-section-8-3",
  "standalone-run": "prd-section-6",
  "copilot-run": "prd-section-7-3",
  "workflow-run": "prd-section-5-2",
  "changeset": "prd-section-5-7",
  "copilot-modes": "prd-section-7-5",
  "editor-overview": "prd-section-9-5-1",
  "editor-palette": "prd-section-9-5-2",
  "editor-canvas": "prd-section-9-5-3",
  "editor-inspector": "prd-section-9-5-4",
  "editor-debug": "prd-section-9-5-6",
  "editor-version": "prd-section-9-5-7",
  admin: "prd-section-10",
};

const prdOutline = [
  ["prd-section-0", "文档说明"],
  ["prd-section-1", "产品背景与目标"],
  ["prd-section-2", "用户角色与核心场景"],
  ["prd-section-3", "信息架构与范围"],
  ["prd-section-4", "用户核心使用路径"],
  ["prd-section-5", "共用执行底座"],
  ["prd-section-6", "独立面板模式"],
  ["prd-section-7", "Copilot 对话模式"],
  ["prd-section-8", "本地 CAD 与登录"],
  ["prd-section-9", "工作台与 Workflow 编辑器"],
  ["prd-section-10", "管理后台"],
  ["prd-section-11", "数据模型与技术契约"],
  ["prd-section-12", "状态与错误处理"],
  ["prd-section-13", "埋点与度量"],
  ["prd-section-14", "非功能需求"],
  ["prd-section-15", "验收用例"],
  ["prd-section-16", "原型一致性与研发补齐"],
  ["prd-section-17", "发布建议"],
  ["prd-section-18", "评审待确认事项"],
];

function markdownHeadingId(text) {
  const match = text.match(/^(\d+(?:\.\d+)*)(?=\.\s|\s|$)/);
  if (!match) return text.startsWith("CAD WorkFlow") ? "prd-title" : undefined;
  return `prd-section-${match[1].replaceAll(".", "-")}`;
}

function readStoredPrdHtml() {
  try {
    const stored = localStorage.getItem("cad-workflow-prd-document-html") || "";
    // 旧版本曾保存过不完整的文档，继续直接读取会导致后续章节出现大片空白。
    // 当前 PRD 至少应包含最后的评审待确认章节。
    return stored.includes('id="prd-section-18"') ? stored : "";
  } catch {
    return "";
  }
}

function PrdMarkdown() {
  const lines = prdMarkdown.split(/\r?\n/);
  const blocks = [];
  let index = 0;
  while (index < lines.length) {
    const line = lines[index];
    if (!line.trim() || line.trim() === "---") { index += 1; continue; }
    if (line.startsWith("```") ) {
      const language = line.slice(3).trim();
      const code = [];
      index += 1;
      while (index < lines.length && !lines[index].startsWith("```")) { code.push(lines[index]); index += 1; }
      index += 1;
      blocks.push(<pre className={`prd-code ${language}`} key={`code-${index}`}><code>{code.join("\n")}</code></pre>);
      continue;
    }
    const heading = line.match(/^(#{1,4})\s+(.+)$/);
    if (heading) {
      const level = heading[1].length;
      const text = heading[2].replace(/\s+#+$/, "");
      const id = markdownHeadingId(text);
      const Heading = level === 1 ? "h1" : level === 2 ? "h2" : level === 3 ? "h3" : "h4";
      blocks.push(<Heading id={id} key={`heading-${index}`}>{text}</Heading>);
      index += 1;
      continue;
    }
    if (line.trim().startsWith("|")) {
      const rows = [];
      while (index < lines.length && lines[index].trim().startsWith("|")) {
        const row = lines[index].trim().slice(1, -1).split("|").map((cell) => cell.trim());
        if (!row.every((cell) => /^:?-{2,}:?$/.test(cell))) rows.push(row);
        index += 1;
      }
      blocks.push(<table className="prd-table" key={`table-${index}`}><thead><tr>{rows[0]?.map((cell) => <th key={cell}>{cell}</th>)}</tr></thead><tbody>{rows.slice(1).map((row, rowIndex) => <tr key={rowIndex}>{row.map((cell, cellIndex) => <td key={`${rowIndex}-${cellIndex}`}>{cell}</td>)}</tr>)}</tbody></table>);
      continue;
    }
    if (/^\s*(?:[-*]|\d+\.)\s+/.test(line)) {
      const ordered = /^\s*\d+\./.test(line);
      const items = [];
      while (index < lines.length && /^\s*(?:[-*]|\d+\.)\s+/.test(lines[index])) { items.push(lines[index].replace(/^\s*(?:[-*]|\d+\.)\s+/, "")); index += 1; }
      const List = ordered ? "ol" : "ul";
      blocks.push(<List className="prd-list" key={`list-${index}`}>{items.map((item, itemIndex) => <li key={itemIndex}>{item}</li>)}</List>);
      continue;
    }
    if (line.startsWith(">")) { blocks.push(<blockquote key={`quote-${index}`}>{line.replace(/^>\s?/, "")}</blockquote>); index += 1; continue; }
    const paragraph = [line.trim()];
    index += 1;
    while (index < lines.length && lines[index].trim() && !/^(#{1,4})\s+/.test(lines[index]) && !lines[index].trim().startsWith("|") && !lines[index].startsWith("```") && !/^\s*(?:[-*]|\d+\.)\s+/.test(lines[index])) { paragraph.push(lines[index].trim()); index += 1; }
    blocks.push(<p className="prd-paragraph" key={`paragraph-${index}`}>{paragraph.join(" ")}</p>);
  }
  return <>{blocks}</>;
}

function RequirementDocumentPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const params = new URLSearchParams(location.search);
  const moduleId = params.get("module");
  const focusAnchor = prdAnchorMap[moduleId] || (location.hash ? location.hash.slice(1) : "");
  const [activeAnchor, setActiveAnchor] = useState(focusAnchor || "prd-section-0");
  const [editing, setEditing] = useState(false);
  const [documentHtml, setDocumentHtml] = useState(readStoredPrdHtml);
  const [documentRevision, setDocumentRevision] = useState(0);
  const documentEditorRef = useRef(null);
  useEffect(() => {
    if (documentHtml && !documentHtml.includes('id="prd-section-18"')) {
      setDocumentHtml("");
      setDocumentRevision((revision) => revision + 1);
    }
  }, [documentHtml]);
  useEffect(() => {
    if (!focusAnchor) return;
    setActiveAnchor(focusAnchor);
    const timer = window.setTimeout(() => document.getElementById(focusAnchor)?.scrollIntoView({ behavior: "smooth", block: "start" }), 80);
    return () => window.clearTimeout(timer);
  }, [focusAnchor]);
  const scrollToPrdAnchor = (event, anchor) => {
    event.preventDefault();
    setActiveAnchor(anchor);
    document.getElementById(anchor)?.scrollIntoView({ behavior: "smooth", block: "start" });
    window.history.replaceState({}, "", `${location.pathname}${location.search}#${anchor}`);
  };
  const startEditing = () => setEditing(true);
  const cancelEditing = () => { setEditing(false); setDocumentRevision((revision) => revision + 1); };
  const saveDocument = () => {
    const html = documentEditorRef.current?.innerHTML || "";
    try { localStorage.setItem("cad-workflow-prd-document-html", html); } catch { /* local storage may be unavailable */ }
    setDocumentHtml(html);
    setEditing(false);
    setDocumentRevision((revision) => revision + 1);
  };
  const restoreOriginalDocument = () => {
    if (!window.confirm("确定恢复原始需求文档吗？当前本地修改将被清除。")) return;
    try { localStorage.removeItem("cad-workflow-prd-document-html"); } catch { /* local storage may be unavailable */ }
    setDocumentHtml("");
    setEditing(false);
    setDocumentRevision((revision) => revision + 1);
  };
  const returnPath = moduleId === "admin" ? "/web/admin" : moduleId?.startsWith("editor-") ? "/workflows/drawing-standardizer/editor" : moduleId === "cad-entry" || moduleId === "login" ? "/cad" : moduleId === "copilot-run" || moduleId === "workflow-run" || moduleId === "changeset" || moduleId === "copilot-modes" || moduleId === "standalone-run" ? "/copilot" : "/";
  return <AppShell><div className="page-content prd-page">
    <div className="page-header prd-page-header"><div><div className="eyebrow">1.0 · 产品需求</div><h1>CAD WorkFlow平台 1.0 需求文档</h1><p>完整展示页面、按钮、内容逻辑、状态、技术契约和验收要求。当前文档版本 V1.0 · 评审稿<span className="prd-local-save-note">{documentHtml ? "已保存到当前浏览器" : "保存范围：当前浏览器"}</span></p></div><div className="page-actions">{editing ? <><button className="secondary" onClick={cancelEditing}>取消编辑</button><button className="secondary" onClick={restoreOriginalDocument}>恢复原始</button><button className="primary" onClick={saveDocument}><FileText size={15} />保存文档</button></> : <><button className="secondary" onClick={() => navigate(returnPath)}><CaretRight size={15} weight="bold" />返回原型</button><button className="secondary" onClick={startEditing}><FileText size={15} />编辑文档</button><button className="primary" onClick={() => window.print()}><FileText size={15} />打印 / 导出</button></>}</div></div>
    {moduleId && <div className="prd-focus-banner"><span><BookOpen size={15} />正在查看原型模块</span><b>{requirementCatalog[moduleId]?.number} · {requirementCatalog[moduleId]?.title}</b><small>页面已定位到对应 PRD 章节</small></div>}
    <div className="prd-layout"><aside className="prd-outline"><div className="prd-outline-head"><b>文档目录</b><small>按产品需求顺序 · 点击可定位</small></div>{prdOutline.map(([anchor, label]) => <button type="button" className={activeAnchor === anchor ? "active" : ""} onClick={(event) => scrollToPrdAnchor(event, anchor)} key={anchor}>{label}</button>)}<div className="prd-outline-foot"><span>覆盖范围</span><b>1.0 全量功能规格</b><small>包含两种执行模式、CAD 交互、编辑器与管理后台</small></div></aside><article className={`prd-document ${editing ? "is-editing" : ""}`}><div className="prd-document-head"><span className="status published">{editing ? "编辑中" : "评审稿"}</span><span>更新日期 2026-08-20</span><span>{documentHtml ? "已加载本地保存版本" : "原型基线：当前仓库实现"}</span>{editing && <small>可直接修改正文、标题、表格和列表内容</small>}</div><div key={documentRevision} ref={documentEditorRef} className="prd-editable-content" contentEditable={editing} suppressContentEditableWarning>{documentHtml ? <div dangerouslySetInnerHTML={{ __html: documentHtml }} /> : <PrdMarkdown />}</div></article></div>
  </div></AppShell>;
}

function RequirementDomMarkers({ pathname, mode }) {
  const review = useContext(RequirementReviewContext);
  const [markers, setMarkers] = useState([]);
  useEffect(() => {
    if (!review?.enabled) { setMarkers([]); return undefined; }
    const update = () => {
      const specs = [];
      if (pathname === "/") {
        const activeTab = document.querySelector(".workbench-workflows .tabs button.active")?.textContent;
        specs.push({ id: activeTab === "官方模板" ? "workbench-templates" : activeTab === "运行记录" ? "workbench-runs" : "workbench-my", selector: ".workbench-workflows", dx: -12, dy: 12 });
      }
      if (pathname === "/cad") {
        specs.push({ id: "cad-entry", selector: ".cad-local-ai-button", dx: 18, dy: -10 });
        if (document.querySelector(".login-modal")) specs.push({ id: "login", selector: ".login-modal", dx: -12, dy: 14 });
      }
      if (pathname === "/copilot") {
        if (mode === "standalone") specs.push({ id: "standalone-run", selector: ".workflow-run-panel:not(.workflow-run-inline)", dx: -12, dy: 10 });
        if (mode === "copilot") {
          specs.push({ id: "copilot-run", selector: ".copilot-chat", dx: -12, dy: 72 });
          specs.push({ id: "copilot-modes", selector: ".agent-mode-switch", dx: -12, dy: -7 });
        }
        specs.push({ id: "workflow-run", selector: mode === "copilot" ? ".workflow-run-inline" : ".workflow-run-panel:not(.workflow-run-inline)", dx: -12, dy: 58 });
        if (document.querySelector(".workflow-run-request.review")) specs.push({ id: "changeset", selector: ".workflow-run-request.review", dx: -10, dy: 8 });
      }
      if (pathname === "/web/admin") specs.push({ id: "admin", selector: ".admin-stack", dx: -12, dy: 10 });
      if (pathname.startsWith("/workflows/") && pathname.endsWith("/editor")) {
        specs.push({ id: "editor-overview", selector: ".editor-header", dx: -12, dy: 10 });
        specs.push({ id: "editor-palette", selector: ".node-palette", dx: -12, dy: 46 });
        specs.push({ id: "editor-canvas", selector: ".flow-area", dx: -12, dy: 16 });
        if (document.querySelector(".inspector")) specs.push({ id: "editor-inspector", selector: ".inspector", dx: -12, dy: 42 });
        if (document.querySelector(".bottom-panel")) specs.push({ id: "editor-debug", selector: ".bottom-panel", dx: -12, dy: 12 });
        specs.push({ id: "editor-version", selector: ".editor-actions", dx: -12, dy: 10 });
      }
      setMarkers(specs.map((spec) => {
        const target = document.querySelector(spec.selector);
        if (!target) return null;
        const rect = target.getBoundingClientRect();
        const maxLeft = review.activeId ? window.innerWidth - 510 : window.innerWidth - 150;
        return { ...spec, top: Math.max(8, rect.top + spec.dy), left: Math.max(8, Math.min(maxLeft, rect.right + spec.dx)) };
      }).filter(Boolean));
    };
    update();
    const timer = window.setInterval(update, 350);
    window.addEventListener("resize", update);
    window.addEventListener("scroll", update, true);
    return () => { window.clearInterval(timer); window.removeEventListener("resize", update); window.removeEventListener("scroll", update, true); };
  }, [pathname, mode, review?.enabled, review?.activeId]);
  if (!review?.enabled) return null;
  return <div className="requirement-dom-markers" aria-label="页面需求标记">{markers.map((marker) => {
    const item = requirementCatalog[marker.id];
    return <button key={marker.id} className={`requirement-marker requirement-marker-fixed ${review.activeId === marker.id ? "active" : ""}`} style={{ top: marker.top, left: marker.left }} onClick={() => review.open(marker.id)}><b>{item.number}</b><span>{item.short}</span></button>;
  })}</div>;
}

function ScopeSwitch({ scope, onChange }) {
  return <div className="scope-switch" aria-label="产品版本范围"><button className={scope === "1.0" ? "active" : ""} onClick={() => onChange("1.0")}>1.0</button><button className={scope === "all" ? "active" : ""} onClick={() => onChange("all")}>全部</button></div>;
}

function ExecutionModeTabs({ mode, onChange }) {
  const location = useLocation();
  return <div className="execution-mode-tabs" aria-label="1.0 工作流执行模式">
    <span className="execution-mode-label">执行交互模式</span>
    <button className={mode === "standalone" ? "active" : ""} onClick={() => onChange("standalone")}><b>独立面板模式</b><small>CAD 中直接交互</small></button>
    <button className={mode === "copilot" ? "active" : ""} onClick={() => onChange("copilot")}><b>Copilot 对话模式</b><small>在对话中调用工作流</small></button>
    {location.pathname === "/cad" && <RequirementMarker id="execution-modes" className="requirement-marker-mode" />}
  </div>;
}

function SurfaceSwitch({ compact = false }) {
  const location = useLocation();
  const navigate = useNavigate();
  const web = location.pathname.startsWith("/web");
  return <div className={`surface-switch ${compact ? "compact" : ""}`} aria-label="平台端侧切换"><button className={!web ? "active" : ""} onClick={() => navigate("/")}>插件端</button><button className={web ? "active" : ""} onClick={() => navigate("/web")}>Web端</button></div>;
}

function AppShell({ children, editor = false, editorHeader = null }) {
  const location = useLocation();
  const navigate = useNavigate();
  const [scope, setScope] = useProductScope();
  const [executionMode, setExecutionMode] = useExecutionMode();
  const onePointOh = scope === "1.0";
  const requestedExecutionMode = new URLSearchParams(location.search).get("mode");
  const shellExecutionMode = requestedExecutionMode === "standalone" || requestedExecutionMode === "copilot" ? requestedExecutionMode : executionMode;
  const navItems = onePointOh ? v1NavItems : (location.pathname.startsWith("/web") ? webNavItems : pluginNavItems);
  const [requirementsVisible, setRequirementsVisible] = useState(() => {
    try { return localStorage.getItem("cad-workflow-requirements-visible") === "true"; } catch { return false; }
  });
  const pageRequirements = requirementsForPage(location.pathname, shellExecutionMode);
  const preferredRequirement = location.pathname === "/copilot"
    ? (shellExecutionMode === "standalone" ? "standalone-run" : "copilot-run")
    : location.pathname === "/cad" ? "cad-entry"
      : location.pathname === "/web/admin" ? "admin"
        : location.pathname === "/" ? "workbench-my"
          : pageRequirements[0]?.id;
  const [activeRequirementId, setActiveRequirementId] = useState(preferredRequirement || "");
  useEffect(() => {
    if (!requirementsVisible) return;
    if (activeRequirementId && !pageRequirements.some((item) => item.id === activeRequirementId)) setActiveRequirementId(preferredRequirement || pageRequirements[0]?.id || "");
  }, [location.pathname, shellExecutionMode, requirementsVisible]);
  const toggleRequirements = () => {
    const next = !requirementsVisible;
    setRequirementsVisible(next);
    if (next) setActiveRequirementId(preferredRequirement || pageRequirements[0]?.id || "");
    try { localStorage.setItem("cad-workflow-requirements-visible", String(next)); } catch { /* browser storage may be unavailable */ }
  };
  const selectScope = (next) => {
    setScope(next);
    if (next === "1.0" && !["/", "/web/admin"].includes(location.pathname) && !location.pathname.startsWith("/workflows/")) navigate("/");
  };
  const selectExecutionMode = (next) => {
    setExecutionMode(next);
    if (location.pathname === "/copilot") {
      const params = new URLSearchParams(location.search);
      params.set("mode", next);
      navigate(`${location.pathname}?${params.toString()}`);
    }
  };
  const requirementReview = {
    enabled: onePointOh && requirementsVisible && location.pathname !== "/requirements",
    activeId: activeRequirementId,
    open: (id) => { setActiveRequirementId(id); if (!requirementsVisible) setRequirementsVisible(true); },
  };
  return (
    <RequirementReviewContext.Provider value={requirementReview}>
    <div className={`app-shell ${onePointOh ? "has-execution-modes" : ""} ${requirementsVisible ? "requirements-visible" : ""}`} data-execution-mode={shellExecutionMode}>
      {editorHeader || <header className="topbar">
        <Brand />
        {!onePointOh && <SurfaceSwitch />}
        <div className="topbar-spacer" />
        <ScopeSwitch scope={scope} onChange={selectScope} />
        {onePointOh && <button className={`prd-nav-button ${location.pathname === "/requirements" ? "active" : ""}`} onClick={() => navigate("/requirements")}><FileText size={16} />需求文档</button>}
        {onePointOh && location.pathname !== "/requirements" && <button className={`requirement-toggle ${requirementsVisible ? "active" : ""}`} onClick={toggleRequirements}><BookOpen size={16} weight={requirementsVisible ? "fill" : "regular"} />需求说明<span>{pageRequirements.length}</span></button>}
        <button className="icon-button" aria-label="帮助"><Info size={19} /></button>
        <div className="avatar">张工</div>
      </header>}
      {onePointOh && editorHeader && location.pathname !== "/requirements" && <button className={`requirement-toggle requirement-toggle-floating ${requirementsVisible ? "active" : ""}`} onClick={toggleRequirements}><BookOpen size={16} />需求说明<span>{pageRequirements.length}</span></button>}
      {onePointOh && <ExecutionModeTabs mode={executionMode} onChange={selectExecutionMode} />}
      <div className="app-body">
        <aside className="global-nav" aria-label="全局导航">
          <nav>
            {navItems.map(([to, label, Icon]) => (
              <NavLink key={to} to={to} end={to === "/" || to === "/web"} className={({ isActive }) => `nav-item ${isActive ? "active" : ""}`}>
                <Icon size={21} weight={label.includes("工作流") ? "fill" : "regular"} />
                <span>{label}</span>
              </NavLink>
            ))}
          </nav>
          <button className="nav-collapse"><SidebarSimple size={20} /><span>收起</span></button>
        </aside>
        <main className={editor ? "main editor-main" : "main"}>{children}</main>
      </div>
      {onePointOh && requirementsVisible && location.pathname !== "/requirements" && <RequirementDomMarkers pathname={location.pathname} mode={shellExecutionMode} />}
      {onePointOh && requirementsVisible && location.pathname !== "/requirements" && activeRequirementId && <RequirementDrawer items={pageRequirements} activeId={activeRequirementId} onSelect={setActiveRequirementId} onClose={() => setActiveRequirementId("")} onViewAll={(id) => navigate(`/requirements?module=${id}#${prdAnchorMap[id] || "prd-title"}`)} />}
    </div>
    </RequirementReviewContext.Provider>
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
  const [scope] = useProductScope();
  const displayEyebrow = scope === "1.0" && typeof eyebrow === "string" && eyebrow.startsWith("Web") ? "平台管理" : eyebrow;
  return (
    <div className="page-header">
      <div><div className="eyebrow">{displayEyebrow}</div><h1>{title}</h1><p>{description}</p></div>
      {action}
    </div>
  );
}

function WorkflowWorkbenchPanel() {
  const navigate = useNavigate();
  const [scope] = useProductScope();
  const [executionMode] = useExecutionMode();
  const [tab, setTab] = useState("我的工作流");
  const [query, setQuery] = useState("");
  const [toast, setToast] = useState("");
  const [activeSkill, setActiveSkill] = useState(null);
  const [createOpen, setCreateOpen] = useState(false);
  const skillTabEnabled = scope !== "1.0";
  useEffect(() => {
    if (!skillTabEnabled && tab === "工作流skills") setTab("我的工作流");
  }, [skillTabEnabled, tab]);
  const importRef = useRef(null);
  const list = workflows.filter((w) => w.name.includes(query));
  const importWorkflow = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setToast(`已导入「${file.name}」，正在校验节点与端口契约`);
    event.target.value = "";
    setTimeout(() => navigate("/workflows/drawing-standardizer/editor"), 500);
  };
  const exportWorkflow = () => setToast("已导出 .zwflow 工作流文件");
  const runWorkflowFromCard = (workflow) => navigate(`/copilot?workflow=${workflow.id}&run=1&mode=${executionMode}`);
  return <section className="workbench-workflows"><header><div><span className="eyebrow">工作流中心</span><h2>我的工作流</h2><p>创建、调试、发布并管理 CAD 自动化流程。</p></div><div className="page-actions"><input ref={importRef} className="visually-hidden" type="file" accept=".zwflow,.json" onChange={importWorkflow} /><button className="secondary" onClick={() => importRef.current?.click()}><FileArrowUp size={15} />导入工作流</button><div className="create-workflow-wrap"><button className="primary" onClick={() => setCreateOpen((open) => !open)}><Plus size={16} />新建工作流<CaretDown size={13} /></button>{createOpen && <div className="create-workflow-menu"><button onClick={() => navigate("/workflows/drawing-standardizer/editor?blank=1")}><b>空白创建</b><small>从零搭建节点流程</small></button><button onClick={() => { setCreateOpen(false); setTab("官方模板"); setToast("请选择一个官方模板开始创建"); }}><b>从模板创建</b><small>复用官方 CAD 流程</small></button><button onClick={() => { setCreateOpen(false); setToast("AI 创建助手已准备"); }}><b>AI 辅助创建</b><small>描述目标生成草稿</small></button></div>}</div></div></header><div className="toolbar-row workbench-workflows-toolbar"><div className="tabs">{["我的工作流", "官方模板", ...(skillTabEnabled ? ["工作流skills"] : []), "运行记录"].map((item) => <button className={tab === item ? "active" : ""} onClick={() => setTab(item)} key={item}>{item}</button>)}</div><label className="search"><MagnifyingGlass size={16} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="搜索工作流" /></label></div>{tab === "运行记录" ? <RunsTable /> : tab === "工作流skills" && skillTabEnabled ? <div className="skill-grid">{workflowSkills.map((skill) => <SkillCard key={skill.id} skill={skill} onOpen={setActiveSkill} />)}</div> : tab === "官方模板" ? <div className="workflow-grid">{industryTemplates["建筑"].map(([name, desc, nodes]) => <article className="workflow-card template-workflow-card" key={name}><span className="status published">官方模板 · {nodes}</span><h3>{name}</h3><p>{desc}</p><footer><button className="secondary" onClick={() => setToast(`已预览「${name}」`)}>预览</button><button className="primary" onClick={() => navigate("/workflows/drawing-standardizer/editor")}>使用</button></footer></article>)}</div> : <div className="workflow-grid">{list.map((workflow) => <WorkflowCard key={workflow.id} workflow={workflow} onOpen={() => navigate(`/workflows/${workflow.id}/editor`)} onRun={() => runWorkflowFromCard(workflow)} onExport={exportWorkflow} onCreateSkill={() => setActiveSkill(workflowSkills.find((skill) => skill.workflowIds.includes(workflow.id)) || workflowSkills[0])} />)}</div>}<SkillDetailModal skill={activeSkill} onClose={() => setActiveSkill(null)} onToast={setToast} />{toast && <Toast message={toast} onClose={() => setToast("")} />}</section>;
}

function DashboardPage() {
  const navigate = useNavigate();
  const [toast, setToast] = useState("");
  return <AppShell><div className="page-content">
    <PageHeader eyebrow="工作台" title="早上好，张工" description="管理已有工作流，或从工作流中心创建、导入并运行工作流。" />
    <section className="hero-strip">
      <div><span className="soft-tag"><Sparkle size={15} weight="fill" />推荐演示</span><h2>帮你把重复性的任务变成工作流高效执行</h2><p>可以在官方模块或者AI助手帮你快速创建你的工作流</p><button className="primary" onClick={() => navigate("/web/workflows?tab=公共模板中心")}>打开工作流模板市场 <PaperPlaneTilt size={17} /></button></div>
      <div className="hero-flow"><span>读取图纸</span><b>→</b><span>规范检查</span><b>→</b><span>安全确认</span></div>
    </section>
    <WorkflowWorkbenchPanel />{toast && <Toast message={toast} onClose={() => setToast("")} />}
  </div></AppShell>;
}

function ZhongwangLoginModal({ mode, onClose, onSuccess }) {
  const [account, setAccount] = useState("zhang.gong@zwcad.com");
  const [password, setPassword] = useState("");
  const [loggingIn, setLoggingIn] = useState(false);
  const targetLabel = mode === "standalone" ? "进入工作台" : "打开 CAD Copilot";
  const submit = (event) => {
    event.preventDefault();
    if (!account.trim() || !password.trim() || loggingIn) return;
    setLoggingIn(true);
    window.setTimeout(() => { setLoggingIn(false); onSuccess(); }, 650);
  };
  return <div className="login-modal-backdrop"><section className="login-modal" role="dialog" aria-modal="true" aria-label="中望账号登录">
    <button className="icon-button login-close" aria-label="关闭登录窗口" onClick={onClose}><X size={17} /></button>
    <div className="login-brand"><span className="login-brand-mark"><Cube size={18} weight="fill" /></span><div><b>中望账号</b><small>登录后继续使用 AI 能力</small></div></div>
    <div className="login-target"><span>登录后将</span><strong>{targetLabel}</strong><small>{mode === "standalone" ? "工作流中心与 CAD 节点交互面板" : "CAD Copilot 对话与工作流技能"}</small></div>
    <form onSubmit={submit}><label>账号<input value={account} onChange={(event) => setAccount(event.target.value)} placeholder="输入中望账号" autoComplete="username" /></label><label>密码<input value={password} onChange={(event) => setPassword(event.target.value)} type="password" placeholder="输入密码" autoComplete="current-password" /></label><div className="login-helper"><span>中望账号统一认证</span><button type="button" onClick={() => setPassword("demo1234")}>填入演示密码</button></div><button className="primary login-submit" type="submit" disabled={!account.trim() || !password.trim() || loggingIn}>{loggingIn ? "正在登录…" : "登录并继续"}<CaretRight size={15} /></button></form>
    <p className="login-legal">本原型仅模拟登录流程，不会提交真实账号信息。</p>
  </section></div>;
}

function CadLocalPage() {
  const navigate = useNavigate();
  const [executionMode] = useExecutionMode();
  const [loginOpen, setLoginOpen] = useState(false);
  const [toast, setToast] = useState("");
  const handleLoginSuccess = () => {
    setLoginOpen(false);
    setToast("中望账号登录成功");
    window.setTimeout(() => navigate(executionMode === "standalone" ? "/" : "/copilot?mode=copilot&source=cad"), 260);
  };
  return <AppShell><div className="cad-local-page">
    <header className="cad-local-head"><div className="cad-local-file"><span className="cad-app-mark"><Cube size={16} weight="fill" /></span><div><b>ZWCAD</b><small>中望 CAD 本地客户端</small></div><span className="cad-file">办公楼二层平面图.dwg</span></div><div className="cad-local-actions"><span className="cad-session-status"><i />本地会话已连接</span><button className="cad-local-ai-button" onClick={() => setLoginOpen(true)}><Sparkle size={16} weight="fill" />AI</button><button title="适配图纸"><ArrowsOut size={17} /></button><button title="缩小"><Minus size={17} /></button><button title="放大"><Plus size={17} /></button></div></header>
    <div className="cad-local-ribbon"><span>文件</span><span className="active">开始</span><span>插入</span><span>注释</span><span>图层</span><span>工具</span><i /><small>模型</small><small>布局 1</small></div>
    <main className="cad-local-canvas"><img src={beforeImage} alt="办公楼二层平面图" /><div className="cad-crosshair"><i /><b /></div><div className="cad-view-badge"><i />当前图纸已连接<br /><strong>ZWCAD · 本地会话</strong></div><div className="cad-local-welcome"><span>AI 能力入口</span><b>点击右上角 AI</b><small>{executionMode === "standalone" ? "登录后进入工作台，运行工作流并在 CAD 中完成节点选择" : "登录后打开 Copilot，对话调用工作流并完成 CAD 节点选择"}</small></div></main>
    <footer className="cad-local-statusbar"><span>模型</span><span>捕捉</span><span>正交</span><span>对象捕捉</span><span>比例 1:100</span><b>坐标：2384.52, 1648.20</b><small>版本 2026.08 · ZWCAD</small></footer>
    {loginOpen && <ZhongwangLoginModal mode={executionMode} onClose={() => setLoginOpen(false)} onSuccess={handleLoginSuccess} />}
    {toast && <Toast message={toast} onClose={() => setToast("")} />}
  </div></AppShell>;
}

const copilotTools = [
  { name: "图纸规范化助手", tool: "workflow.drawing_standardizer", description: "检查图层、标注与尺寸，生成可确认的修改方案", status: "已连接" },
  { name: "图层清理与映射", tool: "workflow.layer_cleanup", description: "识别冗余图层并按项目标准映射", status: "已连接" },
  { name: "标注完整性检查", tool: "workflow.annotation_check", description: "定位遗漏标注与样式异常，输出问题清单", status: "已连接" },
];
const workflowIdsByTool = {
  "workflow.drawing_standardizer": "drawing-standardizer",
  "workflow.layer_cleanup": "layer-cleanup",
  "workflow.annotation_check": "annotation-check",
};

function WorkflowRunPanel({ run, onCancel, onResetSelection, onConfirm, onReturn, inline = false }) {
  const phase = run?.phase;
  const statusText = {
    starting: "正在连接 CAD 会话",
    "waiting-selection": "等待选择实体",
    analyzing: "正在分析已选对象",
    "waiting-point": "等待选择插入位置",
    review: "等待变更确认",
    executing: "正在写入并验证",
    completed: "执行已完成",
  }[phase] || "工作流执行中";
  const progress = phase === "completed" ? 100 : phase === "review" ? 80 : phase === "waiting-point" ? 58 : phase === "analyzing" ? 44 : phase === "waiting-selection" ? 24 : 10;
  const stepIndex = phase === "waiting-selection" ? 1 : phase === "analyzing" ? 2 : phase === "waiting-point" ? 3 : phase === "review" ? 4 : phase === "completed" ? 5 : 0;
  const steps = ["读取当前图纸", "选择 CAD 实体", "分析与生成变更", "位置选择与预览", "人工确认并写入"];
  return <div className={`workflow-run-panel ${inline ? "workflow-run-inline" : ""}`}>
    <header className="workflow-run-head"><div><span className="workflow-run-orb"><Sparkle size={16} weight="fill" /></span><div><b>图纸规范化助手</b><small>{statusText}</small></div></div><button className="icon-button" title="取消运行" onClick={onCancel}><X size={16} /></button></header>
    <div className="workflow-run-context"><File size={13} />办公楼二层平面图.dwg <span>·</span><b>v1.1</b></div>
    <div className="workflow-run-progress"><div><span>运行进度</span><b>{stepIndex} / 5</b></div><i><em style={{ width: `${progress}%` }} /></i></div>
    <div className="workflow-run-steps">{steps.map((label, index) => <div className={`workflow-run-step ${index < stepIndex ? "done" : ""} ${index === stepIndex ? "current" : ""}`} key={label}><span>{index < stepIndex ? <Check size={12} weight="bold" /> : index + 1}</span><div><b>{label}</b><small>{index < stepIndex ? "已完成" : index === stepIndex ? "当前步骤" : "等待中"}</small></div></div>)}</div>
    {phase === "starting" && <div className="workflow-run-request busy"><span className="spinner small" /><div><b>正在准备本地 CAD 交互</b><p>检查图纸版本、连接状态和当前选择集…</p></div></div>}
    {phase === "analyzing" && <div className="workflow-run-request busy"><span className="spinner small" /><div><b>正在分析 3 个已选实体</b><p>正在结合企业制图规范生成下一步任务…</p></div></div>}
    {phase === "waiting-selection" && <div className="workflow-run-request selection"><div className="request-kicker"><Selection size={15} />CAD 交互请求 · 01</div><b>请选择需要规范化的实体</b><p>请在左侧 CAD 画布中点选或框选对象。仅接受门窗块和闭合多段线，数量范围 1～200 个。</p><div className="request-count"><span>当前已选择</span><strong>{run.selectionCount || 0} 个实体</strong></div><button className="secondary" onClick={onResetSelection}>清除并重新选择</button></div>}
    {phase === "waiting-point" && <div className="workflow-run-request point"><div className="request-kicker"><Selection size={15} />CAD 交互请求 · 02</div><b>请选择标题栏插入位置</b><p>临时预览已生成。请在左侧图纸中点击目标位置，系统将使用当前 WCS 坐标和对象捕捉。</p><div className="request-count"><span>预览状态</span><strong>未写入原图</strong></div><button className="secondary" onClick={onResetSelection}>返回重新选择实体</button></div>}
    {phase === "review" && <div className="workflow-run-request review"><div className="request-kicker"><WarningCircle size={15} />ChangeSet 已生成</div><b>12 项低风险变更等待确认</b><p>将规范化 3 个实体，并新增 1 个标准标题栏。原图不会被覆盖。</p><div className="change-summary"><span>图层</span><b>C-WIND → A-WIND</b><small>3 个对象</small><span>新增标题栏</span><b>办公楼二层平面图</b><small>1 个对象</small></div><div className="workflow-run-actions"><button className="secondary" onClick={() => onConfirm("review")}>{run.previewVisible ? "显示原图纸" : "查看差异"}</button><button className="primary" onClick={() => onConfirm("execute")}><Check size={15} />确认并执行</button></div></div>}
    {phase === "executing" && <div className="workflow-run-request busy"><span className="spinner small" /><div><b>正在安全写入 CAD</b><p>正在提交 ChangeSet，并重新读取图纸进行验证…</p></div></div>}
    {phase === "completed" && <div className="workflow-run-request completed"><span className="completed-mark"><Check size={18} weight="bold" /></span><div><b>工作流执行完成</b><p>已验证 13 个对象，生成图纸新版本 v1.1+1。</p></div><button className="primary" onClick={onReturn}>返回工作流中心</button></div>}
    <div className="workflow-run-footnote"><Info size={13} />读取与分析自动执行，CAD 写入始终需要人工确认。</div>
  </div>;
}

function CopilotPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const runParams = new URLSearchParams(location.search);
  const autoWorkflowRun = runParams.get("run") === "1";
  const workflowId = runParams.get("workflow") || "drawing-standardizer";
  const [executionMode] = useExecutionMode();
  const requestedExecutionMode = runParams.get("mode");
  const effectiveExecutionMode = requestedExecutionMode === "standalone" || requestedExecutionMode === "copilot" ? requestedExecutionMode : executionMode;
  const standaloneMode = effectiveExecutionMode === "standalone";
  const [prompt, setPrompt] = useState("");
  const [messages, setMessages] = useState([{ role: "assistant", text: "你好，张工。我已连接当前图纸「办公楼二层平面图.dwg」。你可以直接描述想完成的任务，例如：按企业规范检查并修正这张图。" }]);
  const [activeTool, setActiveTool] = useState(null);
  const [connectedKnowledge, setConnectedKnowledge] = useState([]);
  const [agentMode, setAgentMode] = useState("plan");
  const [running, setRunning] = useState(false);
  const [awaitingConfirmation, setAwaitingConfirmation] = useState(false);
  const [toolsOpen, setToolsOpen] = useState(false);
  const [pickerMode, setPickerMode] = useState("home");
  const [historyOpen, setHistoryOpen] = useState(false);
  const [entitySelected, setEntitySelected] = useState(false);
  const [workflowRun, setWorkflowRun] = useState(null);
  const [toast, setToast] = useState("");
  const [chatThreadElement, setChatThreadElement] = useState(null);
  const knowledgeBases = ["企业制图规范库 v3.2", "建筑施工图国家标准", "办公楼项目资料库"];
  const suggestions = ["检查所选实体是否符合图层规范", "将所选文字高度统一为 3.5", "解释所选对象的属性与风险"];
  useEffect(() => {
    setChatThreadElement(document.querySelector(".chat-thread"));
  }, []);
  const workflowRunStarted = useRef(false);
  const beginWorkflowRun = (runWorkflowId = "drawing-standardizer") => {
    setWorkflowRun({ phase: "starting", workflowId: runWorkflowId, selectionCount: 0, previewVisible: false });
    window.setTimeout(() => setWorkflowRun((run) => run ? { ...run, phase: "waiting-selection" } : run), 900);
  };
  useEffect(() => {
    if (!autoWorkflowRun || workflowRunStarted.current) return undefined;
    workflowRunStarted.current = true;
    const selectedTool = copilotTools.find((tool) => workflowIdsByTool[tool.tool] === workflowId) || copilotTools[0];
    setAgentMode("execute");
    setActiveTool(selectedTool);
    if (!standaloneMode) {
      const autoRunKey = `auto-run:${workflowId}`;
      setMessages((items) => items.some((message) => message.autoRunKey === autoRunKey) ? items : [...items, { role: "user", text: `运行工作流「${selectedTool.name}」`, autoRunKey }, { role: "assistant", tool: selectedTool, text: `收到。我将调用「${selectedTool.name}」处理当前图纸，后续需要你在 CAD 画布中完成节点选择。`, autoRunKey }]);
    }
    beginWorkflowRun(workflowId);
    return () => { workflowRunStarted.current = false; };
  }, [autoWorkflowRun, workflowId, standaloneMode]);
  const handleWorkflowCanvasClick = () => {
    if (!workflowRun) {
      setEntitySelected(true);
      setToast("已选中 3 个实体：2 条标注、1 个文字对象");
      return;
    }
    if (workflowRun.phase === "waiting-selection") {
      setEntitySelected(true);
      setWorkflowRun((run) => ({ ...run, phase: "analyzing", selectionCount: 3 }));
      setToast("已提交 3 个 CAD 实体，工作流继续执行");
      window.setTimeout(() => setWorkflowRun((run) => run?.phase === "analyzing" ? { ...run, phase: "waiting-point" } : run), 1100);
      return;
    }
    if (workflowRun.phase === "waiting-point") {
      setWorkflowRun((run) => ({ ...run, phase: "review", pointSelected: true }));
      setToast("已记录插入点，临时预览已生成");
    }
  };
  const handleWorkflowCancel = () => { setWorkflowRun(null); setEntitySelected(false); setToast("已暂停并退出本次工作流运行"); };
  const handleWorkflowResetSelection = () => { setEntitySelected(false); setWorkflowRun((run) => run ? { ...run, phase: "waiting-selection", selectionCount: 0, pointSelected: false, previewVisible: false } : run); };
  const handleWorkflowConfirm = (action) => {
    if (action === "review") {
      const showingPreview = workflowRun?.previewVisible === true;
      setWorkflowRun((run) => run ? { ...run, previewVisible: !showingPreview } : run);
      setToast(showingPreview ? "已显示原图纸" : "已显示改动效果预览");
      return;
    }
    setWorkflowRun((run) => run ? { ...run, phase: "executing" } : run);
    window.setTimeout(() => setWorkflowRun((run) => run ? { ...run, phase: "completed" } : run), 1200);
  };
  const send = (event) => {
    event?.preventDefault();
    const question = prompt.trim();
    if (!question || running) return;
    setMessages((items) => [...items, { role: "user", text: entitySelected ? `${question}（基于已选中的 3 个实体）` : question }]);
    const tool = activeTool || copilotTools[0];
    setPrompt(""); setRunning(true); setAwaitingConfirmation(false);
    setTimeout(() => {
      const planText = `我已梳理任务计划：1）读取${entitySelected ? "已选中的 3 个图纸实体" : "当前图纸"}与${connectedKnowledge.length ? "已连接知识库" : "图纸上下文"}；2）使用「${tool.name}」校验规则；3）输出变更清单与风险说明。计划确认后，切换到执行模式即可调用工作流。`;
      const executionText = `我将调用「${tool.name}」${entitySelected ? "处理已选中的 3 个图纸实体" : "处理当前图纸"}。已完成 MCP 工具参数校验，并生成 dry-run 方案：发现 12 项可安全调整的图层、标注和文字规范问题。请先审阅变更，再决定是否写入图纸。`;
      setMessages((items) => [...items, { role: "assistant", tool: agentMode === "execute" ? tool : null, text: agentMode === "plan" ? planText : executionText }]);
      setRunning(false); setAwaitingConfirmation(false);
      if (agentMode === "execute") beginWorkflowRun(workflowIdsByTool[tool.tool] || "drawing-standardizer");
    }, 850);
  };
  const confirm = () => { setAwaitingConfirmation(false); setMessages((items) => [...items, { role: "assistant", text: "已确认执行。修改正在由 CAD 本地插件写入，并将生成一个新的云空间图纸版本。" }]); setToast("已提交写图任务，执行记录已同步至工作流平台"); };
  const resetSession = () => { setMessages([{ role: "assistant", text: "新会话已开始。我已连接当前图纸，随时可以开始。" }]); setAwaitingConfirmation(false); setHistoryOpen(false); };
  const inlineWorkflowPanel = !standaloneMode && workflowRun && chatThreadElement ? createPortal(<div className="workflow-run-chat-card"><WorkflowRunPanel run={workflowRun} inline onCancel={handleWorkflowCancel} onResetSelection={handleWorkflowResetSelection} onConfirm={handleWorkflowConfirm} onReturn={() => navigate(`/workflows/${workflowId}/editor`)} /></div>, chatThreadElement) : null;
  return <AppShell><div className="copilot-page copilot-workbench">{workflowRun && <WorkflowRunPanel run={workflowRun} onCancel={handleWorkflowCancel} onResetSelection={handleWorkflowResetSelection} onConfirm={handleWorkflowConfirm} onReturn={() => navigate(`/workflows/${workflowId}/editor`)} />}
    <section className="cad-native-area" aria-label="CAD 原生画图区"><header className="cad-native-head"><div><span className="cad-app-mark"><Cube size={15} weight="fill" /></span><b>ZWCAD</b><span className="cad-file">办公楼二层平面图.dwg</span></div><div><button title="适配图纸"><ArrowsOut size={17} /></button><button title="缩小"><Minus size={17} /></button><button title="放大"><Plus size={17} /></button></div></header><div className="cad-ribbon"><span>文件</span><span className="active">开始</span><span>注释</span><span>图层</span><span>工具</span><i /><small>模型</small><small>布局 1</small></div><div className={`cad-canvas ${workflowRun ? `workflow-cad-${workflowRun.phase}` : ""}`} onClick={handleWorkflowCanvasClick}><img src={workflowRun?.phase === "review" && workflowRun.previewVisible ? afterImage : beforeImage} alt={workflowRun?.phase === "review" && workflowRun.previewVisible ? "改动效果预览" : "当前 CAD 图纸"} /><div className="cad-crosshair"><i /><b /></div><div className="cad-view-badge"><i />当前图纸已连接<br /><strong>ZWCAD · 本地会话</strong></div>{entitySelected && <div className="cad-selection-box"><span>已选中 {workflowRun?.selectionCount || 3} 个实体</span><small>标注 × 2 · 文字 × 1</small></div>}{workflowRun?.phase === "waiting-selection" && <div className="cad-workflow-hint selection"><span><Selection size={15} />工作流等待选择</span><b>请点选或框选需要规范化的实体</b><small>完成后点击右侧面板继续</small></div>}{workflowRun?.phase === "waiting-point" && <div className="cad-workflow-hint point"><span><Selection size={15} />工作流等待位置</span><b>请点击标题栏插入点</b><small>已启用对象捕捉 · WCS</small></div>}{workflowRun?.phase === "review" && <div className={`cad-preview-badge ${workflowRun.previewVisible ? "active" : ""}`}><span><CheckCircle size={14} weight="fill" />{workflowRun.previewVisible ? "改动效果预览" : "原图纸"}</span><b>{workflowRun.previewVisible ? "12 项变更尚未写入" : "预览已隐藏"}</b></div>}</div><footer className="cad-statusbar"><span>模型</span><span>捕捉</span><span>正交</span><span>对象捕捉</span><span>比例 1:100</span><b>坐标：2384.52, 1648.20</b></footer></section>
    <section className="copilot-chat copilot-dock"><div className="chat-top"><div><span className="copilot-orb"><Sparkle size={18} weight="fill" /></span><div><b>CAD Copilot</b></div></div><div className="chat-head-actions"><button className="chat-workbench-entry" onClick={() => navigate("/")}><House size={14} />工作台</button><button className="icon-button" title="会话历史" onClick={() => setHistoryOpen((open) => !open)}><ClockCounterClockwise size={18} /></button><button className="icon-button" title="新建会话" onClick={resetSession}><Plus size={19} /></button><button className="icon-button" title="关闭 Copilot" aria-label="关闭 Copilot" onClick={() => navigate(runParams.get("source") === "cad" ? "/cad" : "/")}><X size={18} /></button></div></div>{historyOpen && <div className="session-history"><div><b>会话管理</b><button onClick={resetSession}><Plus size={14} />新建对话</button></div><button className="active"><b>当前图纸规范检查</b><small>今天 10:24 · 办公楼二层平面图</small></button><button><b>地下车库标注审查</b><small>昨天 18:20 · 7 项问题</small></button><button><b>图层清理与映射</b><small>07 月 26 日 · 已完成</small></button></div>}<div className="chat-context"><span><File size={14} />办公楼二层平面图.dwg</span>{entitySelected ? <button className="entity-chip" onClick={() => setEntitySelected(false)}><Selection size={13} />已选 3 个实体 <X size={12} /></button> : <span>已连接 ZWCAD</span>}</div><div className="chat-thread">{messages.map((message, index) => <article className={`chat-message ${message.role}`} key={index}>{message.role === "assistant" && <span className="message-avatar"><Sparkle size={14} weight="fill" /></span>}<div><div className="message-bubble">{message.text}</div>{message.tool && <div className="tool-call"><span><Code size={14} />MCP 工具调用</span><b>{message.tool.tool}</b><small>{entitySelected ? "已选实体 · " : "当前图纸 · "}dry-run · 需要人工确认</small></div>}</div></article>)}{running && <article className="chat-message assistant"><span className="message-avatar"><Sparkle size={14} weight="fill" /></span><div className="message-bubble typing"><i /><i /><i />{agentMode === "plan" ? "正在梳理任务步骤与风险" : "正在选择工具并生成执行方案"}</div></article>}</div>{awaitingConfirmation && <div className="copilot-confirm"><div><span><WarningCircle size={18} weight="fill" /></span><div><b>变更方案已就绪</b><p>12 项低风险修改等待确认写入。</p></div></div><div><button className="secondary" onClick={() => setToast("已打开工作流中的变更对比审阅")}>审阅</button><button className="primary" onClick={confirm}><Check size={16} />执行</button></div></div>}<div className="agent-mode-switch" role="tablist" aria-label="Copilot 工作模式"><button type="button" role="tab" aria-selected={agentMode === "plan"} className={agentMode === "plan" ? "active" : ""} onClick={() => { setAgentMode("plan"); setToast("已切换至计划模式"); }}><SlidersHorizontal size={14} />计划模式</button><button type="button" role="tab" aria-selected={agentMode === "execute"} className={agentMode === "execute" ? "active" : ""} onClick={() => { setAgentMode("execute"); setToast("已切换至执行模式"); }}><Play size={14} weight="fill" />执行模式</button><span>{agentMode === "plan" ? "先规划，后执行" : "调用前仍需确认写图"}</span></div><form className="copilot-input" onSubmit={send}>{(connectedKnowledge.length > 0 || activeTool) && <div className="conversation-resources" aria-label="本次对话已选资源"><span>本轮上下文</span>{connectedKnowledge.map((name) => <button key={name} type="button" className="resource-chip knowledge" onClick={() => setConnectedKnowledge((items) => items.filter((item) => item !== name))}><BookOpen size={12} />{name}<X size={12} /></button>)}{activeTool && <button type="button" className="resource-chip workflow" onClick={() => setActiveTool(null)}><Code size={12} />{activeTool.name}<X size={12} /></button>}</div>}<div className="input-tool-wrap"><button type="button" className={`input-plus ${toolsOpen ? "active" : ""}`} title="添加上下文或工作流技能" onClick={() => { setToolsOpen((open) => !open); setPickerMode("home"); }}><Plus size={18} /></button>{toolsOpen && <div className="mcp-picker">{pickerMode === "home" && <><div><b>添加能力</b><span>为本次对话补充上下文</span></div><button type="button" onClick={() => setPickerMode("knowledge")}><span className="tool-icon"><BookOpen size={15} /></span><div><b>知识库</b><small>连接知识库，增强当前问题的检索效果</small></div></button><button type="button" onClick={() => setPickerMode("workflow")}><span className="tool-icon"><Code size={15} /></span><div><b>工作流技能</b><small>选择已在 Web 端发布的工作流</small></div></button></>}{pickerMode === "knowledge" && <><div><button className="picker-back" type="button" onClick={() => setPickerMode("home")}>‹</button><b>知识库</b><span>选择或新建知识库</span></div>{knowledgeBases.map((name) => <button key={name} type="button" onClick={() => { setConnectedKnowledge((items) => items.includes(name) ? items : [...items, name]); setToolsOpen(false); setToast(`已连接「${name}」`); }}><span className="tool-icon"><BookOpen size={15} /></span><div><b>{name}</b><small>已索引 · 可用于本次对话</small></div><CheckCircle size={15} weight="fill" /></button>)}<button className="create-workflow" type="button" onClick={() => navigate("/knowledge")}><Plus size={15} />新建知识库</button></>}{pickerMode === "workflow" && <><div><button className="picker-back" type="button" onClick={() => setPickerMode("home")}>‹</button><b>工作流技能</b><span>已发布 · 3 个可用</span></div>{copilotTools.map((tool) => <button className={activeTool?.tool === tool.tool ? "active" : ""} key={tool.tool} type="button" onClick={() => { setActiveTool(tool); setToolsOpen(false); setToast(`已选择「${tool.name}」`); }}><span className="tool-icon"><Code size={15} /></span><div><b>{tool.name}</b><small>{tool.description}</small></div><CheckCircle size={15} weight="fill" /></button>)}<button className="create-workflow" type="button" onClick={() => navigate("/workflows")}><Plus size={15} />新建工作流技能</button></>}<p>读取与分析自动执行；任何写图操作均需确认。</p></div>}</div><div className="prompt-wrap"><textarea value={prompt} onChange={(event) => setPrompt(event.target.value)} placeholder={entitySelected ? "对已选实体下达指令，或输入 / 选择提示词" : "输入任务，或输入 / 选择提示词"} />{prompt && <div className="prompt-suggestions">{suggestions.filter((item) => item.includes(prompt) || prompt.length < 3).slice(0, 3).map((item) => <button type="button" key={item} onClick={() => setPrompt(item)}><Sparkle size={13} />{item}</button>)}</div>}</div><button className="primary" type="submit" disabled={!prompt.trim() || running}><PaperPlaneTilt size={18} weight="fill" /></button></form></section>{toast && <Toast message={toast} onClose={() => setToast("")} />}</div>{inlineWorkflowPanel}</AppShell>;
}

function WorkflowCallLogs() {
  const [date, setDate] = useState("");
  const [page, setPage] = useState(1);
  const rows = [["图纸规范化助手", "MCP", "张工", "成功", "1.8s", "今天 10:24"], ["图层清理与映射", "插件端", "李工", "成功", "2.4s", "今天 09:51"], ["标注完整性检查", "API", "service-design", "告警", "4.7s", "今天 09:12"]];
  return <section className="table-card log-table dashboard-log-table"><div className="section-title"><div><h2>工作流调用日志</h2><p>监控 API、MCP 与插件端的执行结果</p></div><div className="log-actions"><label>日期筛选<input type="date" value={date} onChange={(event) => { setDate(event.target.value); setPage(1); }} /></label><button className="secondary" onClick={() => setPage(1)}>导出日志</button></div></div><table><thead><tr><th>工作流</th><th>调用方式</th><th>调用账号</th><th>状态</th><th>耗时</th><th>时间</th></tr></thead><tbody>{rows.map((row) => <tr key={row.join("-")}>{row.map((cell, index) => <td key={index}>{index === 3 ? <span className={`status ${cell === "成功" ? "published" : "draft"}`}>{cell}</span> : cell}</td>)}</tr>)}</tbody></table><footer className="table-pagination"><span>共 3 条记录</span><div><button disabled={page === 1} onClick={() => setPage(1)}>上一页</button><b>{page}</b><button disabled>下一页</button></div></footer></section>;
}

function WorkflowCard({ workflow, onOpen, onRun, onExport, onCreateSkill, showSkill = true }) {
  const isPublished = workflow.status === "已发布";
  const isDraft = workflow.status === "草稿";
  const statusClass = isPublished ? "published" : isDraft ? "draft" : "offline";
  return <article className="workflow-card" onClick={onOpen} tabIndex={0} onKeyDown={(e) => e.key === "Enter" && onOpen()}>
    <div className={`workflow-icon ${workflow.color}`}><GridFour size={21} weight="fill" /></div>
    <div className="workflow-card-top"><span className={`status ${statusClass}`}>{workflow.status}</span><button className="more">•••</button></div>
    <h3>{workflow.name}</h3><p>{workflow.desc}</p>{(isDraft || isPublished) && <div className="workflow-card-meta">{isDraft && <span>草稿可调试</span>}{isPublished && <span>发布后支持 API / MCP</span>}</div>}
    <footer><div className="workflow-card-footer-meta"><span>运行 {workflow.runs} 次</span><span>{workflow.updated}</span></div><div className="workflow-card-actions">{showSkill && workflow.status === "已发布" && <button className="card-skill" onClick={(event) => { event.stopPropagation(); onCreateSkill?.(workflow); }}><Sparkle size={14} />创建 Skill</button>}{onRun && <button className="card-run" onClick={(event) => { event.stopPropagation(); onRun(workflow); }}><Play size={13} weight="fill" />运行</button>}<button className="card-export" onClick={(event) => { event.stopPropagation(); onExport?.(); }}><DownloadSimple size={14} />导出</button></div></footer>
  </article>;
}

function SkillCard({ skill, onOpen }) {
  return <article className="skill-card">
    <header><span className="skill-icon"><Sparkle size={18} weight="fill" /></span><span className={`status ${skill.status === "已启用" ? "published" : "draft"}`}>{skill.status}</span></header>
    <h3>{skill.name}</h3><p>{skill.description}</p>
    <div className="skill-card-meta"><span><b>绑定</b>{skill.workflowIds.length} 个 Workflow</span><span><b>版本</b>{skill.workflowVersion}</span></div>
    <div className="skill-card-tags"><span>Agent</span><span>CAD Copilot</span>{skill.requiresConfirmation && <span>写入需确认</span>}</div>
    <footer><button className="secondary" onClick={() => onOpen(skill)}>查看 Skill</button><button className="primary" onClick={() => onOpen(skill)}>管理绑定</button></footer>
  </article>;
}

function SkillDetailModal({ skill, onClose, onToast }) {
  const [draftName, setDraftName] = useState("");
  const [draftGoal, setDraftGoal] = useState("");
  const [draftTrigger, setDraftTrigger] = useState("");
  const [generateSkill, setGenerateSkill] = useState(true);
  const [installAgent, setInstallAgent] = useState(true);
  useEffect(() => {
    if (!skill) return;
    setDraftName(skill.name || "");
    setDraftGoal(skill.description || "");
    setDraftTrigger(skill.scenarios || "");
    setGenerateSkill(true);
    setInstallAgent(true);
  }, [skill]);
  if (!skill) return null;
  const confirm = () => {
    const actions = [generateSkill && "生成 Skill", installAgent && "安装到 CAD Agent"].filter(Boolean);
    onToast(actions.length ? `${actions.join("、")}已确认：${draftName}` : "已保存 Skill 信息");
    onClose();
  };
  return <div className="modal-backdrop" onMouseDown={(event) => event.target === event.currentTarget && onClose()}><section className="skill-modal" role="dialog" aria-modal="true" aria-label={`${skill.name} Skill 配置`}>
    <header><div><span className="eyebrow">CAD Agent · Skill</span><h2>创建 Skill</h2><p>以下内容由 AI 根据当前 Workflow 自动生成，你可以按业务需要修改。</p></div><button className="icon-button" onClick={onClose} aria-label="关闭 Skill 配置"><X size={19} /></button></header>
    <div className="skill-form"><label><span>Skill 名称</span><input value={draftName} onChange={(event) => setDraftName(event.target.value)} placeholder="例如：图层规范化助手" /></label><label><span>Skill 目标</span><textarea value={draftGoal} onChange={(event) => setDraftGoal(event.target.value)} rows={3} placeholder="用一句话描述希望它帮助用户完成什么" /></label><label><span>适用场景 / 触发方式</span><textarea value={draftTrigger} onChange={(event) => setDraftTrigger(event.target.value)} rows={3} placeholder="例如：用户说‘清理图层’或‘按企业规范整理图层’时触发" /></label></div>
    <div className="skill-auto-summary"><Sparkle size={16} weight="fill" /><div><b>执行细节由 Workflow 自动继承</b><p>工作流程、工具规则、验收标准、错误处理和输出格式将根据当前 Workflow 自动生成。</p></div></div>
    <footer><label className="skill-option"><input type="checkbox" checked={generateSkill} onChange={(event) => setGenerateSkill(event.target.checked)} /><span>生成 Skill</span></label><label className="skill-option"><input type="checkbox" checked={installAgent} onChange={(event) => setInstallAgent(event.target.checked)} /><span>安装到 CAD Agent</span></label><button className="primary" onClick={confirm}>确认</button></footer>
  </section></div>;
}

function WorkflowsPage() {
  const navigate = useNavigate();
  const [tab, setTab] = useState("我的工作流");
  const [query, setQuery] = useState("");
  const [createOpen, setCreateOpen] = useState(false);
  const [toast, setToast] = useState("");
  const [activeSkill, setActiveSkill] = useState(null);
  const importRef = useRef(null);
  const list = workflows.filter((w) => w.name.includes(query));
  const importWorkflow = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setToast(`已导入「${file.name}」，正在校验节点与端口契约`);
    event.target.value = "";
    setTimeout(() => navigate("/workflows/drawing-standardizer/editor"), 500);
  };
  const exportWorkflow = () => {
    const blob = new Blob([JSON.stringify({ format: "zwflow", version: 1, name: "图纸规范化助手", nodes: initialNodes, edges: initialEdges }, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob); const link = document.createElement("a"); link.href = url; link.download = "图纸规范化助手.zwflow"; link.click(); URL.revokeObjectURL(url); setToast("已导出 .zwflow 工作流文件");
  };
  return <AppShell><div className="page-content">
    <PageHeader eyebrow="工作流中心" title="工作流" description="创建、调试、发布并管理可被插件、Agent、API 与 MCP 调用的 CAD 自动化流程。" action={<div className="page-actions"><input ref={importRef} className="visually-hidden" type="file" accept=".zwflow,.json" onChange={importWorkflow} /><button className="secondary" onClick={() => importRef.current?.click()}><FileArrowUp size={17} />导入 .zwflow</button><div className="create-workflow-wrap"><button className="primary" onClick={() => setCreateOpen((open) => !open)}><Plus size={17} />新建工作流<CaretDown size={13} /></button>{createOpen && <div className="create-workflow-menu"><button onClick={() => navigate("/workflows/drawing-standardizer/editor")}><b>空白创建</b><small>从零搭建节点流程</small></button><button onClick={() => { setCreateOpen(false); setToast("请选择一个官方模板开始创建"); setTab("官方模板"); }}><b>从模板创建</b><small>复用官方 CAD 流程</small></button><button onClick={() => { setCreateOpen(false); setToast("复制已有工作流后可在编辑器中修改"); navigate("/workflows/drawing-standardizer/editor"); }}><b>复制已有工作流</b><small>保留原工作流不变</small></button><button onClick={() => { setCreateOpen(false); setToast("AI 创建助手已准备"); }}><b>AI 辅助创建</b><small>描述目标生成草稿</small></button></div>}</div></div>} />
    <div className="toolbar-row"><div className="tabs">{["我的工作流", "官方模板", "工作流skills", "运行记录"].map((t) => <button className={tab === t ? "active" : ""} onClick={() => setTab(t)} key={t}>{t}</button>)}</div><label className="search"><MagnifyingGlass size={17} /><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="搜索工作流" /></label></div>
    {tab === "运行记录" ? <RunsTable /> : tab === "工作流skills" ? <div className="skill-grid">{workflowSkills.map((skill) => <SkillCard key={skill.id} skill={skill} onOpen={setActiveSkill} />)}</div> : tab === "官方模板" ? <div className="workflow-grid">{industryTemplates["建筑"].map(([name, desc, nodes]) => <article className="workflow-card template-workflow-card" key={name}><span className="status published">官方模板 · {nodes}</span><h3>{name}</h3><p>{desc}</p><footer><button className="secondary" onClick={() => setToast(`已预览「${name}」`)}>预览</button><button className="primary" onClick={() => navigate("/workflows/drawing-standardizer/editor")}>下载使用</button></footer></article>)}</div> : <div className="workflow-grid">{list.map((w) => <WorkflowCard key={w.id} workflow={w} onOpen={() => navigate(`/workflows/${w.id}/editor`)} onExport={exportWorkflow} onCreateSkill={() => setActiveSkill(workflowSkills.find((skill) => skill.workflowIds.includes(w.id)) || { ...workflowSkills[0], name: `${w.name} Skill`, workflowVersion: `${w.name} · 当前正式版本` })} />)}</div>}
    <SkillDetailModal skill={activeSkill} onClose={() => setActiveSkill(null)} onToast={setToast} />
    {toast && <Toast message={toast} onClose={() => setToast("")} />}
  </div></AppShell>;
}

function RunsTable() {
  return <div className="table-card"><table><thead><tr><th>工作流</th><th>图纸</th><th>状态</th><th>Token 用量</th><th>运行时间</th></tr></thead><tbody>
    <tr><td>图纸规范化助手</td><td>办公楼二层平面图.dwg</td><td><span className="status published">执行成功</span></td><td>24.8K</td><td>今天 09:42</td></tr>
    <tr><td>标注完整性检查</td><td>地下车库综合图.dwg</td><td><span className="status published">检查完成</span></td><td>18.6K</td><td>昨天 18:20</td></tr>
  </tbody></table></div>;
}

const fileSize = (bytes) => bytes < 1024 * 1024 ? `${Math.max(1, Math.ceil(bytes / 1024))} KB` : `${(bytes / 1024 / 1024).toFixed(1)} MB`;
const extensionOf = (name) => name.split(".").pop()?.toUpperCase() || "FILE";

const knowledgeBases = [
  { id: "enterprise-standards", title: "企业制图规范库", version: "v3.2", description: "企业 CAD 图层、标注、尺寸和文字规范，支持规范化检查与变更建议。", docs: 4, chunks: 343, indexRate: "98.2%", updated: "今天 09:42", status: "已索引", accent: "green" },
  { id: "national-standards", title: "建筑制图国家标准", version: "v2024", description: "建筑施工图常用国家标准、制图规则和审查要点。", docs: 8, chunks: 612, indexRate: "99.1%", updated: "昨天 16:20", status: "已索引", accent: "blue" },
  { id: "office-project", title: "办公楼项目资料库", version: "v1.8", description: "办公楼项目图纸、交付清单与现场变更记录，供项目协同检索。", docs: 16, chunks: 1284, indexRate: "96.8%", updated: "2026-08-12", status: "已索引", accent: "purple" },
  { id: "mechanical-rules", title: "机械制图规则库", version: "v2.1", description: "机械符号、尺寸公差与粗糙度标注规则，覆盖常用零件图检查。", docs: 6, chunks: 486, indexRate: "97.5%", updated: "2026-08-08", status: "已索引", accent: "orange" },
];

function KnowledgePage() {
  const navigate = useNavigate();
  const [toast, setToast] = useState("");
  return <AppShell><div className="page-content web-page">
    <PageHeader eyebrow="知识库中心" title="知识库" description="将企业规范、国家标准和项目经验沉淀为可检索的 RAG 知识资产。" action={<button className="primary" onClick={() => setToast("新建知识库功能即将开放，请先选择一个知识库上传文档")}><Plus size={17} />新建知识库</button>} />
    <div className="knowledge-center-toolbar"><div><h2>我的知识库</h2><span>共 {knowledgeBases.length} 个知识库 · 点击进入文档与 RAG 配置</span></div><label className="search"><MagnifyingGlass size={17} /><input placeholder="搜索知识库" /></label></div>
    <div className="knowledge-base-grid">{knowledgeBases.map((base) => <button className="knowledge-base-card" key={base.id} onClick={() => navigate(`/web/knowledge/${base.id}`)}><div className={`knowledge-base-icon ${base.accent}`}><Database size={25} weight="fill" /></div><div className="knowledge-base-head"><div><h3>{base.title}</h3><span>{base.version}</span></div><span className="status published">{base.status}</span></div><p>{base.description}</p><div className="knowledge-base-stats"><div><b>{base.docs}</b><span>文档</span></div><div><b>{base.chunks}</b><span>知识片段</span></div><div><b>{base.indexRate}</b><span>索引成功率</span></div></div><footer><span>最近更新 {base.updated}</span><span className="knowledge-base-open">查看详情 <CaretRight size={14} /></span></footer></button>)}</div>
    {toast && <Toast message={toast} onClose={() => setToast("")} />}
  </div></AppShell>;
}

function KnowledgeDetailPage() {
  const navigate = useNavigate();
  const { id } = useParams();
  const knowledgeBase = knowledgeBases.find((base) => base.id === id) || knowledgeBases[0];
  const inputRef = useRef(null);
  const [uploading, setUploading] = useState(false);
  const [toast, setToast] = useState("");
  const [localDocs, setLocalDocs] = useState([]);
  const handleFiles = async (event) => {
    const files = [...event.target.files || []];
    if (!files.length) return;
    setUploading(true);
    try {
      const indexed = await Promise.all(files.map((file) => platformApi.uploadKnowledge(file)));
      setLocalDocs((items) => [...indexed.map((document, index) => [document.name, "本地执行平台", String(document.chunks), document.status === "indexed" ? "已索引" : "索引中", files[index]]), ...items]);
      setToast(`已提交 ${files.length} 个文档到知识库索引`);
    } catch (error) { setToast(`知识库上传失败：${error.message}`); }
    finally { setUploading(false); event.target.value = ""; }
  };
  const allDocs = [...localDocs, ...documents];
  return <AppShell><div className="page-content">
    <PageHeader eyebrow="知识库中心" title={`${knowledgeBase.title} ${knowledgeBase.version}`} description={knowledgeBase.description} action={<><button className="secondary" onClick={() => navigate("/web/knowledge")}><ArrowCounterClockwise size={16} />返回知识库</button><input ref={inputRef} className="visually-hidden" type="file" multiple accept=".pdf,.doc,.docx,.xls,.xlsx,.txt,.md" onChange={handleFiles} /><button className="primary" onClick={() => inputRef.current?.click()} disabled={uploading}>{uploading ? "正在索引..." : <><UploadSimple size={17} />上传文档</>}</button></>} />
    {uploading && <div className="upload-progress"><span style={{ width: "68%" }} /></div>}
    <div className="knowledge-layout"><section className="knowledge-summary"><div className="knowledge-logo"><Database size={27} weight="fill" /></div><h2>{knowledgeBase.title} {knowledgeBase.version}</h2><p>{knowledgeBase.description}</p><div className="summary-stats"><div><b>{allDocs.length}</b><span>文档</span></div><div><b>{knowledgeBase.chunks + localDocs.length * 12}</b><span>知识片段</span></div><div><b>{knowledgeBase.indexRate}</b><span>索引成功率</span></div></div><h3>RAG 参数</h3><label>召回数量 Top K <input type="number" defaultValue="8" /></label><label>相似度阈值 <input type="text" defaultValue="0.72" /></label><button className="secondary" onClick={() => setToast("RAG 参数已保存")}>保存参数</button></section>
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

const webNodes = [
  ["DWG 属性读取", "中望官方", "读取图层、块、标注及实体属性", "2.4k", "v1.6.2"],
  ["企业标准校验", "建筑设计一组", "将企业制图规范封装为可复用校验节点", "986", "v2.1.0"],
  ["BIM 构件映射", "生态开发者", "映射 CAD 图层与 BIM 构件分类", "641", "v1.3.4"],
  ["批量图框识别", "中望官方", "识别模型空间中的图框与出图范围", "1.8k", "v1.9.0"],
];

function IndustryAiDashboardPage() {
  const navigate = useNavigate();
  const [category, setCategory] = useState("all");
  const [stage, setStage] = useState("all");
  const [query, setQuery] = useState("");
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [toast, setToast] = useState("");
  const [view, setView] = useState("overview");
  const categoryLabel = (id) => industryAiCategories.find((item) => item.id === id)?.label || id;
  const stageLabel = (id) => industryAiStages.find((item) => item.id === id)?.label || id;
  const visibleProducts = industryAiProducts.filter((item) => {
    const text = `${item.name} ${item.company} ${item.summary} ${item.capability.join(" ")}`.toLowerCase();
    return (category === "all" || item.category === category) && (stage === "all" || item.stage === stage) && (!query.trim() || text.includes(query.trim().toLowerCase()));
  });
  const categoryCounts = industryAiCategories.slice(1).map((item) => ({ ...item, count: industryAiProducts.filter((product) => product.category === item.id).length }));
  const stageCounts = industryAiStages.slice(1).map((item) => ({ ...item, count: industryAiProducts.filter((product) => product.stage === item.id).length }));
  const shareBoard = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setToast("看板链接已复制，可直接发给部门同事");
    } catch {
      setToast("请复制浏览器地址栏中的看板链接");
    }
  };
  const resetFilters = () => { setCategory("all"); setStage("all"); setQuery(""); };
  return <div className="industry-ai-standalone">
    <header className="industry-ai-topbar"><button className="industry-ai-brand" onClick={() => navigate("/web")}><span className="industry-ai-brand-mark">09</span><span><b>FIELD NOTES</b><small>ENGINEERING AI / RESEARCH BOARD</small></span></button><div className="industry-ai-top-actions"><span className="industry-ai-updated">UPDATED · 2026.08</span><button className="industry-ai-back" onClick={() => navigate("/web")}>CAD WorkFlow <CaretRight size={13} /></button><button className="industry-ai-share" onClick={shareBoard}><UploadSimple size={15} />分享看板</button></div></header>
    <main className="industry-ai-page">
      <header className="industry-ai-masthead"><div className="industry-ai-masthead-copy"><span className="industry-ai-masthead-kicker">ENGINEERING AI <i /> FIELD NOTES / 09</span><h1>工程行业<br /><em>AI 产品雷达</em></h1><p>一张给产品团队的工程 AI 观察地图：从图纸、规范和现场数据出发，看 AI 如何进入设计、建造、成本与运维。</p></div><div className="industry-ai-masthead-aside"><span className="industry-ai-issue">ISSUE 09</span><strong>从“问答工具”<br />到“业务闭环”</strong><p>当前最清晰的产品路径，不是单独训练一个行业大模型，而是把工程对象、知识规则和执行动作串成可审计的工作流。</p><a href={industryAiSourceUrl} target="_blank" rel="noreferrer">SOURCE ARTICLE <CaretRight size={13} /></a></div></header>
    <section className="industry-ai-hero">
      <div className="industry-ai-hero-copy"><div className="industry-ai-kicker"><span className="live-dot" />研究摘要 · 2026.08</div><h2>工程 AI，正在从“问答工具”走向“业务闭环”</h2><p>当前最清晰的产品路径，不是单独训练一个行业大模型，而是把图纸、规范、项目、现场事件和执行动作串成可审计的工作流。</p><div className="industry-ai-hero-tags"><span>图纸理解</span><span>规范检索</span><span>风险识别</span><span>智能体执行</span></div></div>
      <div className="industry-ai-source-card"><div><span className="source-icon"><BookOpen size={17} /></span><div><b>本期研究口径</b><small>用户提供的微信文章 + 公开页面核验</small></div></div><p>微信原文在当前环境无法直接抓取，产品名称与能力描述已按公开索引摘要及厂商页面做交叉核验；看板适合内部讨论，不替代采购尽调。</p><a href={industryAiSourceUrl} target="_blank" rel="noreferrer">打开来源文章 <CaretRight size={14} /></a></div>
    </section>
    <div className="industry-ai-kpi-grid"><article><span className="kpi-label">文章收录</span><b>{industryAiArticleMeta.totalCases}+</b><small>公开案例 / 产品线索</small></article><article><span className="kpi-label">本页展开</span><b>{industryAiProducts.length}</b><small>{industryAiArticleMeta.sampleLabel}</small></article><article><span className="kpi-label">应用场景</span><b>{industryAiArticleMeta.totalScenarios}</b><small>文章归纳的工程场景</small></article><article><span className="kpi-label">下一竞争点</span><b>执行闭环</b><small>从识别建议走向审批、整改与写回</small></article></div>
    <div className="industry-ai-view-tabs" role="tablist" aria-label="看板视图"><button className={view === "overview" ? "active" : ""} onClick={() => setView("overview")}>全景判断</button><button className={view === "products" ? "active" : ""} onClick={() => setView("products")}>产品矩阵</button><button className={view === "highlights" ? "active" : ""} onClick={() => setView("highlights")}>值得关注</button></div>
    {view !== "products" && <>
      <section className="industry-ai-section"><div className="industry-ai-section-head"><div><span className="eyebrow">01 / LANDSCAPE</span><h2>行业 AI 能力分布</h2><p>文章覆盖 {industryAiArticleMeta.totalCases}+ 个案例 / 产品线索；下方展示本页已展开的 {industryAiProducts.length} 个代表性样本分布。</p></div><span className="section-note">样本分布 · 点击能力簇筛选产品</span></div><div className="industry-ai-landscape-grid"><div className="industry-ai-chart"><div className="chart-title"><b>代表样本能力簇</b><small>{industryAiProducts.length} / {industryAiArticleMeta.totalCases}+ 已展开</small></div>{categoryCounts.map((item) => <button className={`industry-ai-bar-row ${category === item.id ? "active" : ""}`} key={item.id} onClick={() => { setCategory(item.id); setView("products"); }}><span>{item.label}</span><i><em className={item.color} style={{ width: `${(item.count / industryAiProducts.length) * 100}%` }} /></i><b>{item.count}</b></button>)}</div><div className="industry-ai-stage-map"><div className="chart-title"><b>代表样本工程阶段</b><small>当前样本 20 个</small></div><div className="stage-map-track">{stageCounts.map((item, index) => <button className={`stage-map-item stage-${index + 1} ${stage === item.id ? "active" : ""}`} key={item.id} onClick={() => { setStage(item.id); setView("products"); }}><span>{item.label.replace("与", " / ")}</span><b>{item.count}</b></button>)}</div><div className="stage-map-caption"><span>设计与审图</span><i /><span>施工与交付</span><i /><span>经营 / 运维</span></div></div></div></section>
      <section className="industry-ai-section"><div className="industry-ai-section-head"><div><span className="eyebrow">02 / EXECUTIVE READ</span><h2>一页读懂这批产品</h2><p>把产品名词还原成对产品规划更有用的判断。</p></div></div><div className="industry-ai-reading-grid"><article><span className="reading-index blue">A</span><div><b>数据底座正在前移</b><p>图纸、模型、规范和项目事件被直接作为 AI 的上下文，知识库从“文档问答”变成“工程对象检索”。</p></div></article><article><span className="reading-index purple">B</span><div><b>行业工作流比通用模型更关键</b><p>审图、算量、造价、巡检与合同审核都在争夺固定任务入口，产品壁垒来自规则、流程与历史数据。</p></div></article><article><span className="reading-index orange">C</span><div><b>现场与经营是两条落地曲线</b><p>现场侧由视觉、传感器和机器人驱动；经营侧由项目、合同、成本和回款数据驱动，最终都会走向闭环。</p></div></article></div></section>
    </>}
    {view !== "highlights" && <section className="industry-ai-section industry-ai-products-section"><div className="industry-ai-section-head"><div><span className="eyebrow">03 / PRODUCT MAP</span><h2>代表性产品 / 案例矩阵</h2><p>文章全量规模为 {industryAiArticleMeta.totalCases}+ 个，本页先展开 {industryAiProducts.length} 个代表性样本；可按能力、阶段和关键词筛选。</p></div><span className="section-note">显示 {visibleProducts.length} / {industryAiProducts.length} 个样本</span></div><div className="industry-ai-filters"><div className="industry-ai-chip-group">{industryAiCategories.map((item) => <button key={item.id} className={category === item.id ? "active" : ""} onClick={() => setCategory(item.id)}>{item.short}</button>)}</div><select value={stage} onChange={(event) => setStage(event.target.value)} aria-label="按工程阶段筛选">{industryAiStages.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}</select><label className="industry-ai-search"><MagnifyingGlass size={15} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="搜索产品、公司或能力" /></label>{(category !== "all" || stage !== "all" || query) && <button className="text-button" onClick={resetFilters}>清除筛选</button>}</div><div className="industry-ai-product-grid">{visibleProducts.map((item) => <article className="industry-ai-product-card" key={item.id}><div className="product-card-top"><span className={`product-category-dot ${industryAiCategories.find((categoryItem) => categoryItem.id === item.category)?.color}`} /><span>{categoryLabel(item.category)}</span><em>{item.maturity}</em></div><h3>{item.name}</h3><div className="product-company">{item.company}<span>·</span>{item.type}</div><p>{item.summary}</p><div className="product-capabilities">{item.capability.map((capability) => <span key={capability}>{capability}</span>)}</div><footer><b>{item.signal}</b><button onClick={() => setSelectedProduct(item)}>查看产品卡 <CaretRight size={14} /></button></footer></article>)}</div>{visibleProducts.length === 0 && <div className="industry-ai-empty"><MagnifyingGlass size={22} /><b>没有匹配的产品</b><span>试试清除筛选，或换一个关键词。</span><button className="secondary" onClick={resetFilters}>重置筛选</button></div>}</section>}
    {view !== "products" && <section className="industry-ai-section"><div className="industry-ai-section-head"><div><span className="eyebrow">04 / WHAT TO WATCH</span><h2>值得关注的亮点</h2><p>这些不是产品排名，而是值得部门持续跟踪的能力信号。</p></div></div><div className="industry-ai-highlights-grid">{industryAiHighlights.map((item) => <article key={item.index}><div className="highlight-head"><span>{item.index}</span><em>{item.tag}</em></div><h3>{item.title}</h3><p>{item.text}</p></article>)}</div></section>}
    {view !== "products" && <section className="industry-ai-section industry-ai-playbook-section"><div className="industry-ai-section-head"><div><span className="eyebrow">05 / TEAM PLAYBOOK</span><h2>对部门的启发</h2><p>把外部产品观察转成内部产品路线的三个动作。</p></div></div><div className="industry-ai-playbook">{industryAiPlaybook.map((item, index) => <article key={item.phase}><div className="playbook-step"><span>0{index + 1}</span><i /></div><div><em>{item.phase}</em><h3>{item.title}</h3><p>{item.text}</p></div></article>)}</div></section>}
    <footer className="industry-ai-footer"><span><Info size={15} />研究口径：产品 / 案例信息来自用户提供文章的公开索引摘要与厂商公开页面；成熟度为团队观察判断。</span><a href={industryAiSourceUrl} target="_blank" rel="noreferrer">回到来源文章 <CaretRight size={14} /></a></footer>
    {selectedProduct && <div className="modal-backdrop industry-product-backdrop" onMouseDown={(event) => event.target === event.currentTarget && setSelectedProduct(null)}><section className="industry-product-modal" role="dialog" aria-modal="true" aria-label={`${selectedProduct.name}产品卡`}><header><div><span className="eyebrow">{categoryLabel(selectedProduct.category)} · {stageLabel(selectedProduct.stage)}</span><h2>{selectedProduct.name}</h2><p>{selectedProduct.company} · {selectedProduct.type}</p></div><button className="icon-button" onClick={() => setSelectedProduct(null)} aria-label="关闭产品卡"><X size={19} /></button></header><div className="industry-product-modal-body"><div className="industry-modal-signal"><span>核心信号</span><b>{selectedProduct.signal}</b></div><p className="industry-modal-summary">{selectedProduct.summary}</p><div className="industry-modal-list"><div><span>能力组合</span><b>{selectedProduct.capability.join(" · ")}</b></div><div><span>团队关注</span><b>{selectedProduct.attention}</b></div><div><span>公开来源</span><a href={selectedProduct.sourceUrl} target="_blank" rel="noreferrer">{selectedProduct.sourceLabel} <CaretRight size={14} /></a></div></div></div><footer><span><CheckCircle size={15} weight="fill" />适合作为部门内部讨论线索</span><button className="primary" onClick={() => { setSelectedProduct(null); setToast("已标记为本轮部门讨论重点"); }}>加入讨论重点</button></footer></section></div>}
    {toast && <Toast message={toast} onClose={() => setToast("")} />}
    </main>
  </div>;
}

function WebDashboardPage() {
  const navigate = useNavigate();
  return <AppShell><div className="page-content web-page"><PageHeader eyebrow="CAD AI WorkFlow · Web端" title="平台工作台" description="统一管理节点生态、知识资产、已发布工作流与云端运行情况。" action={<div className="page-actions"><button className="primary" onClick={() => navigate("/web/workflows")}><GridFour size={17} />进入工作流中心</button></div>} />
    <div className="web-stat-grid"><article><span className="stat-icon blue"><GridFour size={19} /></span><div><small>已发布工作流</small><b>12</b><em>本月新增 3 个</em></div></article><article><span className="stat-icon purple"><Cube size={19} /></span><div><small>可用节点</small><b>48</b><em>第三方节点 16 个</em></div></article><article><span className="stat-icon green"><Play size={19} /></span><div><small>本月调用</small><b>1,284</b><em>成功率 98.7%</em></div></article><article><span className="stat-icon orange"><Database size={19} /></span><div><small>知识资产</small><b>8.6 GB</b><em>7 个知识库</em></div></article></div>
    <section className="web-overview-grid"><article className="overview-panel"><header><div><h2>最近发布的工作流</h2><p>面向插件端、API 与 MCP 的统一发布状态</p></div><button className="text-button" onClick={() => navigate("/web/workflows")}>查看全部</button></header>{workflows.slice(0, 3).map((item, index) => <button className="overview-row" key={item.id} onClick={() => navigate("/web/workflows")}><span className={`workflow-icon ${item.color}`}><GridFour size={18} /></span><div><b>{item.name}</b><small>v{index + 1}.3 · {item.status === "已发布" ? "MCP / API" : "暂不可调用"} · {item.updated}</small></div><em className={item.status === "已发布" ? "published" : item.status === "草稿" ? "draft" : "offline"}>{item.status}</em></button>)}</article><article className="overview-panel"><header><div><h2>平台运行概览</h2><p>过去 7 天的调用与治理状态</p></div></header><div className="usage-chart"><span style={{ height: "38%" }} /><span style={{ height: "52%" }} /><span style={{ height: "47%" }} /><span style={{ height: "72%" }} /><span style={{ height: "64%" }} /><span style={{ height: "86%" }} /><span style={{ height: "78%" }} /></div><div className="overview-metrics"><span><b>1,284</b>总调用</span><span><b>17</b>待处理告警</span><span><b>326 ms</b>平均响应</span></div></article></section><WorkflowCallLogs />
  </div></AppShell>;
}

function NodeCenterPage() {
  const uploadRef = useRef(null);
  const [query, setQuery] = useState("");
  const [toast, setToast] = useState("");
  const [uploaded, setUploaded] = useState([]);
  const visible = [...uploaded, ...webNodes].filter((item) => item[0].toLowerCase().includes(query.toLowerCase()));
  const onUpload = (event) => { const file = event.target.files?.[0]; if (!file) return; setUploaded((items) => [[file.name.replace(/\.[^.]+$/, ""), "我的团队", "刚刚上传的第三方插件节点", "0", "v1.0.0"], ...items]); setToast(`已上传节点包「${file.name}」`); event.target.value = ""; };
  return <AppShell><div className="page-content web-page"><PageHeader eyebrow="Web端 · 节点中心" title="节点中心" description="上传、发现与下载第三方插件节点，为本地工作流编辑器扩展能力。" action={<><input ref={uploadRef} type="file" hidden accept=".zip,.json,.js,.ts" onChange={onUpload} /><button className="primary" onClick={() => uploadRef.current?.click()}><CloudArrowUp size={17} />上传节点</button></>} /><div className="web-toolbar"><div className="tabs"><button className="active">全部节点</button><button>官方节点</button><button>第三方节点</button><button>我的上传</button></div><label className="search"><MagnifyingGlass size={17} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="搜索节点名称或能力" /></label></div><div className="node-market-grid">{visible.map(([name, author, desc, downloads, version]) => <article key={`${name}-${author}`}><div className="node-market-head"><span><Cube size={21} weight="fill" /></span><em>{version}</em></div><h2>{name}</h2><p>{desc}</p><div className="node-meta"><span>{author}</span><span><DownloadSimple size={13} />{downloads}</span></div><footer><button className="secondary" onClick={() => setToast(`已打开「${name}」详情`)}>查看详情</button><button className="primary" onClick={() => setToast(`「${name}」节点包已开始下载`)}><DownloadSimple size={15} />下载</button></footer></article>)}</div>{toast && <Toast message={toast} onClose={() => setToast("")} />}</div></AppShell>;
}

function downloadWorkflowFile(name, payload) {
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `${name}.workflow.json`;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 0);
}

function WebWorkflowCenterPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const [tab, setTab] = useState(() => new URLSearchParams(location.search).get("tab") || "已发布工作流");
  const [toast, setToast] = useState("");
  const [published, setPublished] = useState(() => Object.fromEntries(workflows.map((item) => [item.id, item.status === "已发布"])));
  const [activeInvoke, setActiveInvoke] = useState(null);
  const [activeSkill, setActiveSkill] = useState(null);
  const [activeTemplate, setActiveTemplate] = useState(null);
  const togglePublish = (item) => {
    setPublished((state) => {
      const next = !state[item.id];
      setToast(next ? `「${item.name}」已发布` : `「${item.name}」已取消发布`);
      return { ...state, [item.id]: next };
    });
  };
  const downloadTemplate = (name, description, nodes) => {
    downloadWorkflowFile(name, { type: "cad-ai-workflow-template", name, description, nodes, version: "1.0.0" });
    setToast(`模板「${name}」已下载到本地`);
  };
  return <AppShell><div className="page-content web-page"><PageHeader eyebrow="Web端 · 工作流中心" title="工作流中心" description="从公共模板创建工作流，治理发布版本，并配置插件端、API 与 MCP 调用方式。" action={<button className="primary" onClick={() => navigate("/workflows/drawing-standardizer/editor")}><Plus size={17} />在插件端新建</button>} /><div className="web-toolbar"><div className="tabs">{["已发布工作流", "公共模板中心", "草稿与审核"].map((item) => <button key={item} className={tab === item ? "active" : ""} onClick={() => setTab(item)}>{item}</button>)}</div><label className="search"><MagnifyingGlass size={17} /><input placeholder="搜索工作流" /></label></div>{tab === "公共模板中心" ? <div className="template-grid">{industryTemplates["建筑"].map(([name, description, nodes]) => <article className="template-card" key={name}><div className="template-icon"><Stack size={22} weight="fill" /></div><span>公共模板 · {nodes}</span><h2>{name}</h2><p>{description}</p><footer><button className="secondary" onClick={() => setToast(`已预览「${name}」`)}>查看说明</button><button className="primary" onClick={() => downloadTemplate(name, description, nodes)}><DownloadSimple size={16} />下载使用</button></footer></article>)}</div> : <div className="published-workflow-grid">{workflows.map((item, index) => {
    const isPublished = published[item.id];
    const status = isPublished ? "已发布" : item.status === "已下线" ? "已下线" : "未发布";
    const statusClass = isPublished ? "published" : status === "已下线" ? "offline" : "draft";
    return <article key={item.id}><header><span className={`workflow-icon ${item.color}`}><GridFour size={20} weight="fill" /></span><div className="publish-control"><span className={`status ${statusClass}`}>{status}</span><button type="button" role="switch" aria-checked={isPublished} aria-label={`${item.name}发布状态`} className={`publish-switch ${isPublished ? "active" : ""}`} onClick={() => togglePublish(item)}><i /></button></div></header><h2>{item.name}</h2><p>{item.desc}</p>{isPublished && <div className="publish-methods"><span>API</span><span>MCP</span><span>插件端</span></div>}<dl><div><dt>当前版本</dt><dd>v{index + 1}.3</dd></div><div><dt>本月调用</dt><dd>{128 + index * 76} 次</dd></div></dl><footer><button className="secondary" disabled={!isPublished} onClick={() => setActiveInvoke(item)}>调用方式</button><button className="primary" onClick={() => navigate(`/workflows/${item.id}/editor`)}>在插件端编辑</button></footer></article>;
  })}</div>}{activeInvoke && <div className="modal-backdrop" onMouseDown={(event) => event.target === event.currentTarget && setActiveInvoke(null)}><section className="invoke-modal" role="dialog" aria-modal="true" aria-label={`${activeInvoke.name}调用方式`}><header><div><span className="eyebrow">已发布工作流 · 调用方式</span><h2>{activeInvoke.name}</h2><p>使用以下地址从业务系统或 Copilot 调用当前发布版本。</p></div><button className="icon-button" onClick={() => setActiveInvoke(null)} aria-label="关闭调用方式"><X size={19} /></button></header><div className="invoke-endpoint"><span>API</span><div><b>HTTPS API</b><code>{`https://api.cadworkflow.cn/v1/workflows/${activeInvoke.id}/invoke`}</code></div><button className="secondary" onClick={() => setToast("API 地址已复制")}>复制地址</button></div><div className="invoke-endpoint"><span>MCP</span><div><b>MCP Server</b><code>{`https://mcp.cadworkflow.cn/tools/${activeInvoke.id}`}</code></div><button className="secondary" onClick={() => setToast("MCP 地址已复制")}>复制地址</button></div><footer><span><Info size={15} />地址随发布状态生效，取消发布后将停止访问。</span><button className="primary" onClick={() => setActiveInvoke(null)}>完成</button></footer></section></div>}{toast && <Toast message={toast} onClose={() => setToast("")} />}</div></AppShell>;
}

function WebAdminPage() {
  const [toast, setToast] = useState("");
  return <AppShell><div className="page-content web-page"><PageHeader eyebrow="Web端 · 管理后台" title="管理后台" description="查看账号用量、工作流调用日志与团队账号权限。" /><div className="admin-layout"><section className="overview-panel admin-usage"><header><div><h2>账号用量</h2><p>专业版 · 2026 年度订阅</p></div><button className="secondary" onClick={() => setToast("套餐管理面板已打开")}>管理套餐</button></header><div className="usage-row"><div><span>工作流调用</span><b>1,284 / 5,000</b></div><i><em style={{ width: "26%" }} /></i></div><div className="usage-row"><div><span>知识库存储</span><b>8.6 GB / 50 GB</b></div><i><em style={{ width: "17%" }} /></i></div><div className="usage-row"><div><span>节点包流量</span><b>12.4 GB / 100 GB</b></div><i><em style={{ width: "12%" }} /></i></div></section><section className="overview-panel team-panel"><header><div><h2>账号管理</h2><p>团队成员与平台权限</p></div><button className="primary" onClick={() => setToast("邀请成员面板已打开")}><Plus size={15} />邀请成员</button></header>{[["张工", "管理员", "在线"], ["李工", "工作流编辑者", "2 小时前"], ["王工", "只读成员", "昨天"]].map(([name, role, state]) => <div className="team-row" key={name}><span>{name.slice(0, 1)}</span><div><b>{name}</b><small>{role}</small></div><em>{state}</em></div>)}</section></div><section className="table-card log-table"><div className="section-title"><div><h2>工作流调用日志</h2><p>监控 API、MCP 与插件端的执行结果</p></div><button className="secondary" onClick={() => setToast("调用日志已导出")}>导出日志</button></div><table><thead><tr><th>工作流</th><th>调用方式</th><th>调用账号</th><th>状态</th><th>耗时</th><th>时间</th></tr></thead><tbody>{[["图纸规范化助手", "MCP", "张工", "成功", "1.8s", "今天 10:24"], ["图层清理与映射", "插件端", "李工", "成功", "2.4s", "今天 09:51"], ["标注完整性检查", "API", "service-design", "告警", "4.7s", "今天 09:12"]].map((row) => <tr key={row.join("-")}>{row.map((cell, index) => <td key={index}>{index === 3 ? <span className={`status ${cell === "成功" ? "published" : "draft"}`}>{cell}</span> : cell}</td>)}</tr>)}</tbody></table></section>{toast && <Toast message={toast} onClose={() => setToast("")} />}</div></AppShell>;
}

function WebAdminPageV2() {
  const [upgradeOpen, setUpgradeOpen] = useState(false);
  const [toast, setToast] = useState("");
  const resources = [["可创建工作流个数", "12 / 20", "60%"], ["可发布工作流个数", "8 / 10", "80%"], ["工作流执行次数", "1,284 / 5,000", "26%"], ["工作流最大并发执行数", "3 / 10", "30%"], ["Token", "2.4M / 10M", "24%"], ["知识库空间容量", "8.6 GB / 50 GB", "17%"], ["知识库数量", "7 / 20", "35%"]];
  return <AppShell><div className="page-content web-page"><PageHeader eyebrow="Web端 · 管理后台" title="管理后台" description="查看账号资源用量、团队成员与平台权限。" /><div className="admin-stack"><section className="overview-panel admin-usage"><header><div><h2>账号用量</h2><p>专业版 · 2026 年度订阅</p></div><button className="primary" onClick={() => setUpgradeOpen(true)}>升级套餐</button></header><div className="resource-grid">{resources.map(([name, value, width]) => <div className="resource-meter" key={name}><div><span>{name}</span><b>{value}</b></div><i><em style={{ width }} /></i></div>)}</div></section><section className="overview-panel team-panel"><header><div><h2>账号管理</h2><p>团队成员与平台权限</p></div><button className="primary" onClick={() => setToast("邀请成员面板已打开")}><Plus size={15} />邀请成员</button></header>{[["张工", "管理员", "在线"], ["李工", "工作流编辑者", "2 小时前"], ["王工", "只读成员", "昨天"]].map(([name, role, state]) => <div className="team-row" key={name}><span>{name.slice(0, 1)}</span><div><b>{name}</b><small>{role}</small></div><em>{state}</em></div>)}</section></div>{upgradeOpen && <div className="modal-backdrop" onMouseDown={(event) => event.target === event.currentTarget && setUpgradeOpen(false)}><section className="upgrade-modal" role="dialog" aria-modal="true" aria-label="升级套餐"><header><div><span className="eyebrow">CAD WorkFlow · 套餐升级</span><h2>升级专业版资源</h2><p>解锁更多工作流、并发执行和知识库容量。</p></div><button className="icon-button" onClick={() => setUpgradeOpen(false)} aria-label="关闭升级套餐"><X size={19} /></button></header><div className="plan-options"><article><h3>专业版</h3><b>¥399<span>/月</span></b><p>适合个人与小型团队</p><button className="primary" onClick={() => { setUpgradeOpen(false); setToast("已提交专业版升级申请"); }}>选择专业版</button></article><article><h3>企业版</h3><b>¥1,999<span>/月</span></b><p>更高配额、专属支持与审计</p><button className="secondary" onClick={() => { setUpgradeOpen(false); setToast("企业版咨询请求已提交"); }}>联系销售</button></article></div></section></div>}{toast && <Toast message={toast} onClose={() => setToast("")} />}</div></AppShell>;
}

function WebWorkflowCenterPageV2() {
  const navigate = useNavigate();
  const [tab, setTab] = useState("我的工作流");
  const [preview, setPreview] = useState(null);
  const setToast = () => {};
  const templates = industryTemplates["建筑"].map(([name, description, nodes], index) => ({ name, description, nodes, author: ["CAD WorkFlow 官方", "建筑设计部", "企业模板中心"][index % 3], downloads: [128, 86, 64][index % 3], cad: "ZWCAD 2024+ / DWG", updated: ["2026-08-14", "2026-08-12", "2026-08-08"][index % 3] }));
  return <AppShell><div className="page-content web-page"><PageHeader eyebrow="工作流中心" title="工作流" description="创建、调试、发布并管理可被插件、Agent、API 与 MCP 调用的 CAD 自动化流程。" action={<div className="page-actions"><button className="secondary" onClick={() => setToast?.("")}>导入 .zwflow</button><button className="primary" onClick={() => navigate("/workflows/drawing-standardizer/editor?blank=1")}><Plus size={16} />新建工作流</button></div>} /><div className="web-toolbar"><div className="tabs">{["我的工作流", "工作流技能", "官方模板", "我的模板", "运行记录"].map((item) => <button key={item} className={tab === item ? "active" : ""} onClick={() => setTab(item)}>{item}</button>)}</div><label className="search"><MagnifyingGlass size={17} /><input placeholder="搜索工作流" /></label></div>{tab === "官方模板" || tab === "我的模板" ? <div className="template-grid">{templates.map((item) => <article className="template-card" key={item.name}><div className="template-icon"><Stack size={22} weight="fill" /></div><span>模板 · {item.nodes}</span><h2>{item.name}</h2><p>{item.description}</p><dl className="template-meta"><div><dt>下载量</dt><dd>{item.downloads} 次</dd></div><div><dt>作者</dt><dd>{item.author}</dd></div><div><dt>CAD 兼容要求</dt><dd>{item.cad}</dd></div><div><dt>更新时间</dt><dd>{item.updated}</dd></div></dl><footer><button className="secondary" onClick={() => setPreview(item)}>预览</button><button className="primary" onClick={() => navigate("/workflows/drawing-standardizer/editor?blank=1")}><DownloadSimple size={15} />下载使用</button></footer></article>)}</div> : <div className="workflow-grid">{workflows.map((w) => <WorkflowCard key={w.id} workflow={w} showSkill={false} onOpen={() => navigate(`/workflows/${w.id}/editor`)} />)}</div>}{preview && <div className="modal-backdrop" onMouseDown={(event) => event.target === event.currentTarget && setPreview(null)}><section className="template-preview-modal" role="dialog" aria-modal="true" aria-label={`${preview.name}模板预览`}><header><div><span className="eyebrow">模板预览 · {preview.nodes}</span><h2>{preview.name}</h2><p>{preview.description}</p></div><button className="icon-button" onClick={() => setPreview(null)} aria-label="关闭模板预览"><X size={19} /></button></header><div className="template-canvas"><div className="template-flow-line" />{["CAD图纸读取", "知识检索", "规范检查", "预览确认", "安全写入"].map((node, index) => <div className={`template-flow-node node-${index}`} key={node}><span>{String(index + 1).padStart(2, "0")}</span><b>{node}</b><small>{index === 0 ? "输入图纸对象" : index === 1 ? "企业规范上下文" : index === 2 ? "AI 识别问题" : index === 3 ? "生成变更预览" : "人工确认后执行"}</small></div>)}</div><footer><span>节点画布仅供预览，下载后可在插件端编辑。</span><button className="primary" onClick={() => { setPreview(null); navigate("/workflows/drawing-standardizer/editor?blank=1"); }}>下载并编辑</button></footer></section></div>}</div></AppShell>;
}

function WebWorkflowCenterPageV3() {
  const navigate = useNavigate();
  const [tab, setTab] = useState("已发布工作流");
  const [preview, setPreview] = useState(null);
  const templates = industryTemplates["建筑"].map(([name, description, nodes], index) => ({ name, description, nodes, author: ["CAD WorkFlow 官方", "建筑设计部", "企业模板中心"][index % 3], downloads: [128, 86, 64][index % 3], cad: "ZWCAD 2024+ / DWG", updated: ["2026-08-14", "2026-08-12", "2026-08-08"][index % 3] }));
  return <AppShell><div className="page-content web-page"><PageHeader eyebrow="Web端 · 工作流中心" title="工作流中心" description="从公共模板创建工作流，治理发布版本，并配置插件端、API 与 MCP 调用方式。" action={<button className="primary" onClick={() => navigate("/workflows/drawing-standardizer/editor?blank=1")}><Plus size={17} />在插件端新建</button>} /><div className="web-toolbar"><div className="tabs">{["已发布工作流", "模板市场", "草稿与审核"].map((item) => <button key={item} className={tab === item ? "active" : ""} onClick={() => setTab(item)}>{item}</button>)}</div><label className="search"><MagnifyingGlass size={17} /><input placeholder="搜索工作流" /></label></div>{tab === "模板市场" ? <div className="template-grid">{templates.map((item) => <article className="template-card" key={item.name}><div className="template-icon"><Stack size={22} weight="fill" /></div><span>模板 · {item.nodes}</span><h2>{item.name}</h2><p>{item.description}</p><dl className="template-meta"><div><dt>下载量</dt><dd>{item.downloads} 次</dd></div><div><dt>作者</dt><dd>{item.author}</dd></div><div><dt>CAD 兼容要求</dt><dd>{item.cad}</dd></div><div><dt>更新时间</dt><dd>{item.updated}</dd></div></dl><footer><button className="secondary" onClick={() => setPreview(item)}>预览</button><button className="primary" onClick={() => navigate("/workflows/drawing-standardizer/editor?blank=1")}><DownloadSimple size={15} />下载使用</button></footer></article>)}</div> : <div className="published-workflow-grid">{workflows.map((item, index) => <article key={item.id}><header><span className={`workflow-icon ${item.color}`}><GridFour size={20} weight="fill" /></span><span className={`status ${item.status === "已发布" ? "published" : item.status === "已下线" ? "offline" : "draft"}`}>{item.status}</span></header><h2>{item.name}</h2><p>{item.desc}</p>{item.status === "已发布" && <div className="publish-methods"><span>API</span><span>MCP</span><span>插件端</span></div>}<dl><div><dt>当前版本</dt><dd>v{index + 1}.3</dd></div><div><dt>本月调用</dt><dd>{128 + index * 76} 次</dd></div></dl><footer><button className="primary" onClick={() => navigate(`/workflows/${item.id}/editor`)}>在插件端编辑</button></footer></article>)}</div>}{preview && <div className="modal-backdrop" onMouseDown={(event) => event.target === event.currentTarget && setPreview(null)}><section className="template-preview-modal" role="dialog" aria-modal="true" aria-label={`${preview.name}模板预览`}><header><div><span className="eyebrow">模板预览 · {preview.nodes}</span><h2>{preview.name}</h2><p>{preview.description}</p></div><button className="icon-button" onClick={() => setPreview(null)} aria-label="关闭模板预览"><X size={19} /></button></header><div className="template-canvas"><div className="template-flow-line" />{["CAD图纸读取", "知识检索", "规范检查", "预览确认", "安全写入"].map((node, index) => <div className={`template-flow-node node-${index}`} key={node}><span>{String(index + 1).padStart(2, "0")}</span><b>{node}</b><small>{index === 0 ? "输入图纸对象" : index === 1 ? "企业规范上下文" : index === 2 ? "AI 识别问题" : index === 3 ? "生成变更预览" : "人工确认后执行"}</small></div>)}</div><footer><span>节点画布仅供预览，下载后可在插件端编辑。</span><button className="primary" onClick={() => { setPreview(null); navigate("/workflows/drawing-standardizer/editor?blank=1"); }}>下载并编辑</button></footer></section></div>}</div></AppShell>;
}

function WebWorkflowCenterPageV4() {
  const navigate = useNavigate();
  const [tab, setTab] = useState("已发布工作流");
  const [invoke, setInvoke] = useState(null);
  const templates = industryTemplates["建筑"].map(([name, description, nodes], index) => ({ name, description, nodes, author: ["CAD WorkFlow 官方", "建筑设计部", "企业模板中心"][index % 3], downloads: [128, 86, 64][index % 3], cad: "ZWCAD 2024+ / DWG", updated: ["2026-08-14", "2026-08-12", "2026-08-08"][index % 3] }));
  return <AppShell><div className="page-content web-page"><PageHeader eyebrow="Web端 · 工作流中心" title="工作流中心" description="从公共模板创建工作流，治理发布版本，并配置插件端、API 与 MCP 调用方式。" action={<button className="primary" onClick={() => navigate("/workflows/drawing-standardizer/editor?blank=1")}><Plus size={17} />在插件端新建</button>} /><div className="web-toolbar"><div className="tabs"><button className={tab === "已发布工作流" ? "active" : ""} onClick={() => setTab("已发布工作流")}>已发布工作流</button><button className={tab === "模板市场" ? "active" : ""} onClick={() => setTab("模板市场")}>模板市场</button></div><label className="search"><MagnifyingGlass size={17} /><input placeholder="搜索工作流" /></label></div>{tab === "模板市场" ? <div className="template-grid">{templates.map((item) => <article className="template-card" key={item.name}><div className="template-icon"><Stack size={22} weight="fill" /></div><span>模板 · {item.nodes}</span><h2>{item.name}</h2><p>{item.description}</p><dl className="template-meta"><div><dt>下载量</dt><dd>{item.downloads} 次</dd></div><div><dt>作者</dt><dd>{item.author}</dd></div><div><dt>CAD 兼容要求</dt><dd>{item.cad}</dd></div><div><dt>更新时间</dt><dd>{item.updated}</dd></div></dl><footer><button className="secondary" onClick={() => setInvoke({ name: item.name, template: true })}>预览</button><button className="primary" onClick={() => navigate("/workflows/drawing-standardizer/editor?blank=1")}><DownloadSimple size={15} />下载使用</button></footer></article>)}</div> : <div className="published-workflow-grid">{workflows.map((item, index) => <article key={item.id}><header><span className={`workflow-icon ${item.color}`}><GridFour size={20} weight="fill" /></span><span className={`status ${item.status === "已发布" ? "published" : item.status === "已下线" ? "offline" : "draft"}`}>{item.status}</span></header><h2>{item.name}</h2><p>{item.desc}</p>{item.status === "已发布" && <div className="publish-methods"><span>API</span><span>MCP</span><span>插件端</span></div>}<dl><div><dt>当前版本</dt><dd>v{index + 1}.3</dd></div><div><dt>本月调用</dt><dd>{128 + index * 76} 次</dd></div></dl><footer>{item.status === "已发布" ? <button className="primary" onClick={() => setInvoke(item)}>调用方式</button> : <button className="primary" onClick={() => navigate(`/workflows/${item.id}/editor`)}>在插件端编辑</button>}</footer></article>)}</div>}{invoke && <div className="modal-backdrop" onMouseDown={(event) => event.target === event.currentTarget && setInvoke(null)}><section className="invoke-modal" role="dialog" aria-modal="true" aria-label="工作流调用方式"><header><div><span className="eyebrow">已发布工作流 · 调用方式</span><h2>{invoke.name}</h2><p>使用以下地址从业务系统或 CAD Copilot 调用当前版本。</p></div><button className="icon-button" onClick={() => setInvoke(null)} aria-label="关闭调用方式"><X size={19} /></button></header><div className="invoke-endpoint"><span>API</span><div><b>HTTPS API</b><code>{`https://api.cadworkflow.cn/v1/workflows/${invoke.id || "template"}/invoke`}</code></div><button className="secondary" onClick={() => navigator.clipboard?.writeText(`https://api.cadworkflow.cn/v1/workflows/${invoke.id || "template"}/invoke`)}>复制地址</button></div><div className="invoke-endpoint"><span>MCP</span><div><b>MCP Server</b><code>{`https://mcp.cadworkflow.cn/tools/${invoke.id || "template"}`}</code></div><button className="secondary" onClick={() => navigator.clipboard?.writeText(`https://mcp.cadworkflow.cn/tools/${invoke.id || "template"}`)}>复制地址</button></div><footer><span>地址随发布状态生效。</span><button className="primary" onClick={() => setInvoke(null)}>完成</button></footer></section></div>}</div></AppShell>;
}

function WebAdminPageV4() {
  const [scope] = useProductScope();
  const onePointOh = scope === "1.0";
  const [upgradeOpen, setUpgradeOpen] = useState(false);
  const [detail, setDetail] = useState(null);
  const [roleOpen, setRoleOpen] = useState(null);
  const [toast, setToastState] = useState("");
  const resourceDefinitions = [["可创建工作流个数", "12 / 20", "60%", [["图纸规范化助手", "4 个"], ["图层清理与映射", "3 个"], ["标注完整性检查", "3 个"], ["其他工作流", "2 个"]]], ["可发布工作流个数", "8 / 10", "80%", [["图纸规范化助手", "3 个"], ["图层清理与映射", "2 个"], ["标注完整性检查", "2 个"], ["其他工作流", "1 个"]]], ["工作流执行次数", "1,284 / 5,000", "26%", [["图纸规范化助手", "612 次"], ["图层清理与映射", "384 次"], ["标注完整性检查", "188 次"], ["其他工作流", "100 次"]]], ["工作流最大并发执行数", "3 / 10", "30%", [["图纸规范化助手", "1 路"], ["图层清理与映射", "1 路"], ["标注完整性检查", "1 路"]]], ["Token", "2.4M / 10M", "24%", [["图纸规范化助手", "1.2M"], ["图层清理与映射", "680K"], ["标注完整性检查", "520K"]]], ["知识库空间容量", "8.6 GB / 50 GB", "17%", [["企业制图规范库", "4.2 GB"], ["建筑施工图国家标准", "2.8 GB"], ["办公楼项目资料库", "1.6 GB"]]], ["知识库数量", "7 / 20", "35%", [["企业制图规范库", "3 个"], ["项目资料库", "2 个"], ["团队共享库", "2 个"]]]];
  const resources = resourceDefinitions.filter(([name]) => !onePointOh || !String(name).startsWith("知识库"));
  const [members, setMembers] = useState([["张工", "管理员"], ["李工", "工作流开发者"], ["王工", "工作流使用者"]]);
  const setToast = (message) => { const match = String(message).match(/^(.+?)权限已设置为(.+)$/); if (match) setMembers((items) => items.map(([member, current]) => member === match[1] ? [member, match[2]] : [member, current])); setToastState(message); };
  return <AppShell><div className="page-content web-page"><PageHeader eyebrow="Web端 · 管理后台" title="管理后台" description="查看账号资源用量、团队成员与平台权限。" /><div className="admin-stack"><section className="overview-panel admin-usage"><header><div><h2>账号用量</h2><p>专业版 · 2026 年度订阅</p></div><button className="primary" onClick={() => setUpgradeOpen(true)}>升级套餐</button></header><div className="resource-grid">{resources.map(([name, value, width, items]) => <div className="resource-meter" key={name}><div><span>{name}</span><b>{value}</b><button className="detail-button" onClick={() => setDetail({ name, items })}>明细</button></div><i><em style={{ width }} /></i></div>)}</div></section><section className="overview-panel team-panel"><header><div><h2>账号管理</h2><p>团队成员与平台权限</p></div><button className="primary" onClick={() => setToast("邀请成员面板已打开")}><Plus size={15} />邀请成员</button></header>{members.map(([name, role]) => <div className="team-row" key={name}><span>{name.slice(0, 1)}</span><div><b>{name}</b><small>{role}</small></div><div className="role-control"><button className="secondary role-button" onClick={() => setRoleOpen(roleOpen === name ? null : name)}>权限管理 <CaretDown size={13} /></button>{roleOpen === name && <div className="role-menu">{["管理员", "工作流开发者", "工作流使用者"].map((item) => <button key={item} onClick={() => { setRoleOpen(null); setToast(`${name}权限已设置为${item}`); }}>{item}</button>)}</div>}</div></div>)}</section></div>{detail && <div className="modal-backdrop" onMouseDown={(event) => event.target === event.currentTarget && setDetail(null)}><section className="usage-detail-modal" role="dialog" aria-modal="true" aria-label={`${detail.name}用量明细`}><header><div><span className="eyebrow">资源用量明细</span><h2>{detail.name}</h2></div><button className="icon-button" onClick={() => setDetail(null)} aria-label="关闭明细"><X size={19} /></button></header><div className="distribution-list">{detail.items.map(([item, amount]) => <div key={item}><div><span>{item}</span><b>{amount}</b></div><i><em /></i></div>)}</div></section></div>}{upgradeOpen && <div className="modal-backdrop" onMouseDown={(event) => event.target === event.currentTarget && setUpgradeOpen(false)}><section className="upgrade-modal" role="dialog" aria-modal="true" aria-label="升级套餐"><header><div><span className="eyebrow">CAD WorkFlow · 套餐升级</span><h2>升级专业版资源</h2><p>{onePointOh ? "解锁更多工作流、并发执行和 Token 配额。" : "解锁更多工作流、并发执行和知识库容量。"}</p></div><button className="icon-button" onClick={() => setUpgradeOpen(false)} aria-label="关闭升级套餐"><X size={19} /></button></header><div className="plan-options"><article><h3>专业版</h3><b>¥399<span>/月</span></b><p>适合个人与小型团队</p><button className="primary" onClick={() => { setUpgradeOpen(false); setToast("已提交专业版升级申请"); }}>选择专业版</button></article><article><h3>企业版</h3><b>¥1,999<span>/月</span></b><p>更高配额、专属支持与审计</p><button className="secondary" onClick={() => { setUpgradeOpen(false); setToast("企业版咨询请求已提交"); }}>联系销售</button></article></div></section></div>}{toast && <Toast message={toast} onClose={() => setToast("")} />}</div></AppShell>;
}

function WebAdminPageV3() {
  const [upgradeOpen, setUpgradeOpen] = useState(false);
  const [detail, setDetail] = useState(null);
  const [roleOpen, setRoleOpen] = useState(null);
  const [toast, setToast] = useState("");
  const [scope] = useProductScope();
  const resources = [["可创建工作流个数", "12 / 20", "60%"], ["可发布工作流个数", "8 / 10", "80%"], ["工作流执行次数", "1,284 / 5,000", "26%"], ["工作流最大并发执行数", "3 / 10", "30%"], ["Token", "2.4M / 10M", "24%"], ["知识库空间容量", "8.6 GB / 50 GB", "17%"], ["知识库数量", "7 / 20", "35%"]];
  const members = [["张工", "管理员"], ["李工", "工作流开发者"], ["王工", "工作流使用者"]];
  const eyebrow = scope === "1.0" ? "平台管理" : "Web端 · 管理后台";
  return <AppShell><div className="page-content web-page"><PageHeader eyebrow={eyebrow} title="管理后台" description="查看账号资源用量、团队成员与平台权限。" /><div className="admin-stack"><section className="overview-panel admin-usage"><header><div><h2>账号用量</h2><p>专业版 · 2026 年度订阅</p></div><button className="primary" onClick={() => setUpgradeOpen(true)}>升级套餐</button></header><div className="resource-grid">{resources.map(([name, value, width]) => <div className="resource-meter" key={name}><div><span>{name}</span><b>{value}</b><button className="detail-button" onClick={() => setDetail({ name, value })}>明细</button></div><i><em style={{ width }} /></i></div>)}</div></section><section className="overview-panel team-panel"><header><div><h2>账号管理</h2><p>团队成员与平台权限</p></div><button className="primary" onClick={() => setToast("邀请成员面板已打开")}><Plus size={15} />邀请成员</button></header>{members.map(([name, role]) => <div className="team-row" key={name}><span>{name.slice(0, 1)}</span><div><b>{name}</b><small>{role}</small></div><div className="role-control"><button className="secondary role-button" onClick={() => setRoleOpen(roleOpen === name ? null : name)}>权限管理 <CaretDown size={13} /></button>{roleOpen === name && <div className="role-menu">{["管理员", "工作流开发者", "工作流使用者"].map((item) => <button key={item} onClick={() => { setRoleOpen(null); setToast(`${name}权限已设置为${item}`); }}>{item}</button>)}</div>}</div></div>)}</section></div>{detail && <div className="modal-backdrop" onMouseDown={(event) => event.target === event.currentTarget && setDetail(null)}><section className="usage-detail-modal" role="dialog" aria-modal="true" aria-label={`${detail.name}用量明细`}><header><div><span className="eyebrow">资源用量明细</span><h2>{detail.name}</h2><p>按工作流或知识库查看当前资源分布。</p></div><button className="icon-button" onClick={() => setDetail(null)} aria-label="关闭明细"><X size={19} /></button></header><div className="distribution-list">{["图纸规范化助手", "图层清理与映射", "标注完整性检查", "办公楼项目资料库"].map((item, index) => <div key={item}><div><span>{item}</span><b>{[38, 27, 21, 14][index]}%</b></div><i><em style={{ width: `${[38, 27, 21, 14][index]}%` }} /></i></div>)}</div></section></div>}{upgradeOpen && <div className="modal-backdrop" onMouseDown={(event) => event.target === event.currentTarget && setUpgradeOpen(false)}><section className="upgrade-modal" role="dialog" aria-modal="true" aria-label="升级套餐"><header><div><span className="eyebrow">CAD WorkFlow · 套餐升级</span><h2>升级专业版资源</h2><p>解锁更多工作流、并发执行和知识库容量。</p></div><button className="icon-button" onClick={() => setUpgradeOpen(false)} aria-label="关闭升级套餐"><X size={19} /></button></header><div className="plan-options"><article><h3>专业版</h3><b>¥399<span>/月</span></b><p>适合个人与小型团队</p><button className="primary" onClick={() => { setUpgradeOpen(false); setToast("已提交专业版升级申请"); }}>选择专业版</button></article><article><h3>企业版</h3><b>¥1,999<span>/月</span></b><p>更高配额、专属支持与审计</p><button className="secondary" onClick={() => { setUpgradeOpen(false); setToast("企业版咨询请求已提交"); }}>联系销售</button></article></div></section></div>}{toast && <Toast message={toast} onClose={() => setToast("")} />}</div></AppShell>;
}

const launchFlowSteps = [
  { label: "用户描述目标", note: "自然语言任务", color: "#1677ff", icon: Sparkle },
  { label: "读取 CAD 图纸", note: "对象与属性", color: "#16a36a", icon: File },
  { label: "检索企业规范", note: "知识库上下文", color: "#7457d9", icon: BookOpen },
  { label: "生成执行方案", note: "AI 结构化意图", color: "#d88a12", icon: SlidersHorizontal },
  { label: "预览并确认", note: "Diff + 人工确认", color: "#e36b48", icon: Selection },
  { label: "安全写入 CAD", note: "可撤销执行", color: "#1677ff", icon: CheckCircle },
];

const launchNodeGroups = [
  {
    name: "CAD 节点",
    color: "#1677ff",
    icon: Cube,
    summary: "把图纸对象变成可被工作流调用的专业能力。",
    items: ["读取图纸", "查询对象", "筛选与分组", "预览写入"],
  },
  {
    name: "AI 节点",
    color: "#16a36a",
    icon: Sparkle,
    summary: "理解自然语言、企业规范与设计意图。",
    items: ["意图理解", "规范解析", "知识检索", "结果解释"],
  },
  {
    name: "逻辑节点",
    color: "#7457d9",
    icon: Selection,
    summary: "把专业判断组织成可复用的执行流程。",
    items: ["条件分支", "批量循环", "异常处理", "人工确认"],
  },
];

const launchRoadmap = [
  { phase: "01", title: "概念验证", time: "现在 — 2026 Q3", desc: "聚焦规范检查与安全修改，完成首个可讲清楚的 CAD AI 工作流闭环。", output: "产品方案、核心流程、节点清单" },
  { phase: "02", title: "MVP 落地", time: "2026 Q4", desc: "围绕一个高频场景完成插件端执行、预览确认和基础版本管理。", output: "可运行 MVP、场景模板、用户验证" },
  { phase: "03", title: "平台化治理", time: "2027 H1", desc: "补齐 Web 管理、知识库、账号权益、发布和 API / MCP 调用治理。", output: "工作流中心、权限体系、调用审计" },
  { phase: "04", title: "生态化扩展", time: "2027 H2 以后", desc: "引入第三方节点、行业模板和企业工作流资产，形成 CAD 专业能力生态。", output: "节点市场、模板生态、企业资产复用" },
];

function LaunchMaterialsPage() {
  const [section, setSection] = useState("architecture");
  const [playing, setPlaying] = useState(true);
  const [flowStep, setFlowStep] = useState(1);
  const [selectedNode, setSelectedNode] = useState(0);

  useEffect(() => {
    if (!playing) return undefined;
    const timer = window.setInterval(() => setFlowStep((step) => (step + 1) % launchFlowSteps.length), 1500);
    return () => window.clearInterval(timer);
  }, [playing]);

  const activeFlow = launchFlowSteps[flowStep];
  const ActiveFlowIcon = activeFlow.icon;

  return <AppShell><div className="page-content launch-page">
    <PageHeader
      eyebrow="发布会物料"
      title="CAD AI Workflow：让 CAD 能力成为可调用的专业技能"
      description="本页聚合发布会所需的概念架构、流程动画、双端形态、路线图和 MVP 节点体系。三个 AI 场景 Demo 视频暂不纳入本次物料。"
      action={<button className="secondary" onClick={() => window.print()}><DownloadSimple size={16} />打印 / 导出本页</button>}
    />

    <section className="launch-hero">
      <div>
        <span className="soft-tag"><RocketLaunch size={15} weight="fill" />发布会核心叙事</span>
        <h2>不是替代 CAD，而是给 CAD 增加一个可编排、可治理的 AI 智能层。</h2>
        <p>Agent 负责理解目标，Workflow 负责组织专业能力，CAD 节点负责安全执行。</p>
      </div>
      <div className="launch-hero-metrics"><div><b>1</b><span>首个 MVP 场景</span></div><div><b>4</b><span>核心节点类型</span></div><div><b>3</b><span>平台演进阶段</span></div></div>
    </section>

    <div className="launch-tabs" role="tablist" aria-label="发布会物料分类">
      {[
        ["architecture", "概念架构", "产品定位"],
        ["animation", "Workflow 动画", "技术理念"],
        ["surfaces", "插件 + Web", "产品形态"],
        ["roadmap", "未来路线", "战略规划"],
        ["nodes", "MVP 节点体系", "技术积累"],
      ].map(([id, label, note]) => <button key={id} className={section === id ? "active" : ""} onClick={() => setSection(id)} role="tab" aria-selected={section === id}><span>{label}</span><small>{note}</small></button>)}
    </div>

    {section === "architecture" && <section className="launch-section">
      <div className="launch-section-heading"><div><span className="eyebrow">01 / PRODUCT CONCEPT</span><h2>产品概念架构图</h2><p>用一张图讲清楚 Agent、工作流平台、CAD 插件和 Web 平台之间的关系。</p></div><span className="launch-note"><CheckCircle size={15} weight="fill" />适合发布会主视觉</span></div>
      <div className="architecture-board">
        <div className="architecture-agent"><Sparkle size={17} weight="fill" /><div><b>CAD Copilot / Agent</b><small>理解用户目标 · 调用已发布技能</small></div><span>智能入口</span></div>
        <div className="architecture-core"><div className="architecture-core-icon"><Sparkle size={25} weight="fill" /></div><b>CAD AI Workflow</b><small>把 CAD 专业能力编排成可执行技能</small></div>
        <div className="architecture-columns">
          <article className="architecture-side plugin"><header><span><Cube size={18} weight="fill" /></span><div><b>CAD 插件端</b><small>本地执行工作台</small></div></header><ul><li>工作流编排与调试</li><li>本地图纸读写</li><li>对象选择与上下文</li><li>预览、确认与回滚</li></ul></article>
          <div className="architecture-bridge"><span>本地执行</span><b>↔</b><span>云端治理</span></div>
          <article className="architecture-side web"><header><span><GridFour size={18} weight="fill" /></span><div><b>Web 平台</b><small>企业治理与分发</small></div></header><ul><li>工作流模板中心</li><li>知识库与账号权益</li><li>发布、版本与权限</li><li>API / MCP 生态接入</li></ul></article>
        </div>
        <div className="architecture-foot"><span><Database size={15} />企业知识资产</span><span><Code size={15} />第三方节点生态</span><span><CloudArrowUp size={15} />工作流资产分发</span></div>
      </div>
    </section>}

    {section === "animation" && <section className="launch-section">
      <div className="launch-section-heading"><div><span className="eyebrow">02 / WORKFLOW STORY</span><h2>Workflow 流程动画</h2><p>用 6 个步骤表达“从一句话到一次可确认的 CAD 修改”。</p></div><div className="launch-controls"><button className="secondary" onClick={() => setPlaying((value) => !value)}>{playing ? "暂停动画" : "播放动画"}</button><button className="icon-button" onClick={() => setFlowStep(0)} aria-label="重新播放"><ArrowCounterClockwise size={18} /></button></div></div>
      <div className="flow-animation-board"><div className="flow-animation-top"><span className="live-dot" />正在演示：施工图规范化助手 <em>概念演示</em></div><div className="launch-flow-track">{launchFlowSteps.map((step, index) => { const Icon = step.icon; return <div className={`launch-flow-step ${index === flowStep ? "current" : ""} ${index <= flowStep ? "done" : ""}`} key={step.label}><div className="launch-flow-icon" style={{ "--step-color": step.color }}><Icon size={20} weight="fill" /></div><b>{step.label}</b><small>{step.note}</small>{index < launchFlowSteps.length - 1 && <i className="launch-flow-connector" />}</div>; })}</div><div className="flow-animation-caption"><div className="flow-caption-icon" style={{ "--step-color": activeFlow.color }}><ActiveFlowIcon size={22} weight="fill" /></div><div><span>当前节点</span><b>{activeFlow.label}</b><p>{activeFlow.note} · 所有 CAD 写入都需要经过预览和人工确认</p></div><span className="flow-progress">{String(flowStep + 1).padStart(2, "0")} / {String(launchFlowSteps.length).padStart(2, "0")}</span></div></div>
    </section>}

    {section === "surfaces" && <section className="launch-section">
      <div className="launch-section-heading"><div><span className="eyebrow">03 / PRODUCT FORM</span><h2>CAD 插件 + Web 平台形态</h2><p>插件端承载 CAD 原生操作，Web 端承载企业级治理与分发。</p></div></div>
      <div className="surface-story"><article className="surface-card plugin-surface"><div className="surface-card-top"><span className="surface-icon"><Cube size={20} weight="fill" /></span><div><b>CAD 插件端</b><small>嵌入 CAD 的本地工作台</small></div><span className="surface-status">本地执行</span></div><div className="surface-window"><div className="surface-window-bar"><span /><span /><span /><em>CAD WorkFlow Editor</em></div><div className="surface-window-body"><div className="surface-mini-canvas"><div className="mini-flow-node blue">读取图纸</div><div className="mini-flow-line" /><div className="mini-flow-node green">规范检查</div><div className="mini-flow-line" /><div className="mini-flow-node amber">预览修改</div></div><div className="surface-window-panel"><span>节点属性</span><b>安全确认</b><small>dry-run 预览已生成</small><button>查看变更</button></div></div></div><ul><li>选取图纸对象作为上下文</li><li>执行前生成变更预览</li><li>写入动作保留人工确认</li></ul></article><div className="surface-transfer"><span>工作流定义</span><b>⇄</b><span>执行结果</span></div><article className="surface-card web-surface"><div className="surface-card-top"><span className="surface-icon"><GridFour size={20} weight="fill" /></span><div><b>Web 平台</b><small>企业级工作流治理中心</small></div><span className="surface-status">云端治理</span></div><div className="web-surface-board"><div className="web-surface-header"><span>工作流中心</span><i>已发布</i></div><div className="web-surface-stat"><b>12</b><span>已发布工作流</span><b>48</b><span>可用节点</span></div><div className="web-surface-list"><span><Stack size={14} />公共模板中心</span><span><BookOpen size={14} />企业知识库</span><span><RocketLaunch size={14} />API / MCP 调用</span></div></div><ul><li>模板、版本和发布状态</li><li>知识库、账号和权益管理</li><li>第三方节点与外部调用</li></ul></article></div>
    </section>}

    {section === "roadmap" && <section className="launch-section">
      <div className="launch-section-heading"><div><span className="eyebrow">04 / ROADMAP</span><h2>未来路线图</h2><p>从一个可验证的 CAD 场景，逐步演进为企业级专业能力平台。</p></div></div>
      <div className="roadmap-track">{launchRoadmap.map((item, index) => <article className={`roadmap-item ${index === 0 ? "current" : ""}`} key={item.phase}><div className="roadmap-marker"><span>{item.phase}</span></div><div className="roadmap-card"><div className="roadmap-card-head"><div><span>{item.time}</span><h3>{item.title}</h3></div>{index === 0 && <em>当前阶段</em>}</div><p>{item.desc}</p><footer><strong>阶段产出</strong><span>{item.output}</span></footer></div></article>)}</div>
    </section>}

    {section === "nodes" && <section className="launch-section">
      <div className="launch-section-heading"><div><span className="eyebrow">05 / MVP CAPABILITY</span><h2>MVP 节点体系</h2><p>第一阶段不是堆节点数量，而是围绕“规范检查与安全修改”形成最小闭环。</p></div><span className="launch-note"><WarningCircle size={15} weight="fill" />代码节点首版默认关闭</span></div>
      <div className="node-system-layout"><div className="launch-node-grid">{launchNodeGroups.map((group, index) => { const Icon = group.icon; return <button key={group.name} className={`launch-node-group ${selectedNode === index ? "active" : ""}`} onClick={() => setSelectedNode(index)}><span className="launch-node-group-icon" style={{ "--group-color": group.color }}><Icon size={19} weight="fill" /></span><div><b>{group.name}</b><small>{group.items.length} 类基础能力</small></div><CaretDown size={16} /></button>; })}</div><article className="node-system-detail" style={{ "--group-color": launchNodeGroups[selectedNode].color }}><div className="node-detail-head"><span><Cube size={19} weight="fill" /></span><div><span>基础节点分类</span><h3>{launchNodeGroups[selectedNode].name}</h3></div></div><p>{launchNodeGroups[selectedNode].summary}</p><div className="node-detail-items">{launchNodeGroups[selectedNode].items.map((item, index) => <div key={item}><span>{String(index + 1).padStart(2, "0")}</span><b>{item}</b><CheckCircle size={15} weight="fill" /></div>)}</div><footer><span><CheckCircle size={14} weight="fill" />输入输出标准化</span><span><CheckCircle size={14} weight="fill" />执行过程可追踪</span></footer></article></div>
    </section>}
  </div></AppShell>;
}

function SettingsPage() {
  const [localConnected, setLocalConnected] = useState(false);
  const [toast, setToast] = useState("");
  return <AppShell><div className="page-content"><PageHeader eyebrow="平台设置" title="设置" description="管理账号、套餐用量和 CAD 本地连接能力。" /><div className="settings-grid"><section className="setting-card"><div className="setting-icon blue"><Cube size={22} weight="fill" /></div><div><h2>账号管理</h2><p>张工 · CAD 设计负责人</p></div><button className="secondary" onClick={() => setToast("账号资料编辑面板已打开")}>编辑资料</button><dl><div><dt>所属团队</dt><dd>建筑设计一组</dd></div><div><dt>角色权限</dt><dd>管理员</dd></div><div><dt>登录邮箱</dt><dd>zhang.gong@example.com</dd></div></dl></section><section className="setting-card"><div className="setting-icon purple"><SlidersHorizontal size={22} weight="fill" /></div><div><h2>套餐用量</h2><p>专业版 · 2026 年度订阅</p></div><button className="secondary" onClick={() => setToast("套餐详情已打开")}>查看套餐</button><div className="usage-row"><div><span>工作流运行次数</span><b>128 / 500</b></div><i><em style={{ width: "26%" }} /></i></div><div className="usage-row"><div><span>知识库存储</span><b>1.4 GB / 10 GB</b></div><i><em style={{ width: "14%" }} /></i></div></section><section className="setting-card connection-card"><div className={`setting-icon ${localConnected ? "green" : "orange"}`}><CloudArrowUp size={22} weight="fill" /></div><div><h2>CAD 本地连接</h2><p>{localConnected ? "已连接到 AutoCAD 桌面端" : "连接本地 CAD，读取当前图纸与选择集"}</p></div><button className={localConnected ? "secondary" : "primary"} onClick={() => { setLocalConnected(!localConnected); setToast(localConnected ? "已断开 CAD 本地连接" : "已连接 CAD 本地插件"); }}>{localConnected ? "断开连接" : "连接 CAD"}</button><div className="connection-status"><span className={localConnected ? "online" : "offline"} />{localConnected ? "AutoCAD 2025 · 当前图纸：办公楼二层平面图.dwg" : "尚未连接本地 CAD"}</div></section></div>{toast && <Toast message={toast} onClose={() => setToast("")} />}</div></AppShell>;
}

const PORT_CONTRACTS = {
  "cad-input": { inputs: ["source: string"], outputs: ["drawing: object", "selection_set: array<Entity>", "entities: array<Entity>"] },
  "cad-entity-select": { inputs: ["drawing: object", "filter: object"], outputs: ["entities: array<Entity>", "count: number"] },
  "cad-query": { inputs: ["drawing: object", "query: string"], outputs: ["query_result: object", "matched_entities: array<Entity>"] },
  "cad-entity-properties": { inputs: ["entities: array<Entity>"], outputs: ["properties: array<EntityProperty>", "geometry: array<Geometry>", "entities: array<Entity>"] },
  "cad-process": { inputs: ["entities: array<Entity>", "rule: object"], outputs: ["processed_entities: array<Entity>", "exceptions: array<object>"] },
  "cad-create-geometry": { inputs: ["geometry: object", "layer: string"], outputs: ["created_entity: Entity", "handle: string", "change: Change"] },
  "cad-create-hatch": { inputs: ["boundary: array<Entity>"], outputs: ["hatch: Entity", "handle: string", "change: Change"] },
  "cad-create-text": { inputs: ["content: string", "position: Point"], outputs: ["text_entity: Entity", "handle: string", "change: Change"] },
  "cad-create-dimension": { inputs: ["entities: array<Entity>", "mode: string"], outputs: ["dimension: Entity", "handle: string", "change: Change"] },
  "cad-modify-entity": { inputs: ["entities: array<Entity>", "properties: object"], outputs: ["updated_entities: array<Entity>", "change_set: array<Change>"] },
  "cad-edit": { inputs: ["entities: array<Entity>", "operation: string", "parameters: object"], outputs: ["edited_entities: array<Entity>", "change_set: array<Change>"] },
  "cad-print": { inputs: ["drawing: object", "print_config: object"], outputs: ["file: string", "path: string", "verification: object"] },
  "cad-preview-confirm": { inputs: ["change_set: array<Change>"], outputs: ["approved: boolean", "preview: object", "comment: string"] },
  rag: { inputs: ["query: string"], outputs: ["results: array<KnowledgeChunk>", "retrieval_context: string"] },
  "knowledge-qa": { inputs: ["question: string", "results: array<KnowledgeChunk>"], outputs: ["answer: string", "citations: array<KnowledgeChunk>"] },
  llm: { inputs: ["context: object", "prompt: string"], outputs: ["text: string", "structured_result: object"] },
  classifier: { inputs: ["input: string", "categories: array<string>"], outputs: ["class: string", "confidence: number"] },
  prompt: { inputs: ["variables: object"], outputs: ["prompt_text: string"] },
  "text-inspection": { inputs: ["drawing: object", "region: object"], outputs: ["texts: array<object>", "issues: array<object>"] },
  "table-inspection": { inputs: ["drawing: object"], outputs: ["tables: array<object>", "issues: array<object>"] },
  "mechanical-symbol-inspection": { inputs: ["drawing: object"], outputs: ["symbols: array<object>", "issues: array<object>"] },
  "frame-inspection": { inputs: ["drawing: object"], outputs: ["frames: array<object>", "issues: array<object>"] },
  "layout-segmentation": { inputs: ["drawing: object"], outputs: ["regions: array<object>", "issues: array<object>"] },
  branch: { inputs: ["value: unknown", "condition: object"], outputs: ["true: any", "false: any"] },
  loop: { inputs: ["items: array<any>"], outputs: ["item: any", "results: array<any>", "index: number"] },
  code: { inputs: ["context: object"], outputs: ["result: object", "logs: array<string>"] },
  human: { inputs: ["trigger: object"], outputs: ["approved: boolean", "comment: string", "next: string"] },
  http: { inputs: ["params: object", "body: object"], outputs: ["status: number", "body: object", "headers: object"] },
  "cad-write": { inputs: ["change_set: object"], outputs: ["preview: object", "change_set: array<Change>"] },
};

function getPortContract(kind) { return PORT_CONTRACTS[kind] || { inputs: ["input: object"], outputs: ["result: object"] }; }

function WorkflowNode({ data, selected }) {
  const contract = getPortContract(data.kind);
  return <div className={`flow-node ${selected ? "selected" : ""} ${data.running ? "running" : ""}`} style={{ "--node-color": data.color }}>
    <Handle type="target" position={Position.Left} />
    <div className="flow-node-header"><span className="node-symbol"><Sparkle size={14} weight="fill" /></span><div><strong>{data.title}</strong><small>{data.subtitle}</small></div><NodeStatus status={data.status} /></div>
    <div className="flow-node-body">{data.rows?.map(([k, v]) => <div key={k}><span>{k}</span><b>{v}</b></div>)}</div><div className="flow-node-ports"><span>{(data.inputs || contract.inputs).length} 入参</span><span>{(data.outputs || contract.outputs).length} 出参</span></div>
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

function NodePalette({ onDragStart, onAdd }) {
  const [scope] = useProductScope();
  const onePointOh = scope === "1.0";
  const [query, setQuery] = useState("");
  const [importing, setImporting] = useState(false);
  const [importedName, setImportedName] = useState("");
  const importRef = useRef(null);
  const importNode = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setImporting(true);
    setImportedName(file.name);
    setTimeout(() => {
      onAdd({ type: "third-party", name: file.name.replace(/\.[^.]+$/, ""), desc: "第三方插件节点", color: "#146ef5" });
      setImporting(false);
    }, 1100);
    event.target.value = "";
  };
  const visibleCatalog = nodeCatalog.map((group) => ({ ...group, items: group.items.filter(([type, name]) => !(onePointOh && ["rag", "knowledge-qa"].includes(type)) && name.toLowerCase().includes(query.toLowerCase())) })).filter((group) => group.items.length > 0);
  return <aside className="node-palette"><div className="panel-title"><b>节点库</b><CaretDown size={15} /></div><label className="palette-search"><MagnifyingGlass size={15} /><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="搜索节点" /></label><div className="catalog-scroll">
    {visibleCatalog.map((group) => <section key={group.group}><h4><CaretDown size={12} />{group.group}</h4>{group.items.map(([type, name, desc]) => {
      const disabled = false;
      const item = { type, name, desc, color: group.color };
      return <button draggable={!disabled} disabled={disabled} title={disabled ? "首版为安全起见，代码节点暂不执行" : "单击添加到画布，也可拖拽定位"} onClick={() => onAdd(item)} onDragStart={(e) => onDragStart(e, item)} className={`catalog-item ${disabled ? "disabled" : ""}`} key={type}><span style={{ background: group.color }}><Cube size={14} weight="fill" /></span><div><b>{name}</b><small>{disabled ? "首版安全禁用" : desc}</small></div></button>;
    })}</section>)}
  </div><div className="node-import-area"><input ref={importRef} type="file" hidden accept=".zip,.json,.js,.ts" onChange={importNode} />{importing ? <div className="node-import-progress"><span className="spinner small" /><div><b>节点导入中</b><small>{importedName}</small></div></div> : <button type="button" onClick={() => importRef.current?.click()}><FileArrowUp size={15} />导入第三方节点</button>}</div></aside>;
}

function Inspector({ node, onChange, onDelete, onClose, running, onSingleStep }) {
  const [tab, setTab] = useState("配置");
  useEffect(() => setTab("配置"), [node?.id]);
  if (!node) return <aside className="inspector"><div className="panel-title"><b>节点属性</b><button className="icon-button" onClick={onClose} aria-label="关闭节点属性"><X size={16} /></button></div><div className="inspector-empty"><Selection size={30} /><p>选择画布中的节点<br />以编辑参数</p></div></aside>;
  const title = node.data.title;
  const kind = node.data.kind || inferNodeKind(node);
  return <aside className="inspector"><div className="panel-title"><b>节点属性</b><button className="icon-button" onClick={onClose} aria-label="关闭节点属性"><X size={16} /></button></div><div className="inspector-scroll"><div className="inspector-node"><span className="node-symbol" style={{ background: node.data.color }}><Sparkle size={14} weight="fill" /></span><div><b>{title}</b><small>{node.data.subtitle}</small></div></div><div className="inspector-tabs">{["配置", "输出", "日志"].map((item) => <button key={item} className={tab === item ? "active" : ""} onClick={() => setTab(item)}>{item}</button>)}</div>
    {tab === "配置" && <><div className="form-section"><label>节点名称<input value={title} onChange={(e) => onChange("title", e.target.value)} /></label><label>说明<textarea defaultValue={node.data.subtitle === "人工介入" ? "在写入图纸前等待指定人员确认。" : "配置节点输入、处理规则与输出变量。"} /></label></div><NodeConfig key={node.id} kind={kind} /><button className="danger-button" onClick={onDelete}><Trash size={16} />删除节点</button></>}
    {tab === "输出" && <NodeOutput node={node} kind={kind} />}
    {tab === "日志" && <NodeLogPanel node={node} running={running} onSingleStep={onSingleStep} />}
  </div></aside>;
}

function inferNodeKind(node) {
  const label = `${node.data.title} ${node.data.subtitle}`.toLowerCase();
  if (label.includes("知识问答")) return "knowledge-qa";
  if (label.includes("知识库") || label.includes("rag")) return "rag";
  if (label.includes("知识检索")) return "rag";
  if (label.includes("获取实体")) return "cad-entity-select";
  if (label.includes("实体属性")) return "cad-entity-properties";
  if (label.includes("几何")) return "cad-create-geometry";
  if (label.includes("填充")) return "cad-create-hatch";
  if (label.includes("文字")) return "cad-create-text";
  if (label.includes("标注")) return "cad-create-dimension";
  if (label.includes("修改实体")) return "cad-modify-entity";
  if (label.includes("综合编辑")) return "cad-edit";
  if (label.includes("打印")) return "cad-print";
  if (label.includes("预览确认")) return "cad-preview-confirm";
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

const AI_NODE_CONFIGS = {
  "text-inspection": <><ConfigSection title="文字检测识别"><Field label="检测范围"><select><option>整张图纸</option><option>当前选择集</option><option>指定图层</option></select></Field><Field label="识别内容"><select><option>文字内容与高度</option><option>文字内容、样式与旋转</option></select></Field><Field label="规范规则"><select><option>企业制图规范库 v3.2</option><option>仅输出识别结果</option></select></Field></ConfigSection><OutputSection items="texts / issues" /></>,
  "table-inspection": <><ConfigSection title="表格检测识别"><Field label="检测范围"><select><option>整张图纸</option><option>当前选择集</option></select></Field><Field label="识别模式"><select><option>结构与内容</option><option>仅识别表格边界</option></select></Field><Field label="合并单元格"><select><option>自动识别</option><option>不处理</option></select></Field></ConfigSection><OutputSection items="tables / issues" /></>,
  "mechanical-symbol-inspection": <><ConfigSection title="机械符号检测识别"><Field label="符号类型"><select><option>尺寸、公差、粗糙度</option><option>全部机械制图符号</option></select></Field><Field label="检测范围"><select><option>整张图纸</option><option>当前选择集</option></select></Field><Field label="识别模型"><select><option>CAD 视觉识别模型</option><option>通用视觉模型</option></select></Field></ConfigSection><OutputSection items="symbols / issues" /></>,
  "frame-inspection": <><ConfigSection title="图框检测"><Field label="图框类型"><select><option>自动识别</option><option>A0</option><option>A1</option><option>A2</option><option>A3</option><option>A4</option></select></Field><Field label="检测内容"><select><option>图框与标题栏</option><option>仅图纸边界</option></select></Field><Field label="标题栏字段"><input defaultValue="图号,图名,比例,日期,设计人" /></Field></ConfigSection><OutputSection items="frames / issues" /></>,
  "layout-segmentation": <><ConfigSection title="版面分割"><Field label="分割对象"><select><option>图形、文字块、表格</option><option>图形与文字</option><option>全部区域</option></select></Field><Field label="分割粒度"><select><option>按语义区域</option><option>按连通区域</option></select></Field><Field label="输出坐标系"><select><option>图纸坐标</option><option>模型空间坐标</option></select></Field></ConfigSection><OutputSection items="regions / issues" /></>,
};

function NodeConfig({ kind }) {
  const sections = {
    "cad-input": <><CadInputConfig /><OutputSection items="drawing / selection_set / entities" /></>,
    "cad-entity-select": <CadEntitySelectConfig />,
    "cad-query": <CadQueryConfig />,
    "cad-entity-properties": <CadEntityPropertiesConfig />,
    "cad-process": <CadProcessConfig />,
    "cad-create-geometry": <CadCreateGeometryConfig />,
    "cad-create-hatch": <CadCreateHatchConfig />,
    "cad-create-text": <CadCreateTextConfig />,
    "cad-create-dimension": <CadCreateDimensionConfig />,
    "cad-modify-entity": <CadModifyEntityConfig />,
    "cad-edit": <CadEditConfig />,
    "cad-print": <CadPrintConfig />,
    "cad-preview-confirm": <><PreviewConfirmConfig /><OutputSection items="approved / preview / comment" /></>,
    "cad-write": <CadWriteConfig />,
    rag: <><ConfigSection title="知识检索"><Field label="知识库"><select><option>企业制图规范库 v3.2</option><option>建筑施工图国家标准</option><option>项目资料库</option></select></Field><Field label="查询变量"><select><option>读取图纸.drawing_summary</option><option>Prompt.query</option><option>手动输入问题</option></select></Field><Field label="检索模式"><select><option>混合检索（向量 + 关键词）</option><option>向量检索</option><option>关键词检索</option></select></Field><Field label="召回数量 Top K"><input type="number" defaultValue="8" /></Field><Field label="相似度阈值"><input defaultValue="0.72" /></Field><Field label="是否重排"><select><option>启用重排</option><option>不重排</option></select></Field><Field label="输出格式"><select><option>KnowledgeChunk 结构化结果</option><option>纯文本上下文</option><option>JSON + 引用</option></select></Field></ConfigSection><KnowledgeChunkSchema /><OutputSection items="results: Array<KnowledgeChunk> / retrieval_context" /></>,
    "knowledge-qa": <><ConfigSection title="知识问答"><Field label="问题来源"><select><option>用户问题</option><option>Prompt.prompt_text</option><option>读取图纸.drawing_summary</option></select></Field><Field label="检索范围"><select><option>企业制图规范库 v3.2</option><option>当前项目知识库</option><option>全部已授权知识库</option></select></Field><Field label="回答模型"><select><option>Qwen-Max</option><option>GPT-5</option></select></Field><Field label="回答风格"><select><option>专业、简洁并附引用</option><option>面向设计师解释</option><option>只返回结论</option></select></Field><Field label="温度"><input type="number" min="0" max="1" step="0.1" defaultValue="0.2" /></Field><Field label="无答案处理"><select><option>明确说明未找到依据</option><option>转交人工确认</option><option>返回空结果</option></select></Field></ConfigSection><OutputSection items="answer / citations" /></>,
    llm: <><ConfigSection title="模型"><Field label="模型供应商"><select><option>通义千问</option><option>OpenAI 兼容接口</option></select></Field><Field label="模型"><select defaultValue="Qwen-Max"><option>Qwen-Max</option><option>GPT-5</option></select></Field><Field label="添加 MCP 工具"><select><option>不添加</option><option>ZWCAD MCP · 只读工具</option><option>ZWCAD MCP · 预览工具</option></select></Field><Field label="选择知识库"><select><option>企业制图规范库 v3.2</option><option>不连接知识库</option></select></Field></ConfigSection><ConfigSection title="提示词与上下文"><Field label="提示词（支持 AI 润色）"><textarea defaultValue="依据企业制图规范检查输入图纸，输出结构化问题与建议。" /><button type="button" className="inline-ai-action">✨ AI 润色提示词</button></Field><Field label="上下文变量"><select><option>规范知识库.retrieval_context</option><option>读取图纸.drawing</option><option>上游节点全部输出</option></select></Field><Field label="回答温度"><span className="range-row"><input type="range" min="0" max="1" step="0.1" defaultValue="0.3" /><b>0.3</b></span></Field><Field label="最大输出 Token"><input type="number" defaultValue="2048" /></Field></ConfigSection><OutputSection items="text / structured_result" /></>,
    classifier: <><ConfigSection title="分类规则"><Field label="模型"><select><option>Qwen-Plus</option><option>GPT-5 Mini</option></select></Field><Field label="输入变量"><select><option>LLM.structured_result</option><option>用户问题</option></select></Field><Field label="具体类别"><textarea defaultValue="图层异常\n标注异常\n尺寸异常\n文字异常" /></Field><Field label="分类规则提示词"><textarea defaultValue="根据输入内容选择最匹配的 CAD 问题类别，并返回置信度。" /></Field><Field label="多标签"><select><option>允许多标签</option><option>仅返回最高置信度</option></select></Field></ConfigSection><OutputSection items="class / confidence" /></>,
    prompt: <><ConfigSection title="提示词模板"><Field label="模板内容"><textarea defaultValue={'请基于 {{drawing}} 和 {{rules}} 生成 CAD 修改建议。'} /></Field><Field label="变量"><input defaultValue="drawing, rules, check_result" /></Field><Field label="缺失变量处理"><select><option>提示并终止</option><option>使用空值继续</option></select></Field></ConfigSection><OutputSection items="prompt_text" /></>,
    branch: <><ConfigSection title="分支条件"><Field label="全局参数 / 判断变量"><select><option>检查图层与标注.risk_level</option><option>用户输入.intent</option><option>工作流上下文.status</option></select></Field><Field label="运算符"><select><option>等于</option><option>包含</option><option>大于</option><option>小于</option><option>为空</option></select></Field><Field label="比较值"><input defaultValue="low" /></Field><Field label="包含关系"><select><option>满足全部条件（AND）</option><option>满足任一条件（OR）</option></select></Field><Field label="判断后的下一条件"><select><option>true → 预览确认</option><option>false → 人工介入</option><option>true / false → 分别连接画布端口</option></select></Field></ConfigSection><OutputSection items="true / false" /></>,
    loop: <><ConfigSection title="循环设置"><Field label="循环条件判断"><textarea defaultValue="item.status !== 'done'" /></Field><Field label="迭代数组"><select><option>CAD 查询.matched_entities</option><option>规范知识库.results</option><option>用户输入.items</option></select></Field><Field label="循环块内容"><select><option>在循环体内处理当前实体</option><option>引用画布中已连接节点</option></select></Field><Field label="最大循环次数"><input type="number" defaultValue="100" /></Field><Field label="错误处理"><select><option>记录并继续</option><option>立即终止</option></select></Field></ConfigSection><OutputSection items="item / results / index" /></>,
    code: <><ConfigSection title="代码执行"><Field label="运行环境"><select><option>JavaScript（受限沙箱）</option><option>Python（受限沙箱）</option></select></Field><Field label="输入变量"><input defaultValue="entities, rules" /></Field><Field label="输出变量"><input defaultValue="filtered_entities, logs" /></Field><Field label="代码逻辑区"><textarea defaultValue="return entities.filter(item => item.layer);" /></Field><Field label="异常处理"><select><option>捕获异常并输出 logs</option><option>异常时终止流程</option></select></Field></ConfigSection><OutputSection items="result / logs" /></>,
    human: <><ConfigSection title="人工确认"><Field label="确认触发条件"><select><option>存在 CAD 写入变更</option><option>风险等级为中高风险</option><option>始终需要确认</option></select></Field><Field label="确认说明"><textarea defaultValue="请审阅修改前后差异，确认后才会写入新版本。" /></Field><Field label="确认选择"><select><option>同意 / 不同意</option><option>同意 / 拒绝并填写原因</option></select></Field><Field label="处理人"><select><option>当前工作流运行人</option><option>指定审批人：张工</option></select></Field><Field label="下一步结果"><select><option>同意 → 执行写入；不同意 → 结束</option><option>不同意 → 回到预览节点</option></select></Field></ConfigSection><OutputSection items="approved / comment / next" /></>,
    http: <><ConfigSection title="请求设置"><Field label="API 地址"><input defaultValue="https://api.example.com/v1/check" /></Field><Field label="请求方法"><select><option>POST</option><option>GET</option><option>PUT</option><option>DELETE</option></select></Field><Field label="请求 Headers"><textarea defaultValue={'{"Content-Type": "application/json", "Authorization": "Bearer {{token}}"}'}/></Field><Field label="请求 Body"><textarea defaultValue={'{"input": "{{input}}"}'}/></Field><Field label="请求参数 Query"><textarea defaultValue={'{"drawing_id": "{{drawing.id}}"}'}/></Field><Field label="失败重试机制"><select><option>失败重试 3 次（指数退避）</option><option>失败重试 1 次</option><option>不重试</option></select></Field><Field label="证书验证"><select><option>验证 HTTPS 证书</option><option>允许自签名证书（仅本地）</option></select></Field></ConfigSection><OutputSection items="status / body / headers" /></>,
  };
  return sections[kind] || AI_NODE_CONFIGS[kind] || sections.llm;
}

const CAD_FALLBACK_LAYERS = ["A-WALL", "A-DOOR", "A-WIND", "A-DIMS", "A-TEXT", "0"];
const CAD_FALLBACK_BLOCKS = ["A3-图框", "门编号", "窗编号", "标高符号", "指北针"];
const CAD_ENTITY_TYPES = ["直线（LINE）", "多段线（LWPOLYLINE）", "圆（CIRCLE）", "块参照（INSERT）", "文字（TEXT / MTEXT）", "标注（DIMENSION）"];
let cadContextOptionsRequest;

function useCadContextOptions() {
  const [options, setOptions] = useState({ layers: CAD_FALLBACK_LAYERS, blocks: CAD_FALLBACK_BLOCKS, mode: "fallback" });
  useEffect(() => {
    let active = true;
    if (!cadContextOptionsRequest) {
      cadContextOptionsRequest = fetch("/api/cad/context-options").then((response) => {
        if (!response.ok) throw new Error("CAD context unavailable");
        return response.json();
      }).catch(() => ({ layers: CAD_FALLBACK_LAYERS, blocks: CAD_FALLBACK_BLOCKS, mode: "fallback" }));
    }
    cadContextOptionsRequest.then((result) => {
      if (!active) return;
      setOptions({
        layers: result.layers?.length ? result.layers : CAD_FALLBACK_LAYERS,
        blocks: result.blocks?.length ? result.blocks : CAD_FALLBACK_BLOCKS,
        mode: result.mode || "fallback",
      });
    });
    return () => { active = false; };
  }, []);
  return options;
}

function CadLayerOptions() {
  const { layers } = useCadContextOptions();
  return <>{layers.map((layer) => <option key={layer}>{layer}</option>)}</>;
}

function CadBlockOptions() {
  const { blocks } = useCadContextOptions();
  return <>{blocks.map((block) => <option key={block}>{block}</option>)}</>;
}

function CadEntitySelectConfig() {
  const [source, setSource] = useState("");
  return <><ConfigSection title="实体筛选">
    <Field label="选择来源"><select value={source} onChange={(event) => setSource(event.target.value)}><option value="">请选择选择来源</option><option value="selection">当前图纸选择集</option><option value="layer">选择图层</option><option value="block">选择块</option><option value="type">按对象类型</option></select></Field>
    {source === "selection" && <div className="dependent-note"><b>当前图纸选择集</b><span>运行时读取用户在 ZWCAD 中已选中的实体，不需要额外筛选条件。</span></div>}
    {source === "layer" && <Field label="图纸中的图层"><select><option value="">请选择图层</option><CadLayerOptions /></select></Field>}
    {source === "block" && <Field label="图纸中的块名称"><select><option value="">请选择块</option><CadBlockOptions /></select></Field>}
    {source === "type" && <><Field label="对象类型"><select><option value="">请选择对象类型</option>{CAD_ENTITY_TYPES.map((type) => <option key={type}>{type}</option>)}</select></Field><Field label="查找范围"><select><option>模型空间</option><option>当前布局</option></select></Field></>}
  </ConfigSection><OutputSection items="entities / selection_set / count" /></>;
}

function CadQueryConfig() {
  const [target, setTarget] = useState("");
  return <><ConfigSection title="查询条件"><Field label="输入图纸变量"><select><option>读取图纸.drawing</option></select></Field><Field label="查询目标"><select value={target} onChange={(event) => setTarget(event.target.value)}><option value="">请选择查询目标</option><option value="layer">图层与图元</option><option value="block">块与属性</option><option value="annotation">尺寸与文字</option></select></Field>
    {target === "layer" && <><Field label="图层"><select><option value="">请选择图层</option><CadLayerOptions /></select></Field><Field label="图元类型"><select><option>全部图元</option>{CAD_ENTITY_TYPES.map((type) => <option key={type}>{type}</option>)}</select></Field></>}
    {target === "block" && <><Field label="块名称"><select><option value="">请选择块</option><CadBlockOptions /></select></Field><Field label="属性读取"><select><option>块属性与动态参数</option><option>仅块属性</option><option>仅动态参数</option></select></Field></>}
    {target === "annotation" && <><Field label="内容类型"><select><option>尺寸标注</option><option>单行文字</option><option>多行文字</option></select></Field><Field label="内容匹配"><input placeholder="输入关键字，可留空" /></Field></>}
  </ConfigSection><OutputSection items="query_result / matched_entities" /></>;
}

function CadEntityPropertiesConfig() {
  const [group, setGroup] = useState("");
  return <><ConfigSection title="属性范围"><Field label="实体对象"><select><option>获取实体对象.entities</option><option>CAD 查询.matched_entities</option></select></Field><Field label="属性类别"><select value={group} onChange={(event) => setGroup(event.target.value)}><option value="">请选择属性类别</option><option value="basic">基本属性</option><option value="display">显示与打印属性</option><option value="geometry">几何属性</option></select></Field>
    {group === "basic" && <Field label="返回字段"><select><option>全部基本属性</option><option>类型、句柄、图层</option><option>颜色、线型、超链接</option></select></Field>}
    {group === "display" && <Field label="返回字段"><select><option>全部显示与打印属性</option><option>线型比例、线宽、透明度</option><option>打印样式、厚度</option></select></Field>}
    {group === "geometry" && <Field label="几何返回方式"><select><option>按实体类型返回完整参数</option><option>仅返回边界盒</option><option>返回控制点与参数</option></select></Field>}
  </ConfigSection><OutputSection items="properties / geometry / entities" /></>;
}

function CadProcessConfig() {
  const [method, setMethod] = useState("");
  return <><ConfigSection title="处理规则"><Field label="输入集合"><select><option>CAD 查询.matched_entities</option><option>获取实体对象.entities</option></select></Field><Field label="处理方式"><select value={method} onChange={(event) => setMethod(event.target.value)}><option value="">请选择处理方式</option><option value="layer">按图层分组</option><option value="type">按类型分组</option><option value="map">属性映射</option><option value="unit">单位转换</option></select></Field>
    {method === "layer" && <Field label="分组字段"><select><option>图层名称</option><option>图层状态</option></select></Field>}
    {method === "type" && <Field label="类型归并规则"><select><option>按 CAD 原生类型</option><option>文字与标注归为注释类</option></select></Field>}
    {method === "map" && <Field label="属性映射规则"><textarea defaultValue={'{"layer": {"原图层": "A-WALL"}}'} /></Field>}
    {method === "unit" && <><Field label="源单位"><select><option>毫米</option><option>厘米</option><option>米</option></select></Field><Field label="目标单位"><select><option>米</option><option>毫米</option><option>厘米</option></select></Field></>}
    {method && <Field label="异常对象策略"><select><option>保留并标记</option><option>跳过</option><option>终止流程</option></select></Field>}
  </ConfigSection><OutputSection items="processed_entities / exceptions" /></>;
}

function CadCreateGeometryConfig() {
  const [geometryType, setGeometryType] = useState("");
  const [drawMethod, setDrawMethod] = useState("");
  const parameterFields = {
    line: <><Field label="起点"><input defaultValue='{"x": 0, "y": 0, "z": 0}' /></Field><Field label="终点"><input defaultValue='{"x": 100, "y": 0, "z": 0}' /></Field></>,
    polyline: <Field label="顶点数组"><textarea defaultValue='[[0, 0], [100, 0], [100, 80]]' /></Field>,
    circle: <><Field label="圆心"><input defaultValue='{"x": 0, "y": 0, "z": 0}' /></Field><Field label="半径"><input type="number" defaultValue="20" /></Field></>,
    arc: <><Field label="圆心"><input defaultValue='{"x": 0, "y": 0, "z": 0}' /></Field><Field label="半径"><input type="number" defaultValue="20" /></Field><Field label="起止角度"><input defaultValue="0° / 90°" /></Field></>,
    rectangle: <><Field label="第一个角点"><input defaultValue='{"x": 0, "y": 0}' /></Field><Field label="对角点"><input defaultValue='{"x": 100, "y": 80}' /></Field></>,
    polygon: <><Field label="中心点"><input defaultValue='{"x": 0, "y": 0}' /></Field><Field label="边数"><input type="number" defaultValue="6" /></Field><Field label="外接圆半径"><input type="number" defaultValue="30" /></Field></>,
    ellipse: <><Field label="中心点"><input defaultValue='{"x": 0, "y": 0}' /></Field><Field label="长轴 / 短轴"><input defaultValue="50 / 25" /></Field></>,
    spline: <Field label="控制点数组"><textarea defaultValue='[[0, 0], [40, 80], [100, 20]]' /></Field>,
  };
  return <><ConfigSection title="几何参数"><Field label="图形类型"><select value={geometryType} onChange={(event) => { setGeometryType(event.target.value); setDrawMethod(""); }}><option value="">请选择图形类型</option><option value="line">直线</option><option value="polyline">多段线</option><option value="circle">圆</option><option value="arc">圆弧</option><option value="rectangle">矩形</option><option value="polygon">多边形</option><option value="ellipse">椭圆</option><option value="spline">样条曲线</option></select></Field>
    {geometryType && <Field label="绘制方式"><select value={drawMethod} onChange={(event) => setDrawMethod(event.target.value)}><option value="">请选择绘制方式</option><option value="parameter">参数化输入</option><option value="points">引用上游点位</option><option value="geometry">引用实体几何</option></select></Field>}
    {drawMethod === "parameter" && parameterFields[geometryType]}
    {drawMethod === "points" && <Field label="点位变量"><select><option>CAD 查询.geometry.points</option><option>上游节点.output_points</option></select></Field>}
    {drawMethod === "geometry" && <Field label="几何来源"><select><option>查询实体属性.geometry</option><option>CAD 查询.matched_entities</option></select></Field>}
  </ConfigSection>{drawMethod && <><CadEntityStyleConfig /><CommonCadWriteConfig /></>}<OutputSection items="created_entity / handle / change" /></>;
}

function CadCreateHatchConfig() {
  const [boundary, setBoundary] = useState("");
  return <><ConfigSection title="填充参数"><Field label="边界来源"><select value={boundary} onChange={(event) => setBoundary(event.target.value)}><option value="">请选择边界来源</option><option value="entities">上游实体对象</option><option value="selection">当前图纸选择集</option><option value="layer">指定图层闭合边界</option></select></Field>
    {boundary === "entities" && <Field label="边界对象"><select><option>获取实体对象.entities</option><option>CAD 查询.matched_entities</option></select></Field>}
    {boundary === "selection" && <div className="dependent-note"><b>使用当前选择集</b><span>运行时只接受闭合边界，开放对象会进入异常输出。</span></div>}
    {boundary === "layer" && <Field label="边界图层"><select><option value="">请选择图层</option><CadLayerOptions /></select></Field>}
    {boundary && <><Field label="填充图案"><select><option>ANSI31</option><option>SOLID</option><option>AR-CONC</option></select></Field><Field label="比例"><input type="number" defaultValue="1" /></Field><Field label="角度"><input type="number" defaultValue="0" /></Field></>}
  </ConfigSection>{boundary && <><CadEntityStyleConfig /><CommonCadWriteConfig /></>}<OutputSection items="hatch / handle / change" /></>;
}

function CadCreateTextConfig() {
  const [contentSource, setContentSource] = useState("");
  return <><ConfigSection title="文字参数"><Field label="文字内容来源"><select value={contentSource} onChange={(event) => setContentSource(event.target.value)}><option value="">请选择内容来源</option><option value="manual">手动输入</option><option value="variable">引用上游参数</option></select></Field>
    {contentSource === "manual" && <Field label="文字内容"><textarea placeholder="输入要创建的文字" /></Field>}
    {contentSource === "variable" && <Field label="引用参数"><select><option>知识问答.answer</option><option>LLM.text</option><option>CAD 查询.query_result</option></select></Field>}
    {contentSource && <><Field label="文字高度"><input type="number" defaultValue="3.5" /></Field><Field label="文字旋转"><input type="number" defaultValue="0" /></Field><Field label="插入位置"><input defaultValue='{"x": 0, "y": 0, "z": 0}' /></Field><Field label="文字样式"><select><option>Standard</option><option>企业建筑文字</option></select></Field></>}
  </ConfigSection>{contentSource && <CommonCadWriteConfig />}<OutputSection items="text_entity / handle / change" /></>;
}

function CadCreateDimensionConfig() {
  const [mode, setMode] = useState("");
  const radial = mode === "radius" || mode === "diameter";
  return <><ConfigSection title="标注参数"><Field label="标注模式"><select value={mode} onChange={(event) => setMode(event.target.value)}><option value="">请选择标注模式</option><option value="linear">线性</option><option value="aligned">对齐</option><option value="radius">半径</option><option value="diameter">直径</option><option value="angle">角度</option></select></Field>
    {mode && <Field label={radial ? "圆或圆弧对象" : mode === "angle" ? "两条线对象" : "标注对象或基准点"}><select><option>获取实体对象.entities</option><option>CAD 查询.matched_entities</option></select></Field>}
    {mode && <><Field label="标注样式"><select><option>ISO-25</option><option>企业建筑标注</option><option>引用输入对象样式</option></select></Field><Field label="标注位置"><input defaultValue='{"x": 0, "y": 0, "z": 0}' /></Field></>}
  </ConfigSection>{mode && <CommonCadWriteConfig />}<OutputSection items="dimension / handle / change" /></>;
}

function CadModifyEntityConfig() {
  const [attribute, setAttribute] = useState("");
  const valueField = {
    layer: <Field label="目标图层"><select><option value="">请选择图层</option><CadLayerOptions /></select></Field>,
    color: <Field label="目标颜色"><select><option>ByLayer</option><option>ByBlock</option><option>红色</option><option>黄色</option></select></Field>,
    linetype: <Field label="目标线型"><select><option>ByLayer</option><option>Continuous</option><option>Hidden</option><option>Center</option></select></Field>,
    ltscale: <Field label="线型比例"><input type="number" defaultValue="1" /></Field>,
    lineweight: <Field label="目标线宽"><select><option>ByLayer</option><option>0.18 mm</option><option>0.25 mm</option><option>0.35 mm</option></select></Field>,
    transparency: <Field label="透明度"><input type="number" min="0" max="90" defaultValue="0" /></Field>,
    thickness: <Field label="厚度"><input type="number" defaultValue="0" /></Field>,
  }[attribute];
  return <><ConfigSection title="修改属性"><Field label="实体对象"><select><option>获取实体对象.entities</option><option>CAD 查询.matched_entities</option></select></Field><Field label="要修改的属性"><select value={attribute} onChange={(event) => setAttribute(event.target.value)}><option value="">请选择属性</option><option value="layer">图层</option><option value="color">颜色</option><option value="linetype">线型</option><option value="ltscale">线型比例</option><option value="lineweight">线宽</option><option value="transparency">透明度</option><option value="thickness">厚度</option></select></Field>{valueField}</ConfigSection>{attribute && <CommonCadWriteConfig />}<OutputSection items="updated_entities / change_set" /></>;
}

function CadPrintConfig() {
  const [format, setFormat] = useState("");
  return <><ConfigSection title="导出参数"><Field label="导出格式"><select value={format} onChange={(event) => setFormat(event.target.value)}><option value="">请选择导出格式</option><option value="pdf">PDF</option><option value="excel">Excel</option></select></Field>
    {format === "pdf" && <><Field label="纸张与方向"><select><option>A3 · 横向</option><option>A4 · 纵向</option><option>A1 · 横向</option></select></Field><Field label="打印区域"><select><option>当前布局</option><option>窗口范围</option><option>图形界限</option></select></Field><Field label="打印比例"><select><option>按图纸比例</option><option>布满图纸</option><option>1:100</option></select></Field><Field label="PDF 文件名与路径"><input defaultValue="{{drawing.name}}_publish.pdf" /></Field></>}
    {format === "excel" && <><Field label="导出内容"><select><option>块属性明细</option><option>图层统计</option><option>实体属性清单</option></select></Field><Field label="工作表名称"><input defaultValue="CAD 数据" /></Field><Field label="Excel 文件名与路径"><input defaultValue="{{drawing.name}}_data.xlsx" /></Field></>}
  </ConfigSection><OutputSection items="file / path / verification" /></>;
}

function CadWriteConfig() {
  const [action, setAction] = useState("");
  const mutating = action && action !== "highlight";
  return <><ConfigSection title="写入策略"><Field label="目标图纸"><select><option>读取图纸.drawing</option></select></Field><Field label="修改动作"><select value={action} onChange={(event) => setAction(event.target.value)}><option value="">请选择修改动作</option><option value="update">更新图层与属性</option><option value="create">创建文字或标注</option><option value="block">插入块</option><option value="highlight">高亮对象</option></select></Field>
    {action === "update" && <><Field label="变更计划"><select><option>LLM.structured_result.change_plan</option><option>上游实体属性变更</option></select></Field><Field label="写入范围"><select><option>仅修改方案中的对象</option><option>当前选择集</option></select></Field></>}
    {action === "create" && <><Field label="创建计划"><select><option>LLM.structured_result.creations</option><option>上游创建节点.change_set</option></select></Field><Field label="目标图层"><select><CadLayerOptions /></select></Field></>}
    {action === "block" && <><Field label="块名称"><select><option value="">请选择块</option><CadBlockOptions /></select></Field><Field label="插入位置"><input defaultValue='{"x": 0, "y": 0, "z": 0}' /></Field></>}
    {action === "highlight" && <><Field label="高亮对象"><select><option>获取实体对象.entities</option><option>CAD 查询.matched_entities</option></select></Field><Field label="高亮颜色"><select><option>红色</option><option>黄色</option><option>蓝色</option></select></Field></>}
  </ConfigSection>{mutating && <ConfigSection title="安全控制"><Field label="执行方式"><select><option>先 dry-run 预览</option><option>仅生成变更计划</option></select></Field><Field label="执行前确认"><select><option>必须人工确认</option><option>由预览确认节点决定</option></select></Field></ConfigSection>}<OutputSection items="change_set / preview_drawing" /></>;
}

function CadEntityStyleConfig() {
  const [styleMode, setStyleMode] = useState("by-layer");
  return <ConfigSection title="通用属性"><Field label="属性方式"><select value={styleMode} onChange={(event) => setStyleMode(event.target.value)}><option value="by-layer">全部随层（推荐）</option><option value="custom">自定义实体属性</option></select></Field><Field label="图层"><select><option value="">请选择图层</option><CadLayerOptions /></select></Field>{styleMode === "custom" && <><Field label="颜色"><select><option>ByLayer</option><option>ByBlock</option><option>指定颜色</option></select></Field><Field label="线型"><select><option>ByLayer</option><option>Continuous</option><option>Hidden</option></select></Field><Field label="线型比例"><input defaultValue="1" /></Field><Field label="打印样式"><input defaultValue="ByLayer" /></Field><Field label="线宽"><input defaultValue="ByLayer" /></Field><Field label="透明度"><input defaultValue="ByLayer" /></Field><Field label="厚度"><input defaultValue="0" /></Field></>}</ConfigSection>;
}

function CadEditConfig() {
  const [operation, setOperation] = useState("");
  const operationFields = {
    移动: <><Field label="初始基点"><input defaultValue='{"x": 0, "y": 0, "z": 0}' /></Field><Field label="结束基点"><input defaultValue='{"x": 100, "y": 0, "z": 0}' /></Field></>,
    复制: <><Field label="复制模式"><select><option>单个</option><option>多个</option></select></Field><Field label="初始基点"><input defaultValue='{"x": 0, "y": 0, "z": 0}' /></Field><Field label="结束基点"><input defaultValue='{"x": 100, "y": 0, "z": 0}' /></Field></>,
    旋转: <><Field label="旋转基点"><input defaultValue='{"x": 0, "y": 0, "z": 0}' /></Field><Field label="旋转角度"><input type="number" defaultValue="90" /></Field></>,
    缩放: <><Field label="缩放基点"><input defaultValue='{"x": 0, "y": 0, "z": 0}' /></Field><Field label="缩放比例"><input type="number" defaultValue="1.2" /></Field></>,
    镜像: <><Field label="镜像线点 1"><input defaultValue='{"x": 0, "y": 0, "z": 0}' /></Field><Field label="镜像线点 2"><input defaultValue='{"x": 100, "y": 0, "z": 0}' /></Field><Field label="删除源对象"><select><option>否</option><option>是</option></select></Field></>,
    偏移: <><Field label="偏移距离"><input type="number" defaultValue="10" /></Field></>,
    阵列: <><Field label="行数 / 列数"><input defaultValue="2 / 3" /></Field><Field label="行间距 / 列间距"><input defaultValue="100 / 100" /></Field></>,
    拉伸: <><Field label="拉伸窗口 / 选择集"><select><option>当前选择集</option><option>交叉窗口</option></select></Field><Field label="位移向量"><input defaultValue='{"x": 100, "y": 0, "z": 0}' /></Field></>,
    圆角: <><Field label="第二个实体"><select><option>获取实体对象.entities[1]</option></select></Field><Field label="圆角半径"><input type="number" defaultValue="5" /></Field></>,
  };
  return <><ConfigSection title="编辑动作"><Field label="操作"><select value={operation} onChange={(event) => setOperation(event.target.value)}><option value="">请选择编辑操作</option>{Object.keys(operationFields).map((item) => <option key={item}>{item}</option>)}</select></Field>{operation && <><Field label="输入实体"><select><option>获取实体对象.entities</option><option>CAD 查询.matched_entities</option></select></Field>{operationFields[operation]}</>}</ConfigSection>{operation && <CommonCadWriteConfig />}<OutputSection items="edited_entities / change_set" /></>;
}

function PreviewConfirmConfig() {
  const [decision, setDecision] = useState("");
  return <ConfigSection title="预览与确认策略"><span className="field-caption">预览方式（可多选）</span><div className="check-grid"><label><input type="checkbox" defaultChecked />改动前后对比</label><label><input type="checkbox" defaultChecked />改动处高亮</label><label><input type="checkbox" defaultChecked />改动点汇总</label></div><Field label="用户取消时"><select value={decision} onChange={(event) => setDecision(event.target.value)}><option value="">请选择取消处理方式</option><option value="stop">放弃执行并结束</option><option value="return">回流到指定节点</option></select></Field>{decision === "return" && <Field label="回流节点"><select><option>回到 LLM 检查节点</option><option>回到 CAD 写入预览节点</option></select></Field>}</ConfigSection>;
}

function CommonCadWriteConfig() {
  return <ConfigSection title="通用写入控制"><Field label="目标图纸"><select><option>当前打开图纸</option><option>云空间当前版本</option></select></Field><Field label="写入模式"><select><option>先 dry-run 预览</option><option>仅生成变更计划</option></select></Field><Field label="执行前确认"><select><option>必须人工确认</option><option>由预览确认节点决定</option></select></Field></ConfigSection>;
}

function CadInputConfig() {
  const [source, setSource] = useState("");
  const [scope, setScope] = useState("");
  const [connecting, setConnecting] = useState(false);
  useEffect(() => {
    if (source !== "local") return undefined;
    setConnecting(true);
    const timer = setTimeout(() => setConnecting(false), 650);
    return () => clearTimeout(timer);
  }, [source]);
  return <ConfigSection title="图纸输入">
    <Field label="文件来源"><select value={source} onChange={(event) => { setSource(event.target.value); setScope(""); }}><option value="">请选择文件来源</option><option value="cloud">云空间文件</option><option value="local">本地 CAD 文件</option></select></Field>
    {source === "cloud" && <Field label="选择云空间图纸"><select defaultValue="办公楼二层平面图.dwg"><option>办公楼二层平面图.dwg · v1.1</option><option>地下车库综合图.dwg · v2.3</option><option>园区总平面图.dxf · v1.4</option></select></Field>}
    {source === "local" && <div className="local-cad-source"><Field label="本地 CAD 文件"><select defaultValue="办公楼二层平面图.dwg"><option>办公楼二层平面图.dwg（当前打开）</option><option>当前 CAD 选择集</option></select></Field><div className={`cad-connection ${connecting ? "connecting" : "connected"}`}><span>{connecting ? <i className="spinner small" /> : <CheckCircle size={15} weight="fill" />}</span><div><b>{connecting ? "正在连接本地 CAD…" : "已连接本地 CAD"}</b><small>{connecting ? "正在读取当前打开的图纸" : "ZWCAD 2025 · 办公楼二层平面图.dwg"}</small></div><button type="button" onClick={() => { setConnecting(true); setTimeout(() => setConnecting(false), 650); }}>重新连接</button></div></div>}
    {source && <Field label="读取范围"><select value={scope} onChange={(event) => setScope(event.target.value)}><option value="">请选择读取范围</option><option value="selection">当前选择集</option><option value="model">全部模型空间</option><option value="layer">指定图层</option><option value="type">指定对象类型</option></select></Field>}
    {scope === "selection" && <div className="dependent-note"><b>当前选择集</b><span>运行时读取用户在 ZWCAD 中当前选中的对象。</span></div>}
    {scope === "layer" && <Field label="图层"><select><option value="">请选择图层</option><CadLayerOptions /></select></Field>}
    {scope === "type" && <Field label="对象类型"><select><option value="">请选择对象类型</option>{CAD_ENTITY_TYPES.map((type) => <option key={type}>{type}</option>)}</select></Field>}
  </ConfigSection>;
}

function ConfigSection({ title, children }) { return <div className="form-section"><h4>{title}</h4>{children}</div>; }
function Field({ label, children }) { return <label>{label}{children}</label>; }
function OutputSection({ items }) { return <ConfigSection title="输出变量"><div className="output-vars">{items.split("/").map((item) => <code key={item}>{item.trim()}</code>)}</div></ConfigSection>; }

function KnowledgeChunkSchema() {
  return <ConfigSection title="KnowledgeChunk 字段"><div className="output-vars"><code>content</code><code>title</code><code>document_id</code><code>document_name</code><code>page</code><code>metadata</code><code>score</code><code>content_type</code></div></ConfigSection>;
}

function NodeOutput({ node, kind }) {
  const outputs = { "cad-input": ["drawing: object", "selection_set: array<Entity>", "entities: array<Entity>"], "cad-entity-select": ["entities: array<Entity>", "selection_set: array<Entity>", "count: number"], "cad-entity-properties": ["properties: array<EntityProperty>", "geometry: array<Geometry>", "entities: array<Entity>"], "cad-query": ["query_result: object", "matched_entities: array<Entity>"], "cad-process": ["processed_entities: array<Entity>", "exceptions: array<object>"], rag: ["results: array<KnowledgeChunk>", "retrieval_context: string"], llm: ["text: string", "structured_result: object"], "text-inspection": ["texts: array<object>", "issues: array<object>"], "table-inspection": ["tables: array<object>", "issues: array<object>"], "mechanical-symbol-inspection": ["symbols: array<object>", "issues: array<object>"], "frame-inspection": ["frames: array<object>", "issues: array<object>"], "layout-segmentation": ["regions: array<object>", "issues: array<object>"], code: ["result: object", "logs: array<string>"], human: ["approved: boolean", "comment: string"], "cad-preview-confirm": ["approved: boolean", "preview: object", "comment: string"] };
  const inputPorts = node?.data?.inputs || ["input: object"];
  const outputPorts = node?.data?.outputs || outputs[kind] || getPortContract(kind).outputs || ["result: object", "logs: array<string>"];
  return <div className="node-output-panel"><span className="status published">端口契约已就绪</span><div className="port-group"><h4>输入端口</h4>{inputPorts.map((port) => <div className="port-row" key={port}><span className="port-dot input" /><code>{port}</code><small>未连接时运行前校验</small></div>)}</div><div className="port-group"><h4>输出端口</h4>{outputPorts.map((port) => <div className="port-row" key={port}><span className="port-dot output" /><code>{port}</code><button className="icon-button" title="复制端口名" onClick={() => navigator.clipboard?.writeText(port)}><Code size={12}/></button></div>)}</div><pre>{`{\n  "${outputPorts[0].split(":")[0]}": "…",\n  "status": "ready"\n}`}</pre><p>实际运行后会显示节点输出、耗时和变量映射。</p></div>;
}

function NodeLogPanel({ node, running, onSingleStep }) {
  const isCurrent = Boolean(node.data.running) || running;
  return <div className="node-log-panel"><div className="node-log-head"><span className={isCurrent ? "log-running" : "log-success"} />{isCurrent ? "正在执行节点" : "最近一次调试记录"}</div><div className="log-lines"><p><time>09:42:08.104</time><span>开始处理 {node.data.title}</span></p><p><time>09:42:08.387</time><span>读取输入变量并完成校验</span></p><p><time>09:42:08.816</time><span>{isCurrent ? "正在生成节点输出…" : "输出变量已写入工作流上下文"}</span></p></div><div className="node-log-actions"><button className="secondary" onClick={() => onSingleStep?.(node.id)} disabled={running}><Play size={13} weight="fill" />单步调试</button><button className="secondary">查看完整节点日志</button></div></div>;
}

function SkillHeaderAction({ disabled }) {
  const [open, setOpen] = useState(false);
  return <><button className="skill-header-button" onClick={() => setOpen(true)} disabled={disabled} title={disabled ? "发布后才能创建 Skill" : "将已发布 Workflow 封装为 Skill"}><Sparkle size={16} />创建 Skill</button>{open && <SkillDetailModal skill={workflowSkills[0]} onClose={() => setOpen(false)} onToast={() => setOpen(false)} />}</>;
}

function EditorHeader({ onSave, onAction, onDebug, onRun, onVersions, onPublish, running, workflowStatus }) {
  const [scope] = useProductScope();
  return <header className="editor-header"><Brand /><div className="editor-surface-switch">{scope !== "1.0" && <SurfaceSwitch compact />}</div><div className="breadcrumb"><span>插件端 · Workflow 编辑器</span><b>/</b><strong>图纸规范化助手</strong><span className={`editor-status-badge ${workflowStatus === "已发布" ? "published" : "draft"}`}>{workflowStatus}</span></div><div className="editor-actions"><button onClick={onVersions}><ClockCounterClockwise size={17} />版本</button><button onClick={onSave}><FloppyDisk size={17} />保存草稿</button><button onClick={onDebug}><Code size={17} />调试</button>{scope !== "1.0" && <SkillHeaderAction disabled={workflowStatus !== "已发布"} />}<button onClick={onPublish}><RocketLaunch size={17} />{workflowStatus === "已发布" ? "重新发布" : "发布"}<CaretDown size={13} /></button><button className="run-button" onClick={onRun} disabled={running}>{running ? <><span className="spinner small" />运行中</> : <><Play size={16} weight="fill" />运行</>}</button></div></header>;
}

function VersionHistory({ versions, onClose }) {
  return <div className="modal-backdrop version-backdrop" onMouseDown={(event) => event.target === event.currentTarget && onClose()}><aside className="version-drawer" role="dialog" aria-modal="true" aria-label="工作流版本历史"><div className="drawer-head"><div><span className="eyebrow">图纸规范化助手</span><h2>版本历史</h2><p>保存只更新草稿；发布时才会生成正式版本。</p></div><button className="icon-button" onClick={onClose}><X size={19} /></button></div><div className="drawer-timeline">{versions.map((version, index) => <div className="workflow-version" key={version.id}><span className="timeline-dot"><Check size={12} weight="bold" /></span>{index < versions.length - 1 && <i /> }<div className="workflow-version-main"><div><b>{version.label}</b>{index === 0 && <span>{version.status || "正式版本"}</span>}</div><p>{version.note}</p><small>{version.updated} · {version.nodes} 个节点 · {version.editor}</small></div><button className="secondary" onClick={() => onClose()}>查看</button></div>)}</div><footer><Info size={16} />草稿可以调试；API、Agent、MCP 只调用已发布版本。</footer></aside></div>;
}

function ReviewPanel({ onCompare, onConfirm, onClose, success }) {
  if (success) return <div className="review-panel success-panel"><div className="success-icon"><Check size={26} weight="bold" /></div><div><h3>12 项修改已安全执行</h3><p>已保留原图，并创建新版本 <b>v1.1</b>。你可以在历史记录中查看或回滚。</p></div><div className="success-actions"><button className="secondary">查看执行记录</button><button className="primary">返回画布</button></div></div>;
  return <section className="review-panel"><div className="review-head"><div className="review-title"><ClockCounterClockwise size={22} /><h3>执行确认</h3><span>等待您的确认</span></div><div className="risk">风险等级：<b>低风险</b></div><button className="icon-button" onClick={onClose}><X size={16} /></button></div><p className="review-note">AI 将基于修改方案对图纸执行写入操作，请在确认前查看预览结果。</p>
    <div className="review-content"><button className="preview-card" onClick={onCompare}><span>修改前（当前图纸）</span><div className="preview-image"><img src={beforeImage} alt="修改前 CAD 图纸" /><i><ArrowsOut size={17} />点击放大</i></div></button><div className="preview-arrow">→</div><button className="preview-card" onClick={onCompare}><span>修改后（预览结果）</span><div className="preview-image"><img src={afterImage} alt="修改后 CAD 图纸" /><i><ArrowsOut size={17} />点击放大</i></div></button>
      <div className="change-summary"><h4>发现 <b>12</b> 项可修改内容</h4><dl><div><dt>图层</dt><dd>5 项</dd></div><div><dt>标注</dt><dd>4 项</dd></div><div><dt>尺寸</dt><dd>2 项</dd></div><div><dt>文字</dt><dd>1 项</dd></div></dl></div>
      <div className="review-warning"><h4>重要提示</h4><p>• 确认后自动应用修改并更新图纸。</p><p>• 原图不会被覆盖，将自动创建新版本。</p></div></div>
    <div className="review-footer"><div className="legend"><span><i className="green" />新增</span><span><i className="amber" />修改</span><span><i className="blue" />移动</span><span><i className="red" />删除</span></div><div><button className="secondary" onClick={onCompare}>查看差异</button><button className="primary" onClick={onConfirm}>确认执行</button></div></div></section>;
}

function DebugPanel({ running, debugNodeId, onClose, onReview }) {
  const steps = running ? [
    ["编译工作流", "正在校验节点连接与变量引用", "running"],
    ["读取图纸", "已加载办公楼二层平面图.dwg", "done"],
    ["检索企业规范", "等待上游节点输出", "waiting"],
  ] : [
    ["编译工作流", "5 个节点、4 条连接，校验通过", "done"],
    ["节点级调试", "可在右侧节点属性的「日志」查看输入输出", "done"],
    ["运行准备", "图纸写入将在人工确认后执行", "waiting"],
  ];
  return <section className="debug-panel"><div className="debug-head"><div><Code size={19} /><div><h3>{debugNodeId ? "节点单步调试" : running ? "编译与运行调试" : "工作流调试"}</h3><p>{debugNodeId ? `正在检查节点 ${debugNodeId} 的输入、输出与耗时` : running ? "正在实时输出流程执行日志" : "已完成编译检查，可查看各节点的调试记录"}</p></div></div><div><span className={running || debugNodeId ? "debug-status running" : "debug-status"}>{running || debugNodeId ? "运行中" : "编译通过"}</span><button className="icon-button" onClick={onClose}><X size={16} /></button></div></div><div className="debug-content"><div className="debug-steps">{steps.map(([title, detail, state]) => <div className={`debug-step ${state}`} key={title}><span>{state === "done" ? <Check size={13} weight="bold" /> : state === "running" ? <i className="spinner small" /> : <ClockCounterClockwise size={13} />}</span><div><b>{title}</b><p>{detail}</p></div><time>{state === "done" ? "09:42:08" : "等待中"}</time></div>)}</div></div><footer><span><Info size={15} />草稿可单步或全流程调试；只有发布版本可被外部入口调用。</span><div>{!running && !debugNodeId && <button className="execution-entry" onClick={onReview}><WarningCircle size={16} weight="fill" />进入执行确认 <b>12 项修改</b></button>}<button className="secondary">导出调试日志</button></div></footer></section>;
}

function CompareModal({ onClose, onConfirm, preview }) {
  if (preview?.preview) {
    const changes = preview.preview.changes || [];
    return <div className="modal-backdrop" onMouseDown={(e) => e.target === e.currentTarget && onClose()}><div className="compare-modal" role="dialog" aria-modal="true" aria-label="CAD 变更预览">
      <div className="compare-header"><div><span className="soft-tag"><WarningCircle size={14} weight="fill" />MCP dry-run</span><h2>真实 CAD 变更预览</h2><p>以下结果来自执行引擎的只读/预览调用；未确认前不会写入当前图纸。</p></div><button className="close-large" onClick={onClose}><X size={20} /></button></div>
      <div className="compare-body"><aside className="change-list" style={{ width: "100%" }}><div className="change-list-head"><div><h3>{changes.length} 个 CAD 写入节点</h3><p>预览哈希：{preview.preview_hash?.slice(0, 12)}</p></div><span className="low-risk"><CheckCircle size={14} weight="fill" />等待确认</span></div>{changes.map((change, index) => <div className="review-warning" key={`${change.tool}-${index}`}><h4>{change.tool}</h4><pre>{JSON.stringify(change.preview, null, 2)}</pre></div>)}<div className="rule-source"><b>RAG 依据</b>{(preview.preview.citations || []).map((citation, index) => <p key={index}>{citation.document} · {citation.chunk} · 相似度 {citation.score}</p>)}</div></aside></div>
      <div className="compare-footer"><span><Info size={16} weight="fill" />确认后会复用本次预览哈希；哈希不匹配时服务端将拒绝写入。</span><button className="primary" onClick={onConfirm}>确认进入执行</button></div>
    </div></div>;
  }
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

function WorkflowAIAssistant({ open, onClose, messages, prompt, onPromptChange, onSubmit, busy, onSuggestion }) {
  if (!open) return null;
  return <aside className="workflow-ai-panel" aria-label="AI 工作流搭建助手">
    <header className="workflow-ai-head"><div><span className="workflow-ai-kicker"><Sparkle size={14} weight="fill" />AI 助手</span><h2>自然语言搭建工作流</h2><p>描述目标，我会生成节点与连线。</p></div><button className="icon-button" onClick={onClose} aria-label="关闭 AI 助手"><X size={17} /></button></header>
    <div className="workflow-ai-scope"><Sparkle size={15} weight="fill" /><span><b>仅限工作流搭建</b><small>不会执行 CAD 操作，也不会修改图纸</small></span></div>
    <div className="workflow-ai-messages" role="log" aria-live="polite">{messages.map((message, index) => <div className={`workflow-ai-message ${message.role}`} key={`${message.role}-${index}`}><span>{message.role === "assistant" ? <Sparkle size={13} weight="fill" /> : "你"}</span><p>{message.text}</p></div>)}{busy && <div className="workflow-ai-message assistant"><span><Sparkle size={13} weight="fill" /></span><p className="workflow-ai-thinking"><i />正在分析节点与连接关系…</p></div>}</div>
    <div className="workflow-ai-suggestions"><small>试试这样描述</small><button onClick={() => onSuggestion("读取当前图纸，检查图层和标注，生成预览后等待人工确认")}>规范检查并预览</button><button onClick={() => onSuggestion("读取图纸后查询所有实体，并按图层分组")}>查询并分组实体</button></div>
    <form className="workflow-ai-composer" onSubmit={(event) => { event.preventDefault(); onSubmit(); }}><textarea value={prompt} onChange={(event) => onPromptChange(event.target.value)} placeholder="例如：读取当前图纸，检查图层命名并生成可确认的修改预览" rows={3} disabled={busy} /><div><small>生成结果会追加到当前画布</small><button className="primary" type="submit" disabled={busy || !prompt.trim()} aria-label="生成工作流"><PaperPlaneTilt size={15} weight="fill" /></button></div></form>
  </aside>;
}

function getEditorInitialGraph(scope, blank) {
  if (blank) return { nodes: [], edges: [] };
  if (scope !== "1.0") return { nodes: initialNodes, edges: initialEdges };
  const removedKinds = new Set(["rag", "knowledge-qa"]);
  const nodes = initialNodes.filter((node) => !removedKinds.has(node.data?.kind));
  const nodeIds = new Set(nodes.map((node) => node.id));
  const edges = initialEdges.filter((edge) => nodeIds.has(edge.source) && nodeIds.has(edge.target));
  if (nodeIds.has("read") && nodeIds.has("inspect") && !edges.some((edge) => edge.source === "read" && edge.target === "inspect")) {
    edges.unshift({ id: "edge-v1-read-inspect", source: "read", target: "inspect", animated: false, style: { stroke: "#53a3ff", strokeWidth: 2 } });
  }
  return { nodes, edges };
}

function EditorPage() {
  const { id } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const [scope] = useProductScope();
  const blank = new URLSearchParams(location.search).get("blank") === "1";
  const autoRun = new URLSearchParams(location.search).get("run") === "1";
  const initialGraph = getEditorInitialGraph(scope, blank);
  const [nodes, setNodes, onNodesChange] = useNodesState(initialGraph.nodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialGraph.edges);
  const [selectedId, setSelectedId] = useState(blank ? null : "proposal");
  const [inspectorOpen, setInspectorOpen] = useState(true);
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
  const [aiAssistantOpen, setAiAssistantOpen] = useState(false);
  const [aiPrompt, setAiPrompt] = useState("");
  const [aiBusy, setAiBusy] = useState(false);
  const [aiMessages, setAiMessages] = useState([{ role: "assistant", text: "告诉我你想搭建什么流程，我会把自然语言转换成可编辑的节点画布。" }]);
  const [activeRun, setActiveRun] = useState(null);
  const [preview, setPreview] = useState(null);
  const [workflowStatus, setWorkflowStatus] = useState("草稿");
  const [debugNodeId, setDebugNodeId] = useState(null);
  const [workflowVersions, setWorkflowVersions] = useState([
    { id: "wf-v1-3", label: "v1.3", note: "发布前保存", updated: "今天 09:42", nodes: 5, editor: "张工" },
    { id: "wf-v1-2", label: "v1.2", note: "补充安全确认节点", updated: "昨天 17:20", nodes: 5, editor: "张工" },
    { id: "wf-v1-1", label: "v1.1", note: "初始规范化流程", updated: "07月16日 14:08", nodes: 4, editor: "王工" },
  ]);
  const wrapperRef = useRef(null);
  const workspaceRef = useRef(null);
  const flowApiRef = useRef(null);
  const eventStreamRef = useRef(null);
  const autoRunStarted = useRef(false);
  const selectedNode = nodes.find((n) => n.id === selectedId);
  useEffect(() => {
    if (scope !== "1.0") return;
    const removedKinds = new Set(["rag", "knowledge-qa"]);
    setNodes((items) => items.filter((node) => !removedKinds.has(node.data?.kind)));
    setEdges((items) => {
      const allowed = new Set(nodes.filter((node) => !removedKinds.has(node.data?.kind)).map((node) => node.id));
      const next = items.filter((edge) => allowed.has(edge.source) && allowed.has(edge.target));
      if (allowed.has("read") && allowed.has("inspect") && !next.some((edge) => edge.source === "read" && edge.target === "inspect")) {
        next.unshift({ id: "edge-v1-read-inspect", source: "read", target: "inspect", animated: false, style: { stroke: "#53a3ff", strokeWidth: 2 } });
      }
      return next;
    });
  }, [scope]);
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
  const buildWorkflowFromPrompt = () => {
    const text = aiPrompt.trim();
    if (!text || aiBusy) return;
    setAiMessages((messages) => [...messages, { role: "user", text }]);
    setAiPrompt("");
    setAiBusy(true);
    window.setTimeout(() => {
      const lower = text.toLowerCase();
      const kinds = [];
      const addKind = (kind) => { if (!kinds.includes(kind)) kinds.push(kind); };
      if (/(读取|图纸|选择集|当前图纸|dwg|dxf)/i.test(text)) addKind("cad-input");
      if (/(查询|查找|实体|图层|图元|分组)/i.test(text)) addKind(/分组/.test(text) ? "cad-entity-select" : "cad-query");
      if (scope !== "1.0" && /(知识库|规范|标准|规则)/i.test(text)) addKind("rag");
      if (/(检查|识别|分析|标注|尺寸|文字|分类)/i.test(text)) addKind("llm");
      if (/(预览|确认|审批|人工)/i.test(text)) addKind("cad-preview-confirm");
      if (/(写入|修改|修正|执行|统一)/i.test(text)) addKind("cad-write");
      const catalogItems = nodeCatalog.flatMap((group) => group.items.map(([type, name, desc]) => ({ type, name, desc, color: group.color })));
      const plan = kinds.map((kind) => catalogItems.find((item) => item.type === kind)).filter(Boolean);
      if (!plan.length) {
        setAiMessages((messages) => [...messages, { role: "assistant", text: scope === "1.0" ? "我目前只负责搭建 1.0 工作流节点。请描述图纸读取、查询、检查、预览确认或写入等步骤。" : "我目前只负责搭建工作流节点。请描述图纸读取、查询、知识检索、检查、预览确认或写入等步骤。" }]);
        setAiBusy(false);
        return;
      }
      const stamp = Date.now();
      const created = plan.map((item, index) => createWorkflowNode(item, { x: 110 + ((nodes.length + index) % 4) * 210, y: 300 + Math.floor((nodes.length + index) / 4) * 150 }, `ai-node-${stamp}-${index}`));
      setNodes((items) => [...items, ...created]);
      setEdges((items) => {
        const links = [];
        if (nodes.length && created.length) links.push({ id: `ai-edge-${stamp}-start`, source: nodes[nodes.length - 1].id, target: created[0].id, style: { stroke: "#53a3ff", strokeWidth: 2 } });
        for (let index = 1; index < created.length; index += 1) links.push({ id: `ai-edge-${stamp}-${index}`, source: created[index - 1].id, target: created[index].id, style: { stroke: "#53a3ff", strokeWidth: 2 } });
        return [...items, ...links];
      });
      setSelectedId(created[created.length - 1].id);
      setAiMessages((messages) => [...messages, { role: "assistant", text: `已根据描述生成 ${created.length} 个节点，并追加到当前画布。你可以继续描述下一步，或直接拖动节点调整流程。` }]);
      setAiBusy(false);
      setToast(`AI 已生成 ${created.length} 个工作流节点`);
    }, 420);
  };
  const updateSelected = (key, value) => setNodes((nds) => nds.map((n) => n.id === selectedId ? { ...n, data: { ...n.data, [key]: value } } : n));
  const deleteSelected = () => { setNodes((nds) => nds.filter((n) => n.id !== selectedId)); setEdges((eds) => eds.filter((e) => e.source !== selectedId && e.target !== selectedId)); setSelectedId(null); };
  useEffect(() => () => eventStreamRef.current?.close(), []);
  const runWorkflow = async () => {
    if (running) return;
    try {
      const validation = await platformApi.validateWorkflow({ nodes, edges });
      if (!validation.valid) {
        setBottomOpen(true);
        setToast(`工作流不可执行：${validation.issues.map((issue) => issue.message).join("；")}`);
        return;
      }
      setRunning(true); setExecuted(false); setBottomOpen(true); setPreview(null);
      const response = await platformApi.startRun({ graph: { nodes, edges } });
      setActiveRun(response.run_id);
      eventStreamRef.current?.close();
      eventStreamRef.current = platformApi.events(response.run_id, (name, payload) => {
        if (name === "node.started") setNodes((items) => items.map((node) => node.id === payload.node_id ? { ...node, data: { ...node.data, running: true, status: "idle" } } : node));
        if (name === "node.completed") setNodes((items) => items.map((node) => node.id === payload.node_id ? { ...node, data: { ...node.data, running: false, status: "success", output: payload.output } } : node));
        if (name === "node.failed") { setRunning(false); setToast(payload.message || "节点运行失败"); }
        if (name === "run.awaiting_confirmation") { setRunning(false); setPreview(payload); setCompareOpen(true); setToast("已生成 MCP dry-run 预览，等待确认"); }
        if (name === "run.completed") { setRunning(false); setExecuted(true); setToast("工作流已完成"); }
        if (name === "run.failed") { setRunning(false); setToast(payload.issues?.map((issue) => issue.message).join("；") || "工作流运行失败"); }
      }, () => setRunning(false));
    } catch (error) { setRunning(false); setToast(`无法连接本地执行 API：${error.message}`); }
  };
  useEffect(() => {
    if (!autoRun || autoRunStarted.current) return undefined;
    autoRunStarted.current = true;
    const timer = window.setTimeout(() => runWorkflow(), 320);
    return () => window.clearTimeout(timer);
  }, [autoRun]);
  const executeChanges = async () => {
    if (!activeRun || !preview?.preview_hash) return;
    setExecuting(true);
    try { await platformApi.confirmRun(activeRun, preview.preview_hash); setConfirmOpen(false); setExecuted(true); setToast("已确认并提交 CAD 写入任务"); }
    catch (error) { setToast(`确认失败：${error.message}`); }
    finally { setExecuting(false); }
  };
  const saveWorkflow = async () => {
    try {
      const saved = await platformApi.saveWorkflow({ id, name: "图纸规范化助手", graph: { nodes, edges } });
      setWorkflowStatus("草稿");
      setToast("草稿已保存到 SQLite；发布后才会生成正式版本");
    } catch (error) { setToast(`保存失败：${error.message}`); }
  };
  const publishWorkflow = async () => {
    try {
      const saved = await platformApi.saveWorkflow({ id, name: "图纸规范化助手", graph: { nodes, edges } });
      setWorkflowStatus("已发布");
      setWorkflowVersions((items) => [{ id: `wf-p-${Date.now()}`, label: `v${saved.version}.0`, note: "当前草稿已冻结并发布", updated: "刚刚", nodes: nodes.length, editor: "张工", status: "正式版本" }, ...items]);
      setToast(`已发布 v${saved.version}.0；插件端、API 与 MCP 将使用此版本`);
    } catch (error) { setToast(`发布失败：${error.message}`); }
  };
  const singleStepDebug = (nodeId) => {
    setBottomOpen(true); setDebugNodeId(nodeId); setNodes((items) => items.map((node) => node.id === nodeId ? { ...node, data: { ...node.data, running: true, status: "idle" } } : node));
    setTimeout(() => { setNodes((items) => items.map((node) => node.id === nodeId ? { ...node, data: { ...node.data, running: false, status: "success", output: { debug: true, node_id: nodeId, checked_at: new Date().toISOString() } } } : node)); setDebugNodeId(null); setToast("单步调试完成：已生成实际输入/输出快照"); }, 900);
  };
  const openDebug = () => { setBottomOpen(true); setToast("已展开工作流编译与调试模块"); };
  const runFromCad = () => navigate(`/copilot?workflow=${id || "drawing-standardizer"}&run=1`);
  const editorHeader = <EditorHeader onSave={saveWorkflow} onAction={setToast} onDebug={openDebug} onRun={runFromCad} onPublish={publishWorkflow} onVersions={() => setVersionsOpen(true)} running={running} workflowStatus={workflowStatus} />;
  return <AppShell editor editorHeader={editorHeader}><div className="editor-page"><div className={`editor-grid ${inspectorOpen ? "" : "inspector-closed"}`}><NodePalette onDragStart={onDragStart} onAdd={addNode} /><div className="workspace-center" ref={workspaceRef}><div className="flow-area" ref={wrapperRef} onDrop={onDrop} onDragOver={(e) => { e.preventDefault(); e.dataTransfer.dropEffect = "move"; }}><div className="canvas-status"><span>图纸规范化流程</span><i />{workflowStatus === "已发布" ? "正式版本可被调用" : "草稿 · 仅可调试"}</div><WorkflowAIAssistant open={aiAssistantOpen} onClose={() => setAiAssistantOpen(false)} messages={aiMessages} prompt={aiPrompt} onPromptChange={setAiPrompt} onSubmit={buildWorkflowFromPrompt} busy={aiBusy} onSuggestion={(suggestion) => { setAiPrompt(suggestion); }} /><div className="canvas-toolbar"><button className={`canvas-ai-button ${aiAssistantOpen ? "active" : ""}`} onClick={() => { setAiAssistantOpen((open) => !open); setViewMenuOpen(false); setNewNodeMenuOpen(false); }} aria-label="打开 AI 工作流助手"><Sparkle size={15} weight="fill" /><span>AI 助手</span></button><div className="canvas-tool-wrap"><button className="canvas-tool" onClick={() => { setViewMenuOpen((open) => !open); setNewNodeMenuOpen(false); }} aria-label="画布缩放"><MagnifyingGlass size={17} /></button>{viewMenuOpen && <div className="canvas-popover zoom-popover"><button onClick={() => flowApiRef.current?.zoomIn()}>放大画布 <Plus size={14} /></button><button onClick={() => flowApiRef.current?.zoomOut()}>缩小画布 <Minus size={14} /></button><button onClick={() => flowApiRef.current?.fitView({ padding: .12 })}>适配画布 <ArrowsOut size={14} /></button></div>}</div><div className="canvas-tool-wrap"><button className="canvas-add-node" onClick={() => { setNewNodeMenuOpen((open) => !open); setViewMenuOpen(false); }}><Plus size={16} />新增节点</button>{newNodeMenuOpen && <div className="canvas-popover add-node-popover">{nodeCatalog.map((group) => <div key={group.group}><b>{group.group}</b>{group.items.map(([type, name, desc]) => <button key={type} disabled={type === "code"} title={type === "code" ? "首版安全禁用" : undefined} onClick={() => addNode({ type, name, desc, color: group.color })}><span style={{ background: group.color }}><Cube size={12} weight="fill" /></span><div><strong>{name}</strong><small>{type === "code" ? "首版安全禁用" : desc}</small></div></button>)}</div>)}</div>}</div></div><ReactFlow nodes={nodes} edges={edges} onNodesChange={onNodesChange} onEdgesChange={onEdgesChange} onConnect={onConnect} onNodeClick={(_, n) => { setSelectedId(n.id); setInspectorOpen(true); }} onInit={(instance) => { flowApiRef.current = instance; }} nodeTypes={workflowNodeTypes} fitView fitViewOptions={{ padding: .055 }} minZoom={.5} maxZoom={1.5} deleteKeyCode={["Backspace", "Delete"]} proOptions={{ hideAttribution: true }}><Background color="#3d4651" gap={18} size={1} /><MiniMap position="bottom-right" style={{ width: 116, height: 78 }} pannable={false} zoomable={false} nodeColor={(n) => n.data.color} maskColor="rgba(18,24,31,.72)" /></ReactFlow>{running && <div className="run-log"><span className="spinner small" /><div><b>正在运行工作流</b><small>执行引擎正在处理节点输出…</small></div></div>}</div>{bottomOpen && <div className="bottom-panel" style={{ flexBasis: bottomHeight }}><div className={`resize-handle ${resizingBottom ? "active" : ""}`} onPointerDown={(event) => { event.preventDefault(); setResizingBottom(true); }}><span /></div><DebugPanel running={running} debugNodeId={debugNodeId} onClose={() => setBottomOpen(false)} onReview={() => preview && setCompareOpen(true)} /></div>}</div>{inspectorOpen && <Inspector node={selectedNode} onChange={updateSelected} onDelete={deleteSelected} onClose={() => { setSelectedId(null); setInspectorOpen(false); }} running={running} onSingleStep={singleStepDebug} />}</div>{versionsOpen && <VersionHistory versions={workflowVersions} onClose={() => setVersionsOpen(false)} />}{compareOpen && <CompareModal preview={preview} onClose={() => setCompareOpen(false)} onConfirm={() => { setCompareOpen(false); setConfirmOpen(true); }} />}{confirmOpen && <ConfirmDialog executing={executing} onCancel={() => setConfirmOpen(false)} onConfirm={executeChanges} />}{toast && <Toast message={toast} onClose={() => setToast("")} />}</div></AppShell>;
}

function createWorkflowNode(item, position, id) {
  const defaults = {
    "cad-input": { inputs: ["source: string"], outputs: ["drawing: object", "selection_set: array<Entity>", "entities: array<Entity>"] },
    "cad-entity-select": { inputs: ["drawing: object", "filter: object"], outputs: ["entities: array<Entity>", "count: number"] },
    "cad-query": { inputs: ["drawing: object", "query: string"], outputs: ["query_result: object", "matched_entities: array<Entity>"] },
    "cad-entity-properties": { inputs: ["entities: array<Entity>"], outputs: ["properties: array<EntityProperty>", "geometry: array<Geometry>", "entities: array<Entity>"] },
    "cad-process": { inputs: ["entities: array<Entity>", "rule: object"], outputs: ["processed_entities: array<Entity>", "exceptions: array<object>"] },
    "cad-create-geometry": { inputs: ["geometry: object", "layer: string"], outputs: ["created_entity: Entity", "handle: string", "change: Change"] },
    "cad-create-hatch": { inputs: ["boundary: array<Entity>"], outputs: ["hatch: Entity", "handle: string", "change: Change"] },
    "cad-create-text": { inputs: ["content: string", "position: Point"], outputs: ["text_entity: Entity", "handle: string", "change: Change"] },
    "cad-create-dimension": { inputs: ["entities: array<Entity>", "mode: string"], outputs: ["dimension: Entity", "handle: string", "change: Change"] },
    "cad-modify-entity": { inputs: ["entities: array<Entity>", "properties: object"], outputs: ["updated_entities: array<Entity>", "change_set: array<Change>"] },
    "cad-edit": { inputs: ["entities: array<Entity>", "operation: string", "parameters: object"], outputs: ["edited_entities: array<Entity>", "change_set: array<Change>"] },
    "cad-print": { inputs: ["drawing: object", "print_config: object"], outputs: ["file: string", "path: string", "verification: object"] },
    "cad-preview-confirm": { inputs: ["change_set: array<Change>"], outputs: ["approved: boolean", "preview: object", "comment: string"] },
    rag: { inputs: ["query: string"], outputs: ["results: array<KnowledgeChunk>", "retrieval_context: string"] },
    "knowledge-qa": { inputs: ["question: string", "results: array<KnowledgeChunk>"], outputs: ["answer: string", "citations: array<KnowledgeChunk>"] },
    llm: { inputs: ["context: object", "prompt: string"], outputs: ["text: string", "structured_result: object"] },
    classifier: { inputs: ["input: string", "categories: array<string>"], outputs: ["class: string", "confidence: number"] },
    prompt: { inputs: ["variables: object"], outputs: ["prompt_text: string"] },
    "text-inspection": { inputs: ["drawing: object", "region: object"], outputs: ["texts: array<object>", "issues: array<object>"] },
    "table-inspection": { inputs: ["drawing: object"], outputs: ["tables: array<object>", "issues: array<object>"] },
    "mechanical-symbol-inspection": { inputs: ["drawing: object"], outputs: ["symbols: array<object>", "issues: array<object>"] },
    "frame-inspection": { inputs: ["drawing: object"], outputs: ["frames: array<object>", "issues: array<object>"] },
    "layout-segmentation": { inputs: ["drawing: object"], outputs: ["regions: array<object>", "issues: array<object>"] },
    code: { inputs: ["context: object"], outputs: ["result: object", "logs: array<string>"] },
    branch: { inputs: ["value: unknown", "condition: object"], outputs: ["true: any", "false: any"] },
    loop: { inputs: ["items: array<any>"], outputs: ["item: any", "results: array<any>", "index: number"] },
    human: { inputs: ["trigger: object"], outputs: ["approved: boolean", "comment: string", "next: string"] },
    http: { inputs: ["params: object", "body: object"], outputs: ["status: number", "body: object", "headers: object"] },
    "cad-write": { inputs: ["change_set: object"], outputs: ["preview: object", "change_set: array<Change>"] },
  };
  return { id, type: "workflow", position, data: { kind: item.type, title: item.name, subtitle: item.desc, color: item.color, rows: [["输入", "待配置"], ["输出", "output"]], status: "idle", ...(defaults[item.type] || { inputs: ["input: object"], outputs: ["result: object"] }) } };
}

export function App() {
  return <BrowserRouter><Routes>
    <Route path="/" element={<DashboardPage />} />
    <Route path="/requirements" element={<RequirementDocumentPage />} />
    <Route path="/cad" element={<CadLocalPage />} />
    <Route path="/copilot" element={<CopilotPage />} />
    <Route path="/workflows" element={<WorkflowsPage />} />
    <Route path="/workflows/:id/editor" element={<EditorPage />} />
    <Route path="/knowledge" element={<KnowledgePage />} />
    <Route path="/cloud" element={<CloudPage />} />
    <Route path="/templates" element={<TemplatesPage />} />
    <Route path="/settings" element={<SettingsPage />} />
    <Route path="/web" element={<WebDashboardPage />} />
    <Route path="/web/nodes" element={<NodeCenterPage />} />
    <Route path="/web/knowledge/:id" element={<KnowledgeDetailPage />} />
    <Route path="/web/knowledge" element={<KnowledgePage />} />
    <Route path="/web/workflows" element={<WebWorkflowCenterPageV4 />} />
    <Route path="/web/cloud" element={<CloudPage />} />
    <Route path="/web/admin" element={<WebAdminPageV4 />} />
  </Routes></BrowserRouter>;
}

