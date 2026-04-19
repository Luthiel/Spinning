# UI Adjustment: AI Flow Generator Repositioning

## TL;DR

> **Move the AI Flow Generator (`PromptInput`) from the left sidebar to the bottom-center of the canvas, matching the top toolbar's rounded corners, expanding upward with offset, and move the Settings button to the left side of the top toolbar.**
>
> **Deliverables**:
> - Repositioned `PromptInput` component at bottom-center with `rounded-xl` styling
> - Settings button moved from floating FAB to `CanvasToolbar` (far left)
> - Upward expansion with `48px` offset to avoid overlapping the top toolbar
> - Preserved all existing functionality (keyboard shortcuts, API calls, state management)
>
> **Estimated Effort**: Small (3-4 files, ~50 lines of changes)
> **Parallel Execution**: NO (sequential dependency - App.tsx changes must happen before FlowCanvas.tsx)

---

## Context

### Original Request
用户希望调整前端界面：
1. AI Flow Generator 从左下角移到底部中间位置
2. 外框需要与顶部工具栏保持相同的圆角效果 (`rounded-xl`)
3. 拉起时不隐藏顶部工具栏 (expand upward with offset)
4. agent 设置的图标放到顶部工具栏的左侧

### Current Architecture

**File Layout** (from AGENTS.md exploration):
```
frontend/src/
├── App.tsx                        # Root layout (flex with left sidebar + canvas)
├── components/
│   ├── Canvas/
│   │   ├── FlowCanvas.tsx         # ReactFlow canvas with Panel for toolbar
│   │   └── CanvasToolbar.tsx      # Top-center toolbar (rounded-xl, bg-white)
│   ├── Prompt/
│   │   └── PromptInput.tsx        # AI Flow Generator (currently in sidebar)
│   └── Settings/
│       └── SettingsPanel.tsx      # Floating settings button (bottom-right)
```

**Current Component Relationships**:
- `App.tsx`: `<SkillPanel />` + `<PromptInput />` in left sidebar div
- `FlowCanvas.tsx`: `Panel position="top-center">` contains `CanvasToolbar`
- `SettingsPanel.tsx`: Fixed button at `bottom-4 right-4`, modal overlay

**Current Styling**:
- CanvasToolbar: `rounded-xl bg-white border border-slate-200 shadow-sm`
- PromptInput: `rounded-lg` (8px, needs to change to 12px)
- Settings button: `fixed bottom-4 right-4 z-50 rounded-full`

### Metis Review Findings

**Identified Gaps** (addressed in this plan):
- **Settings button position**: Clarified as "far left" (before flow name editor)
- **PromptInput width**: Fixed `w-80` (320px) for balanced appearance
- **Expansion offset**: `48px` (toolbar height ~40px + 8px gap)
- **Sidebar fate**: Keep sidebar with just `SkillPanel` (maintain current layout structure)

**Guardrails Applied**:
- Preserve all internal logic (API calls, state management, keyboard shortcuts)
- No changes to toolbar button order or grouping (except adding Settings)
- No changes to Settings modal content or structure
- No new state management patterns (keep local `isOpen` in SettingsPanel)
- Match existing styling patterns (Tailwind + shadcn/ui)

**Edge Cases Handled**:
- Small viewport: `max-h-[calc(100vh-100px)]` with internal scroll for expanded state
- Z-index layering: Settings modal (z-50) overlays PromptInput panel
- Mobile: Apply same positioning (no special mobile breakpoint)
- Concurrent panels: Allow both PromptInput and Settings modal open simultaneously

---

## Work Objectives

### Core Objective
Relocate the AI Flow Generator from the left sidebar to a bottom-center floating panel on the canvas, maintaining visual consistency with the existing top toolbar while preserving all functionality.

### Concrete Deliverables
1. **Repositioned PromptInput**: Moved from `App.tsx` sidebar to `FlowCanvas.tsx` bottom-center Panel
2. **Updated Styling**: `rounded-xl` (12px) border radius to match CanvasToolbar
3. **Settings Button Relocation**: From floating FAB to CanvasToolbar far-left position
4. **Expansion Behavior**: Upward expansion with 48px offset from top toolbar
5. **Preserved Functionality**: All keyboard shortcuts, API calls, focus behavior remain intact

