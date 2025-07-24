# System Architecture

## Overview
The Job Importer System is a scalable, queue-based application that fetches job listings from XML feeds, processes them asynchronously, and provides real-time monitoring through a web dashboard.

## Architecture Diagram

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Next.js UI    │◄──►│  Express API    │◄──►│    MongoDB      │
│   (Frontend)    │    │   (Backend)     │    │   (Database)    │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         │              ┌─────────────────┐              │
         │              │   Socket.io     │              │
         │              │ (Real-time)     │              │
         │              └─────────────────┘              │
         │                       │                       │
         └───────────────────────┼───────────────────────┘
                                 │
                    ┌─────────────────┐
                    │     Redis       │
                    │   (Queue)       │
                    └─────────────────┘
                                 │
                    ┌─────────────────┐
                    │   BullMQ        │
                    │  (Workers)      │
                    └─────────────────┘
```

## Components

### 1. Frontend (Next.js)
- **Location**: `/client`
- **Purpose**: Admin dashboard for monitoring imports
- **Features**:
  - Real-time import status updates
  - Import history with detailed logs
  - Job listings with filtering
  - Failed job analysis

### 2. Backend API (Express.js)
- **Location**: `/server`
- **Purpose**: REST API and job orchestration
- **Key Files**:
  - `server.js` - Main application entry
  - `routes/importRoutes.js` - API endpoints
  - `models/` - MongoDB schemas

### 3. Queue System (Redis + BullMQ)
- **Purpose**: Asynchronous job processing
- **Components**:
  - **Redis**: Message broker and queue storage
  - **BullMQ**: Queue management and worker coordination
  - **Workers**: Process individual jobs with retry logic

### 4. Database (MongoDB)
- **Collections**:
  - `jobs` - Imported job listings
  - `importlogs` - Import history and statistics

## Data Flow

1. **Cron Trigger**: Hourly cron job initiates import process
2. **Feed Fetching**: System fetches XML from configured RSS feeds
3. **Job Queuing**: Parsed jobs are added to Redis queue via BullMQ
4. **Worker Processing**: Multiple workers process jobs concurrently
5. **Database Storage**: Jobs are saved/updated in MongoDB
6. **Real-time Updates**: Progress sent to frontend via Socket.io
7. **Import Logging**: Statistics and failures tracked in ImportLog

## Key Design Decisions

### Queue-Based Processing
- **Why**: Enables horizontal scaling and fault tolerance
- **Benefits**: 
  - Handles traffic spikes
  - Retry failed jobs automatically
  - Process jobs concurrently

### Real-time Updates
- **Technology**: Socket.io
- **Purpose**: Live dashboard updates without polling
- **Events**: Import progress, completion status, error notifications

### Modular Architecture
- **Structure**: Clear separation of concerns
- **Benefits**: 
  - Easy to test individual components
  - Can evolve to microservices
  - Independent scaling of components

## Scalability Considerations

### Horizontal Scaling
- Multiple worker instances can be deployed
- Redis handles job distribution automatically
- Database connections pooled efficiently

### Configuration
- Worker concurrency configurable via environment
- Batch sizes adjustable for different loads
- Retry policies customizable per job type

## Error Handling

### Retry Logic
- Exponential backoff for failed jobs
- Maximum retry attempts configurable
- Failed jobs logged with detailed error messages

### Monitoring
- Real-time error tracking in UI
- Comprehensive logging throughout system
- Import statistics for performance analysis

## Environment Configuration

### Required Variables
```env
MONGO_URI=mongodb://localhost:27017/job-importer
REDIS_HOST=127.0.0.1
REDIS_PORT=6379
WORKER_CONCURRENCY=5
FEED_URL=https://example.com/jobs.rss
```

### Optional Variables
```env
BATCH_SIZE=100
NODE_ENV=development
PORT=5000
```

## Future Enhancements

1. **Multiple Feed Sources**: Support for different XML formats
2. **Job Deduplication**: Advanced duplicate detection algorithms
3. **Analytics Dashboard**: Trend analysis and reporting
4. **API Rate Limiting**: Protect against abuse
5. **Caching Layer**: Redis caching for frequently accessed data