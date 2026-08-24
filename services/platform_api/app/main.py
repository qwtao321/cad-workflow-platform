from __future__ import annotations

import asyncio
import json
import os
from pathlib import Path
from typing import Any
from fastapi import FastAPI, File, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, StreamingResponse
from fastapi.staticfiles import StaticFiles

from .contracts import ConfirmRequest, RunRequest, WorkflowGraph, WorkflowPayload
from .engine import WorkflowEngine
from .graph import validate_graph
from .store import Store

store = Store()
engine = WorkflowEngine(store)
app = FastAPI(title="CAD WorkFlow Platform API", version="0.1.0")
_cors_origins = [item.strip() for item in os.getenv("PLATFORM_CORS_ORIGINS", "").split(",") if item.strip()]
_cors_origins.extend(["http://localhost:5173", "http://127.0.0.1:5173", "https://cad-workflow.vercel.app"])
app.add_middleware(CORSMiddleware, allow_origins=sorted(set(_cors_origins)), allow_methods=["*"], allow_headers=["*"])


@app.get("/health")
def health():
    return {"status": "ok", "service": "platform-api"}


def _mcp_rows(payload: dict[str, Any]) -> list[dict[str, Any]]:
    rows = payload.get("data", [])
    if isinstance(rows, dict):
        rows = rows.get("items") or rows.get("layers") or rows.get("references") or []
    return [item for item in rows if isinstance(item, dict)] if isinstance(rows, list) else []


@app.get("/api/cad/context-options")
async def cad_context_options():
    document, layers_payload, blocks_payload = await asyncio.gather(
        engine.cad.call("get_current_document", {}),
        engine.cad.call("list_layers", {"detail": False}),
        engine.cad.call("list_block_references", {"scope": "all_layouts", "limit": 200}),
    )
    layers = [str(item.get("name")) for item in _mcp_rows(layers_payload) if item.get("name")]
    blocks = []
    for item in _mcp_rows(blocks_payload):
        name = item.get("effective_name") or item.get("block_name") or item.get("name")
        if name and str(name) not in blocks:
            blocks.append(str(name))
    return {
        "mode": "demo" if any(payload.get("mode") == "demo" for payload in (document, layers_payload, blocks_payload)) else "live",
        "document": document,
        "layers": layers,
        "blocks": blocks,
    }


@app.post("/api/workflows/validate")
def validate(graph: WorkflowGraph):
    return validate_graph(graph)


@app.post("/api/workflows")
def save_workflow(payload: WorkflowPayload):
    result = validate_graph(payload.graph)
    if not result.valid:
        raise HTTPException(422, {"issues": [issue.model_dump() for issue in result.issues]})
    return store.save_workflow(payload.name, payload.graph.model_dump(), payload.id)


@app.get("/api/workflows/{workflow_id}")
def get_workflow(workflow_id: str):
    workflow = store.get_workflow(workflow_id)
    if not workflow:
        raise HTTPException(404, "工作流不存在")
    return workflow


@app.post("/api/runs")
async def start_run(request: RunRequest):
    graph = request.graph
    if graph is None:
        if not request.workflow_id:
            raise HTTPException(422, "必须提供 workflow_id 或 graph")
        workflow = store.get_workflow(request.workflow_id)
        if not workflow:
            raise HTTPException(404, "工作流不存在")
        graph = WorkflowGraph.model_validate(workflow["graph"])
    run_id = store.create_run(graph.model_dump(), request.workflow_id)
    asyncio.create_task(engine.execute(run_id, graph))
    return {"run_id": run_id, "status": "queued"}


@app.get("/api/runs/{run_id}")
def get_run(run_id: str):
    run = store.get_run(run_id)
    if not run:
        raise HTTPException(404, "运行不存在")
    return run


@app.get("/api/runs/{run_id}/events")
async def events(run_id: str):
    if not store.get_run(run_id):
        raise HTTPException(404, "运行不存在")
    async def stream():
        cursor = 0
        while True:
            for item in store.events_after(run_id, cursor):
                cursor = item["id"]
                yield f"event: {item['event']}\ndata: {json.dumps(item['payload'], ensure_ascii=False)}\n\n"
            run = store.get_run(run_id)
            if run and run["status"] in {"completed", "failed", "awaiting_confirmation"}:
                break
            await asyncio.sleep(0.25)
    return StreamingResponse(stream(), media_type="text/event-stream")


@app.post("/api/runs/{run_id}/confirm")
async def confirm(run_id: str, request: ConfirmRequest):
    try:
        await engine.confirm(run_id, request.preview_hash)
    except ValueError as exc:
        raise HTTPException(409, str(exc)) from exc
    return store.get_run(run_id)


@app.get("/api/knowledge/documents")
def documents():
    return store.documents()


@app.post("/api/knowledge/documents")
async def upload_document(file: UploadFile = File(...)):
    content = (await file.read()).decode("utf-8", errors="replace")
    return store.add_document(file.filename or "未命名文档", file.content_type or "application/octet-stream", content)


@app.on_event("startup")
def seed_example_document():
    if store.documents():
        return
    sample = Path(__file__).resolve().parents[1] / "knowledge" / "示例 CAD 图层规范.md"
    if sample.exists():
        store.add_document(sample.name, "text/markdown", sample.read_text(encoding="utf-8"), "seed")


# The production React build is served by the API in local deployments, so the
# portal and its execution API are always reached through one localhost URL.
FRONTEND_DIST = Path(__file__).resolve().parents[3] / "dist"
if FRONTEND_DIST.exists():
    app.mount("/assets", StaticFiles(directory=FRONTEND_DIST / "assets"), name="assets")

    @app.get("/{path:path}", include_in_schema=False)
    def portal(path: str):
        return FileResponse(FRONTEND_DIST / "index.html")

