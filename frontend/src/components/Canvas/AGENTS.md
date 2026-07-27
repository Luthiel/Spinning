# Canvas Components

ReactFlow-based visual DAG builder. Nodes, edges, and canvas interactions.

## STRUCTURE

```
Canvas/
├── FlowCanvas.tsx       # Main canvas component
├── CanvasToolbar.tsx    # Save/execute/layout/template/export
├── NodeDetailPanel.tsx  # Node properties panel
├── nodes/               # Custom node types
│   ├── SkillNode.tsx
│   ├── ConditionNode.tsx
│   ├── GatewayNode.tsx
│   ├── StartEndNode.tsx
│   └── MCPNode.tsx
└── edges/
    └── CustomEdge.tsx   # Serial/parallel/conditional edges
```

## WHERE TO LOOK

| Task | Location | Notes |
|------|----------|-------|
| Add node type | `nodes/` | Extend `Node` type, add to nodeTypes map |
| Change edge style | `edges/CustomEdge.tsx` | SVG path + label positioning |
| Modify canvas UI | `FlowCanvas.tsx` | ReactFlow props + event handlers |
| Add toolbar action | `CanvasToolbar.tsx` | Button + handler |
| Edit node panel | `NodeDetailPanel.tsx` | Form fields for selected node |

## CONVENTIONS

- **Node types**: PascalCase files (`SkillNode.tsx`), lowercase type IDs (`'skill'`)
- **Node registration**: Add to `nodeTypes` object in `FlowCanvas.tsx`
- **Status colors**: idle(gray) → running(blue) → success(green) → error(red)
- **Drag handles**: Use `Position` enum from `@xyflow/react`

## ANTI-PATTERNS

- **Direct store mutations**: Always use store actions, never mutate state directly
- **Missing keys**: Always provide unique keys when rendering node lists

## NOTES

- **ReactFlow v12**: Uses new API (`useReactFlow`, `addEdges`)
- **Dagre layout**: Auto-layout triggered from toolbar (`utils/dagLayout.ts`)
- **Conflict overlay**: Renders conflict markers via custom node components
