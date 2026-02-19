module.exports = {
    createClassroom: [
        {
            path: 'name',
            type: 'string',
            length: { min: 1, max: 100 },
            required: true,
        },
        {
            path: 'schoolId',
            type: 'string',
            length: { min: 1, max: 50 },
            required: true,
        },
        {
            path: 'capacity',
            type: 'number',
            required: true,
        },
        {
            path: 'gradeLevel',
            type: 'string',
            length: { min: 1, max: 50 },
            required: false,
        }
    ],
    updateClassroom: [
        {
            path: 'name',
            type: 'string',
            length: { min: 1, max: 100 },
            required: false,
        },
        {
            path: 'capacity',
            type: 'number',
            required: false,
        },
        {
            path: 'gradeLevel',
            type: 'string',
            length: { min: 1, max: 50 },
            required: false,
        }
    ]
}
