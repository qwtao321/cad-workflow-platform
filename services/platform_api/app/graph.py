from __future__ import annotations

from collections import defaultdict, deque
from .contracts import ValidationIssue, ValidationResult, WorkflowGraph


SUPPORTED_KINDS = {
    "cad-input", "cad-entity-select", "cad-query", "cad-entity-properties", "cad-process",
    "cad-create-geometry", "cad-create-hatch", "cad-create-text", "cad-create-dimension",
    "cad-modify-entity", "cad-edit", "cad-print", "cad-preview-confirm", "cad-write",
    "llm", "rag", "knowledge-qa", "classifier", "prompt", "text-inspection", "table-inspection", "mechanical-symbol-inspection", "frame-inspection", "layout-segmentation", "code", "branch", "loop", "human", "http",
}


def validate_graph(graph: WorkflowGraph) -> ValidationResult:
    issues: list[ValidationIssue] = []
    nodes = {node.id: node for node in graph.nodes}
    if not nodes:
        return ValidationResult(valid=False, issues=[ValidationIssue(code="empty_graph", message="工作流至少需要一个节点")])
    if len(nodes) != len(graph.nodes):
        issues.append(ValidationIssue(code="duplicate_node", message="节点 ID 必须唯一"))

    indegree = {node_id: 0 for node_id in nodes}
    adjacency: dict[str, list[str]] = defaultdict(list)
    for edge in graph.edges:
        if edge.source not in nodes or edge.target not in nodes:
            issues.append(ValidationIssue(code="unknown_endpoint", message="连线引用了不存在的节点", edge_id=edge.id))
            continue
        if edge.source == edge.target:
            issues.append(ValidationIssue(code="implicit_cycle", message="不允许节点自环；请使用循环节点", edge_id=edge.id))
            continue
        adjacency[edge.source].append(edge.target)
        indegree[edge.target] += 1

    for node in graph.nodes:
        if node.kind not in SUPPORTED_KINDS:
            issues.append(ValidationIssue(code="unsupported_node", message=f"不支持的节点类型：{node.kind or '未配置'}", node_id=node.id))

    queue = deque(sorted(node_id for node_id, degree in indegree.items() if degree == 0))
    order: list[str] = []
    remaining = dict(indegree)
    while queue:
        current = queue.popleft()
        order.append(current)
        for target in adjacency[current]:
            remaining[target] -= 1
            if remaining[target] == 0:
                queue.append(target)
    if len(order) != len(nodes):
        issues.append(ValidationIssue(code="implicit_cycle", message="工作流存在隐式环；循环必须封装在循环节点内"))

    return ValidationResult(valid=not issues, order=order, issues=issues)

