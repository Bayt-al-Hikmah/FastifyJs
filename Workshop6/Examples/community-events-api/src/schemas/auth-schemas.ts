import { USER_ROLES } from './common-schemas.js'


export const registerBodySchema = {

    type: 'object',

    required: [
        'username',
        'email',
        'password'
    ],

    properties: {

        username: {
            type: 'string',
            minLength: 3,
            maxLength: 30,
            pattern: '^[A-Za-z0-9_]+$'
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
        },

        role: {
            type: 'string',
            enum: [...USER_ROLES],
            default: 'MEMBER'
        }

    },

    additionalProperties: false

} as const


export const loginBodySchema = {

    type: 'object',

    required: [
        'email',
        'password'
    ],

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
