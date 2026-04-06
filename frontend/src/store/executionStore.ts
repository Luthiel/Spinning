import { create } from 'zustand'
import type { FlowExecution, ExecutionLog } from '@/types'

interface ExecutionState {
  currentExecution: FlowExecution | null
  executionHistory: FlowExecution[]
  isExecuting: boolean
  panelOpen: boolean
  activeTab: 'logs' | 'status'

  setCurrentExecution: (exec: FlowExecution | null) => void
  updateExecution: (partial: Partial<FlowExecution>) => void
  appendLog: (log: ExecutionLog) => void
  setIsExecuting: (v: boolean) => void
  setPanelOpen: (v: boolean) => void
  setActiveTab: (tab: 'logs' | 'status') => void
  addToHistory: (exec: FlowExecution) => void
  clearHistory: () => void
}

export const useExecutionStore = create<ExecutionState>((set) => ({
  currentExecution: null,
  executionHistory: [],
  isExecuting: false,
  panelOpen: false,
  activeTab: 'logs',

  setCurrentExecution: (currentExecution) => set({ currentExecution }),

  updateExecution: (partial) =>
    set((state) => ({
      currentExecution: state.currentExecution
        ? { ...state.currentExecution, ...partial }
        : null,
    })),

  appendLog: (log) =>
    set((state) => ({
      currentExecution: state.currentExecution
        ? {
            ...state.currentExecution,
            logs: [...state.currentExecution.logs, log],
          }
        : null,
    })),

  setIsExecuting: (isExecuting) => set({ isExecuting }),
  setPanelOpen: (panelOpen) => set({ panelOpen }),
  setActiveTab: (activeTab) => set({ activeTab }),

  addToHistory: (exec) =>
    set((state) => ({
      executionHistory: [exec, ...state.executionHistory].slice(0, 20),
    })),

  clearHistory: () => set({ executionHistory: [] }),
}))