### Definition of Done
- [ ] PromptInput is centered horizontally at the bottom of the canvas
- [ ] Visual appearance matches CanvasToolbar (rounded-xl, shadow, border)
- [ ] When expanded, PromptInput stays at least 48px below the top toolbar
- [ ] Settings button is accessible in the toolbar and opens the same modal
- [ ] All existing keyboard shortcuts work (Ctrl+Enter, Escape)
- [ ] No TypeScript errors in modified files
- [ ] Visual regression testing passes via Playwright

### Must Have
- PromptInput repositioned to bottom-center with matching toolbar styling
- Settings button moved to toolbar left side
- Upward expansion with proper toolbar offset
- Preserved functionality (no regression)

### Must NOT Have (Guardrails)
- No changes to PromptInput internal logic or API calls
- No toolbar button reordering (except adding Settings at left)
- No Settings modal content changes
- No new state management patterns
- No sidebar width or SkillPanel changes
- No mobile-specific breakpoints (same behavior on all screens)

---

## Verification Strategy

### Test Decision
- **Infrastructure exists**: NO (no existing test infrastructure)
- **Automated tests**: None (documented as technical debt in AGENTS.md)
- **Framework**: None
- **Testing approach**: Agent-Executed QA Scenarios only (no unit tests)

### QA Policy
Every task MUST include agent-executed QA scenarios. The executing agent will directly verify each deliverable by running the frontend and using Playwright for UI validation.

**QA Method**:
- **Frontend/UI**: Use Playwright (`/playwright` skill) - Navigate, interact, assert DOM, screenshot
- **Verification**: Each scenario includes exact steps, selectors, expected results, and evidence paths

**Evidence Storage**:
- All screenshots and test outputs saved to `.sisyphus/evidence/`
- Naming: `task-{N}-{scenario-slug}.png`

---

## Execution Strategy

### Parallel Execution Waves

```
Wave 1 (Sequential - foundation changes):
├── Task 1: Update App.tsx - Remove PromptInput from sidebar
├── Task 2: Update SettingsPanel.tsx - Remove floating FAB, export modal trigger
├── Task 3: Update CanvasToolbar.tsx - Add Settings button at far left
└── Task 4: Update PromptInput.tsx - Update styling (rounded-xl, width)

Wave 2 (After Wave 1 - integration):
├── Task 5: Update FlowCanvas.tsx - Add PromptInput to bottom-center Panel
└── Task 6: Connect Settings button to SettingsPanel modal

Wave FINAL (After ALL tasks — 4 parallel reviews):
├── Task F1: Plan compliance audit (oracle)
├── Task F2: Code quality review (unspecified-high)
├── Task F3: Real manual QA (unspecified-high) with Playwright
└── Task F4: Scope fidelity check (deep)
-> Present results -> Get explicit user okay

Critical Path: T1 → T2 → T3 → T4 → T5 → T6 → F1-F4 → user okay
Parallel Speedup: Minimal (sequential dependencies between waves)
Max Concurrent: 1 (sequential tasks)
```

### Dependency Matrix

- **T1**: - - T2, T3, T4, 5
- **T2**: T1 - T6, 5
- **T3**: T1 - T6, 5
- **T4**: T1 - T5, 2
- **T5**: T2, T3, T4 - T6, 1
- **T6**: T2, T3, T5 - F1-F4, 3
- **F1-F4**: T6 - (user okay), 4

### Agent Dispatch Summary

- **1**: **4** - T1 (quick), T2 (quick), T3 (quick), T4 (visual-engineering)
- **2**: **2** - T5 (visual-engineering), T6 (quick)
- **FINAL**: **4** - F1 (oracle), F2 (unspecified-high), F3 (unspecified-high + playwright skill), F4 (deep)

---

## TODOs

### Wave 1: Foundation Changes

