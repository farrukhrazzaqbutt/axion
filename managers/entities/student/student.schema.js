module.exports = {
    createStudent: [
        {
            path: 'firstName',
            type: 'string',
            length: { min: 1, max: 50 },
            required: true,
        },
        {
            path: 'lastName',
            type: 'string',
            length: { min: 1, max: 50 },
            required: true,
        },
        {
            path: 'dateOfBirth',
            type: 'string',
            required: true,
        },
        {
            path: 'email',
            type: 'string',
            length: { min: 3, max: 100 },
            required: false,
        },
        {
            path: 'phone',
            type: 'string',
            length: { min: 10, max: 20 },
            required: false,
        },
        {
            path: 'schoolId',
            type: 'string',
            length: { min: 1, max: 50 },
            required: false,
        },
        {
            path: 'classroomId',
            type: 'string',
            length: { min: 1, max: 50 },
            required: false,
        }
    ],
    updateStudent: [
        {
            path: 'firstName',
            type: 'string',
            length: { min: 1, max: 50 },
            required: false,
        },
        {
            path: 'lastName',
            type: 'string',
            length: { min: 1, max: 50 },
            required: false,
        },
        {
            path: 'dateOfBirth',
            type: 'string',
            required: false,
        },
        {
            path: 'email',
            type: 'string',
            length: { min: 3, max: 100 },
            required: false,
        },
        {
            path: 'phone',
            type: 'string',
            length: { min: 10, max: 20 },
            required: false,
        },
        {
            path: 'classroomId',
            type: 'string',
            length: { min: 1, max: 50 },
            required: false,
        }
    ]
}
