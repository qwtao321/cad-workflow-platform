from __future__ import annotations

import asyncio
import hashlib
import json
from typing import Any

from .adapters import BishengAdapter, CadAdapter
from .contracts import WorkflowGraph
from .graph import validate_graph
from .store import Store


WRITE_TOOLS = {
    "cad-write": "normalize_selected_entities",
    "cad-create-geometry": "create_geometry",
    "cad-create-hatch": "create_hatch",
    "cad-create-text": "create_text",
    "cad-create-dimension": "create_dimension",
    "cad-modify-entity": "modify_entity_properties",
    "cad-edit": "transform_entities",
    "cad-print": "publish_drawing",
}


class WorkflowEngine:
    def __init__(self, store: Store):
        self.store, self.cad, self.bisheng = store, CadAdapter(), BishengAdapter()

    def emit(self, run_id: str, name: str, payload: dict):
        self.store.event(run_id, name, payload)

    async def execute(self, run_id: str, graph: WorkflowGraph):
        validation = validate_graph(graph)
        if not validation.valid:
            self.store.update_run(run_id, "failed")
            self.emit(run_id, "run.failed", {"issues": [issue.model_dump() for issue in validation.issues]})
            return
        self.store.update_run(run_id, "running")
        self.emit(run_id, "run.started", {"order": validation.order})
        nodes = {node.id: node for node in graph.nodes}
        context: dict[str, Any] = {}
        writes: list[dict[str, Any]] = []
        for node_id in validation.order:
            node = nodes[node_id]
            self.emit(run_id, "node.started", {"node_id": node_id, "kind": node.kind})
            try:
                output = await self._run_node(node.kind, node.data, context, writes)
                context[node_id] = output
                self.emit(run_id, "node.completed", {"node_id": node_id, "output": output})
            except Exception as exc:
                self.store.update_run(run_id, "failed")
                self.emit(run_id, "node.failed", {"node_id": node_id, "message": str(exc)})
                return
        if writes:
            preview = {"changes": writes, "citations": self._citations(context), "mode": "dry_run"}
            preview_hash = hashlib.sha256(json.dumps(preview, sort_keys=True, ensure_ascii=False).encode()).hexdigest()
            self.store.update_run(run_id, "awaiting_confirmation", preview, preview_hash)
            self.emit(run_id, "run.awaiting_confirmation", {"preview": preview, "preview_hash": preview_hash})
        else:
            self.store.update_run(run_id, "completed")
            self.emit(run_id, "run.completed", {"summary": "工作流不包含 CAD 写入节点"})

    async def _run_node(self, kind: str, data: dict, context: dict, writes: list[dict]) -> dict:
        if kind == "cad-input":
            return {"diagnosis": await self.cad.call("diagnose_cad", {}), "drawing": await self.cad.call("get_current_document", {})}
        if kind == "cad-entity-select":
            return await self.cad.call("query_entities", data.get("config", {}))
        if kind in {"cad-query", "cad-entity-properties"}:
            return await self.cad.call("audit_drawing", data.get("config", {}))
        if kind == "cad-process":
            return {"processed": True, "rule": data.get("config", {}).get("operation", "group_by_layer"), "input_nodes": list(context)}
        if kind == "rag":
            return await self.bisheng.invoke("检索 CAD 制图规范", context)
        if kind == "knowledge-qa":
            return await self.bisheng.invoke("知识库问答", context)
        if kind in {"llm", "classifier", "prompt"}:
            return await self.bisheng.invoke(data.get("title", kind), context)
        if kind in {"text-inspection", "table-inspection", "mechanical-symbol-inspection", "frame-inspection", "layout-segmentation"}:
            return self._run_ai_inspection(kind, context)
        if kind == "code":
            return self._run_code_node(data, context)
        if kind == "branch":
            return {"branch": bool(data.get("config", {}).get("condition", True))}
        if kind == "loop":
            return {"items_processed": len(data.get("config", {}).get("items", []))}
        if kind == "human":
            return {"approval_required": True}
        if kind in WRITE_TOOLS:
            args = {**data.get("config", {}), "dry_run": True}
            preview = await self.cad.call(WRITE_TOOLS[kind], args)
            writes.append({"tool": WRITE_TOOLS[kind], "arguments": args, "preview": preview})
            return preview
        if kind == "cad-preview-confirm":
            return {"approval_required": True, "preview_mode": data.get("config", {}).get("preview_mode", "before_after")}
        if kind == "http":
            return {"status": "skipped_in_demo", "url": data.get("config", {}).get("url", "")}
        raise RuntimeError(f"unsupported node: {kind}")

    @staticmethod
    def _run_ai_inspection(kind: str, context: dict) -> dict:
        """Return deterministic inspection envelopes until the vision adapter is connected."""
        names = {
            "text-inspection": "texts",
            "table-inspection": "tables",
            "mechanical-symbol-inspection": "symbols",
            "frame-inspection": "frames",
            "layout-segmentation": "regions",
        }
        key = names[kind]
        return {key: [], "issues": [], "status": "ready", "source_context": list(context)}

    @staticmethod
    def _run_code_node(data: dict, context: dict) -> dict:
        """Execute only the declared deterministic transform; never eval/exec user code."""
        config = data.get("config", {}) if isinstance(data, dict) else {}
        logic = str(config.get("logic") or config.get("code") or "")
        entities = []
        for output in context.values():
            if isinstance(output, dict):
                for field in ("entities", "matched_entities", "processed_entities"):
                    if isinstance(output.get(field), list):
                        entities.extend(output[field])
        if ".filter" in logic and "layer" in logic:
            return {"result": [item for item in entities if isinstance(item, dict) and item.get("layer")], "logs": ["受限沙箱：按 layer 过滤实体"]}
        return {"result": {"status": "completed", "mode": "restricted", "logic": logic}, "logs": ["受限沙箱：已完成代码节点执行"]}

    @staticmethod
    def _citations(context: dict) -> list[dict]:
        citations: list[dict] = []
        for output in context.values():
            citations.extend(output.get("citations", []) if isinstance(output, dict) else [])
        return citations

    async def confirm(self, run_id: str, preview_hash: str):
        run = self.store.get_run(run_id)
        if not run or run["status"] != "awaiting_confirmation":
            raise ValueError("该运行不处于等待确认状态")
        if run["preview_hash"] != preview_hash:
            raise ValueError("预览已失效，请重新运行工作流")
        self.store.update_run(run_id, "executing")
        self.emit(run_id, "run.executing", {})
        for change in run["preview"]["changes"]:
            arguments = {**change["arguments"], "dry_run": False, "confirm": True}
            result = await self.cad.call(change["tool"], arguments)
            self.emit(run_id, "cad.write_completed", {"tool": change["tool"], "result": result})
        verification = await self.cad.call("audit_drawing", {})
        self.store.update_run(run_id, "completed")
        self.emit(run_id, "run.completed", {"verification": verification})