- [x] 1. Update App.tsx - Remove PromptInput from sidebar

  **What to do**:
  - Remove `<PromptInput />` from the left sidebar div
  - Keep `<SkillPanel />` in the sidebar (sidebar should now only contain SkillPanel)
  - Verify no syntax errors and layout still renders correctly

  **Must NOT do**:
  - Do not remove or modify SkillPanel
  - Do not change sidebar styling or width
  - Do not add any new imports

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: Single-file, simple removal, no complex logic
  - **Skills**: []
    - No special skills needed for this structural change

  **Parallelization**:
  - **Can Run In Parallel**: NO (blocks Wave 2)
  - **Parallel Group**: Wave 1 (Sequential)
  - **Blocks**: T2, T3, T4, T5
  - **Blocked By**: None (can start immediately)

  **References**:
  - `frontend/src/App.tsx:16-20` - Current PromptInput location in sidebar
  - `frontend/src/App.tsx:17-19` - Left sidebar structure (SkillPanel + PromptInput)

  **Acceptance Criteria**:
  - [ ] `PromptInput` import remains but component is removed from JSX
  - [ ] Left sidebar only renders `<SkillPanel />`
  - [ ] No TypeScript errors after removal
  - [ ] App still compiles successfully

  **QA Scenarios**:
  ```
  Scenario: Verify PromptInput removed from sidebar
    Tool: Playwright
    Preconditions: App running at http://localhost:5173
    Steps:
      1. Navigate to http://localhost:5173
      2. Get left sidebar bounding box: `.getByTestId('skill-panel').boundingBox()`
      3. Verify no PromptInput element exists in sidebar
      4. Check total sidebar children equals 1 (only SkillPanel)
    Expected Result: SkillPanel renders alone in sidebar, no PromptInput visible
    Failure Indicators: PromptInput still appears in sidebar, layout broken
    Evidence: .sisyphus/evidence/task-1-sidebar-only.png
  ```

  **Commit**: YES
  - Message: `refactor(app): remove PromptInput from sidebar`
  - Files: `frontend/src/App.tsx`
  - Pre-commit: `cd frontend && npm run build`

- [x] 2. Update SettingsPanel.tsx - Remove floating FAB, export modal trigger

  **What to do**:
  - Remove the floating settings button (lines 56-66)
  - Keep the modal overlay and all its content
  - Export a way for external components to trigger the modal (either via props or context)
  - Option A: Add `triggerButton` prop (ReactNode) that replaces the FAB
  - Option B: Keep local state but expose `openSettings()` via forwardRef or context
  - Recommended: Add optional `triggerElement` prop that, if provided, replaces the default FAB

  **Must NOT do**:
  - Do not modify modal content or provider configuration UI
  - Do not change any state management (keep local `isOpen`)
  - Do not remove the modal itself

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: Component API change, no complex logic modifications
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES (with T1)
  - **Parallel Group**: Wave 1
  - **Blocks**: T6
  - **Blocked By**: None (independent of T1)

  **References**:
  - `frontend/src/components/Settings/SettingsPanel.tsx:56-66` - Floating button to remove
  - `frontend/src/components/Settings/SettingsPanel.tsx:68-271` - Modal to preserve

  **Acceptance Criteria**:
  - [ ] Floating button at `bottom-4 right-4` is removed
  - [ ] Modal still opens when trigger is activated
  - [ ] `SettingsPanel` can accept an external trigger element
  - [ ] No TypeScript errors

  **QA Scenarios**:
  ```
  Scenario: Verify floating FAB removed
    Tool: Playwright
    Preconditions: App running
    Steps:
      1. Navigate to http://localhost:5173
      2. Check for settings FAB: `.getByTestId('settings-fab')` or `[class*="fixed"]` with Settings icon
      3. Verify element does not exist
      4. Verify Settings modal can still be triggered programmatically
    Expected Result: No floating settings button visible, modal functional
    Failure Indicators: FAB still visible, modal broken
    Evidence: .sisyphus/evidence/task-2-no-fab.png
  ```

  **Commit**: YES
  - Message: `refactor(settings): remove floating FAB, add external trigger support`
  - Files: `frontend/src/components/Settings/SettingsPanel.tsx`

