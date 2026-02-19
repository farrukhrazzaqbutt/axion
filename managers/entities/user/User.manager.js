module.exports = class User {
    constructor({ utils, cache, config, cortex, managers, validators, mongomodels } = {}) {
        this.config = config;
        this.cortex = cortex;
        this.validators = validators;
        this.mongomodels = mongomodels;
        this.User = mongomodels ? mongomodels.user : null;
        this.tokenManager = managers.token;
        this.usersCollection = "users";
        this.httpExposed = [
            'post=register',
            'post=login',
            'get=getProfile',
            'put=updateProfile',
            'put=assignSchool'
        ];
    }

    async register({ username, email, password, role = 'school_admin', schoolId, longToken, req }) {
        // Validation
        const validationResult = await this.validators.user.register({ username, email, password, role });
        if (validationResult) return validationResult;

        // Check for existing superadmin token if trying to create superadmin
        let existingSuperadminToken = null;
        if (role === 'superadmin') {
            // Check if there are any existing superadmins
            const existingSuperadmin = await this.User.findOne({ role: 'superadmin', isActive: true });
            
            // If superadmins exist, require authentication
            if (existingSuperadmin) {
                // Try to get token from request header
                if (req && req.headers && req.headers.token) {
                    try {
                        const decoded = this.tokenManager.verifyShortToken({ token: req.headers.token });
                        if (decoded && decoded.role === 'superadmin') {
                            existingSuperadminToken = decoded;
                        }
                    } catch (err) {
                        // Token invalid, ignore
                    }
                }
                // Also check if longToken was passed in body (for API calls)
                if (longToken) {
                    try {
                        const decoded = this.tokenManager.verifyLongToken({ token: longToken });
                        if (decoded) {
                            // Fetch user to get role
                            const user = await this.User.findById(decoded.userId);
                            if (user && user.role === 'superadmin') {
                                existingSuperadminToken = { role: 'superadmin', userId: user._id.toString() };
                            }
                        }
                    } catch (err) {
                        // Token invalid, ignore
                    }
                }
                
                // Only existing superadmins can create new superadmin accounts
                if (!existingSuperadminToken) {
                    return { errors: 'Only existing superadmins can create new superadmin accounts' };
                }
            }
            // If no superadmins exist, allow creating the first one (bootstrap)
        }

        try {
            // Check if user already exists
            const existingUser = await this.User.findOne({
                $or: [{ email }, { username }]
            });

            if (existingUser) {
                return { errors: 'User with this email or username already exists' };
            }

            const userData = {
                username,
                email,
                password,
                role
            };

            // Only superadmins can assign schoolId during registration
            if (schoolId && existingSuperadminToken && existingSuperadminToken.role === 'superadmin') {
                userData.schoolId = schoolId;
            }

            const user = new this.User(userData);
            const savedUser = await user.save();

            // Generate tokens
            const longToken = this.tokenManager.genLongToken({
                userId: savedUser._id.toString(),
                userKey: savedUser._id.toString()
            });

            return {
                user: {
                    id: savedUser._id,
                    username: savedUser.username,
                    email: savedUser.email,
                    role: savedUser.role,
                    schoolId: savedUser.schoolId
                },
                longToken
            };
        } catch (error) {
            if (error.code === 11000) {
                return { errors: 'User with this email or username already exists' };
            }
            return { error: 'Failed to create user', details: error.message };
        }
    }

    async login({ email, password, __device }) {
        if (!email || !password) {
            return { errors: 'Email and password are required' };
        }

        try {
            const user = await this.User.findOne({ email, isActive: true });
            if (!user) {
                return { errors: 'Invalid email or password' };
            }

            const isPasswordValid = await user.comparePassword(password);
            if (!isPasswordValid) {
                return { errors: 'Invalid email or password' };
            }

            // Generate tokens
            const longToken = this.tokenManager.genLongToken({
                userId: user._id.toString(),
                userKey: user._id.toString()
            });

            const shortToken = this.tokenManager.genShortToken({
                userId: user._id.toString(),
                userKey: user._id.toString(),
                sessionId: require('nanoid')(),
                deviceId: require('md5')(JSON.stringify(__device || {}))
            });

            return {
                user: {
                    id: user._id,
                    username: user.username,
                    email: user.email,
                    role: user.role,
                    schoolId: user.schoolId
                },
                longToken,
                shortToken
            };
        } catch (error) {
            return { error: 'Failed to login', details: error.message };
        }
    }

    async getProfile({ __token }) {
        try {
            const user = await this.User.findById(__token.userId)
                .populate('schoolId', 'name')
                .select('-password');

            if (!user) {
                return { errors: 'User not found' };
            }

            return { user };
        } catch (error) {
            return { error: 'Failed to fetch profile', details: error.message };
        }
    }

    async updateProfile({ username, email, phone, __token }) {
        try {
            const user = await this.User.findById(__token.userId);
            if (!user) {
                return { errors: 'User not found' };
            }

            // Validation
            const validationResult = await this.validators.user.updateProfile({ username, email });
            if (validationResult) return validationResult;

            // Update fields
            if (username !== undefined) user.username = username;
            if (email !== undefined) user.email = email;

            const updatedUser = await user.save();
            return {
                user: {
                    id: updatedUser._id,
                    username: updatedUser.username,
                    email: updatedUser.email,
                    role: updatedUser.role,
                    schoolId: updatedUser.schoolId
                }
            };
        } catch (error) {
            if (error.code === 11000) {
                return { errors: 'Username or email already in use' };
            }
            return { error: 'Failed to update profile', details: error.message };
        }
    }

    async assignSchool({ userId, schoolId, __token }) {
        // Only superadmins can assign schools
        if (__token.role !== 'superadmin') {
            return { errors: 'Only superadmins can assign schools to users' };
        }

        if (!userId || !schoolId) {
            return { errors: 'User ID and School ID are required' };
        }

        try {
            const user = await this.User.findById(userId);
            if (!user) {
                return { errors: 'User not found' };
            }

            // Verify school exists
            const School = this.mongomodels ? this.mongomodels.school : null;
            if (!School) {
                return { errors: 'School model not available' };
            }
            const school = await School.findById(schoolId);
            if (!school) {
                return { errors: 'School not found' };
            }

            // Only school_admin role can be assigned to a school
            if (user.role !== 'school_admin') {
                return { errors: 'Only school administrators can be assigned to schools' };
            }

            user.schoolId = schoolId;
            await user.save();

            return {
                user: {
                    id: user._id,
                    username: user.username,
                    email: user.email,
                    role: user.role,
                    schoolId: user.schoolId
                },
                message: 'School assigned successfully'
            };
        } catch (error) {
            return { error: 'Failed to assign school', details: error.message };
        }
    }
}

