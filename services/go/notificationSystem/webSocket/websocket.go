package websocket

import (
	"log"
	"net/http"
	"sync"

	"github.com/gin-gonic/gin"
	"github.com/gorilla/websocket"
)

var upgrader = websocket.Upgrader{
	CheckOrigin: func(r *http.Request) bool {
		return true
	},
}

var clients = make(map[*websocket.Conn]bool) // connected clients
var broadcast = make(chan Notification)      // broadcast channel
var mutex = &sync.Mutex{}                    // mutex to protect clients map

type Notification struct {
    ID      int    `json:"id"`
    UserID  int    `json:"user_id"`
    Title   string `json:"title"`
    Message string `json:"message"`
    IsRead  bool   `json:"is_read"`
}


func HandleConnections(c *gin.Context) {
	ws, err := upgrader.Upgrade(c.Writer, c.Request, nil)
	if err != nil {
		log.Println("Failed to upgrade to WebSocket:", err)
		return
	}
	defer ws.Close()

	// Register new client
	mutex.Lock()
	clients[ws] = true
	mutex.Unlock()

	for {
		var msg Notification
		err := ws.ReadJSON(&msg)
		if err != nil {
			log.Printf("error: %v", err)
			mutex.Lock()
			delete(clients, ws)
			mutex.Unlock()
			break
		}
		// Send the received message to the broadcast channel
		broadcast <- msg
	}
}

func HandleMessages() {
	for {
		// Grab the next message from the broadcast channel
		msg := <-broadcast

		// Send the message to all clients
		mutex.Lock()
		for client := range clients {
			err := client.WriteJSON(msg)
			if err != nil {
				log.Printf("error: %v", err)
				client.Close()
				delete(clients, client)
			}
		}
		mutex.Unlock()
	}
}
func Broadcast(msg Notification) {
	// Send the message to all clients
	mutex.Lock()
	defer mutex.Unlock()

	for client := range clients {
		err := client.WriteJSON(msg)
		if err != nil {
			log.Printf("error: %v", err)
			client.Close()
			delete(clients, client)
		}
	}
}
