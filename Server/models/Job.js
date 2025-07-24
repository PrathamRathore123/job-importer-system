const mongoose = require('mongoose');

const JobSchema = new mongoose.Schema({
  externalId: { type: String, required: true, unique: true, sparse: true },
  title: { type: String, required: true },
  company: { type: String, required: true },
  location: { type: String, required: true },
  url: { type: String, required: true },
  description: { type: String },
  category: { type: String, default: 'General' },
  jobType: { type: String, default: 'Full-time' },
  source: { type: String }, // Which API/feed this came from
  createdAt: { type: Date, required: true },
  updatedAt: { type: Date, required: true },
  raw: { type: Object }, // Store the raw XML/job object for reference
});

module.exports = mongoose.model('Job', JobSchema);
