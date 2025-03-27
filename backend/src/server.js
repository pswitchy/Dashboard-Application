// /backend/src/server.js

// Load environment variables FIRST
require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });

// Core module imports
const express = require('express');
const cors = require('cors');
const http = require('http');
const WebSocket = require('ws'); // Keep WebSocket import
const cookieParser = require('cookie-parser'); // Ensure cookie-parser is imported
const path = require('path'); // Often needed with __dirname

// Database and Models (before routes that use them)
const connectDB = require('./config/db');
const TableConfig = require('./models/TableConfig'); // Needed for initial polling logic maybe

// --- App Initialization ---
const app = express();
const PORT = process.env.PORT || 5001;
const WEBSOCKET_PORT = process.env.WEBSOCKET_PORT || 5002;

// --- Database Connection ---
connectDB();

// --- Middleware ---
app.use(cors({
    origin: process.env.FRONTEND_URL || 'http://localhost:3000', // Your frontend URL
    credentials: true, // Important for cookies
}));
app.use(express.json()); // Body parser
app.use(cookieParser()); // Use cookie parser

// --- Placeholder for Broadcast Function ---
// We need a way for tableController to access broadcast *later*
// We can attach it to the app or export it carefully AFTER initialization
let broadcast = (data) => {
    console.warn("Broadcast called before WebSocket Server was fully initialized!");
};


// --- Routes ---
// Import routes *after* middleware, db, models, but potentially *before* WS server init
const authRoutes = require('./routes/authRoutes');
const tableRoutes = require('./routes/tableRoutes'); // This requires tableController which needs broadcast

// Mount Routes
app.use('/api/auth', authRoutes);
app.use('/api/table', tableRoutes);

// --- Basic Root Route ---
app.get('/', (req, res) => {
  res.send('Dashboard Backend API Running');
});

// --- HTTP Server ---
const server = http.createServer(app);

// --- WebSocket Server Setup ---
// Initialize *after* routes might have been required, but before server starts listening fully
const wss = new WebSocket.Server({ server }); // Or attach to server: { server }

wss.on('connection', (ws) => {
  console.log('Client connected via WebSocket');
  ws.on('message', (message) => {
      try {
        console.log('Received WebSocket message:', message.toString()); // Log as string
      } catch (e) {
         console.error("Error processing WS message:", e)
      }
  });
  ws.on('close', () => console.log('Client disconnected'));
  ws.on('error', (error) => console.error('WebSocket error:', error));
});

// --- Define the ACTUAL Broadcast Function ---
// Now that wss exists, redefine the broadcast function
broadcast = (data) => { // Reassign the actual function
  if (!wss) return; // Safety check
  const message = typeof data === 'string' ? data : JSON.stringify(data);
  wss.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(message);
    }
  });
};
console.log(`WebSocket Server running on port ${WEBSOCKET_PORT}`); // Log after setup

// --- Start HTTP Server ---
server.listen(PORT, () => {
  console.log(`HTTP Server running on port ${PORT}`);

  // Optional: Start initial polling only after server is listening and broadcast is ready
  // This requires careful handling to ensure broadcast is the *real* one
  // We need to pass the broadcast function to the controller explicitly or make it globally available carefully
  // Let's try passing it:
  try {
      const { setBroadcastFunction, startInitialPollingIfNeeded } = require('./controllers/tableController');
      setBroadcastFunction(broadcast); // Pass the function reference
      startInitialPollingIfNeeded(); // Ask controller to check if it needs to poll
  } catch(err) {
      console.error("Error setting up initial polling:", err);
  }

});


// --- Exporting ---
// Export the initialized app and server. We *could* export broadcast, but it's tricky due to timing.
// It's better if modules requiring broadcast import it and rely on the setup above.
module.exports = { app, server }; // Keep exports minimal