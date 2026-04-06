import { useEffect, useRef } from 'react'
import { X, Play, Square, CheckCircle2, XCircle, Clock, ChevronDown } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { useExecutionStore } from '@/store/executionStore'
import { useFlowStore } from '@/store/flowStore'
import { wsService } from '@/services/websocket'
import { formatDuration, cn } from '@/lib/utils'
import type { WSMessage, NodeExecution } from '@/types'

const STATUS_COLORS = {
  pending: 'secondary',
  running: 'info',
  completed: 'success',
  failed: 'destructive',
  cancelled: 'secondary',
} as const

function ExecutionStatus({ execution }: { execution: NonNullable<ReturnType<typeof useExecutionStore.getState>['currentExecution']> }) {
  const duration = execution.completed_at
    ? new Date(execution.completed_at).getTime() - new Date(execution.started_at).getTime()
    : Date.now() - new Date(execution.started_at).getTime()

  const nodeStats = Object.values(execution.node_executions)
  const completed = nodeStats.filter((n) => n.status === 'success').length
  const failed = nodeStats.filter((n) => n.status === 'error').length
  const running = nodeStats.filter((n) => n.status === 'running').length

  return (
    <div className="p-3 space-y-3">
      {/* Overall status */}
      <div className="flex items-center justify-between">
        <Badge variant={STATUS_BADGES[execution.status] || 'secondary'} className="capitalize">
          {execution.status}
        </Badge>
        <div className="flex items-center gap-1 text-xs text-slate-500">
          <Clock className="h-3 w-3" />
          {formatDuration(duration)}
        </div>
      </div>

      {/* Node stats */}
      <div className="grid grid-cols-3 gap-2">
        <StatBox label="Completed" value={completed} color="text-emerald-600" />
        <StatBox label="Running" value={running} color="text-blue-600" />
        <StatBox label="Failed" value={failed} color="text-red-500" />
      </div>

      {/* Per-node statuses */}
      <div className="space-y-1.5">
        <div className="text-xs font-semibold text-slate-700">Node Executions</div>
        {Object.entries(execution.node_executions).map(([nodeId, exec]) => (
          <NodeExecutionRow key={nodeId} nodeId={nodeId} exec={exec} />
        ))}
        {Object.keys(execution.node_executions).length === 0 && (
          <div className="text-xs text-slate-400 text-center py-2">
            Waiting for nodes to start...
          </div>
        )}
      </div>
    </div>
  )
}

function StatBox({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="bg-slate-50 rounded-lg p-2 text-center">
      <div className={cn('text-lg font-bold', color)}>{value}</div>
      <div className="text-[10px] text-slate-500">{label}</div>
    </div>
  )
}

function NodeExecutionRow({ nodeId, exec }: { nodeId: string; exec: NodeExecution }) {
  const { nodes } = useFlowStore()
  const node = nodes.find((n) => n.id === nodeId)
  const label = node?.data.label || nodeId

  return (
    <div className="flex items-center gap-2 px-2.5 py-2 bg-white border border-slate-100 rounded-lg">
      <StatusDot status={exec.status} />
      <span className="text-xs text-slate-700 flex-1 truncate">{label}</span>
      {exec.duration_ms !== undefined && (
        <span className="text-[10px] text-slate-400">{exec.duration_ms}ms</span>
      )}
    </div>
  )
}

function StatusDot({ status }: { status: string }) {
  return (
    <div
      className={cn(
        'w-2 h-2 rounded-full flex-shrink-0',
        status === 'running' && 'bg-blue-500 animate-pulse',
        status === 'success' && 'bg-emerald-500',
        status === 'error' && 'bg-red-500',
        (status === 'idle' || status === 'skipped') && 'bg-slate-300',
      )}
    />
  )
}

const STATUS_BADGES = {
  pending: 'secondary',
  running: 'info',
  completed: 'success',
  failed: 'destructive',
  cancelled: 'secondary',
} as const

