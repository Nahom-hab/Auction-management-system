package main

import (
	"NOTIFICATION/inapp"
	"NOTIFICATION/websocket"
	
	"log"
	"strconv"

	"github.com/gin-gonic/gin"
	"gorm.io/driver/postgres"
	"gorm.io/gorm"
)

func initDB() *gorm.DB {
	dsn := "user=postgres password=admin dbname=postgres port=5432 sslmode=disable"
	db, err := gorm.Open(postgres.Open(dsn), &gorm.Config{})
	if err != nil {
		log.Fatal("Failed to connect to the database:", err)
	}
	return db
}


var db *gorm.DB // Initialize your database connection here

func PlaceBid(c *gin.Context) {
	auctionID, _ := strconv.Atoi(c.Param("auction_id"))
	newBidderID, _ := strconv.Atoi(c.Param("user_id"))
	bidAmount, _ := strconv.ParseFloat(c.Param("bid_amount"), 64)

	// Notify all bidders except the new bidder about the new bid (in-app + WebSocket)
	err := inapp.NotifyUsersAboutBid(db, auctionID, newBidderID, bidAmount)
	if err != nil {
		log.Println("Failed to notify users:", err)
		c.JSON(500, gin.H{"error": "failed to notify users"})
		return
	}

	// Optionally, if the auction is complete, notify the winner via email
	// err = email.NotifyAuctionWinner(db, auctionID)
	// if err != nil {
	//     log.Println("Failed to notify auction winner:", err)
	//     c.JSON(500, gin.H{"error": "failed to notify auction winner"})
	//     return
	// }

	c.JSON(200, gin.H{"message": "Bid placed and notifications sent"})
}



func main() {
    db =initDB()

    r := gin.Default()

	// WebSocket route
	r.GET("/ws", websocket.HandleConnections)

	// Route for placing a bid
	r.POST("/auction/:auction_id/user/:user_id/bid/:bid_amount", PlaceBid)

	// Start WebSocket message handler
	go websocket.HandleMessages()

    // Use db for in-app notifications or email notifications
    // For example, if you want to notify about bids:
    // err = inapp.NotifyUsersAboutBid(db, auctionID, newBidderID, bidAmount)
    // if err != nil {
        //    log.Println("Failed to notify users:", err)
        // }
        
       
    // Run the server
    r.Run(":8080")
}
