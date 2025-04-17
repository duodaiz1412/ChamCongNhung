// server.js
const http = require('http');
const app = require('./app');
const connectDB = require('./services/databaseService');
const websocketService = require('./services/websocketService');
require('dotenv').config();

const PORT = process.env.PORT || 3000;

async function startServer() {
    try {
        // 1. Connect to Database
        await connectDB();

        // 2. Create HTTP Server
        const server = http.createServer(app);

        // 3. Initialize WebSocket Server
        websocketService.initializeWebSocketServer(server);

        // 4. Start Listening
        server.listen(PORT, '0.0.0.0', () => {
            console.log(`-------------------------------------------------------`);
            console.log(` Server running at http://0.0.0.0:${PORT}`);
            console.log(` WebSocket server is listening on the same port.`);
            console.log(`-------------------------------------------------------`);
        });

         // Graceful Shutdown
        process.on('SIGTERM', () => {
            console.log('SIGTERM signal received: closing HTTP server');
            server.close(() => {
                console.log('HTTP server closed');
                mongoose.connection.close(false, () => {
                     console.log('MongoDB connection closed.');
                     process.exit(0);
                });
                // Đóng WS server nếu cần cleanup thêm
                // websocketService.getWss()?.close(() => console.log('WebSocket server closed'));
            });
        });
        process.on('SIGINT', () => { // Handle Ctrl+C
             console.log('SIGINT signal received: closing server');
             server.close(() => {
                 console.log('HTTP server closed');
                  mongoose.connection.close(false, () => {
                     console.log('MongoDB connection closed.');
                     process.exit(0);
                 });
             });
        });


    } catch (error) {
        console.error("Failed to start server:", error);
        process.exit(1);
    }
}

startServer();