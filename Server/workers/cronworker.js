const { Queue } = require('bullmq');
const IORedis = require('ioredis');
const { fetchAndParseFeed } = require('./jobWorker');
const ImportLog = require('../models/ImportLog');
require('dotenv').config();

const FEED_URLS = process.env.FEED_URLS ? process.env.FEED_URLS.split(',') : [
  'https://jobicy.com/?feed=job_feed',
  'https://jobicy.com/?feed=job_feed&job_categories=smm&job_types=full-time',
  'https://jobicy.com/?feed=job_feed&job_categories=seller&job_types=full-time&search_region=france',
  'https://jobicy.com/?feed=job_feed&job_categories=design-multimedia',
  'https://jobicy.com/?feed=job_feed&job_categories=data-science',
  'https://jobicy.com/?feed=job_feed&job_categories=copywriting',
  'https://jobicy.com/?feed=job_feed&job_categories=business',
  'https://jobicy.com/?feed=job_feed&job_categories=management',
  'https://www.higheredjobs.com/rss/articleFeed.cfm'
];

const redisConnection = new IORedis({
  host: process.env.REDIS_HOST || '127.0.0.1',
  port: process.env.REDIS_PORT || 6379,
  maxRetriesPerRequest: null,
});

const jobQueue = new Queue('job-import-queue', { connection: redisConnection });

async function runImportCron(io) {
  try {
    console.log('Starting job import process for multiple feeds...');
    
    for (const feedUrl of FEED_URLS) {
      try {
        console.log(`Processing feed: ${feedUrl}`);
        
        // 1. Fetch and parse the feed
        const { fetchedJobs, rawJobs } = await fetchAndParseFeed(feedUrl);

        if (fetchedJobs.length === 0) {
          console.log(`No jobs fetched from ${feedUrl}. Skipping.`);
          continue;
        }

        // 2. Create an initial ImportLog entry for this feed
        const importLog = await ImportLog.create({
          fileName: feedUrl,
          timestamp: new Date(),
          totalFetched: fetchedJobs.length,
          totalImported: 0,
          newJobs: 0,
          newJobsDetails: [],
          updatedJobs: 0,
          failedJobs: [],
          fetchedJobs: rawJobs,
        });

        console.log(`Created ImportLog for ${feedUrl} with ID: ${importLog._id}. Adding ${fetchedJobs.length} jobs to queue.`);

        // 3. Add each job to the BullMQ queue
        const jobsToAdd = fetchedJobs.map(jobData => ({
          name: 'process-job',
          data: { jobData, importLogId: importLog._id },
          opts: {
            attempts: 3,
            backoff: {
              type: 'exponential',
              delay: 1000,
            },
          },
        }));

        await jobQueue.addBulk(jobsToAdd);

        // Emit event for this feed's import log
        if (io) {
          io.emit('import-log-updated', importLog.toObject());
        }
        
        // Small delay between feeds to avoid overwhelming the APIs
        await new Promise(resolve => setTimeout(resolve, 2000));
        
      } catch (feedError) {
        console.error(`Failed to process feed ${feedUrl}:`, feedError.message);
      }
    }
  } catch (err) {
    console.error('Import cron failed:', err.message);
  }
}

module.exports = runImportCron; 