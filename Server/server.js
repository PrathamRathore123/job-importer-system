require('dotenv').config();
const http = require('http');
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const socketio = require('socket.io');
const importRoutes = require('./routes/importRoutes');
const runImportCron = require('./workers/cronworker');
const cron = require('node-cron');
require('./workers/jobProcessor'); // This initializes and starts the worker
const helmet = require('helmet');

const allowedOrigins = [
  'http://localhost:3000', // for local dev
  'https://your-frontend-domain.com' // replace with your production frontend domain
];

const app = express();
app.use(helmet());
app.use(cors({
  origin: allowedOrigins,
  credentials: true
}));
app.use(express.json());

// API routes
app.use('/api/import', importRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' });
});

// Debug route
app.get('/api/debug', async (req, res) => {
  try {
    const Job = require('./models/Job');
    const ImportLog = require('./models/ImportLog');
    const jobCount = await Job.countDocuments();
    const logCount = await ImportLog.countDocuments();
    const latestLog = await ImportLog.findOne().sort({ timestamp: -1 }).lean();
    res.json({ 
      jobs: jobCount, 
      logs: logCount,
      latestLog: latestLog
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Manual import trigger
app.post('/api/import/trigger', async (req, res) => {
  try {
    console.log('Manual import triggered');
    runImportCron(io);
    res.json({ message: 'Import triggered successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

const PORT = process.env.PORT || 5000;
const MONGO_URI = process.env.MONGO_URI;

const server = http.createServer(app);
const io = socketio(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

// Socket.IO connection
io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);
});

global.io = io;

// Connect to MongoDB and start server
mongoose.connect(MONGO_URI)
  .then(() => {
    console.log('MongoDB connected');
    // For development, run once on startup
    runImportCron(io);

    // Schedule the cron job to run at the top of every hour
    cron.schedule('0 * * * *', () => {
      console.log('Running hourly job import...');
      runImportCron(io);
    });

    server.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  })
  .catch((err) => {
    console.error('MongoDB connection error:', err.message);
    process.exit(1);
  }); 