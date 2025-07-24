const express = require('express');
const router = express.Router();
const Job = require('../models/Job');
const ImportLog = require('../models/ImportLog');

// GET /api/import/logs (optional pagination)
router.get('/logs', async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;
    const total = await ImportLog.countDocuments();
    const logs = await ImportLog.find()
      .sort({ timestamp: -1 })
      .skip(skip)
      .limit(limit)
      .lean();
    res.json({ page, limit, total, totalPages: Math.ceil(total / limit), logs });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/import/logs/latest
router.get('/logs/latest', async (req, res) => {
  try {
    const log = await ImportLog.findOne().sort({ timestamp: -1 }).lean();
    if (!log) return res.status(404).json({ message: 'No logs found' });
    res.json(log);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/import/jobs
router.get('/jobs', async (req, res) => {
  try {
    const jobs = await Job.find().sort({ createdAt: -1 }).lean();
    res.json({ jobs });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/import/jobs/new
router.get('/jobs/new', async (req, res) => {
  try {
    // Example: jobs created in the last 24 hours
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const newJobs = await Job.find({ createdAt: { $gte: since } }).lean();
    res.json(newJobs);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/import/jobs/failed
router.get('/jobs/failed', async (req, res) => {
  try {
    // Get the most recent ImportLog with failed jobs
    const log = await ImportLog.findOne({ 'failedJobs.0': { $exists: true } })
      .sort({ timestamp: -1 })
      .lean();
    const failedJobs = log ? log.failedJobs : [];
    res.json(failedJobs);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Debug endpoints
router.get('/debug/counts', async (req, res) => {
  try {
    const jobCount = await Job.countDocuments();
    const logCount = await ImportLog.countDocuments();
    res.json({ jobs: jobCount, logs: logCount });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router; 