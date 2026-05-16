import { useEffect, useMemo, useState } from 'react'
import Editor, { DiffEditor } from '@monaco-editor/react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { Bot, GitCompare, History, Loader2, RotateCcw, Save, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { skillsApi } from '@/services/api'
import type { SkillFileContent, SkillFileEditProposal, SkillFileInfo, SkillFileVersion } from '@/types'
import { cn } from '@/lib/utils'

interface Props {
  skillId: string
  file: SkillFileInfo | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onSaved?: () => void
}

function monacoLanguage(language: string) {
  if (language === 'shell') return 'shell'
  if (language === 'typescript') return 'typescript'
  if (language === 'javascript') return 'javascript'
  if (language === 'markdown') return 'markdown'
  if (language === 'yaml') return 'yaml'
  if (language === 'python') return 'python'
  if (language === 'json') return 'json'
  if (language === 'go') return 'go'
  return 'plaintext'
}

export function SkillFileEditorDialog({ skillId, file, open, onOpenChange, onSaved }: Props) {
  const [loadedFile, setLoadedFile] = useState<SkillFileContent | null>(null)
  const [draft, setDraft] = useState('')
  const [versions, setVersions] = useState<SkillFileVersion[]>([])
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [prompt, setPrompt] = useState('')
  const [proposal, setProposal] = useState<SkillFileEditProposal | null>(null)
  const [error, setError] = useState<string | null>(null)

  const language = useMemo(
    () => monacoLanguage(loadedFile?.language || file?.language || 'plaintext'),
    [file?.language, loadedFile?.language]
  )

  const loadContent = async () => {
    if (!file) return
    setLoading(true)
    setError(null)
    try {
      const [content, history] = await Promise.all([
        skillsApi.readFile(skillId, file.path),
        skillsApi.listFileVersions(skillId, file.path),
      ])
      setLoadedFile(content)
      setDraft(content.content)
      setVersions(history)
      setProposal(null)
    } catch (e: any) {
      setError(e.response?.data?.error || e.message || 'Failed to load file')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (open && file) loadContent()
  }, [open, file?.path])

  const refreshVersions = async () => {
    if (!file) return
    setVersions(await skillsApi.listFileVersions(skillId, file.path))
  }

  const saveContent = async (content: string, message: string, baseHash?: string) => {
    if (!file) return
    setSaving(true)
    setError(null)
    try {
      const result = await skillsApi.saveFile(skillId, {
        path: file.path,
        content,
        base_hash: baseHash || loadedFile?.hash,
        message,
      })
      setLoadedFile(result.file)
      setDraft(result.file.content)
      setProposal(null)
      await refreshVersions()
      onSaved?.()
    } catch (e: any) {
      setError(e.response?.data?.error || e.message || 'Failed to save file')
    } finally {
      setSaving(false)
    }
  }

  const proposeEdit = async () => {
    if (!file || !prompt.trim()) return
    setSaving(true)
    setError(null)
    try {
      const next = await skillsApi.proposeFileEdit(skillId, {
        path: file.path,
        prompt: prompt.trim(),
        current_content: draft,
      })
      setProposal(next)
      setPrompt('')
    } catch (e: any) {
      setError(e.response?.data?.error || e.message || 'Failed to propose edit')
    } finally {
      setSaving(false)
    }
  }

  const compareVersion = (version: SkillFileVersion) => {
    setProposal({
      path: version.path,
      language: version.language,
      proposed_content: version.content,
      explanation: `Comparing against ${version.message || version.id}`,
      diff: '',
      base_hash: loadedFile?.hash || '',
    })
  }

  const restoreVersion = async (version: SkillFileVersion) => {
    if (!window.confirm('Restore this version?')) return
    setSaving(true)
    setError(null)
    try {
      const result = await skillsApi.restoreFileVersion(skillId, version.id)
      setLoadedFile(result.file)
      setDraft(result.file.content)
      setProposal(null)
      await refreshVersions()
      onSaved?.()
    } catch (e: any) {
      setError(e.response?.data?.error || e.message || 'Failed to restore version')
    } finally {
      setSaving(false)
    }
  }

  const deleteVersion = async (version: SkillFileVersion) => {
    if (!window.confirm('Delete this version?')) return
    await skillsApi.deleteFileVersion(skillId, version.id)
    await refreshVersions()
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[1180px] w-[calc(100vw-56px)] h-[calc(100vh-72px)] grid-rows-[auto_minmax(0,1fr)] p-0 gap-0 overflow-hidden">
        <DialogHeader className="px-4 py-3 border-b border-slate-100">
          <DialogTitle className="text-sm font-semibold">{file?.path || 'Skill file'}</DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-[minmax(0,1fr)_360px] min-h-0 flex-1">
          <div className="min-w-0 border-r border-slate-100 flex flex-col">
            <Tabs defaultValue="edit" className="flex-1 min-h-0 flex flex-col">
              <div className="flex items-center justify-between px-3 py-2 border-b border-slate-100">
                <TabsList className="h-7">
                  <TabsTrigger value="edit" className="text-xs h-5">Edit</TabsTrigger>
                  <TabsTrigger value="preview" className="text-xs h-5" disabled={language !== 'markdown'}>Preview</TabsTrigger>
                  <TabsTrigger value="diff" className="text-xs h-5" disabled={!proposal}>Diff</TabsTrigger>
                </TabsList>
                <Button
                  size="sm"
                  onClick={() => saveContent(draft, 'Manual save')}
                  disabled={!loadedFile || saving}
                  className="h-7 gap-1.5"
                >
                  {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
                  Save
                </Button>
              </div>

              {error && (
                <div className="mx-3 mt-2 rounded-md border border-red-200 bg-red-50 px-2 py-1 text-xs text-red-600">
                  {error}
                </div>
              )}

              <TabsContent value="edit" className="flex-1 min-h-0 m-0">
                {loading ? (
                  <div className="h-full flex items-center justify-center text-xs text-slate-400">
                    <Loader2 className="h-4 w-4 animate-spin mr-2" /> Loading
                  </div>
                ) : (
                  <Editor
                    height="100%"
                    language={language}
                    value={draft}
                    onChange={(value) => setDraft(value || '')}
                    options={{ minimap: { enabled: false }, fontSize: 13, wordWrap: 'on' }}
                  />
                )}
              </TabsContent>

              <TabsContent value="preview" className="flex-1 min-h-0 m-0">
                <ScrollArea className="h-full">
                  <div className="prose prose-slate max-w-none p-5 text-sm">
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>{draft}</ReactMarkdown>
                  </div>
                </ScrollArea>
              </TabsContent>

              <TabsContent value="diff" className="flex-1 min-h-0 m-0">
                <DiffEditor
                  height="100%"
                  language={language}
                  original={draft}
                  modified={proposal?.proposed_content || draft}
                  options={{ readOnly: true, minimap: { enabled: false }, wordWrap: 'on' }}
                />
              </TabsContent>
            </Tabs>
          </div>

          <div className="min-w-0 flex flex-col bg-slate-50/80">
            <div className="p-3 border-b border-slate-100 bg-white">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-700 mb-2">
                <Bot className="h-3.5 w-3.5 text-blue-500" /> LLM Chat
              </div>
              <Textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="Describe the change..."
                className="min-h-[92px] text-xs bg-white"
              />
              <div className="flex justify-end mt-2">
                <Button size="sm" className="h-7" onClick={proposeEdit} disabled={!prompt.trim() || saving}>
                  {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <GitCompare className="h-3.5 w-3.5" />}
                  Propose
                </Button>
              </div>
            </div>

            {proposal && (
              <div className="p-3 border-b border-slate-100 bg-white space-y-2">
                <div className="text-xs font-semibold text-slate-700">Pending Diff</div>
                <p className="text-xs text-slate-500 leading-relaxed">{proposal.explanation}</p>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    className="h-7"
                    onClick={() => saveContent(proposal.proposed_content, 'LLM edit', proposal.base_hash)}
                    disabled={saving}
                  >
                    Apply
                  </Button>
                  <Button size="sm" variant="outline" className="h-7" onClick={() => setProposal(null)}>
                    Reject
                  </Button>
                </div>
              </div>
            )}

            <div className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-700 bg-white border-b border-slate-100">
              <History className="h-3.5 w-3.5" /> Versions
            </div>
            <ScrollArea className="flex-1 min-h-0">
              <div className="p-2 space-y-1.5">
                {versions.map((version) => (
                  <div key={version.id} className="rounded-md border border-slate-200 bg-white p-2">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="text-xs font-medium text-slate-700 truncate">
                          {version.message || version.source}
                        </div>
                        <div className="text-[10px] text-slate-400">
                          {new Date(version.created_at).toLocaleString()}
                        </div>
                      </div>
                      <span className={cn('text-[10px] px-1.5 py-0.5 rounded bg-slate-100 text-slate-500')}>
                        {version.source}
                      </span>
                    </div>
                    <div className="flex gap-1 mt-2">
                      <Button variant="ghost" size="icon-sm" onClick={() => compareVersion(version)}>
                        <GitCompare className="h-3.5 w-3.5" />
                      </Button>
                      <Button variant="ghost" size="icon-sm" onClick={() => restoreVersion(version)}>
                        <RotateCcw className="h-3.5 w-3.5" />
                      </Button>
                      <Button variant="ghost" size="icon-sm" className="text-red-500 hover:bg-red-50" onClick={() => deleteVersion(version)}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                ))}
                {versions.length === 0 && (
                  <div className="text-xs text-slate-400 text-center py-6">No versions yet</div>
                )}
              </div>
            </ScrollArea>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
