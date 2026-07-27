# State Management

Zustand stores for flow, skill, and execution state.

## STRUCTURE

```
store/
├── flowStore.ts         # Flow orchestration (nodes, edges, selection)
├── skillStore.ts        # Skill list + search/filter
├── executionStore.ts    # Execution status + logs
└── providerStore.ts     # LLM provider configuration
```

## WHERE TO LOOK

| Task | Location | Notes |
|------|----------|-------|
| Add flow action | `flowStore.ts` | Add to `actions` object |
| Modify skill list | `skillStore.ts` | `skills` array + filter logic |
| Track execution | `executionStore.ts` | `executionId` + `logs` |
| Change LLM config | `providerStore.ts` | Provider + model selection |

## CONVENTIONS

- **Store naming**: `{domain}Store.ts` with `use{Domain}Store` hook export
- **Actions object**: Group setters in `actions` for cleaner usage
- **Persistence**: No persistence — state resets on refresh
- **DevTools**: Enable Redux DevTools in development

## ANTI-PATTERNS

- **Cross-store imports**: Keep stores independent; compose in components
- **Derived state in store**: Compute in selectors, not store

## NOTES

- **Zustand v5**: New API with `create` + selectors
- **TypeScript**: Full type safety with store interfaces
- **Async actions**: Use async functions in store actions
