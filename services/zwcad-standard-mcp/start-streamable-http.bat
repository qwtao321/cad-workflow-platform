@echo off
setlocal
cd /d "%~dp0"
if not exist .venv\Scripts\python.exe (
  echo [ERROR] .venv not found. Run install.bat first.
  exit /b 1
)
set ZWCAD_MCP_TRANSPORT=streamable-http
set ZWCAD_MCP_HOST=127.0.0.1
set ZWCAD_MCP_PORT=8765
set ZWCAD_MCP_PROG_ID=ZWCAD.Application.2025
.venv\Scripts\python.exe -m zwcad_standard_mcp.server
endlocal

