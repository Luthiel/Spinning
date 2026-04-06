import { ReactFlowProvider } from '@xyflow/react'
import { TooltipProvider } from '@/components/ui/tooltip'
import { FlowCanvas } from '@/components/Canvas/FlowCanvas'
import { SkillPanel } from '@/components/Panel/SkillPanel'
import { PromptInput } from '@/components/Prompt/PromptInput'
import { ConflictPanel } from '@/components/Conflict/ConflictPanel'
import { ExecutionPanel } from '@/components/Execution/ExecutionPanel'
import { TemplateSelector } from '@/components/Execution/TemplateSelector'

function App() {
  return (
    <TooltipProvider delayDuration={300}>
      <ReactFlowProvider>
        <div className="flex h-screen w-screen overflow-hidden bg-slate-50">
          {/* Left panel: Skill list + prompt input */}
          <div className="flex flex-col h-full flex-shrink-0">
            <SkillPanel />
            <PromptInput />
          </div>

          {/* Main canvas area */}
          <div className="flex-1 relative overflow-hidden">
            <FlowCanvas />
            <ConflictPanel />
            <ExecutionPanel />
            <TemplateSelector />
          </div>
        </div>
      </ReactFlowProvider>
    </TooltipProvider>
  )
}

export default App
