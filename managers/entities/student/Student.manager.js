module.exports = class Student {
    constructor({ utils, cache, config, cortex, managers, validators, mongomodels } = {}) {
        this.config = config;
        this.cortex = cortex;
        this.validators = validators;
        this.mongomodels = mongomodels;
        this.Student = mongomodels ? mongomodels.student : null;
        this.Classroom = mongomodels ? mongomodels.classroom : null;
        this.School = mongomodels ? mongomodels.school : null;
        this.httpExposed = [
            'post=createStudent',
            'get=getStudent',
            'get=getAllStudents',
            'put=updateStudent',
            'put=transferStudent',
            'delete=deleteStudent'
        ];
    }

    async createStudent({ firstName, lastName, dateOfBirth, email, phone, address, schoolId, classroomId, __token }) {
        // Validation
        const validationResult = await this.validators.student.createStudent({
            firstName, lastName, dateOfBirth, email, phone, address, schoolId, classroomId
        });
        if (validationResult) return validationResult;

        // Check permissions - only school admins can create students
        if (__token.role !== 'school_admin') {
            return { errors: 'Only school administrators can create students' };
        }

        // Verify school access
        if (__token.schoolId && schoolId && __token.schoolId.toString() !== schoolId) {
            return { errors: 'Access denied: You can only create students for your own school' };
        }

        // Use token's schoolId if not provided
        const targetSchoolId = schoolId || __token.schoolId;
        if (!targetSchoolId) {
            return { errors: 'School ID is required' };
        }

        try {
            // Verify school exists
            const school = await this.School.findById(targetSchoolId);
            if (!school) {
                return { errors: 'School not found' };
            }

            // Verify classroom if provided
            if (classroomId) {
                const classroom = await this.Classroom.findById(classroomId);
                if (!classroom) {
                    return { errors: 'Classroom not found' };
                }
                if (classroom.schoolId.toString() !== targetSchoolId) {
                    return { errors: 'Classroom does not belong to the specified school' };
                }
                if (classroom.isFull) {
                    return { errors: 'Classroom is at full capacity' };
                }
            }

            const student = new this.Student({
                firstName,
                lastName,
                dateOfBirth,
                email,
                phone,
                address: address || {},
                schoolId: targetSchoolId,
                classroomId: classroomId || null,
                createdBy: __token.userId
            });

            const savedStudent = await student.save();

            // Update classroom enrollment if assigned
            if (classroomId) {
                await this.Classroom.findByIdAndUpdate(classroomId, {
                    $inc: { currentEnrollment: 1 }
                });
            }

            return { student: savedStudent };
        } catch (error) {
            if (error.code === 11000) {
                return { errors: 'Student with this email already exists' };
            }
            return { error: 'Failed to create student', details: error.message };
        }
    }

    async getStudent({ studentId, __token }) {
        if (!studentId) {
            return { errors: 'Student ID is required' };
        }

        try {
            const student = await this.Student.findById(studentId)
                .populate('schoolId', 'name')
                .populate('classroomId', 'name capacity');
            if (!student) {
                return { errors: 'Student not found' };
            }

            // Check access permissions
            if (__token.role === 'school_admin' && __token.schoolId && 
                student.schoolId._id.toString() !== __token.schoolId.toString()) {
                return { errors: 'Access denied' };
            }

            return { student };
        } catch (error) {
            return { error: 'Failed to fetch student', details: error.message };
        }
    }

    async getAllStudents({ schoolId, classroomId, page = 1, limit = 10, __token }) {
        try {
            const skip = (page - 1) * limit;
            let query = { isActive: true };

            // School admins can only see students from their school
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

            if (classroomId) {
                query.classroomId = classroomId;
            }

            const students = await this.Student.find(query)
                .skip(skip)
                .limit(parseInt(limit))
                .sort({ createdAt: -1 })
                .populate('schoolId', 'name')
                .populate('classroomId', 'name')
                .populate('createdBy', 'username email');

            const total = await this.Student.countDocuments(query);

            return {
                students,
                pagination: {
                    page: parseInt(page),
                    limit: parseInt(limit),
                    total,
                    pages: Math.ceil(total / limit)
                }
            };
        } catch (error) {
            return { error: 'Failed to fetch students', details: error.message };
        }
    }

    async updateStudent({ studentId, firstName, lastName, dateOfBirth, email, phone, address, classroomId, __token }) {
        if (!studentId) {
            return { errors: 'Student ID is required' };
        }

        try {
            const student = await this.Student.findById(studentId);
            if (!student) {
                return { errors: 'Student not found' };
            }

            // Check permissions
            if (__token.role !== 'school_admin') {
                return { errors: 'Only school administrators can update students' };
            }

            // Verify access
            if (__token.schoolId && student.schoolId.toString() !== __token.schoolId.toString()) {
                return { errors: 'Access denied: You can only update students in your own school' };
            }

            // Validation
            const validationResult = await this.validators.student.updateStudent({
                firstName, lastName, dateOfBirth, email, phone, address, classroomId
            });
            if (validationResult) return validationResult;

            // Handle classroom transfer
            if (classroomId !== undefined && classroomId !== student.classroomId?.toString()) {
                // Remove from old classroom
                if (student.classroomId) {
                    await this.Classroom.findByIdAndUpdate(student.classroomId, {
                        $inc: { currentEnrollment: -1 }
                    });
                }

                // Add to new classroom
                if (classroomId) {
                    const newClassroom = await this.Classroom.findById(classroomId);
                    if (!newClassroom) {
                        return { errors: 'Classroom not found' };
                    }
                    if (newClassroom.schoolId.toString() !== student.schoolId.toString()) {
                        return { errors: 'Cannot transfer student to classroom in different school' };
                    }
                    if (newClassroom.isFull) {
                        return { errors: 'Target classroom is at full capacity' };
                    }
                    await this.Classroom.findByIdAndUpdate(classroomId, {
                        $inc: { currentEnrollment: 1 }
                    });
                }
                student.classroomId = classroomId;
            }

            // Update other fields
            if (firstName !== undefined) student.firstName = firstName;
            if (lastName !== undefined) student.lastName = lastName;
            if (dateOfBirth !== undefined) student.dateOfBirth = dateOfBirth;
            if (email !== undefined) student.email = email;
            if (phone !== undefined) student.phone = phone;
            if (address !== undefined) student.address = { ...student.address, ...address };

            const updatedStudent = await student.save();
            return { student: updatedStudent };
        } catch (error) {
            return { error: 'Failed to update student', details: error.message };
        }
    }

    async transferStudent({ studentId, targetSchoolId, targetClassroomId, __token }) {
        if (!studentId || !targetSchoolId) {
            return { errors: 'Student ID and target school ID are required' };
        }

        // Check permissions
        if (__token.role !== 'school_admin') {
            return { errors: 'Only school administrators can transfer students' };
        }

        try {
            const student = await this.Student.findById(studentId);
            if (!student) {
                return { errors: 'Student not found' };
            }

            // Verify current access
            if (__token.schoolId && student.schoolId.toString() !== __token.schoolId.toString()) {
                return { errors: 'Access denied: You can only transfer students from your own school' };
            }

            // Verify target school exists
            const targetSchool = await this.School.findById(targetSchoolId);
            if (!targetSchool) {
                return { errors: 'Target school not found' };
            }

            // Verify target classroom if provided
            if (targetClassroomId) {
                const targetClassroom = await this.Classroom.findById(targetClassroomId);
                if (!targetClassroom) {
                    return { errors: 'Target classroom not found' };
                }
                if (targetClassroom.schoolId.toString() !== targetSchoolId) {
                    return { errors: 'Target classroom does not belong to the target school' };
                }
                if (targetClassroom.isFull) {
                    return { errors: 'Target classroom is at full capacity' };
                }
            }

            // Remove from old classroom
            if (student.classroomId) {
                await this.Classroom.findByIdAndUpdate(student.classroomId, {
                    $inc: { currentEnrollment: -1 }
                });
            }

            // Update student
            student.schoolId = targetSchoolId;
            student.classroomId = targetClassroomId || null;
            student.status = 'transferred';

            // Add to new classroom if provided
            if (targetClassroomId) {
                await this.Classroom.findByIdAndUpdate(targetClassroomId, {
                    $inc: { currentEnrollment: 1 }
                });
            }

            const updatedStudent = await student.save();
            return { student: updatedStudent, message: 'Student transferred successfully' };
        } catch (error) {
            return { error: 'Failed to transfer student', details: error.message };
        }
    }

    async deleteStudent({ studentId, __token }) {
        if (!studentId) {
            return { errors: 'Student ID is required' };
        }

        try {
            const student = await this.Student.findById(studentId);
            if (!student) {
                return { errors: 'Student not found' };
            }

            // Check permissions
            if (__token.role !== 'school_admin') {
                return { errors: 'Only school administrators can delete students' };
            }

            // Verify access
            if (__token.schoolId && student.schoolId.toString() !== __token.schoolId.toString()) {
                return { errors: 'Access denied' };
            }

            // Remove from classroom enrollment
            if (student.classroomId) {
                await this.Classroom.findByIdAndUpdate(student.classroomId, {
                    $inc: { currentEnrollment: -1 }
                });
            }

            // Soft delete
            student.isActive = false;
            student.status = 'withdrawn';
            await student.save();

            return { message: 'Student deleted successfully' };
        } catch (error) {
            return { error: 'Failed to delete student', details: error.message };
        }
    }
}
