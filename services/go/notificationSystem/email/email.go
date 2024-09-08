package email

import (
    "fmt"
    "gopkg.in/gomail.v2"
    "gorm.io/gorm"
)

type Auction struct {
    ID            int
    BidWinnerID   int
    CurrentMaxBid float64
}

type User struct {
    ID        int
    FirstName string
    Email     string
}

func SendEmail(to, subject, body string) error {
    m := gomail.NewMessage()
    
    // Replace with your sender email
    m.SetHeader("From", "your-email@example.com")
    m.SetHeader("To", to)
    m.SetHeader("Subject", subject)
    m.SetBody("text/plain", body)

    // Replace with your SMTP server details
    d := gomail.NewDialer("smtp.example.com", 587, "your-email@example.com", "your-password")

    // Send the email
    if err := d.DialAndSend(m); err != nil {
        return fmt.Errorf("failed to send email: %v", err)
    }

    return nil
}

func NotifyAuctionWinner(db *gorm.DB, auctionID int) error {
    // Fetch the auction details and the winning bid
    var auction Auction
    result := db.First(&auction, auctionID)
    if result.Error != nil {
        return fmt.Errorf("failed to fetch auction: %v", result.Error)
    }

    // Check if there is a winner
    if auction.BidWinnerID == 0 {
        return fmt.Errorf("no winner for auction %d", auctionID)
    }

    // Fetch the winning user details
    var winner User
    result = db.First(&winner, auction.BidWinnerID)
    if result.Error != nil {
        return fmt.Errorf("failed to fetch winner details: %v", result.Error)
    }

    // Create the email content
    subject := fmt.Sprintf("Congratulations! You've won the auction #%d", auctionID)
    body := fmt.Sprintf("Dear %s,\n\nCongratulations! You have won the auction with a winning bid of %.2f.\n\nBest regards,\nAuction Team",
        winner.FirstName, auction.CurrentMaxBid)

    // Send the email to the winner
    err := SendEmail(winner.Email, subject, body)
    if err != nil {
        return fmt.Errorf("failed to send email notification: %v", err)
    }

    return nil
}
