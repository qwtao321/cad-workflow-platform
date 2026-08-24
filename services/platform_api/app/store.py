from __future__ import annotations

import json
import os
import sqlite3
import threading
from contextlib import contextmanager
from datetime import datetime, timezone
from pathlib import Path
from uuid import uuid4


class Store:
    def __init__(self, path: str | None = None):
        default_root = "/tmp/cad-workflow-data" if os.getenv("VERCEL") and os.name != "nt" else "./data"
        root = Path(path or os.getenv("PLATFORM_DATA_DIR", default_root))
        root.mkdir(parents=True, exist_ok=True)
        self.path = root / "platform.sqlite3"
        self.lock = threading.Lock()
        self._init()

    @contextmanager
    def connection(self):
        connection = sqlite3.connect(self.path, check_same_thread=False)
        connection.row_factory = sqlite3.Row
        try:
            yield connection
            connection.commit()
        finally:
            connection.close()

    def _init(self):
        with self.connection() as db:
            db.executescript("""
            CREATE TABLE IF NOT EXISTS workflows (id TEXT PRIMARY KEY, name TEXT NOT NULL, graph TEXT NOT NULL, version INTEGER NOT NULL, updated_at TEXT NOT NULL);
            CREATE TABLE IF NOT EXISTS runs (id TEXT PRIMARY KEY, workflow_id TEXT, graph TEXT NOT NULL, status TEXT NOT NULL, preview_hash TEXT, preview TEXT, created_at TEXT NOT NULL, updated_at TEXT NOT NULL);
            CREATE TABLE IF NOT EXISTS events (id INTEGER PRIMARY KEY AUTOINCREMENT, run_id TEXT NOT NULL, event TEXT NOT NULL, payload TEXT NOT NULL, created_at TEXT NOT NULL);
            CREATE TABLE IF NOT EXISTS documents (id TEXT PRIMARY KEY, name TEXT NOT NULL, mime_type TEXT NOT NULL, status TEXT NOT NULL, chunks INTEGER NOT NULL, source TEXT NOT NULL, content TEXT, created_at TEXT NOT NULL);
            """)

    @staticmethod
    def now() -> str:
        return datetime.now(timezone.utc).isoformat()

    def save_workflow(self, name: str, graph: dict, workflow_id: str | None = None) -> dict:
        workflow_id = workflow_id or str(uuid4())
        now = self.now()
        with self.connection() as db:
            existing = db.execute("SELECT version FROM workflows WHERE id=?", (workflow_id,)).fetchone()
            version = (existing["version"] + 1) if existing else 1
            db.execute("INSERT INTO workflows(id,name,graph,version,updated_at) VALUES(?,?,?,?,?) ON CONFLICT(id) DO UPDATE SET name=excluded.name, graph=excluded.graph, version=excluded.version, updated_at=excluded.updated_at", (workflow_id, name, json.dumps(graph), version, now))
        return self.get_workflow(workflow_id)

    def get_workflow(self, workflow_id: str) -> dict | None:
        with self.connection() as db:
            row = db.execute("SELECT * FROM workflows WHERE id=?", (workflow_id,)).fetchone()
        return {**dict(row), "graph": json.loads(row["graph"])} if row else None

    def create_run(self, graph: dict, workflow_id: str | None) -> str:
        run_id, now = str(uuid4()), self.now()
        with self.connection() as db:
            db.execute("INSERT INTO runs(id,workflow_id,graph,status,created_at,updated_at) VALUES(?,?,?,?,?,?)", (run_id, workflow_id, json.dumps(graph), "queued", now, now))
        return run_id

    def update_run(self, run_id: str, status: str, preview: dict | None = None, preview_hash: str | None = None):
        with self.connection() as db:
            db.execute("UPDATE runs SET status=?, preview=COALESCE(?,preview), preview_hash=COALESCE(?,preview_hash), updated_at=? WHERE id=?", (status, json.dumps(preview) if preview else None, preview_hash, self.now(), run_id))

    def get_run(self, run_id: str) -> dict | None:
        with self.connection() as db:
            row = db.execute("SELECT * FROM runs WHERE id=?", (run_id,)).fetchone()
        if not row:
            return None
        value = dict(row)
        value["graph"] = json.loads(value["graph"])
        value["preview"] = json.loads(value["preview"]) if value["preview"] else None
        return value

    def event(self, run_id: str, event: str, payload: dict):
        with self.connection() as db:
            db.execute("INSERT INTO events(run_id,event,payload,created_at) VALUES(?,?,?,?)", (run_id, event, json.dumps(payload), self.now()))

    def events_after(self, run_id: str, after: int = 0) -> list[dict]:
        with self.connection() as db:
            rows = db.execute("SELECT * FROM events WHERE run_id=? AND id>? ORDER BY id", (run_id, after)).fetchall()
        return [{"id": row["id"], "event": row["event"], "payload": json.loads(row["payload"])} for row in rows]

    def add_document(self, name: str, mime_type: str, content: str, source: str = "platform") -> dict:
        doc_id = str(uuid4())
        chunks = max(1, (len(content) + 799) // 800)
        with self.connection() as db:
            db.execute("INSERT INTO documents VALUES(?,?,?,?,?,?,?,?)", (doc_id, name, mime_type, "indexed", chunks, source, content, self.now()))
        return {"id": doc_id, "name": name, "mime_type": mime_type, "status": "indexed", "chunks": chunks, "source": source}

    def documents(self) -> list[dict]:
        with self.connection() as db:
            rows = db.execute("SELECT id,name,mime_type,status,chunks,source FROM documents ORDER BY created_at DESC").fetchall()
        return [dict(row) for row in rows]

