import { useState, useEffect } from 'react'
import { RefreshCw, CheckCircle2, AlertCircle, Bot, Zap, Hash } from 'lucide-react'
import { useProviderStore } from '@/store/providerStore'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'

interface SettingsPanelProps {
  isOpen?: boolean
  onOpenChange?: (open: boolean) => void
}

export function SettingsPanel({ isOpen: controlledIsOpen, onOpenChange }: SettingsPanelProps) {
  const [internalIsOpen, setInternalIsOpen] = useState(false)
  const isOpen = controlledIsOpen ?? internalIsOpen

  const setIsOpen = (open: boolean) => {
    setInternalIsOpen(open)
    onOpenChange?.(open)
  }

  const {
    selectedProvider,
    setSelectedProvider,
    openCodeCLIPath,
    setOpenCodeCLIPath,
    openAIBaseURL,
    setOpenAIBaseURL,
    openAIModel,
    setOpenAIModel,
    defaultFallback,
    setDefaultFallback,
    autoSyncSkills,
    setAutoSyncSkills,
    syncIntervalMins,
    setSyncIntervalMins,
    externalSources,
    loadExternalSources,
    isSyncing,
    lastSyncResult,
    syncSkills,
  } = useProviderStore()

  useEffect(() => {
    if (isOpen) {
      loadExternalSources()
    }
  }, [isOpen, loadExternalSources])

  const handleSync = async () => {
    try {
      await syncSkills()
    } catch (error) {
      console.error('Sync failed:', error)
    }
  }

  const providers = [
    { value: 'openai', label: 'OpenAI', icon: Bot, desc: 'Use OpenAI API for flow generation' },
    { value: 'opencode', label: 'OpenCode', icon: Zap, desc: 'Use OpenCode CLI for flow generation' },
    { value: 'mock', label: 'Mock Generator', icon: Hash, desc: 'Use built-in mock generator' },
  ] as const

  const fallbacks = [
    { value: 'openai', label: 'OpenAI' },
    { value: 'opencode', label: 'OpenCode' },
    { value: 'mock', label: 'Mock Generator' },
  ] as const

  return (
    <>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="w-full max-w-2xl max-h-[80vh] bg-white rounded-xl shadow-2xl overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b">
              <h2 className="text-lg font-semibold">Settings</h2>
              <Button variant="ghost" size="sm" onClick={() => setIsOpen(false)}>
                ✕
              </Button>
            </div>

            <ScrollArea className="h-[calc(80vh-60px)]">
              <div className="p-6 space-y-6">
                {/* Provider Selection */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">LLM Provider</CardTitle>
                    <CardDescription>Select the provider for AI-powered flow generation</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-3 gap-3">
                      {providers.map((provider) => (
                        <button
                          key={provider.value}
                          onClick={() => setSelectedProvider(provider.value)}
                          className={`p-3 rounded-lg border-2 text-left transition-all ${
                            selectedProvider === provider.value
                              ? 'border-blue-500 bg-blue-50'
                              : 'border-slate-200 hover:border-slate-300'
                          }`}
                        >
                          <div className="flex items-center gap-2 mb-1">
                            <provider.icon className="h-4 w-4" />
                            <span className="font-medium text-sm">{provider.label}</span>
                          </div>
                          <p className="text-xs text-slate-500">{provider.desc}</p>
                        </button>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                {/* OpenCode Settings */}
                {selectedProvider === 'opencode' && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base">OpenCode Settings</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div>
                        <label className="text-sm font-medium">CLI Path</label>
                        <Input
                          value={openCodeCLIPath}
                          onChange={(e) => setOpenCodeCLIPath(e.target.value)}
                          placeholder="opencode"
                          className="mt-1"
                        />
                        <p className="text-xs text-slate-500 mt-1">
                          Path to OpenCode CLI executable
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* OpenAI Settings */}
                {selectedProvider === 'openai' && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base">OpenAI Settings</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div>
                        <label className="text-sm font-medium">Base URL</label>
                        <Input
                          value={openAIBaseURL}
                          onChange={(e) => setOpenAIBaseURL(e.target.value)}
                          placeholder="https://api.openai.com/v1"
                          className="mt-1"
                        />
                      </div>
                      <div>
                        <label className="text-sm font-medium">Model</label>
                        <Input
                          value={openAIModel}
                          onChange={(e) => setOpenAIModel(e.target.value)}
                          placeholder="gpt-4o-mini"
                          className="mt-1"
                        />
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Fallback Settings */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Fallback Behavior</CardTitle>
                    <CardDescription>What to do when the primary provider fails</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <select
                      value={defaultFallback}
                      onChange={(e) => setDefaultFallback(e.target.value as typeof defaultFallback)}
                      className="w-full p-2 border rounded-lg"
                    >
                      {fallbacks.map((fb) => (
                        <option key={fb.value} value={fb.value}>
                          {fb.label}
                        </option>
                      ))}
                    </select>
                  </CardContent>
                </Card>

                {/* Skill Sync */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">External Skills</CardTitle>
                    <CardDescription>Import skills from external agents</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          id="autoSync"
                          checked={autoSyncSkills}
                          onChange={(e) => setAutoSyncSkills(e.target.checked)}
                          className="rounded"
                        />
                        <label htmlFor="autoSync" className="text-sm">
                          Auto-sync on startup
                        </label>
                      </div>
                      {autoSyncSkills && (
                        <div className="flex items-center gap-2">
                          <label className="text-sm text-slate-500">Interval:</label>
                          <Input
                            type="number"
                            value={syncIntervalMins}
                            onChange={(e) => setSyncIntervalMins(Number(e.target.value))}
                            className="w-20 h-8"
                            min={1}
                          />
                          <span className="text-sm text-slate-500">min</span>
                        </div>
                      )}
                    </div>

                    <Button
                      onClick={handleSync}
                      disabled={isSyncing}
                      className="w-full"
                      variant="outline"
                    >
                      <RefreshCw className={`h-4 w-4 mr-2 ${isSyncing ? 'animate-spin' : ''}`} />
                      {isSyncing ? 'Syncing...' : 'Sync Now'}
                    </Button>

                    {lastSyncResult && (
                      <div className="flex gap-2 text-sm">
                        <Badge variant="outline" className="bg-green-50">
                          <CheckCircle2 className="h-3 w-3 mr-1" />
                          Imported: {lastSyncResult.imported}
                        </Badge>
                        <Badge variant="outline">
                          Updated: {lastSyncResult.updated}
                        </Badge>
                        <Badge variant="outline">
                          Skipped: {lastSyncResult.skipped}
                        </Badge>
                        {lastSyncResult.errors > 0 && (
                          <Badge variant="outline" className="bg-red-50">
                            <AlertCircle className="h-3 w-3 mr-1" />
                            Errors: {lastSyncResult.errors}
                          </Badge>
                        )}
                      </div>
                    )}

                    {externalSources.length > 0 && (
                      <div className="space-y-2">
                        <p className="text-sm font-medium">Detected Sources:</p>
                        {externalSources.map((source, idx) => (
                          <div
                            key={idx}
                            className="p-2 bg-slate-50 rounded-lg text-sm"
                          >
                            <div className="font-medium">{source.name}</div>
                            <div className="text-xs text-slate-500">{source.path}</div>
                            <div className="text-xs text-slate-400">
                              {source.skill_count} skills found
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            </ScrollArea>
          </div>
        </div>
      )}
    </>
  )
}
