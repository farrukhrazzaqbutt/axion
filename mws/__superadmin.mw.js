module.exports = ({ meta, config, managers }) => {
    return ({ req, res, next, results }) => {
        const token = results.__token || results.__tokenWithUser;
        if (!token) {
            return managers.responseDispatcher.dispatch(res, { ok: false, code: 401, errors: 'authentication required' });
        }
        if (token.role !== 'superadmin') {
            return managers.responseDispatcher.dispatch(res, { ok: false, code: 403, errors: 'superadmin access required' });
        }
        next(token);
    }
}
