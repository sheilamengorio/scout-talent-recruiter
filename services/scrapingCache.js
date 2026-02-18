const NodeCache = require('node-cache');

// Brand data cache: 1 hour TTL
const brandCache = new NodeCache({ stdTTL: 3600, checkperiod: 600 });

// Market research cache: 30 minutes TTL
const marketCache = new NodeCache({ stdTTL: 1800, checkperiod: 300 });

module.exports = {
  brand: {
    get: (key) => brandCache.get(key),
    set: (key, value) => brandCache.set(key, value),
    has: (key) => brandCache.has(key)
  },
  market: {
    get: (key) => marketCache.get(key),
    set: (key, value) => marketCache.set(key, value),
    has: (key) => marketCache.has(key)
  }
};