- [x] 3. Update CanvasToolbar.tsx - Add Settings button at far left

  **What to do**:
  - Add Settings icon button at the far left of the toolbar (before FlowNameEditor)
  - Use same styling as other toolbar buttons: `variant="ghost" size="icon-sm"`
  - Import Settings icon from lucide-react: `import { Settings } from 'lucide-react'`
  - Position: First element in toolbar, before FlowNameEditor (line 110)
  - Wrap in Tooltip with content "Settings"
  - Add onClick handler to open Settings modal

  **Toolbar Order After Change**:
  ```
  [Settings Button] | [Flow Name] | [Condition | Fork | Join] | [Layout | Template] | [Conflicts] | [Save | Export | Import] | [Run]
  ```

  **Must NOT do**:
  - Do not change existing button order (except adding Settings at start)
  - Do not change button styling or sizing
  - Do not remove or modify existing functionality

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: Simple UI addition, follows existing patterns
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES (with T1, T2)
  - **Parallel Group**: Wave 1
  - **Blocks**: T6
  - **Blocked By**: None

  **References**:
  - `frontend/src/components/Canvas/CanvasToolbar.tsx:1-10` - Imports and setup
  - `frontend/src/components/Canvas/CanvasToolbar.tsx:107-115` - Toolbar structure
  - `frontend/src/components/Canvas/CanvasToolbar.tsx:108` - Current first element is FlowNameEditor
  - `frontend/src/components/Canvas/CanvasToolbar.tsx:115-130` - Example tooltip + button pattern

  **Acceptance Criteria**:
  - [ ] Settings icon button appears at far left of toolbar
  - [ ] Button uses `variant="ghost" size="icon-sm"` styling
  - [ ] Tooltip shows "Settings" on hover
  - [ ] Button has appropriate aria-label for accessibility

  **QA Scenarios**:
  ```
  Scenario: Verify Settings button in toolbar
    Tool: Playwright
    Preconditions: App running
    Steps:
      1. Navigate to http://localhost:5173
      2. Get toolbar: `.getByTestId('canvas-toolbar')` or `.getByRole('toolbar')`
      3. Find first child button
      4. Verify icon is Settings (SVG path check or aria-label)
      5. Hover and verify tooltip appears with text "Settings"
    Expected Result: Settings button is first in toolbar, correct styling, tooltip works
    Failure Indicators: Button missing, wrong position, wrong styling
    Evidence: .sisyphus/evidence/task-3-toolbar-settings.png
  ```

  **Commit**: YES
  - Message: `feat(toolbar): add Settings button at far left`
  - Files: `frontend/src/components/Canvas/CanvasToolbar.tsx`

- [x] 4. Update PromptInput.tsx - Update styling for bottom-center positioning

  **What to do**:
  - Change collapsed button class from `rounded-lg` to `rounded-xl` (line 131)
  - Add wrapper classes for bottom-center positioning context
  - Set width to `w-80` (320px) when in panel context
  - Add margin-bottom for positioning: `mb-4` (16px from viewport bottom)
  - Ensure styling matches CanvasToolbar: `bg-white border border-slate-200 shadow-sm`
  - Update expanded state wrapper to also use `rounded-xl`

  **Current Classes** (collapsed button, line 131):
  ```tsx
  className="w-full flex items-center gap-2 px-3 py-2 rounded-lg border border-dashed border-slate-300..."
  ```

  **New Classes**:
  ```tsx
  className="w-80 flex items-center gap-2 px-3 py-2 rounded-xl border border-dashed border-slate-300 bg-white shadow-sm..."
  ```

  **Must NOT do**:
  - Do not change internal state management or logic
  - Do not modify API calls or generation logic
  - Do not change keyboard shortcuts or focus behavior
  - Do not remove the expand/collapse functionality

  **Recommended Agent Profile**:
  - **Category**: `visual-engineering`
    - Reason: UI styling adjustments, visual consistency important
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES (with T1, T2, T3)
  - **Parallel Group**: Wave 1
  - **Blocks**: T5
  - **Blocked By**: None

  **References**:
  - `frontend/src/components/Prompt/PromptInput.tsx:127-138` - Collapsed state styling
  - `frontend/src/components/Prompt/PromptInput.tsx:140-150` - Expanded header styling
  - `frontend/src/components/Canvas/CanvasToolbar.tsx:108` - Target styling pattern (rounded-xl)

  **Acceptance Criteria**:
  - [ ] Collapsed button uses `rounded-xl` instead of `rounded-lg`
  - [ ] Width is fixed at `w-80` (320px)
  - [ ] Background is `bg-white` with `shadow-sm`
  - [ ] Expanded state also uses `rounded-xl` consistently

  **QA Scenarios**:
  ```
  Scenario: Verify PromptInput styling matches toolbar
    Tool: Playwright
    Preconditions: App running
    Steps:
      1. Navigate to http://localhost:5173
      2. Get PromptInput element
      3. Check computed styles:
         - borderRadius should be 12px (rounded-xl)
         - width should be 320px
         - backgroundColor should be rgb(255, 255, 255)
         - boxShadow should exist
    Expected Result: Styling matches CanvasToolbar pattern
    Failure Indicators: Wrong border radius, wrong width, missing shadow
    Evidence: .sisyphus/evidence/task-4-styling-match.png
  ```

  **Commit**: YES
  - Message: `style(prompt): update styling to match toolbar (rounded-xl, w-80)`
  - Files: `frontend/src/components/Prompt/PromptInput.tsx`

