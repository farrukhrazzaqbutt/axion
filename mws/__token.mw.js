module.exports = ({ meta, config, managers }) =>{
    return async ({req, res, next})=>{
        if(!req.headers.token){
            console.log('token required but not found')
            return managers.responseDispatcher.dispatch(res, {ok: false, code:401, errors: 'unauthorized'});
        }
        let decoded = null
        try {
            decoded = managers.token.verifyShortToken({token: req.headers.token});
            if(!decoded){
                console.log('failed to decode-1')
                return managers.responseDispatcher.dispatch(res, {ok: false, code:401, errors: 'unauthorized'});
            };
        } catch(err){
            console.log('failed to decode-2')
            return managers.responseDispatcher.dispatch(res, {ok: false, code:401, errors: 'unauthorized'});
        }
        
        // Fetch user details including role and schoolId if User manager and models are available
        try {
            if (managers.user && decoded.userId) {
                // Try to get User model from mongomodels
                const mongomodels = managers.user.mongomodels;
                if (mongomodels && mongomodels.user) {
                    const user = await mongomodels.user.findById(decoded.userId).select('role schoolId isActive');
                    if (!user || !user.isActive) {
                        return managers.responseDispatcher.dispatch(res, {ok: false, code:401, errors: 'user not found or inactive'});
                    }
                    decoded.role = user.role;
                    decoded.schoolId = user.schoolId;
                }
            }
        } catch (err) {
            console.log('failed to fetch user details', err);
            // Continue without user details if there's an error
        }
    
        next(decoded);
    }
}