

# 📺🐦 YouTube + Twitter Integration

A simple project that integrates **YouTube** and **Twitter APIs** to fetch and post content seamlessly.  
This project demonstrates how to connect multiple third-party APIs, handle authentication, and automate workflows.



---



## 🚀 Features
- Fetch video details from YouTube (title, views, likes, etc.).
- Post video updates automatically to Twitter.
- Search and display tweets related to a YouTube video.
- Simple CLI / Web interface for interaction.
- Environment variable–based API key configuration.



---



## 🛠️ Tech Stack :
- **Backend**: Node.js (Express)
- **APIs**:  
  - YouTube Data API v3  
  - Twitter API v2
- **Authentication**: OAuth 2.0 / API keys
- **Database**: MongoDB (for caching tweets & video data)



---


## 📂 Project Structure

```
.
├── app.js              # Main Express app configuration
├── index.js            # Entry point
├── constants.js        # Constants (API URLs, config values, etc.)
├── controllers/        # Route controllers (YouTube, Twitter logic)
├── db/                 # Database connection and setup
├── middleware/         # Custom middleware (auth, error handling)
├── models/             # Data models (User, Video, Tweet)
├── routes/             # API routes
├── services/           # YouTube & Twitter service handlers
├── utils/              # Helper functions
├── package.json
└── README.md
```

---

🌐 Production Deployment
This backend project is deployed and running on Render. You can access the live API here:

[Production URL](https://videotube-twitter.onrender.com)

---



## ⚙️ Setup Instructions : 

1. Clone the repo:
    ```
    git clone https://github.com/theritikkk/youtube-twitter.git
    cd youtube-twitter
    ```
    Install dependencies: 
        ``` npm install ```

2. Create a .env file and add your keys:
    ```
        .env
        YOUTUBE_API_KEY=your_youtube_api_key
        TWITTER_API_KEY=your_twitter_api_key
        TWITTER_API_SECRET=your_twitter_secret
        TWITTER_ACCESS_TOKEN=your_access_token
        TWITTER_ACCESS_SECRET=your_access_secret
    ```

3. Run the app: 
    ```npm start```



## 🧪 Usage : 
Fetch YouTube video info:

``` GET : /api/youtube/:videoId ```
``` Post : tweet about video ```
``` POST : /api/twitter/tweet ```


## 📸 Screenshots / Demo :


---



## 🔮 Future Improvements :

Scheduled Tweets → allow users to schedule automatic tweets for new YouTube uploads.

Analytics Dashboard → track engagement ( retweets, impressions ) for each tweet.

Sentiment Analysis → analyze the sentiment of tweets related to a YouTube video.

Multi-user Support → extend authentication to handle multiple YouTube/Twitter accounts.

Web UI → add a React/Vue frontend for better visualization instead of just API endpoints.

Redis Caching → improve performance by caching YouTube video data and tweets.




## 🤝 Contributing : 

Contributions are welcome!

Fork the repo

Create a new branch (feature/xyz)

Commit and push your changes



## 📜 License :
This project is licensed under the MIT License.

# Chai-Backend
For advanced backend projects 

Chai aur backend series
Videos series based project for practice


---



- [Model link](https://app.eraser.io/workspace/QgBDVPcrYVvR1wze0AhG?origin=share)

To run the program use : 'npm run dev'