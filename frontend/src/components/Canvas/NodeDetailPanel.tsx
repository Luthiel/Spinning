import { useEffect, useState } from 'react'
import { X, Activity, Clock, User, Tag, Layers, FileText, Code2, BookOpen, Pencil, Power } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { useFlowStore } from '@/store/flowStore'
import { skillsApi } from '@/services/api'
import { SkillFileEditorDialog } from './SkillFileEditorDialog'
import { cn } from '@/lib/utils'
import type { SkillFileInfo, SkillFilesResponse } from '@/types'

const STATUS_BADGE: Record<string, 'default' | 'info' | 'success' | 'destructive' | 'secondary' | 'warning'> = {
  idle: 'secondary',
  running: 'info',
  success: 'success',
  error: 'destructive',
  skipped: 'secondary',
  disabled: 'secondary',
  blocked: 'warning',
}

interface Props { nodeId: string }

export function NodeDetailPanel({ nodeId }: Props) {
  const { nodes, setSelectedNodeId, toggleNodeEnabled } = useFlowStore()
  const [files, setFiles] = useState<SkillFilesResponse | null>(null)
  const [editingFile, setEditingFile] = useState<SkillFileInfo | null>(null)
  const [editorOpen, setEditorOpen] = useState(false)
  const node = nodes.find((n) => n.id === nodeId)
  const skill = node?.data.skill

  useEffect(() => {
    let cancelled = false
    if (!skill?.id) {
      setFiles(null)
      return
    }
    skillsApi.listFiles(skill.id)
      .then((result) => { if (!cancelled) setFiles(result) })
      .catch(() => { if (!cancelled) setFiles(null) })
    return () => { cancelled = true }
  }, [skill?.id])

  const openEditor = (file: SkillFileInfo) => {
    setEditingFile(file)
    setEditorOpen(true)
  }

  if (!node) return null

  const { data } = node
  const enabled = data.enabled !== false

  return (
    <div className="absolute right-3 top-3 bottom-3 w-72 bg-white border border-slate-200 rounded-xl shadow-lg z-10 flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-slate-100">
        <div>
          <div className="text-sm font-semibold text-slate-900 truncate">{data.label}</div>
          <div className="text-xs text-slate-400 capitalize">{data.type} node</div>
        </div>
        <Button variant="ghost" size="icon-sm" onClick={() => setSelectedNodeId(null)}>
          <X className="h-4 w-4" />
        </Button>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-4 space-y-4">
          {/* Status */}
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-500">Status</span>
            <Badge variant={STATUS_BADGE[data.status] || 'secondary'} className="capitalize">
              {data.status}
            </Badge>
          </div>

          {data.type === 'skill' && (
            <div className="flex items-center justify-between">
              <span className="text-xs text-slate-500 flex items-center gap-1">
                <Power className="h-3 w-3" /> Enabled
              </span>
              <Button
                size="sm"
                variant={enabled ? 'success' : 'secondary'}
                className="h-7 text-xs"
                onClick={() => toggleNodeEnabled(nodeId)}
              >
                {enabled ? 'On' : 'Off'}
              </Button>
            </div>
          )}

          {/* Call count */}
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-500 flex items-center gap-1">
              <Activity className="h-3 w-3" /> Call Count
            </span>
            <span className="text-xs font-semibold text-slate-700">{data.call_count}</span>
          </div>

          {/* Execution time */}
          {data.execution_time !== undefined && (
            <div className="flex items-center justify-between">
              <span className="text-xs text-slate-500 flex items-center gap-1">
                <Clock className="h-3 w-3" /> Last Duration
              </span>
              <span className="text-xs font-semibold text-slate-700">{data.execution_time}ms</span>
            </div>
          )}

          {/* Skill details */}
          {skill && (
            <>
              <div className="border-t border-slate-100 pt-3">
                <div className="text-xs font-semibold text-slate-700 mb-2">Skill Info</div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-slate-500 flex items-center gap-1">
                      <User className="h-3 w-3" /> Author
                    </span>
                    <span className="text-xs text-slate-700">{skill.author}</span>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-xs text-slate-500">Team</span>
                    <span className="text-xs text-slate-700">{skill.owner_team}</span>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-xs text-slate-500">Version</span>
                    <span className="text-xs font-mono text-slate-700">v{skill.version}</span>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-xs text-slate-500">Status</span>
                    <Badge
                      variant={skill.status === 'active' ? 'success' : skill.status === 'deprecated' ? 'warning' : 'secondary'}
                      className="capitalize text-[10px]"
                    >
                      {skill.status}
                    </Badge>
                  </div>
                </div>
              </div>

              {/* Description */}
              <div>
                <div className="text-xs font-semibold text-slate-700 mb-1">Description</div>
                <p className="text-xs text-slate-500 leading-relaxed">{skill.description}</p>
              </div>

              {/* Categories */}
              {skill.category.length > 0 && (
                <div>
                  <div className="text-xs font-semibold text-slate-700 mb-1.5 flex items-center gap-1">
                    <Layers className="h-3 w-3" /> Categories
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {skill.category.map((c) => (
                      <Badge key={c} variant="secondary" className="text-[10px] capitalize">
                        {c}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {/* Capabilities */}
              {skill.capabilities.length > 0 && (
                <div>
                  <div className="text-xs font-semibold text-slate-700 mb-1.5 flex items-center gap-1">
                    <Tag className="h-3 w-3" /> Capabilities
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {skill.capabilities.map((c) => (
                      <Badge key={c} variant="info" className="text-[10px]">
                        {c}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {/* Input Schema */}
              <div>
                <div className="text-xs font-semibold text-slate-700 mb-1.5">Input Schema</div>
                <div className="bg-slate-50 rounded-lg p-2 space-y-1">
                  {skill.input_schema.properties ? (
                    Object.entries(skill.input_schema.properties).map(([key, prop]) => (
                      <div key={key} className="flex items-center gap-1.5">
                        <span
                          className={cn(
                            'text-[9px] px-1 py-0.5 rounded font-mono',
                            prop.type === 'string' && 'bg-green-100 text-green-700',
                            prop.type === 'number' && 'bg-blue-100 text-blue-700',
                            prop.type === 'boolean' && 'bg-purple-100 text-purple-700',
                            prop.type === 'array' && 'bg-orange-100 text-orange-700',
                            prop.type === 'object' && 'bg-slate-200 text-slate-700'
                          )}
                        >
                          {prop.type}
                        </span>
                        <span className="text-[10px] text-slate-700 font-mono">{key}</span>
                        {skill.input_schema.required?.includes(key) && (
                          <span className="text-[9px] text-red-400">*</span>
                        )}
                      </div>
                    ))
                  ) : (
                    <span className="text-[10px] text-slate-400">No input parameters</span>
                  )}
                </div>
              </div>

              {/* Conflict tags */}
              {skill.conflict_tags.length > 0 && (
                <div>
                  <div className="text-xs font-semibold text-slate-700 mb-1.5">Conflict Tags</div>
                  <div className="flex flex-wrap gap-1">
                    {skill.conflict_tags.map((t) => (
                      <Badge key={t} variant="warning" className="text-[10px]">
                        {t}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              <div>
                <div className="text-xs font-semibold text-slate-700 mb-1.5">Files</div>
                <div className="space-y-1.5">
                  {files?.skill_file && (
                    <FileRow icon="skill" file={files.skill_file} onEdit={openEditor} />
                  )}
                  {files && files.references.length > 0 && (
                    <div>
                      <div className="text-[10px] font-semibold uppercase text-slate-400 mb-1 mt-2">References</div>
                      <div className="space-y-1">
                        {files.references.map((file) => (
                          <FileRow key={file.path} icon="reference" file={file} onEdit={openEditor} />
                        ))}
                      </div>
                    </div>
                  )}
                  {files && files.scripts.length > 0 && (
                    <div>
                      <div className="text-[10px] font-semibold uppercase text-slate-400 mb-1 mt-2">Scripts</div>
                      <div className="space-y-1">
                        {files.scripts.map((file) => (
                          <FileRow key={file.path} icon="script" file={file} onEdit={openEditor} />
                        ))}
                      </div>
                    </div>
                  )}
                  {files && !files.skill_file && files.references.length === 0 && files.scripts.length === 0 && (
                    <div className="text-[10px] text-slate-400">No managed files</div>
                  )}
                </div>
              </div>
            </>
          )}

          {/* Condition expr for condition nodes */}
          {data.type === 'condition' && (
            <div>
              <div className="text-xs font-semibold text-slate-700 mb-1">Condition Expression</div>
              <div className="bg-amber-50 border border-amber-200 rounded px-2 py-1.5 text-xs font-mono text-amber-800">
                {data.condition_expr || <span className="text-amber-400 italic">not set</span>}
              </div>
            </div>
          )}

          {/* Error */}
          {data.error_message && (
            <div>
              <div className="text-xs font-semibold text-red-600 mb-1">Error</div>
              <div className="bg-red-50 border border-red-200 rounded px-2 py-1.5 text-xs text-red-700">
                {data.error_message}
              </div>
            </div>
          )}
        </div>
      </ScrollArea>
      {skill?.id && (
        <SkillFileEditorDialog
          skillId={skill.id}
          file={editingFile}
          open={editorOpen}
          onOpenChange={setEditorOpen}
          onSaved={() => skillsApi.listFiles(skill.id).then(setFiles).catch(() => undefined)}
        />
      )}
    </div>
  )
}

function FileRow({
  icon,
  file,
  onEdit,
}: {
  icon: 'skill' | 'reference' | 'script'
  file: SkillFileInfo
  onEdit: (file: SkillFileInfo) => void
}) {
  const Icon = icon === 'script' ? Code2 : icon === 'reference' ? BookOpen : FileText
  return (
    <div className="flex items-center gap-2 rounded-md border border-slate-100 bg-slate-50 px-2 py-1.5">
      <Icon className="h-3.5 w-3.5 text-slate-400 flex-shrink-0" />
      <div className="min-w-0 flex-1">
        <div className="text-[11px] text-slate-700 truncate">{file.name}</div>
        <div className="text-[9px] text-slate-400">{file.language}</div>
      </div>
      <Button variant="ghost" size="icon-sm" onClick={() => onEdit(file)}>
        <Pencil className="h-3.5 w-3.5" />
      </Button>
    </div>
  )
}
