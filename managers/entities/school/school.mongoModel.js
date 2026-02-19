const mongoose = require('mongoose');

const schoolSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        trim: true,
        minlength: 3,
        maxlength: 200
    },
    address: {
        street: { type: String, trim: true },
        city: { type: String, trim: true, required: true },
        state: { type: String, trim: true },
        zipCode: { type: String, trim: true },
        country: { type: String, trim: true, default: 'USA' }
    },
    contact: {
        phone: { type: String, trim: true },
        email: { type: String, trim: true, lowercase: true }
    },
    establishedYear: {
        type: Number,
        min: 1800,
        max: new Date().getFullYear()
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
schoolSchema.index({ name: 1 });
schoolSchema.index({ isActive: 1 });

module.exports = mongoose.model('School', schoolSchema);
