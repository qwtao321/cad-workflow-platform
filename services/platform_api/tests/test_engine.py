import asyncio

import pytest

from app.contracts import WorkflowGraph
from app.engine import WorkflowEngine
from app.store import Store
from app.main import cad_context_options


def test_write_preview_requires_matching_hash(tmp_path):
    store = Store(str(tmp_path))
    engine = WorkflowEngine(store)
    graph = WorkflowGraph.model_validate({
        "nodes": [
            {"id": "read", "data": {"kind": "cad-input"}},
            {"id": "write", "data": {"kind": "cad-write", "config": {"target_layer": "A-WIND"}}},
        ],
        "edges": [{"source": "read", "target": "write"}],
    })
    run_id = store.create_run(graph.model_dump(), None)
    asyncio.run(engine.execute(run_id, graph))
    run = store.get_run(run_id)
    assert run["status"] == "awaiting_confirmation"
    assert run["preview"]["changes"]
    with pytest.raises(ValueError):
        asyncio.run(engine.confirm(run_id, "incorrect-preview-hash"))
    asyncio.run(engine.confirm(run_id, run["preview_hash"]))
    assert store.get_run(run_id)["status"] == "completed"


def test_cad_context_options_exposes_layers_and_blocks():
    result = asyncio.run(cad_context_options())
    assert result["layers"]
    assert result["blocks"]
    assert result["mode"] in {"demo", "live"}

