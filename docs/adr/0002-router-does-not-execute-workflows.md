# Keep workflow execution outside the Router

The Router discovers and forwards atomic tool calls but does not schedule or persist multi-tool DAGs. It may eventually return a non-executable Suggested Plan if value testing demonstrates a need; repeated governed workflows should become composite tools, while general DAG execution belongs to a separate Workflow Runtime.