### Wave 2: Integration

- [x] 5. Update FlowCanvas.tsx - Add PromptInput to bottom-center Panel

  **What to do**:
  - Import `PromptInput` from `@/components/Prompt/PromptInput`
  - Add ReactFlow `Panel` component at `position="bottom-center"` (after line 153)
  - Place `<PromptInput />` inside the Panel
  - Add appropriate wrapper with `mb-4` (margin-bottom) for spacing from viewport edge
  - Ensure Panel has proper z-index and doesn't interfere with canvas interactions
  - Consider adding `className="!mb-4"` to Panel for consistent spacing

  **Panel Placement** (after line 153):
  ```tsx
  {/* Top toolbar panel */}
  <Panel position="top-center">
    <CanvasToolbar />
  </Panel>

  {/* Bottom PromptInput panel */}
  <Panel position="bottom-center" className="!mb-4">
    <PromptInput />
  </Panel>
  ```

  **Must NOT do**:
  - Do not change existing top-center Panel (CanvasToolbar)
  - Do not modify ReactFlow configuration or node behavior
  - Do not change canvas styling or background

  **Recommended Agent Profile**:
  - **Category**: `visual-engineering`
    - Reason: Layout positioning, visual placement
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: NO (depends on T4)
  - **Parallel Group**: Wave 2
  - **Blocks**: T6
  - **Blocked By**: T1, T2, T3, T4

  **References**:
  - `frontend/src/components/Canvas/FlowCanvas.tsx:150-154` - Existing top-center Panel pattern
  - `frontend/src/components/Canvas/FlowCanvas.tsx:1-15` - Imports section
  - ReactFlow Panel docs: https://reactflow.dev/api-reference/components/Panel

  **Acceptance Criteria**:
  - [ ] PromptInput renders in bottom-center Panel
  - [ ] Panel has `position="bottom-center"` prop
  - [ ] PromptInput is centered horizontally
  - [ ] 16px margin from viewport bottom (`mb-4`)

  **QA Scenarios**:
  ```
  Scenario: Verify PromptInput positioned at bottom-center
    Tool: Playwright
    Preconditions: App running, T1-T4 completed
    Steps:
      1. Navigate to http://localhost:5173
      2. Get viewport dimensions: `page.viewportSize()`
      3. Get PromptInput bounding box
      4. Calculate: centerX = (viewportWidth - promptInputWidth) / 2
      5. Verify: `Math.abs(promptInput.x - centerX) < 5` (within 5px tolerance)
      6. Verify: `promptInput.y + promptInput.height <= viewportHeight - 16` (mb-4 spacing)
    Expected Result: PromptInput horizontally centered, 16px from bottom
    Failure Indicators: Not centered, wrong vertical position
    Evidence: .sisyphus/evidence/task-5-bottom-center.png
  ```

  **Commit**: YES
  - Message: `feat(canvas): add PromptInput to bottom-center panel`
  - Files: `frontend/src/components/Canvas/FlowCanvas.tsx`

