package inapp

import (
	"fmt"
	"gorm.io/gorm"
	"NOTIFICATION/websocket" // Import the WebSocket package
)

type Notification struct {
	ID      int
	UserID  int
	Title   string
	Message string
	IsRead  bool
}

// NotifyUsersAboutBid sends notifications (in-app and WebSocket) to all bidders except the new one.
func NotifyUsersAboutBid(db *gorm.DB, auctionID, newBidderID int, bidAmount float64) error {
	// Get distinct bidders for the auction
	var bidders []int
	result := db.Table("bid").
		Select("DISTINCT user_id").
		Where("auction_id = ?", auctionID).
		Scan(&bidders)

	if result.Error != nil {
		return fmt.Errorf("error fetching bidders: %v", result.Error)
	}

	// Iterate over each user and create both in-app and WebSocket notifications
	for _, bidderID := range bidders {
		if bidderID != newBidderID {
			// Create in-app notification
			notification := Notification{
				UserID:  bidderID,
				Title:   "New bid placed",
				Message: fmt.Sprintf("A new bid of %.2f has been placed by User %d on auction %d", bidAmount, newBidderID, auctionID),
				IsRead:  false,
			}

			// Save in-app notification to the database
			if err := db.Create(&notification).Error; err != nil {
				return fmt.Errorf("error creating in-app notification: %v", err)
			}

			// Broadcast the notification via WebSocket
			wsNotification := websocket.Notification{
				Message: notification.Message,
			}
			websocket.Broadcast(wsNotification) // Ensure that this method is correctly implemented in the websocket package
		}
	}

	return nil
}
