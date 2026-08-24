from __future__ import annotations

import os
import json
from typing import Any
import httpx


class CadAdapter:
    """Adapter boundary for the ZWCAD streamable-HTTP MCP server.

    The local fallback deliberately returns read-only data and dry-run previews;
    a real MCP endpoint is required before any write can be committed.
    """
    def __init__(self):
        self.url = os.getenv("ZWCAD_MCP_URL", "").rstrip("/")

    async def call(self, tool: str, arguments: dict[str, Any]) -> dict[str, Any]:
        if not self.url:
            return self._demo(tool, arguments)
        # Keep the Vercel demo API lightweight; the MCP client is only needed
        # when a real local ZWCAD endpoint is configured.
        from mcp import ClientSession
        from mcp.client.streamable_http import streamablehttp_client

        async with streamablehttp_client(self.url) as (read, write, _):
            async with ClientSession(read, write) as session:
                await session.initialize()
                result = await session.call_tool(tool, arguments)
        if result.isError:
            raise RuntimeError("ZWCAD MCP 调用失败：" + " ".join(getattr(item, "text", "") for item in result.content))
        if result.structuredContent is not None:
            return result.structuredContent
        if result.content and hasattr(result.content[0], "text"):
            try:
                return json.loads(result.content[0].text)
            except (TypeError, ValueError):
                pass
        return result.model_dump(mode="json")

    def _demo(self, tool: str, arguments: dict[str, Any]) -> dict[str, Any]:
        if tool == "diagnose_cad":
            return {"mode": "demo", "connected": False, "message": "未配置 ZWCAD_MCP_URL；未连接真实图纸"}
        if tool in {"get_current_document", "audit_drawing"}:
            return {"mode": "demo", "document": "示例办公楼二层平面图.dwg", "layers": ["0", "C-WIND", "A-WALL"], "entity_count": 12}
        if tool == "list_layers":
            return {"mode": "demo", "success": True, "data": [{"name": name} for name in ["0", "A-WALL", "A-DOOR", "A-WIND", "A-DIMS", "A-TEXT"]]}
        if tool == "list_block_references":
            return {"mode": "demo", "success": True, "data": [{"name": name} for name in ["A3-图框", "门编号", "窗编号", "标高符号", "指北针"]]}
        if tool in {"normalize_selected_entities", "update_entity_properties", "ensure_layers"}:
            return {"mode": "demo", "dry_run": arguments.get("dry_run", True), "affected_handles": ["1A2", "1A3"], "changes": [{"handle": "1A2", "before": {"layer": "C-WIND"}, "after": {"layer": arguments.get("target_layer", "A-WIND")}}]}
        return {"mode": "demo", "tool": tool, "arguments": arguments}


class BishengAdapter:
    def __init__(self):
        self.url = os.getenv("BISHENG_EXECUTE_URL", "")
        self.token = os.getenv("BISHENG_API_TOKEN", "")

    async def invoke(self, task: str, context: dict[str, Any]) -> dict[str, Any]:
        if not self.url:
            return {"mode": "demo", "text": f"已依据示例 CAD 图层规范处理：{task}", "citations": [{"document": "示例 CAD 图层规范.md", "chunk": "2.1", "score": 0.93}]}
        headers = {"Authorization": f"Bearer {self.token}"} if self.token else {}
        async with httpx.AsyncClient(timeout=90) as client:
            response = await client.post(self.url, json={"task": task, "context": context}, headers=headers)
            response.raise_for_status()
            return response.json()

