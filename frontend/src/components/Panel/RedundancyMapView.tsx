import { useState, useCallback } from 'react'
import { Search, ScanSearch, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { RedundancyNetworkGraph } from './RedundancyNetworkGraph'
import { RedundancyPairTable } from './RedundancyPairTable'
import { redundancyApi } from '@/services/api'
import type { RedundancyMap, RedundancyAction } from '@/types'

interface RedundancyMapViewProps {
  initialMap?: RedundancyMap
}

export function RedundancyMapView({ initialMap }: RedundancyMapViewProps) {
  const [map, setMap] = useState<RedundancyMap | undefined>(initialMap)
  const [loading, setLoading] = useState(false)
  const [detecting, setDetecting] = useState(false)
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const loadMap = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await redundancyApi.getMap()
      setMap(data)
    } catch (e) {
      console.error('Failed to load redundancy map', e)
      setError('Failed to load redundancy map')
    } finally {
      setLoading(false)
    }
  }, [])

  const handleDetect = useCallback(async () => {
    setDetecting(true)
    setError(null)
    try {
      const result = await redundancyApi.detect()
      setMap(result.map)
    } catch (e) {
      console.error('Detection failed', e)
      setError('Detection failed. Please try again.')
    } finally {
      setDetecting(false)
    }
  }, [])

  const handleNodeClick = useCallback((nodeId: string) => {
    setSelectedNodeId((prev) => (prev === nodeId ? null : nodeId))
  }, [])

  const handlePairAction = useCallback(async (_pairId: string, _action: RedundancyAction) => {
    // Placeholder: UI buttons are present but backend integration is future work
    await new Promise((resolve) => setTimeout(resolve, 300))
  }, [])

  const hasData = map && (map.nodes.length > 0 || map.pairs.length > 0)

  return (
    <div className="flex flex-col h-full">
      {/* Header with detect button */}
      <div className="flex items-center justify-between px-1 pb-2">
        <div className="text-[10px] text-slate-500">
          {hasData ? (
            <span>
              {map.nodes.length} nodes · {map.pairs.length} pairs
            </span>
          ) : (
            <span>No data</span>
          )}
        </div>
        <div className="flex gap-1">
          <Button
            variant="outline"
            size="sm"
            className="h-6 text-[10px] px-2"
            onClick={loadMap}
            disabled={loading}
          >
            {loading ? (
              <Loader2 className="h-3 w-3 animate-spin mr-1" />
            ) : (
              <Search className="h-3 w-3 mr-1" />
            )}
            Refresh
          </Button>
          <Button
            size="sm"
            className="h-6 text-[10px] px-2"
            onClick={handleDetect}
            disabled={detecting}
          >
            {detecting ? (
              <Loader2 className="h-3 w-3 animate-spin mr-1" />
            ) : (
              <ScanSearch className="h-3 w-3 mr-1" />
            )}
            Detect
          </Button>
        </div>
      </div>

      {/* Error message */}
      {error && (
        <div className="text-[10px] text-red-500 bg-red-50 border border-red-200 rounded-md px-2 py-1.5 mb-2">
          {error}
        </div>
      )}

      {/* Content tabs */}
      {hasData ? (
        <Tabs defaultValue="graph" className="flex-1 flex flex-col min-h-0">
          <TabsList className="w-full h-7">
            <TabsTrigger value="graph" className="flex-1 text-[11px] h-5">
              Network
            </TabsTrigger>
            <TabsTrigger value="list" className="flex-1 text-[11px] h-5">
              Pairs
            </TabsTrigger>
          </TabsList>

          <TabsContent value="graph" className="flex-1 min-h-0 mt-2">
            <RedundancyNetworkGraph
              nodes={map.nodes}
              edges={map.edges}
              onNodeClick={handleNodeClick}
              selectedNodeId={selectedNodeId}
            />
          </TabsContent>

          <TabsContent value="list" className="flex-1 min-h-0 mt-2">
            <RedundancyPairTable
              pairs={map.pairs}
              onAction={handlePairAction}
            />
          </TabsContent>
        </Tabs>
      ) : (
        <div className="flex-1 flex flex-col items-center justify-center text-slate-400">
          <ScanSearch className="h-8 w-8 mb-2 opacity-40" />
          <p className="text-xs">No redundancy data available</p>
          <p className="text-[10px] mt-1">Click Detect to analyze skills</p>
        </div>
      )}
    </div>
  )
}
