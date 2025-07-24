# Job Importer System

A scalable job aggregation platform that fetches jobs from XML-based APIs, processes them using Redis + BullMQ queues, and provides a real-time admin dashboard.

## 🏗️ Architecture

- **Frontend**: Next.js with TypeScript, Tailwind CSS, Socket.io
- **Backend**: Node.js + Express, BullMQ workers
- **Database**: MongoDB with Mongoose
- **Queue**: Redis + BullMQ
- **Real-time**: Socket.io

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- MongoDB running locally or MongoDB Atlas
- Redis running locally or Redis Cloud

### Installation

1. **Clone and install dependencies**
```bash
# Server
cd Project/Server
npm install

# Client
cd ../client
npm install
```

2. **Configure environment**
```bash
# Copy and edit server .env
cd Project/Server
# Edit .env file with your MongoDB and Redis URLs
```

3. **Start services**
```bash
# Terminal 1: Start Redis (if local)
redis-server

# Terminal 2: Start MongoDB (if local)
mongod

# Terminal 3: Start server
cd Project/Server
npm start

# Terminal 4: Start client
cd Project/client
npm run dev
```

4. **Access the application**
- Frontend: http://localhost:3000
- Backend API: http://localhost:5000

## 📦 Features

✅ **Job Source Integration**: Fetches from XML APIs (RSS feeds)
✅ **Queue Processing**: Redis + BullMQ with retry logic
✅ **Import Tracking**: Detailed logs with statistics
✅ **Real-time Updates**: Live dashboard updates via Socket.io
✅ **Scalable Architecture**: Worker-based processing
✅ **Admin UI**: Complete import history dashboard

## 🔧 Configuration

Environment variables in `Server/.env`:
- `MONGO_URI`: MongoDB connection string
- `REDIS_HOST/PORT`: Redis configuration
- `WORKER_CONCURRENCY`: Number of concurrent workers
- `FEED_URL`: RSS feed URL to import from

## 📊 API Endpoints

- `GET /api/import/logs` - Get import history
- `GET /api/import/jobs` - Get all jobs
- `GET /api/import/jobs/new` - Get recent jobs
- `GET /api/import/jobs/failed` - Get failed jobs

## 🔄 How It Works

1. **Cron Job**: Runs hourly to fetch jobs from RSS feeds
2. **Queue System**: Jobs are queued using BullMQ for processing
3. **Workers**: Process jobs with retry logic and error handling
4. **Database**: Stores jobs and import logs in MongoDB
5. **Real-time**: Updates sent to frontend via Socket.io