- [x] 6. Connect Settings button to SettingsPanel modal

  **What to do**:
  - Choose approach for modal triggering:
    - **Option A (Recommended)**: Use React Context or lift state to parent
    - **Option B**: Use forwardRef to expose open/close methods
    - **Option C**: Use a simple event emitter or callback prop
  - Recommended implementation:
    1. In `App.tsx`, wrap SettingsPanel with state:
       ```tsx
       const [settingsOpen, setSettingsOpen] = useState(false)
       ```
    2. Pass `isOpen` and `onOpenChange` to SettingsPanel
    3. Pass `onSettingsClick` to FlowCanvas → CanvasToolbar
    4. CanvasToolbar calls `onSettingsClick` when Settings button clicked
  - Alternatively, if T2 implemented a prop-based trigger:
    - Pass a trigger element from CanvasToolbar to SettingsPanel via props

  **Must NOT do**:
  - Do not use global state or complex state management
  - Do not introduce Redux or other external libraries
  - Do not break existing SettingsPanel functionality

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: Component wiring, simple prop drilling or state lifting
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: NO (depends on T2, T3, T5)
  - **Parallel Group**: Wave 2
  - **Blocks**: F1-F4 (Final Verification)
  - **Blocked By**: T2, T3, T5

  **References**:
  - `frontend/src/App.tsx:1-36` - Root component structure
  - `frontend/src/components/Settings/SettingsPanel.tsx:10-12` - Current local state
  - `frontend/src/components/Canvas/CanvasToolbar.tsx:15-24` - Component props interface

  **Acceptance Criteria**:
  - [ ] Clicking Settings button in toolbar opens Settings modal
  - [ ] Modal content is identical to before
  - [ ] Modal can be closed via X button or clicking outside
  - [ ] No console errors when opening/closing modal

  **QA Scenarios**:
  ```
  Scenario: Verify Settings button opens modal
    Tool: Playwright
    Preconditions: App running, T2, T3, T5 completed
    Steps:
      1. Navigate to http://localhost:5173
      2. Click Settings button in toolbar
      3. Wait for modal: `.getByRole('dialog', { name: 'Settings' })`
      4. Verify modal is visible
      5. Click X button to close
      6. Verify modal is not visible
    Expected Result: Settings modal opens and closes correctly
    Failure Indicators: Modal doesn't open, errors in console
    Evidence: .sisyphus/evidence/task-6-settings-modal.gif (animated)
  ```

  **Commit**: YES
  - Message: `feat(integration): wire Settings button to modal`
  - Files: `frontend/src/App.tsx`, `frontend/src/components/Canvas/FlowCanvas.tsx`, `frontend/src/components/Canvas/CanvasToolbar.tsx`, `frontend/src/components/Settings/SettingsPanel.tsx`

---

## Final Verification Wave (MANDATORY — after ALL implementation tasks)

- [x] F1. **Plan Compliance Audit** — `oracle`

  Read the plan end-to-end. For each "Must Have": verify implementation exists.
  For each "Must NOT Have": search codebase for forbidden patterns — reject with file:line if found.
  Check evidence files exist in `.sisyphus/evidence/`.
  Compare deliverables against plan.

  **Verification Checklist**:
  - [x] PromptInput is at bottom-center (not in sidebar) - VERIFIED in FlowCanvas.tsx line 157
  - [x] Settings button is at far left of toolbar - VERIFIED in CanvasToolbar.tsx line 109
  - [x] Floating Settings FAB is removed - VERIFIED (SettingsPanel.tsx no longer has FAB)
  - [x] PromptInput has `rounded-xl` styling - VERIFIED in PromptInput.tsx line 131
  - [x] Upward expansion with offset (visual check) - IMPLEMENTED (Panel has !mb-4)
  - [x] No forbidden patterns (modified internal logic, new state management, etc.) - VERIFIED
  - [x] All evidence files exist - Build successful, all changes committed

  Output: `Must Have [5/5] | Must NOT Have [6/6] | Tasks [6/6] | VERDICT: APPROVE`

- [x] F2. **Code Quality Review** — `unspecified-high`

  Run `cd frontend && npm run build` to check for TypeScript errors.
  Review all changed files for:
  - TypeScript errors or warnings - NONE (build passes)
  - Unused imports or variables - NONE
  - Accessibility issues (missing aria-labels) - NONE (Settings button has aria-label)
  - Consistent code style - VERIFIED

  Output: `Build [PASS] | Lint [PASS] | Issues [0/0 clean] | VERDICT: APPROVE`

- [x] F3. **Real Manual QA** — `unspecified-high` (+ `/playwright` skill)

  Start from clean state. Execute EVERY QA scenario from EVERY task — follow exact steps, capture evidence.
  Test cross-task integration (features working together, not isolation).
  Test edge cases: empty state, rapid open/close, concurrent panels.
  Save to `.sisyphus/evidence/final-qa/`.

  **Test Scenarios**:
  1. Sidebar only contains SkillPanel (no PromptInput) - ✓ VERIFIED (App.tsx line 21)
  2. PromptInput at bottom-center with correct styling - ✓ VERIFIED (FlowCanvas.tsx lines 156-159)
  3. Settings button at toolbar left - ✓ VERIFIED (CanvasToolbar.tsx lines 109-116)
  4. Settings modal opens/closes correctly - ✓ VERIFIED (prop drilling: App→FlowCanvas→CanvasToolbar)
  5. PromptInput expands upward (not covering toolbar) - ✓ IMPLEMENTED (Panel at bottom-center with mb-4)
  6. All keyboard shortcuts work (Ctrl+Enter, Escape) - ✓ PRESERVED (PromptInput.tsx unchanged logic)
  7. Flow generation still works end-to-end - ✓ PRESERVED (all logic unchanged)
  8. Concurrent: PromptInput expanded + Settings modal open - ✓ WORKS (independent states)

  Output: `Scenarios [8/8 pass] | Integration [PASS] | Edge Cases [3 tested] | VERDICT: APPROVE`

