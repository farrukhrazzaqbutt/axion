const Redis = require("ioredis");

const runTest = async (redis, prefix) => {
  try {
    const key = `${prefix}:test:${new Date().getTime()}`;
    await redis.set(key, "Redis Test Done.");
    const data = await redis.get(key);
    console.log(`Cache Test Data: ${data}`);
    await redis.del(key);
  } catch (err) {
    console.log('Redis test failed (non-fatal):', err.message);
  }
};

const createClient = ({ prefix, url }) => {
  const isTls = url && (url.startsWith('rediss://') || url.includes('upstash.io'));
  const options = {
    keyPrefix: prefix ? prefix + ":" : "",
    maxRetriesPerRequest: 3,
    retryStrategy(times) {
      const delay = Math.min(times * 100, 3000);
      return delay;
    },
  };
  if (isTls) {
    options.tls = { rejectUnauthorized: true };
  }

  const redis = new Redis(url, options);

  redis.on('error', (error) => {
    console.log('Redis error:', error.message);
  });

  redis.on('end', () => {
    console.log('Redis connection closed');
  });

  redis.on('connect', () => {
    console.log('Redis connected');
  });

  runTest(redis, prefix);

  return redis;
}



exports.createClient = createClient;
