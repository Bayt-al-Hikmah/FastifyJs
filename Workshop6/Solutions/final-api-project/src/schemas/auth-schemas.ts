import { errorResponseSchema } from './common-schemas.js'


const userRoleValues = ['CHEF', 'MEMBER']


export const publicUserSchema = {

    type: 'object',

    properties: {

        id: { type: 'integer' },

        name: { type: 'string' },

        email: { type: 'string' },

        role: {
            type: 'string',
            enum: userRoleValues
        },

        createdAt: {
            type: 'string',
            format: 'date-time'
        }

    },

    required: ['id', 'name', 'email', 'role', 'createdAt'],

    additionalProperties: false

} as const


export const sessionUserSchema = {

    type: 'object',

    properties: {

        id: { type: 'integer' },

        name: { type: 'string' },

        email: { type: 'string' },

        role: {
            type: 'string',
            enum: userRoleValues
        }

    },

    required: ['id', 'name', 'email', 'role'],

    additionalProperties: false

} as const


export const registerSchema = {

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
            minLength: 15,
            maxLength: 128
        },

        role: {
            type: 'string',
            enum: userRoleValues,
            default: 'MEMBER'
        }

    },

    additionalProperties: false

} as const


export const loginSchema = {

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


export const registerResponseSchema = {

    type: 'object',

    properties: {

        message: { type: 'string' },

        data: {
            type: 'object',
            properties: {
                user: publicUserSchema
            },
            required: ['user'],
            additionalProperties: false
        }

    },

    required: ['message', 'data'],

    additionalProperties: false

} as const


export const loginResponseSchema = {

    type: 'object',

    properties: {

        message: { type: 'string' },

        data: {
            type: 'object',
            properties: {
                accessToken: { type: 'string' },
                tokenType: { type: 'string' },
                expiresIn: { type: 'integer' },
                user: sessionUserSchema
            },
            required: ['accessToken', 'tokenType', 'expiresIn', 'user'],
            additionalProperties: false
        }

    },

    required: ['message', 'data'],

    additionalProperties: false

} as const


export const meResponseSchema = {

    type: 'object',

    properties: {

        message: { type: 'string' },

        data: {
            type: 'object',
            properties: {
                user: publicUserSchema
            },
            required: ['user'],
            additionalProperties: false
        }

    },

    required: ['message', 'data'],

    additionalProperties: false

} as const


export const authErrorResponseSchema = errorResponseSchema
