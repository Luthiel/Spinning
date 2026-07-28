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
import { HealthDashboard } from '@/components/Health'
import { Activity, HeartPulse } from 'lucide-react'
import { cn } from '@/lib/utils'

type AppView = 'flow' | 'health'

function App() {
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [view, setView] = useState<AppView>('flow')

  return (
    <TooltipProvider delayDuration={300}>
      <ReactFlowProvider>
        <div className="flex h-screen w-screen overflow-hidden bg-slate-50">
          {/* Left panel: Skill list + prompt input */}
          <div className="flex flex-col h-full flex-shrink-0">
            <SkillPanel />
            {/* View switcher */}
            <div className="px-3 py-2 border-t border-slate-200 bg-white">
              <div className="flex gap-1 bg-slate-100 rounded-lg p-0.5">
                <button
                  onClick={() => setView('flow')}
                  className={cn(
                    'flex-1 flex items-center justify-center gap-1 text-[11px] font-medium rounded-md py-1.5 transition-all',
                    view === 'flow'
                      ? 'bg-white text-slate-900 shadow-sm'
                      : 'text-slate-500 hover:text-slate-700'
                  )}
                >
                  <Activity className="w-3 h-3" />
                  Flow
                </button>
                <button
                  onClick={() => setView('health')}
                  className={cn(
                    'flex-1 flex items-center justify-center gap-1 text-[11px] font-medium rounded-md py-1.5 transition-all',
                    view === 'health'
                      ? 'bg-white text-slate-900 shadow-sm'
                      : 'text-slate-500 hover:text-slate-700'
                  )}
                >
                  <HeartPulse className="w-3 h-3" />
                  Health
                </button>
              </div>
            </div>
          </div>

          {/* Main area */}
          <div className="flex-1 relative overflow-hidden">
            {view === 'flow' ? (
              <>
                <FlowCanvas onSettingsClick={() => setSettingsOpen(true)} />
                <ConflictPanel />
                <ExecutionPanel />
                <TemplateSelector />
              </>
            ) : (
              <HealthDashboard />
            )}
          </div>

          {/* Settings panel (floating) */}
          <SettingsPanel isOpen={settingsOpen} onOpenChange={setSettingsOpen} />
        </div>
      </ReactFlowProvider>
    </TooltipProvider>
  )
}

export default App
