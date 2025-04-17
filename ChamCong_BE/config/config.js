require('dotenv').config(); // Load biến môi trường từ .env

module.exports = {
  port: process.env.PORT || 3000,
  mongoURI: process.env.MONGO_URI,
  corsOptions: {
    origin: "*", // Nên giới hạn trong production
    methods: ["GET", "POST", "PUT", "DELETE"],
  },
};