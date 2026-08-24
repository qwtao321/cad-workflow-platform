from __future__ import annotations

from typing import Any, Literal
from pydantic import BaseModel, Field


JsonValue = Any


class GraphNode(BaseModel):
    id: str = Field(min_length=1)
    type: str = "workflow"
    position: dict[str, float] = Field(default_factory=dict)
    data: dict[str, JsonValue] = Field(default_factory=dict)

    @property
    def kind(self) -> str:
        return str(self.data.get("kind", ""))


class GraphEdge(BaseModel):
    id: str | None = None
    source: str
    target: str
    sourceHandle: str | None = None
    targetHandle: str | None = None


class WorkflowGraph(BaseModel):
    nodes: list[GraphNode]
    edges: list[GraphEdge]


class WorkflowPayload(BaseModel):
    id: str | None = None
    name: str = "未命名工作流"
    graph: WorkflowGraph


class ValidationIssue(BaseModel):
    code: str
    message: str
    node_id: str | None = None
    edge_id: str | None = None


class ValidationResult(BaseModel):
    valid: bool
    order: list[str] = Field(default_factory=list)
    issues: list[ValidationIssue] = Field(default_factory=list)


class RunRequest(BaseModel):
    workflow_id: str | None = None
    graph: WorkflowGraph | None = None


class ConfirmRequest(BaseModel):
    preview_hash: str = Field(min_length=16)


class KnowledgeDocument(BaseModel):
    id: str
    name: str
    mime_type: str
    status: Literal["indexing", "indexed", "failed"]
    chunks: int = 0
    source: str = "platform"

