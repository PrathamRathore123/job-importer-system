const xml2js = require('xml2js');
const axios = require('axios');

async function fetchAndParseFeed(feedUrl) {
  const fetchedJobs = [];
  let xml;
  try {
    const response = await axios.get(feedUrl, {
      headers: { 'User-Agent': 'Mozilla/5.0' },
      timeout: 30000 
    });
    xml = response.data;
  } catch (err) {
    throw new Error('Failed to fetch XML feed: ' + err.message);
  }
  let parsed;
  try {
    parsed = await xml2js.parseStringPromise(xml, { explicitArray: false });
  } catch (err) {
    throw new Error('Failed to parse XML: ' + err.message);
  }
  // Handle different XML structures (RSS, Atom, etc.)
  let items = [];
  if (parsed.rss && parsed.rss.channel && parsed.rss.channel.item) {
    items = Array.isArray(parsed.rss.channel.item) ? parsed.rss.channel.item : [parsed.rss.channel.item];
  } else if (parsed.feed && parsed.feed.entry) {
    items = Array.isArray(parsed.feed.entry) ? parsed.feed.entry : [parsed.feed.entry];
  } else if (parsed.channel && parsed.channel.item) {
    items = Array.isArray(parsed.channel.item) ? parsed.channel.item : [parsed.channel.item];
  }
  for (const item of items) {
    // This logic remains the same for extracting job data from the feed item
    let externalId = '';
    if (item.guid) {
      if (typeof item.guid === 'object' && item.guid._) {
        externalId = item.guid._;
      } else if (typeof item.guid === 'string') {
        externalId = item.guid;
      }
    } else if (item.id) {
      externalId = item.id;
    } else if (item.link) {
      externalId = item.link;
    } else if (item.title) {
      externalId = item.title;
    }
    const jobData = {
      externalId: externalId || `${item.title || 'job'}-${Date.now()}-${Math.random()}`,
      title: item.title || item.summary || 'No Title',
      company: item['job:company'] || item.company || item.author || 'Unknown',
      location: item['job:location'] || item.location || item['job:region'] || 'Remote',
      url: item.link || item.id,
      description: item.description || item.content || item.summary || '',
      category: item['job:category'] || item.category || 'General',
      jobType: item['job:type'] || item.type || 'Full-time',
      createdAt: item.pubDate ? new Date(item.pubDate) : (item.published ? new Date(item.published) : new Date()),
      updatedAt: new Date(),
      source: feedUrl,
      raw: item
    };
    // --- End of same logic ---
    fetchedJobs.push(jobData);
  }
  return {
    fetchedJobs,
    rawJobs: items, // Return the raw parsed items as well
  };
}

module.exports = { fetchAndParseFeed };