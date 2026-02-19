module.exports = ({ meta, config, managers }) => {
    return async ({ req, res, next }) => {
        const cache = managers.cache || managers.cache;
        if (!cache) {
            // If cache is not available, skip rate limiting
            return next();
        }

        // Get client IP
        const clientIp = req.headers['x-forwarded-for'] || req.connection.remoteAddress || 'unknown';
        const rateLimitKey = `ratelimit:${clientIp}`;
        const maxRequests = 100; // 100 requests per window
        const windowMs = 15 * 60 * 1000; // 15 minutes

        try {
            // Check current request count
            const currentCount = await cache.key.get({ key: rateLimitKey });
            const count = currentCount ? parseInt(currentCount) : 0;

            if (count >= maxRequests) {
                return managers.responseDispatcher.dispatch(res, {
                    ok: false,
                    code: 429,
                    errors: 'Too many requests. Please try again later.'
                });
            }

            // Increment counter
            if (count === 0) {
                // First request in window, set expiration
                await cache.key.set({ key: rateLimitKey, data: '1', ttl: Math.floor(windowMs / 1000) });
            } else {
                await cache.key.set({ key: rateLimitKey, data: String(count + 1), ttl: Math.floor(windowMs / 1000) });
            }

            // Add rate limit headers
            res.setHeader('X-RateLimit-Limit', maxRequests);
            res.setHeader('X-RateLimit-Remaining', Math.max(0, maxRequests - count - 1));
            res.setHeader('X-RateLimit-Reset', new Date(Date.now() + windowMs).toISOString());

            next();
        } catch (error) {
            console.log('Rate limit error:', error);
            // On error, allow request to proceed
            next();
        }
    }
}
