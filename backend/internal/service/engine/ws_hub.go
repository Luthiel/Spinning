package engine

import (
	"encoding/json"
	"log"
	"sync"

	"github.com/gorilla/websocket"
)

// WSHub manages WebSocket connections per execution
type WSHub struct {
	mu      sync.RWMutex
	clients map[string]map[*websocket.Conn]bool // executionID -> set of connections
}

func NewWSHub() *WSHub {
	return &WSHub{
		clients: map[string]map[*websocket.Conn]bool{},
	}
}

func (h *WSHub) Register(executionID string, conn *websocket.Conn) {
	h.mu.Lock()
	defer h.mu.Unlock()
	if _, ok := h.clients[executionID]; !ok {
		h.clients[executionID] = map[*websocket.Conn]bool{}
	}
	h.clients[executionID][conn] = true
}

func (h *WSHub) Unregister(executionID string, conn *websocket.Conn) {
	h.mu.Lock()
	defer h.mu.Unlock()
	if conns, ok := h.clients[executionID]; ok {
		delete(conns, conn)
		if len(conns) == 0 {
			delete(h.clients, executionID)
		}
	}
}

func (h *WSHub) Broadcast(executionID string, event WSEvent) {
	h.mu.RLock()
	conns := h.clients[executionID]
	h.mu.RUnlock()

	data, err := json.Marshal(event)
	if err != nil {
		log.Println("[WS] marshal error:", err)
		return
	}

	for conn := range conns {
		if err := conn.WriteMessage(websocket.TextMessage, data); err != nil {
			log.Println("[WS] write error:", err)
			h.Unregister(executionID, conn)
			conn.Close()
		}
	}
}
