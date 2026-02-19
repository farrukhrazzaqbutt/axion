const mongoose = require('mongoose');

const classroomSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        trim: true,
        minlength: 1,
        maxlength: 100
    },
    schoolId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'School',
        required: true,
        index: true
    },
    capacity: {
        type: Number,
        required: true,
        min: 1,
        max: 1000
    },
    currentEnrollment: {
        type: Number,
        default: 0,
        min: 0
    },
    gradeLevel: {
        type: String,
        trim: true
    },
    resources: {
        type: Map,
        of: String,
        default: {}
    },
    isActive: {
        type: Boolean,
        default: true
    },
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    }
}, {
    timestamps: true
});

// Index for faster queries
classroomSchema.index({ schoolId: 1, isActive: 1 });
classroomSchema.index({ schoolId: 1, name: 1 });

// Virtual to check if classroom is full
classroomSchema.virtual('isFull').get(function() {
    return this.currentEnrollment >= this.capacity;
});

module.exports = mongoose.model('Classroom', classroomSchema);
