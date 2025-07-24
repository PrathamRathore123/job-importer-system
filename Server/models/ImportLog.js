const mongoose = require('mongoose');

const FailedJobSchema = new mongoose.Schema({
  job: { type: Object, required: true },
  reason: { type: String, required: true }
}, { _id: false });

const ImportLogSchema = new mongoose.Schema({
  fileName: { type: String, required: true },
  timestamp: { type: Date, required: true },
  totalFetched: { type: Number, required: true },
  totalImported: { type: Number, required: true },
  newJobs: { type: Number, required: true },
  newJobsDetails: [{
    jobId: String,
    title: String,
    company: String,
    location: String,
    url: String
  }],
  updatedJobs: { type: Number, required: true },
  failedJobsCount: { type: Number, default: 0 },
  failedJobs: [FailedJobSchema],
  fetchedJobs: { type: [Object], required: true }
}, { timestamps: true });

module.exports = mongoose.model('ImportLog', ImportLogSchema); 