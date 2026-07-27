import { useState } from 'react'
import { ReactFlowProvider } from '@xyflow/react'
import { TooltipProvider } from '@/components/ui/tooltip'
import { FlowCanvas } from '@/components/Canvas/FlowCanvas'
import { SkillPanel } from '@/components/Panel/SkillPanel'
import { PromptInput } from '@/components/Prompt/PromptInput'
import { ConflictPanel } from '@/components/Conflict/ConflictPanel'
import { ExecutionPanel } from '@/components/Execution/ExecutionPanel'
import { TemplateSelector } from '@/components/Execution/TemplateSelector'
import { SettingsPanel } from '@/components/Settings/SettingsPanel'

function App() {
  const [settingsOpen, setSettingsOpen] = useState(false)

  return (
    <TooltipProvider delayDuration={300}>
      <ReactFlowProvider>
        <div className="flex h-screen w-screen overflow-hidden bg-slate-50">
          {/* Left panel: Skill list + prompt input */}
          <div className="flex flex-col h-full flex-shrink-0">
            <SkillPanel />
          </div>

          {/* Main canvas area */}
          <div className="flex-1 relative overflow-hidden">
            <FlowCanvas onSettingsClick={() => setSettingsOpen(true)} />
            <ConflictPanel />
            <ExecutionPanel />
            <TemplateSelector />
          </div>

          {/* Settings panel (floating) */}
          <SettingsPanel isOpen={settingsOpen} onOpenChange={setSettingsOpen} />
        </div>
      </ReactFlowProvider>
    </TooltipProvider>
  )
}

export default App