export function ExecutionPanel() {
  const {
    currentExecution, panelOpen, setPanelOpen, activeTab, setActiveTab,
    appendLog, updateExecution, setIsExecuting, setCurrentExecution,
  } = useExecutionStore()
  const { updateNodeStatus } = useFlowStore()
  const logBottomRef = useRef<HTMLDivElement>(null)

  // Handle WebSocket messages
  useEffect(() => {
    if (!currentExecution) return

    const removeHandler = wsService.addHandler((msg: WSMessage) => {
      if (msg.execution_id !== currentExecution.id) return

      switch (msg.type) {
        case 'node_status': {
          const { node_id, status, call_count, duration_ms, error } = msg.payload as Record<string, unknown>
          updateNodeStatus(
            node_id as string,
            status as Parameters<typeof updateNodeStatus>[1],
            call_count as number | undefined
          )
          updateExecution({
            node_executions: {
              ...currentExecution.node_executions,
              [node_id as string]: {
                node_id: node_id as string,
                status: status as NodeExecution['status'],
                duration_ms: duration_ms as number | undefined,
                error: error as string | undefined,
              },
            },
          })
          break
        }
        case 'execution_log': {
          appendLog({
            id: `log-${Date.now()}`,
            execution_id: currentExecution.id,
            node_id: msg.payload.node_id as string,
            node_name: msg.payload.node_name as string,
            level: msg.payload.level as 'info' | 'warn' | 'error' | 'debug',
            message: msg.payload.message as string,
            timestamp: msg.payload.timestamp as string,
            duration_ms: msg.payload.duration_ms as number | undefined,
          })
          break
        }
        case 'execution_complete':
          updateExecution({ status: 'completed', completed_at: new Date().toISOString() })
          setIsExecuting(false)
          wsService.disconnect()
          break
        case 'execution_error':
          updateExecution({ status: 'failed', completed_at: new Date().toISOString() })
          setIsExecuting(false)
          wsService.disconnect()
          break
      }
    })

    return () => { removeHandler() }
  }, [currentExecution?.id])

  // Auto-scroll logs
  useEffect(() => {
    logBottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [currentExecution?.logs.length])

  if (!panelOpen) return null

  const LOG_LEVEL_COLORS = {
    info: 'text-slate-600',
    debug: 'text-slate-400',
    warn: 'text-amber-600',
    error: 'text-red-500',
  }

  return (
    <div className="absolute bottom-3 left-1/2 -translate-x-1/2 w-[600px] max-h-[320px] bg-white border border-slate-200 rounded-xl shadow-xl z-20 flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-slate-100">
        <div className="flex items-center gap-2">
          <Play className="h-4 w-4 text-slate-600" />
          <span className="text-sm font-semibold text-slate-900">Execution</span>
          {currentExecution && (
            <Badge variant={STATUS_BADGES[currentExecution.status] || 'secondary'} className="text-[10px] capitalize">
              {currentExecution.status}
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon-sm" onClick={() => setPanelOpen(false)}>
            <ChevronDown className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon-sm" onClick={() => { setPanelOpen(false); setCurrentExecution(null) }}>
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {!currentExecution ? (
        <div className="flex-1 flex items-center justify-center text-xs text-slate-400 p-4">
          Start a flow execution to see results here
        </div>
      ) : (
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'logs' | 'status')} className="flex-1 flex flex-col min-h-0">
          <TabsList className="mx-4 mt-2 w-auto self-start">
            <TabsTrigger value="logs" className="text-xs">Logs</TabsTrigger>
            <TabsTrigger value="status" className="text-xs">Status</TabsTrigger>
          </TabsList>

          <TabsContent value="logs" className="flex-1 min-h-0 mx-0 mt-0">
            <ScrollArea className="h-[220px]">
              <div className="p-3 space-y-0.5 font-mono">
                {currentExecution.logs.map((log) => (
                  <div key={log.id} className="flex items-start gap-2 text-[11px] py-0.5">
                    <span className="text-slate-300 flex-shrink-0">
                      {new Date(log.timestamp).toLocaleTimeString('en', { hour12: false })}
                    </span>
                    <span
                      className={cn(
                        'font-semibold uppercase text-[9px] w-8 flex-shrink-0',
                        LOG_LEVEL_COLORS[log.level]
                      )}
                    >
                      {log.level}
                    </span>
                    <span className="text-slate-500 flex-shrink-0 max-w-[80px] truncate">[{log.node_name}]</span>
                    <span className={cn(LOG_LEVEL_COLORS[log.level], 'flex-1')}>{log.message}</span>
                  </div>
                ))}
                {currentExecution.logs.length === 0 && (
                  <div className="text-slate-400 text-xs py-2">No logs yet...</div>
                )}
                <div ref={logBottomRef} />
              </div>
            </ScrollArea>
          </TabsContent>

          <TabsContent value="status" className="flex-1 min-h-0">
            <ScrollArea className="h-[220px]">
              <ExecutionStatus execution={currentExecution} />
            </ScrollArea>
          </TabsContent>
        </Tabs>
      )}
    </div>
  )
}
