import type { WSMessage } from '@/types'

type MessageHandler = (msg: WSMessage) => void

class WebSocketService {
  private ws: WebSocket | null = null
  private handlers: Set<MessageHandler> = new Set()
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null
  private executionId: string | null = null

  connect(executionId: string) {
    this.executionId = executionId
    this.disconnect()

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
    const url = `${protocol}//${window.location.host}/ws/execution/${executionId}`

    this.ws = new WebSocket(url)

    this.ws.onmessage = (event) => {
      try {
        const msg: WSMessage = JSON.parse(event.data)
        this.handlers.forEach((h) => h(msg))
      } catch (e) {
        console.error('WS parse error', e)
      }
    }

    this.ws.onclose = () => {
      // Auto-reconnect once after 2s if we still have an executionId
      if (this.executionId) {
        this.reconnectTimer = setTimeout(() => this.connect(this.executionId!), 2000)
      }
    }

    this.ws.onerror = (e) => {
      console.error('WebSocket error', e)
    }
  }

  disconnect() {
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer)
    this.reconnectTimer = null
    this.executionId = null
    if (this.ws) {
      this.ws.close()
      this.ws = null
    }
  }

  addHandler(handler: MessageHandler) {
    this.handlers.add(handler)
    return () => this.handlers.delete(handler)
  }
}

export const wsService = new WebSocketService()
