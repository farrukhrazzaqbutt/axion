module.exports = {
    createSchool: [
        {
            path: 'name',
            type: 'string',
            length: { min: 3, max: 200 },
            required: true,
        },
        {
            path: 'address.city',
            type: 'string',
            length: { min: 2, max: 100 },
            required: false,
        },
        {
            path: 'contact.email',
            type: 'string',
            length: { min: 3, max: 100 },
            required: false,
        },
        {
            path: 'establishedYear',
            type: 'number',
            required: false,
        }
    ],
    updateSchool: [
        {
            path: 'name',
            type: 'string',
            length: { min: 3, max: 200 },
            required: false,
        },
        {
            path: 'address.city',
            type: 'string',
            length: { min: 2, max: 100 },
            required: false,
        },
        {
            path: 'contact.email',
            type: 'string',
            length: { min: 3, max: 100 },
            required: false,
        },
        {
            path: 'establishedYear',
            type: 'number',
            required: false,
        },
        {
            path: 'isActive',
            type: 'boolean',
            required: false,
        }
    ]
}
