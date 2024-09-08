package main

import (
    "database/sql"
    "log"
    "net/http"
    "strconv"
     "fmt"
    _ "github.com/lib/pq"
    "github.com/gin-gonic/gin"
)

var db *sql.DB

func initDB() {
    var err error
    connStr := "user=postgres dbname=auction_db sslmode=disable password=1995"
    db, err = sql.Open("postgres", connStr)
    if err != nil {
        log.Fatal(err)
    }
}

// Placeholder function for getting user_id from session or context
func getUserIDFromContext(c *gin.Context) (int64, error) {
    // This should be replaced with actual implementation
    // For example, extract from session or JWT token
    userIDStr := c.GetHeader("X-User-ID") // Example header, adjust as needed
    if userIDStr == "" {
        return 0, fmt.Errorf("user_id not found in context")
    }
    return strconv.ParseInt(userIDStr, 10, 64)
}

func saveFeedback(c *gin.Context) {
    var feedbackRequest struct {
        Feedback string `json:"feedback"`
    }

    if err := c.BindJSON(&feedbackRequest); err != nil {
        log.Printf("Error binding JSON: %v", err)
        c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid input"})
        return
    }

    userID, err := getUserIDFromContext(c)
    if err != nil {
        log.Printf("Error getting user_id from context: %v", err)
        c.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized"})
        return
    }

    log.Printf("Retrieved user_id: %d", userID) // Debugging log

    // Check if the user_id exists in user_authentication table
    var exists bool
    err = db.QueryRow("SELECT EXISTS (SELECT 1 FROM user_authentication WHERE user_id = $1)", userID).Scan(&exists)
    if err != nil {
        log.Printf("Error checking user_id existence: %v", err)
        c.JSON(http.StatusInternalServerError, gin.H{"error": "Error checking user_id"})
        return
    }
    if !exists {
        c.JSON(http.StatusNotFound, gin.H{"error": "User_id not found"})
        return
    }

    // Insert feedback into feedback table
    query := `
    INSERT INTO feedback (user_id, feedback_text)
    VALUES ($1, $2);
    `
    _, err = db.Exec(query, userID, feedbackRequest.Feedback)
    if err != nil {
        log.Printf("Error inserting feedback: %v", err)
        c.JSON(http.StatusInternalServerError, gin.H{"error": "Could not save feedback", "details": err.Error()})
        return
    }

    c.JSON(http.StatusOK, gin.H{"message": "Feedback saved successfully"})
}


func fetchFeedback(c *gin.Context) {
    userIDStr := c.Query("user_id")

    // Convert userIDStr to int64
    userID, err := strconv.ParseInt(userIDStr, 10, 64)
    if err != nil {
        c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid user_id"})
        return
    }

    // Fetch feedback for the user_id
    query := `
    SELECT user_id, feedback_text
    FROM feedback
    WHERE user_id = $1;
    `
    rows, err := db.Query(query, userID)
    if err != nil {
        c.JSON(http.StatusInternalServerError, gin.H{"error": "Could not retrieve feedback", "details": err.Error()})
        return
    }
    defer rows.Close()

    var feedbacks []gin.H
    for rows.Next() {
        var retrievedUserID int64
        var feedbackText string
        if err := rows.Scan(&retrievedUserID, &feedbackText); err != nil {
            c.JSON(http.StatusInternalServerError, gin.H{"error": "Could not retrieve feedback", "details": err.Error()})
            return
        }
        feedbacks = append(feedbacks, gin.H{"user_id": retrievedUserID, "feedback": feedbackText})
    }

    if len(feedbacks) == 0 {
        c.JSON(http.StatusNotFound, gin.H{"message": "No feedback found for the given user_id"})
        return
    }

    c.JSON(http.StatusOK, feedbacks)
}

func main() {
    initDB()

    r := gin.Default()
    r.POST("/save_feedback", saveFeedback)
    r.GET("/fetch_feedback", fetchFeedback)

    if err := r.Run(":8076"); err != nil {
        log.Fatal("Unable to start:", err)
    }
}
