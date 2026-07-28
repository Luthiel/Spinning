import { useEffect, useState } from 'react'
import {
  Route,
  Save,
  Play,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Loader2,
  SlidersHorizontal,
} from 'lucide-react'
import { useRouterStore, ROUTER_PRESETS, type PresetKey } from '@/store/routerStore'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { cn } from '@/lib/utils'

interface SmartRouterPanelProps {
  isOpen?: boolean
  onOpenChange?: (open: boolean) => void
}

export function SmartRouterPanel({ isOpen: controlledIsOpen, onOpenChange }: SmartRouterPanelProps) {
  const [internalIsOpen, setInternalIsOpen] = useState(false)
  const isOpen = controlledIsOpen ?? internalIsOpen

  const setIsOpen = (open: boolean) => {
    setInternalIsOpen(open)
    onOpenChange?.(open)
  }

  const {
    config,
    activePreset,
    loading,
    saving,
    simulating,
    simulationResult,
    simulationError,
    loadError,
    applyPreset,
    updateField,
    loadConfig,
    saveConfig,
    simulate,
    resetSimulation,
  } = useRouterStore()

  useEffect(() => {
    if (isOpen) {
      loadConfig()
    }
  }, [isOpen, loadConfig])

  const handlePresetClick = (preset: PresetKey) => {
    applyPreset(preset)
  }

  const [simPrompt, setSimPrompt] = useState('')

  const handleSimulate = async () => {
    await simulate(simPrompt)
  }

  const handleSave = async () => {
    await saveConfig()
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-3xl max-h-[85vh] bg-white rounded-xl shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b flex-shrink-0">
          <div className="flex items-center gap-2">
            <Route className="h-5 w-5 text-blue-600" />
            <h2 className="text-lg font-semibold">Smart Router</h2>
          </div>
          <Button variant="ghost" size="sm" onClick={() => setIsOpen(false)}>
            ✕
          </Button>
        </div>

        <Tabs defaultValue="config" className="flex-1 flex flex-col min-h-0">
          <div className="px-6 pt-4 flex-shrink-0">
            <TabsList className="w-full">
              <TabsTrigger value="config" className="flex-1 gap-1.5">
                <SlidersHorizontal className="h-3.5 w-3.5" />
                配置面板
              </TabsTrigger>
              <TabsTrigger value="simulate" className="flex-1 gap-1.5">
                <Play className="h-3.5 w-3.5" />
                模拟测试
              </TabsTrigger>
            </TabsList>
          </div>

          <ScrollArea className="flex-1 min-h-0">
            <div className="p-6 space-y-6">
              <TabsContent value="config" className="mt-0 space-y-6">
                {loadError && (
                  <div className="flex items-center gap-2 text-sm text-amber-600 bg-amber-50 p-3 rounded-lg">
                    <AlertCircle className="h-4 w-4" />
                    {loadError}
                  </div>
                )}

                {loading && (
                  <div className="flex items-center justify-center py-4 text-sm text-slate-500">
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    加载配置中...
                  </div>
                )}

                {/* Presets */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">预设模式</CardTitle>
                    <CardDescription>快速切换推荐配置组合</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-3 gap-3">
                      {(Object.keys(ROUTER_PRESETS) as PresetKey[]).map((key) => {
                        const preset = ROUTER_PRESETS[key]
                        const isActive = activePreset === key
                        return (
                          <button
                            key={key}
                            onClick={() => handlePresetClick(key)}
                            className={cn(
                              'p-3 rounded-lg border-2 text-left transition-all',
                              isActive
                                ? 'border-blue-500 bg-blue-50'
                                : 'border-slate-200 hover:border-slate-300'
                            )}
                          >
                            <span className="font-medium text-sm">{preset.label}</span>
                            <div className="mt-1 space-y-0.5 text-[10px] text-slate-500">
                              <div>Budget: {preset.config.token_budget}</div>
                              <div>Health ≥ {preset.config.min_health_score}</div>
                              <div>Max: {preset.config.max_skills}</div>
                              <div>Dedup: {preset.config.dedup_threshold}</div>
                            </div>
                          </button>
                        )
                      })}
                    </div>
                  </CardContent>
                </Card>

                {/* Sliders */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">详细配置</CardTitle>
                    <CardDescription>微调路由参数</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <ConfigSlider
                      label="Token Budget"
                      value={config.token_budget}
                      min={0}
                      max={10000}
                      step={100}
                      unit=""
                      onChange={(v) => updateField('token_budget', v)}
                    />
                    <ConfigSlider
                      label="最低健康分"
                      value={config.min_health_score}
                      min={0}
                      max={100}
                      step={1}
                      unit=""
                      onChange={(v) => updateField('min_health_score', v)}
                    />
                    <ConfigSlider
                      label="最大 Skill 数"
                      value={config.max_skills}
                      min={1}
                      max={30}
                      step={1}
                      unit=""
                      onChange={(v) => updateField('max_skills', v)}
                    />
                    <ConfigSlider
                      label="去重阈值"
                      value={config.dedup_threshold}
                      min={0.5}
                      max={1.0}
                      step={0.01}
                      unit=""
                      onChange={(v) => updateField('dedup_threshold', v)}
                    />
                  </CardContent>
                </Card>

                {/* Current config summary */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">当前配置</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <SummaryItem label="Token Budget" value={config.token_budget.toString()} />
                      <SummaryItem label="最低健康分" value={config.min_health_score.toString()} />
                      <SummaryItem label="最大 Skill 数" value={config.max_skills.toString()} />
                      <SummaryItem label="去重阈值" value={config.dedup_threshold.toFixed(2)} />
                    </div>
                  </CardContent>
                </Card>

                <Button
                  onClick={handleSave}
                  disabled={saving}
                  className="w-full"
                >
                  {saving ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Save className="h-4 w-4 mr-2" />
                  )}
                  {saving ? '保存中...' : '保存配置'}
                </Button>
              </TabsContent>

              <TabsContent value="simulate" className="mt-0 space-y-6">
                {/* Simulation Input */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">任务描述</CardTitle>
                    <CardDescription>输入任务描述，模拟 Smart Router 的 skill 选择过程</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <textarea
                      value={simPrompt}
                      onChange={(e) => setSimPrompt(e.target.value)}
                      placeholder="例如：分析用户评论的情感倾向并生成总结报告..."
                      className="w-full min-h-[100px] p-3 text-sm border rounded-lg resize-y focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                    <div className="flex items-center gap-2">
                      <Button
                        onClick={handleSimulate}
                        disabled={simulating || !simPrompt.trim()}
                        className="flex-1"
                      >
                        {simulating ? (
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        ) : (
                          <Play className="h-4 w-4 mr-2" />
                        )}
                        {simulating ? '模拟中...' : '模拟'}
                      </Button>
                      {simulationResult && (
                        <Button variant="outline" onClick={resetSimulation}>
                          清除
                        </Button>
                      )}
                    </div>
                    {simulationError && (
                      <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 p-3 rounded-lg">
                        <AlertCircle className="h-4 w-4" />
                        {simulationError}
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Simulation Results */}
                {simulationResult && (
                  <div className="space-y-4">
                    {/* Summary */}
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-base">模拟结果概览</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="flex gap-4">
                          <div className="flex-1 p-3 bg-slate-50 rounded-lg text-center">
                            <div className="text-2xl font-bold text-slate-800">
                              {simulationResult.total_token_cost}
                            </div>
                            <div className="text-xs text-slate-500 mt-1">总计 Token</div>
                          </div>
                          <div className="flex-1 p-3 bg-slate-50 rounded-lg text-center">
                            <div className="text-2xl font-bold text-slate-800">
                              {simulationResult.budget_usage_percent.toFixed(1)}%
                            </div>
                            <div className="text-xs text-slate-500 mt-1">Budget 使用率</div>
                          </div>
                          <div className="flex-1 p-3 bg-slate-50 rounded-lg text-center">
                            <div className="text-2xl font-bold text-emerald-600">
                              {simulationResult.selected.length}
                            </div>
                            <div className="text-xs text-slate-500 mt-1">已选中</div>
                          </div>
                          <div className="flex-1 p-3 bg-slate-50 rounded-lg text-center">
                            <div className="text-2xl font-bold text-rose-500">
                              {simulationResult.filtered.length}
                            </div>
                            <div className="text-xs text-slate-500 mt-1">已过滤</div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    {/* Selected Skills */}
                    {simulationResult.selected.length > 0 && (
                      <Card>
                        <CardHeader>
                          <CardTitle className="text-base flex items-center gap-2">
                            <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                            被选中的 Skill
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-2">
                          {simulationResult.selected.map((skill) => (
                            <div
                              key={skill.skill_id}
                              className="flex items-center justify-between p-3 bg-emerald-50 border border-emerald-100 rounded-lg"
                            >
                              <div className="flex items-center gap-3">
                                <Badge variant="outline" className="bg-white text-emerald-700 border-emerald-200">
                                  {skill.grade}
                                </Badge>
                                <span className="text-sm font-medium">{skill.name}</span>
                              </div>
                              <div className="flex items-center gap-3 text-xs text-slate-500">
                                <span>score: {skill.score.toFixed(1)}</span>
                                <span>tokens: {skill.token_cost}</span>
                              </div>
                            </div>
                          ))}
                        </CardContent>
                      </Card>
                    )}

                    {/* Filtered Skills */}
                    {simulationResult.filtered.length > 0 && (
                      <Card>
                        <CardHeader>
                          <CardTitle className="text-base flex items-center gap-2">
                            <XCircle className="h-4 w-4 text-rose-500" />
                            被过滤的 Skill
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-2">
                          {simulationResult.filtered.map((skill) => (
                            <div
                              key={skill.skill_id}
                              className="flex items-center justify-between p-3 bg-rose-50 border border-rose-100 rounded-lg"
                            >
                              <div className="flex items-center gap-3">
                                <Badge variant="outline" className="bg-white text-rose-700 border-rose-200">
                                  {skill.grade}
                                </Badge>
                                <span className="text-sm font-medium">{skill.name}</span>
                              </div>
                              <div className="flex items-center gap-3 text-xs text-slate-500">
                                <span className="text-rose-600">{skill.reason}</span>
                                <span>score: {skill.score.toFixed(1)}</span>
                              </div>
                            </div>
                          ))}
                        </CardContent>
                      </Card>
                    )}
                  </div>
                )}
              </TabsContent>
            </div>
          </ScrollArea>
        </Tabs>
      </div>
    </div>
  )
}

function ConfigSlider({
  label,
  value,
  min,
  max,
  step,
  unit,
  onChange,
}: {
  label: string
  value: number
  min: number
  max: number
  step: number
  unit: string
  onChange: (value: number) => void
}) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <label className="text-sm font-medium">{label}</label>
        <span className="text-sm font-mono bg-slate-100 px-2 py-0.5 rounded">
          {value}
          {unit}
        </span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        aria-label={label}
        className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
      />
      <div className="flex justify-between text-[10px] text-slate-400">
        <span>{min}</span>
        <span>{max}</span>
      </div>
    </div>
  )
}

function SummaryItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between p-2 bg-slate-50 rounded">
      <span className="text-slate-500">{label}</span>
      <span className="font-mono font-medium">{value}</span>
    </div>
  )
}