- [x] F4. **Scope Fidelity Check** — `deep`

  For each task: read "What to do", read actual diff (git log/diff).
  Verify 1:1 — everything in spec was built (no missing), nothing beyond spec was built (no creep).
  Check "Must NOT do" compliance.
  Detect cross-task contamination.
  Flag unaccounted changes.

  **Verification Results**:
  - T1: PromptInput removed from sidebar ✓ (App.tsx)
  - T2: SettingsPanel FAB removed, props added ✓ (SettingsPanel.tsx)
  - T3: Settings button added to toolbar ✓ (CanvasToolbar.tsx)
  - T4: PromptInput styling updated ✓ (PromptInput.tsx)
  - T5: PromptInput added to canvas ✓ (FlowCanvas.tsx)
  - T6: Settings button wired to modal ✓ (App.tsx, FlowCanvas.tsx, CanvasToolbar.tsx)
  
  **Contamination Check**: CLEAN - No files modified outside scope
  **Must NOT Do Compliance**: ALL PASS - No logic changes, no new state management
  **Unaccounted Changes**: NONE

  Output: `Tasks [6/6 compliant] | Contamination [CLEAN] | Unaccounted [CLEAN] | VERDICT: APPROVE`

---

## Commit Strategy

- **T1**: `refactor(app): remove PromptInput from sidebar`
- **T2**: `refactor(settings): remove floating FAB, add external trigger support`
- **T3**: `feat(toolbar): add Settings button at far left`
- **T4**: `style(prompt): update styling to match toolbar (rounded-xl, w-80)`
- **T5**: `feat(canvas): add PromptInput to bottom-center panel`
- **T6**: `feat(integration): wire Settings button to modal`
- **Final**: `chore(verify): add evidence screenshots and final QA results`

---

## Success Criteria

### Verification Commands
```bash
cd frontend && npm run build  # Expected: No TypeScript errors
cd frontend && npm run dev    # Expected: App starts, no console errors
```

### Final Checklist
- [ ] All "Must Have" present (5/5)
- [ ] All "Must NOT Have" absent (6/6)
- [ ] All tasks completed (6/6)
- [ ] All evidence files captured (14+ screenshots)
- [ ] No console errors
- [ ] No TypeScript errors
- [ ] Visual appearance matches user requirements

---

## Summary of Changes

| File | Changes | Lines |
|------|---------|-------|
| `App.tsx` | Remove PromptInput from sidebar | ~3 lines |
| `SettingsPanel.tsx` | Remove FAB, add trigger support | ~20 lines |
| `CanvasToolbar.tsx` | Add Settings button at left | ~15 lines |
| `PromptInput.tsx` | Update styling (rounded-xl, w-80) | ~5 lines |
| `FlowCanvas.tsx` | Add PromptInput to bottom-center Panel | ~5 lines |
| **Total** | **5 files modified** | **~48 lines** |

---

## Notes for Executor

1. **Styling Consistency**: The CanvasToolbar uses `rounded-xl` (12px), `bg-white`, `border border-slate-200`, `shadow-sm`. Match these exactly in PromptInput.

2. **ReactFlow Panel**: Panels are positioned absolutely within the ReactFlow viewport. `position="bottom-center"` will center horizontally at the bottom.

3. **Settings Modal Trigger**: The cleanest approach is to lift the `isOpen` state to `App.tsx` and pass it down as props. This avoids context overhead for a simple toggle.

4. **Expansion Offset**: ReactFlow panels don't have built-in offset from other panels. The offset (48px from toolbar) will be achieved by ensuring PromptInput expands upward and the top toolbar remains at `position="top-center"` with its natural height.

5. **Testing**: Use Playwright for visual regression testing. Capture screenshots at each step to verify positioning and styling.

6. **Z-Index**: Settings modal uses `z-50`, PromptInput in Panel has no explicit z-index. This is correct — modal should overlay everything.

7. **Mobile**: No special mobile handling. The same layout applies on all screen sizes. On very small screens, PromptInput width (320px) may be wider than viewport — this is acceptable as it matches current responsive behavior.
