module.exports = {
    register: [
        {
            model: 'username',
            required: true,
        },
        {
            model: 'email',
            required: true,
        },
        {
            model: 'password',
            required: true,
        },
        {
            path: 'role',
            type: 'string',
            oneOf: ['superadmin', 'school_admin'],
            required: false,
        }
    ],
    updateProfile: [
        {
            model: 'username',
            required: false,
        },
        {
            model: 'email',
            required: false,
        }
    ],
    login: [
        {
            model: 'email',
            required: true,
        },
        {
            model: 'password',
            required: true,
        }
    ]
}
