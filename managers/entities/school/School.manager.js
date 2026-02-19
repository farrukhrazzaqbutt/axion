module.exports = class School {
    constructor({ utils, cache, config, cortex, managers, validators, mongomodels } = {}) {
        this.config = config;
        this.cortex = cortex;
        this.validators = validators;
        this.mongomodels = mongomodels;
        this.School = mongomodels ? mongomodels.school : null;
        this.httpExposed = [
            'post=createSchool',
            'get=getSchool',
            'get=getAllSchools',
            'put=updateSchool',
            'delete=deleteSchool'
        ];
    }

    async createSchool({ name, address, contact, establishedYear, __token }) {
        // Validation
        const validationResult = await this.validators.school.createSchool({ name, address, contact, establishedYear });
        if (validationResult) return validationResult;

        // Check if user is superadmin
        if (__token.role !== 'superadmin') {
            return { errors: 'Only superadmins can create schools' };
        }

        try {
            const school = new this.School({
                name,
                address: address || {},
                contact: contact || {},
                establishedYear,
                createdBy: __token.userId
            });

            const savedSchool = await school.save();
            return { school: savedSchool };
        } catch (error) {
            if (error.code === 11000) {
                return { errors: 'School with this name already exists' };
            }
            return { error: 'Failed to create school', details: error.message };
        }
    }

    async getSchool({ schoolId, __token }) {
        if (!schoolId) {
            return { errors: 'School ID is required' };
        }

        try {
            const school = await this.School.findById(schoolId);
            if (!school) {
                return { errors: 'School not found' };
            }

            // School admins can only access their own school
            if (__token.role === 'school_admin' && __token.schoolId && __token.schoolId.toString() !== schoolId) {
                return { errors: 'Access denied' };
            }

            return { school };
        } catch (error) {
            return { error: 'Failed to fetch school', details: error.message };
        }
    }

    async getAllSchools({ page = 1, limit = 10, __token }) {
        try {
            const skip = (page - 1) * limit;
            let query = { isActive: true };

            // School admins can only see their own school
            if (__token.role === 'school_admin' && __token.schoolId) {
                query._id = __token.schoolId;
            }

            const schools = await this.School.find(query)
                .skip(skip)
                .limit(parseInt(limit))
                .sort({ createdAt: -1 })
                .populate('createdBy', 'username email');

            const total = await this.School.countDocuments(query);

            return {
                schools,
                pagination: {
                    page: parseInt(page),
                    limit: parseInt(limit),
                    total,
                    pages: Math.ceil(total / limit)
                }
            };
        } catch (error) {
            return { error: 'Failed to fetch schools', details: error.message };
        }
    }

    async updateSchool({ schoolId, name, address, contact, establishedYear, isActive, __token }) {
        if (!schoolId) {
            return { errors: 'School ID is required' };
        }

        // Check permissions
        if (__token.role !== 'superadmin') {
            return { errors: 'Only superadmins can update schools' };
        }

        try {
            const school = await this.School.findById(schoolId);
            if (!school) {
                return { errors: 'School not found' };
            }

            // Validation
            const validationResult = await this.validators.school.updateSchool({ name, address, contact, establishedYear, isActive });
            if (validationResult) return validationResult;

            // Update fields
            if (name !== undefined) school.name = name;
            if (address !== undefined) school.address = { ...school.address, ...address };
            if (contact !== undefined) school.contact = { ...school.contact, ...contact };
            if (establishedYear !== undefined) school.establishedYear = establishedYear;
            if (isActive !== undefined) school.isActive = isActive;

            const updatedSchool = await school.save();
            return { school: updatedSchool };
        } catch (error) {
            return { error: 'Failed to update school', details: error.message };
        }
    }

    async deleteSchool({ schoolId, __token }) {
        if (!schoolId) {
            return { errors: 'School ID is required' };
        }

        // Check permissions
        if (__token.role !== 'superadmin') {
            return { errors: 'Only superadmins can delete schools' };
        }

        try {
            const school = await this.School.findById(schoolId);
            if (!school) {
                return { errors: 'School not found' };
            }

            // Soft delete
            school.isActive = false;
            await school.save();

            return { message: 'School deleted successfully' };
        } catch (error) {
            return { error: 'Failed to delete school', details: error.message };
        }
    }
}
