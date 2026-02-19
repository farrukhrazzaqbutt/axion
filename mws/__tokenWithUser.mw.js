module.exports = ({ meta, config, managers }) => {
    return async ({ req, res, next }) => {
        if (!req.headers.token) {
            console.log('token required but not found')
            return managers.responseDispatcher.dispatch(res, { ok: false, code: 401, errors: 'unauthorized' });
        }
        let decoded = null;
        try {
            decoded = managers.token.verifyShortToken({ token: req.headers.token });
            if (!decoded) {
                console.log('failed to decode-1')
                return managers.responseDispatcher.dispatch(res, { ok: false, code: 401, errors: 'unauthorized' });
            }
        } catch (err) {
            console.log('failed to decode-2')
            return managers.responseDispatcher.dispatch(res, { ok: false, code: 401, errors: 'unauthorized' });
        }

        // Fetch user details including role and schoolId
        // Note: This will be populated by the managers after they're loaded
        // For now, we'll rely on the token having role info or fetch it in managers
        next(decoded);

        next(decoded);
    }
}
