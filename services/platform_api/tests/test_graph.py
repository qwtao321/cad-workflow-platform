from app.contracts import WorkflowGraph
from app.graph import validate_graph


def graph(nodes, edges):
    return WorkflowGraph.model_validate({"nodes": nodes, "edges": edges})


def node(node_id, kind):
    return {"id": node_id, "data": {"kind": kind}}


def test_valid_dag_has_topological_order():
    result = validate_graph(graph([node("a", "cad-input"), node("b", "rag")], [{"source": "a", "target": "b"}]))
    assert result.valid
    assert result.order == ["a", "b"]


def test_cycle_is_rejected():
    result = validate_graph(graph([node("a", "rag"), node("b", "llm")], [{"source": "a", "target": "b"}, {"source": "b", "target": "a"}]))
    assert not result.valid
    assert any(issue.code == "implicit_cycle" for issue in result.issues)


def test_code_node_is_supported():
    result = validate_graph(graph([node("a", "code")], []))
    assert result.valid
    assert result.order == ["a"]

