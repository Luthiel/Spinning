# AI Flow UI Adjustments - Project Notepad

## Inherited Wisdom

### From AGENTS.md
- **Components**: Feature-based organization (`Canvas/`, `Panel/`, `Execution/`)
- **Styling**: Tailwind + shadcn/ui pattern (`components/ui/`)
- **State**: Zustand stores in `src/store/`
- **Imports**: `@/` alias points to `src/`

### Key File References
- `App.tsx`: Root layout with left sidebar (SkillPanel + PromptInput)
- `FlowCanvas.tsx`: ReactFlow canvas with top-center Panel for CanvasToolbar
- `CanvasToolbar.tsx`: Top toolbar with rounded-xl styling
- `SettingsPanel.tsx`: Floating settings button at bottom-right
- `PromptInput.tsx`: AI Flow Generator currently in sidebar

### Styling Patterns
- CanvasToolbar: `rounded-xl bg-white border border-slate-200 shadow-sm`
- PromptInput (target): `rounded-xl w-80 bg-white shadow-sm`
- Panel margin: `mb-4` (16px from viewport bottom)

### State Management Approach
- Lift `isOpen` state to App.tsx for Settings modal
- Pass props down: App → FlowCanvas → CanvasToolbar (onSettingsClick)
- Keep PromptInput state internal (no changes needed)

## Decisions Made

### User Confirmed
1. Settings button position: Far left of toolbar (before flow name) ✓
2. PromptInput expansion: Upward with offset ✓

### Defaults Applied
1. PromptInput width: 320px (w-80)
2. Expansion offset: 48px (toolbar ~40px + 8px gap)
3. Sidebar: Keep with just SkillPanel

## Task Dependencies

### Wave 1 (Foundation)
- T1: Remove PromptInput from App.tsx → Blocks T5
- T2: Update SettingsPanel.tsx → Blocks T6
- T3: Add Settings button to CanvasToolbar.tsx → Blocks T6
- T4: Update PromptInput.tsx styling → Blocks T5

### Wave 2 (Integration)
- T5: Add PromptInput to FlowCanvas.tsx → Blocks T6
- T6: Wire Settings button to modal → Blocks F1-F4

### Final Verification
- F1-F4: Parallel reviews after all implementation

## Implementation Notes

### File Changes Summary
1. `App.tsx`: Remove PromptInput from sidebar JSX (keep import), add settings state
2. `SettingsPanel.tsx`: Remove FAB, accept isOpen/onOpenChange props
3. `CanvasToolbar.tsx`: Add Settings button at left, accept onSettingsClick prop
4. `PromptInput.tsx`: Change rounded-lg to rounded-xl, add w-80 width
5. `FlowCanvas.tsx`: Import PromptInput, add bottom-center Panel

### Testing Approach
- Build verification: `cd frontend && npm run build`
- Visual QA: Playwright screenshots for each deliverable
- Integration: Test all components work together

## Evidence Storage
- All screenshots to `.sisyphus/evidence/`
- Naming: `task-{N}-{scenario}.png`
- Final QA: `.sisyphus/evidence/final-qa/`
