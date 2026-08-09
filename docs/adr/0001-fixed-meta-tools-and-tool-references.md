# Use fixed meta-tools with explicit Tool References

The Router exposes a fixed `find_tools` and `call_tool` pair instead of changing `tools/list` after discovery. `find_tools` issues an opaque Tool Reference that `call_tool` accepts with caller-supplied arguments; this keeps each MCP request self-contained, avoids connection-scoped state, and prevents upstream naming collisions from leaking into the caller contract.
