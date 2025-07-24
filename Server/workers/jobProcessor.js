const { Worker } = require('bullmq');
const IORedis = require('ioredis');
const Job = require('../models/Job');
const ImportLog = require('../models/ImportLog');

// Create a new Redis connection for the worker
const redisConnection = new IORedis(
  process.env.UPSTASH_REDIS_REST_URL ? {
    host: process.env.UPSTASH_REDIS_REST_URL.replace('https://', '').replace('http://', ''),
    port: 6379,
    password: process.env.UPSTASH_REDIS_REST_TOKEN,
    tls: {},
    maxRetriesPerRequest: null,
  } : {
    host: process.env.REDIS_HOST || '127.0.0.1',
    port: process.env.REDIS_PORT || 6379,
    maxRetriesPerRequest: null,
  }
);

const processJob = async (job) => {
    const { jobData, importLogId } = job.data;
    const io = global.io;

    try {
        console.log(`Processing job: ${jobData.title}`);
        
        const existing = await Job.findOne({
            $or: [{ externalId: jobData.externalId }, { url: jobData.url }],
        });

        let wasNew = false;
        let wasUpdated = false;

        if (!existing) {
            const newJob = await Job.create(jobData);
            console.log(`Created new job: ${newJob._id}`);
            wasNew = true;
            
            // Add to newJobsDetails in ImportLog
            await ImportLog.findOneAndUpdate(
                { _id: importLogId },
                {
                    $push: {
                        newJobsDetails: {
                            jobId: newJob._id,
                            title: jobData.title,
                            company: jobData.company,
                            location: jobData.location,
                            url: jobData.url
                        }
                    }
                }
            );
        } else {
            const needsUpdate =
                existing.title !== jobData.title ||
                existing.company !== jobData.company ||
                existing.location !== jobData.location ||
                existing.description !== jobData.description ||
                existing.category !== jobData.category ||
                existing.jobType !== jobData.jobType;

            if (needsUpdate) {
                await Job.updateOne({ _id: existing._id }, { $set: jobData });
                console.log(`Updated existing job: ${existing._id}`);
                wasUpdated = true;
            } else {
                console.log(`Job already exists and up to date: ${existing._id}`);
            }
        }

        // Update import log - always increment totalImported for processed jobs
        const updateFields = {
            $inc: {
                totalImported: 1, // Count all processed jobs
                newJobs: wasNew ? 1 : 0,
                updatedJobs: wasUpdated ? 1 : 0,
            },
        };
        
        const updatedLog = await ImportLog.findOneAndUpdate(
            { _id: importLogId },
            updateFields,
            { new: true }
        ).lean();

        if (io && updatedLog) {
            io.emit('import-log-updated', updatedLog);
        }
    } catch (err) {
        console.error(`Job processing failed: ${err.message}`);
        throw err;
    }
};

// Define the worker with rate limiting
const worker = new Worker('job-import-queue', processJob, {
    connection: redisConnection,
    concurrency: 1, // Process one job at a time for rate limiting
    removeOnComplete: { count: 1000 },
    removeOnFail: { count: 5000 },
    limiter: {
        max: 5, // Maximum 5 jobs
        duration: 60000, // Per minute (60000ms)
    },
});

worker.on('completed', (job) => {
    console.log(`Job ${job.id} has completed!`);
});

worker.on('failed', async (job, err) => {
    // This event fires only after all attempts have failed.
    console.error(
        `Job ${job.id} has failed permanently after ${job.attemptsMade} attempts with error: ${err.message}`
    );

    // Log the permanent failure to the database.
    const { jobData, importLogId } = job.data;
    const io = global.io;

    try {
        const updatedLog = await ImportLog.findOneAndUpdate(
            { _id: importLogId },
            {
                $inc: { failedJobsCount: 1 },
                $push: {
                    failedJobs: { job: jobData, reason: err.message },
                },
            },
            { new: true }
        ).lean();

        if (io && updatedLog) {
            io.emit('import-log-updated', updatedLog);
        }
    } catch (dbErr) {
        console.error('Failed to log permanent failure to database:', dbErr.message);
    }
});

module.exports = worker;
