# LangGraph 迁移评估

当前对话编排已经具备 LangGraph 所需的三个核心契约：显式 `DialogueState`、纯节点函数 `DialogueNode`、以及有向边运行器 `DialogueStateGraph`。运行器对节点顺序、终止节点、循环和最大步数都有保护。

当前不强制引入外部 LangGraph 依赖，原因是现有服务部署不需要额外 Python/Node 运行时，且对话流程仍是单进程、确定性的线性流程。内部状态图作为兼容层，后续可以将节点和状态映射到 LangGraph 的 StateGraph，而不改变业务节点接口。

迁移触发条件：需要条件分支/人工审批、跨进程持久化检查点、可视化图调试或并行 Agent 调度时，再引入 LangGraph 运行器；届时保留现有 `DialogueNode` 作为适配器，并以现有状态图测试作为回归基线。
