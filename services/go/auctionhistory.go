package main

import (
    "database/sql"
    "fmt"
    "log"
    "net/http"

    "github.com/gin-gonic/gin"
    _ "github.com/lib/pq"
)

var db *sql.DB

func initDB() {
    connStr := "user=postgres dbname=auction_db sslmode=disable password=1995 host=localhost"
    var err error
    db, err = sql.Open("postgres", connStr)
    if err != nil {
        log.Fatal("Failed to connect to the database:", err)
    }

    err = db.Ping()
    if err != nil {
        log.Fatal("Database ping failed:", err)
    }

    fmt.Println("Database connected successfully")
}

type AuctionHistory struct {
    ID            int64   `json:"id"`
    AuctionID     int64   `json:"auction_id"`
    UserID        int64   `json:"user_id"`
    WinningAmount float64 `json:"winning_amount"`
    CreatedAt     string  `json:"created_at"`
}

func closeAuction(c *gin.Context) {
    auctionID := c.Param("auction_id")

    tx, err := db.Begin()
    if err != nil {
        c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to start transaction"})
        return
    }

    // Update the auction by setting the winner and max bid if time is up
    updateAuctionQuery := `
        UPDATE Auction
        SET bid_winner_id = (
            SELECT user_id FROM bid
            WHERE auction_id = $1
            ORDER BY amount DESC
            LIMIT 1
        ),
        currnt_max_bid = (
            SELECT amount FROM bid
            WHERE auction_id = $1
            ORDER BY amount DESC
            LIMIT 1
        )
        WHERE id = $1 AND bid_closing_time <= NOW();`

    _, err = tx.Exec(updateAuctionQuery, auctionID)
    if err != nil {
        tx.Rollback()
        c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update auction"})
        return
    }

    // Insert the auction history into the AuctionHistory table
    insertHistoryQuery := `
        INSERT INTO AuctionHistory (auction_id, user_id, winning_amount, create_at)
        SELECT a.id, a.bid_winner_id, a.currnt_max_bid, NOW()
        FROM Auction a
        WHERE a.id = $1 AND a.bid_winner_id IS NOT NULL;`

    _, err = tx.Exec(insertHistoryQuery, auctionID)
    if err != nil {
        tx.Rollback()
        c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to insert auction history"})
        return
    }

    err = tx.Commit()
    if err != nil {
        c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to commit transaction"})
        return
    }

    c.JSON(http.StatusOK, gin.H{"message": "Auction closed and winner recorded successfully"})
}

func getAuctionHistory(c *gin.Context) {
    auctionID := c.Param("auction_id")

    query := `SELECT id, auction_id, user_id, winning_amount, create_at FROM AuctionHistory WHERE auction_id = $1`
    rows, err := db.Query(query, auctionID)
    if err != nil {
        c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to query auction history"})
        return
    }
    defer rows.Close()

    var histories []AuctionHistory
    for rows.Next() {
        var history AuctionHistory
        if err := rows.Scan(&history.ID, &history.AuctionID, &history.UserID, &history.WinningAmount, &history.CreatedAt); err != nil {
            c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to scan history data"})
            return
        }
        histories = append(histories, history)
    }

    c.JSON(http.StatusOK, histories)
}

func main() {
    initDB()

    router := gin.Default()

    router.POST("/auction/:auction_id/close", closeAuction)
    router.GET("/auction/:auction_id/history", getAuctionHistory)

    router.Run(":8068")
}
