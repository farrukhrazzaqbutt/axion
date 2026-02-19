module.exports = class Classroom {
    constructor({ utils, cache, config, cortex, managers, validators, mongomodels } = {}) {
        this.config = config;
        this.cortex = cortex;
        this.validators = validators;
        this.mongomodels = mongomodels;
        this.Classroom = mongomodels ? mongomodels.classroom : null;
        this.School = mongomodels ? mongomodels.school : null;
        this.httpExposed = [
            'post=createClassroom',
            'get=getClassroom',
            'get=getAllClassrooms',
            'put=updateClassroom',
            'delete=deleteClassroom'
        ];
    }

    async createClassroom({ name, schoolId, capacity, gradeLevel, resources, __token }) {
        // Validation
        const validationResult = await this.validators.classroom.createClassroom({ name, schoolId, capacity, gradeLevel });
        if (validationResult) return validationResult;

        // Check permissions - only school admins can create classrooms
        if (__token.role !== 'school_admin') {
            return { errors: 'Only school administrators can create classrooms' };
        }

        // Verify school exists and user has access
        try {
            const school = await this.School.findById(schoolId);
            if (!school) {
                return { errors: 'School not found' };
            }

            // School admins can only create classrooms for their own school
            if (__token.schoolId && __token.schoolId.toString() !== schoolId) {
                return { errors: 'Access denied: You can only create classrooms for your own school' };
            }

            const classroom = new this.Classroom({
                name,
                schoolId,
                capacity,
                gradeLevel,
                resources: resources || {},
                createdBy: __token.userId
            });

            const savedClassroom = await classroom.save();
            return { classroom: savedClassroom };
        } catch (error) {
            return { error: 'Failed to create classroom', details: error.message };
        }
    }

    async getClassroom({ classroomId, __token }) {
        if (!classroomId) {
            return { errors: 'Classroom ID is required' };
        }

        try {
            const classroom = await this.Classroom.findById(classroomId).populate('schoolId', 'name');
            if (!classroom) {
                return { errors: 'Classroom not found' };
            }

            // Check access permissions
            if (__token.role === 'school_admin' && __token.schoolId && 
                classroom.schoolId._id.toString() !== __token.schoolId.toString()) {
                return { errors: 'Access denied' };
            }

            return { classroom };
        } catch (error) {
            return { error: 'Failed to fetch classroom', details: error.message };
        }
    }

    async getAllClassrooms({ schoolId, page = 1, limit = 10, __token }) {
        try {
            const skip = (page - 1) * limit;
            let query = { isActive: true };

            // School admins can only see classrooms from their school
            if (__token.role === 'school_admin') {
                if (__token.schoolId) {
                    query.schoolId = __token.schoolId;
                } else {
                    return { errors: 'School administrator must be assigned to a school' };
                }
            } else if (schoolId) {
                // Superadmins can filter by schoolId
                query.schoolId = schoolId;
            }

            const classrooms = await this.Classroom.find(query)
                .skip(skip)
                .limit(parseInt(limit))
                .sort({ createdAt: -1 })
                .populate('schoolId', 'name')
                .populate('createdBy', 'username email');

            const total = await this.Classroom.countDocuments(query);

            return {
                classrooms,
                pagination: {
                    page: parseInt(page),
                    limit: parseInt(limit),
                    total,
                    pages: Math.ceil(total / limit)
                }
            };
        } catch (error) {
            return { error: 'Failed to fetch classrooms', details: error.message };
        }
    }

    async updateClassroom({ classroomId, name, capacity, gradeLevel, resources, isActive, __token }) {
        if (!classroomId) {
            return { errors: 'Classroom ID is required' };
        }

        try {
            const classroom = await this.Classroom.findById(classroomId);
            if (!classroom) {
                return { errors: 'Classroom not found' };
            }

            // Check permissions
            if (__token.role !== 'school_admin') {
                return { errors: 'Only school administrators can update classrooms' };
            }

            // Verify access to this classroom's school
            if (__token.schoolId && classroom.schoolId.toString() !== __token.schoolId.toString()) {
                return { errors: 'Access denied: You can only update classrooms in your own school' };
            }

            // Validation
            const validationResult = await this.validators.classroom.updateClassroom({ name, capacity, gradeLevel });
            if (validationResult) return validationResult;

            // Update fields
            if (name !== undefined) classroom.name = name;
            if (capacity !== undefined) {
                if (capacity < classroom.currentEnrollment) {
                    return { errors: `Capacity cannot be less than current enrollment (${classroom.currentEnrollment})` };
                }
                classroom.capacity = capacity;
            }
            if (gradeLevel !== undefined) classroom.gradeLevel = gradeLevel;
            if (resources !== undefined) classroom.resources = { ...classroom.resources, ...resources };
            if (isActive !== undefined) classroom.isActive = isActive;

            const updatedClassroom = await classroom.save();
            return { classroom: updatedClassroom };
        } catch (error) {
            return { error: 'Failed to update classroom', details: error.message };
        }
    }

    async deleteClassroom({ classroomId, __token }) {
        if (!classroomId) {
            return { errors: 'Classroom ID is required' };
        }

        try {
            const classroom = await this.Classroom.findById(classroomId);
            if (!classroom) {
                return { errors: 'Classroom not found' };
            }

            // Check permissions
            if (__token.role !== 'school_admin') {
                return { errors: 'Only school administrators can delete classrooms' };
            }

            // Verify access
            if (__token.schoolId && classroom.schoolId.toString() !== __token.schoolId.toString()) {
                return { errors: 'Access denied' };
            }

            // Soft delete
            classroom.isActive = false;
            await classroom.save();

            return { message: 'Classroom deleted successfully' };
        } catch (error) {
            return { error: 'Failed to delete classroom', details: error.message };
        }
    }
}
