export const registerBodySchema = {

    type: 'object',

    required: ['name', 'email', 'password'],

    properties: {

        name: {
            type: 'string',
            minLength: 2,
            maxLength: 80,
            pattern: '\\S'
        },

        email: {
            type: 'string',
            format: 'email',
            maxLength: 254
        },

        password: {
            type: 'string',
            minLength: 12,
            maxLength: 128
        }

    },

    additionalProperties: false

} as const


export const loginBodySchema = {

    type: 'object',

    required: ['email', 'password'],

    properties: {

        email: {
            type: 'string',
            format: 'email',
            maxLength: 254
        },

        password: {
            type: 'string',
            minLength: 1,
            maxLength: 128
        }

    },

    additionalProperties: false

} as const
