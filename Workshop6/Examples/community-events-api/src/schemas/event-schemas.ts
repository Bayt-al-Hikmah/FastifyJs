import {
    EVENT_CATEGORIES,
    EVENT_STATUSES,
    paginationQuerySchema
} from './common-schemas.js'


export const listEventsQuerySchema = {

    type: 'object',

    properties: {

        search: {
            type: 'string',
            minLength: 1,
            maxLength: 100
        },

        category: {
            type: 'string',
            enum: [...EVENT_CATEGORIES]
        },

        page: {
            type: 'integer',
            minimum: 1,
            maximum: 1_000_000,
            default: 1
        },

        limit: {
            type: 'integer',
            minimum: 1,
            maximum: 50,
            default: 10
        }

    },

    additionalProperties: false

} as const


export const myEventsQuerySchema = {

    type: 'object',

    properties: {

        status: {
            type: 'string',
            enum: [...EVENT_STATUSES]
        },

        page: {
            type: 'integer',
            minimum: 1,
            maximum: 1_000_000,
            default: 1
        },

        limit: {
            type: 'integer',
            minimum: 1,
            maximum: 50,
            default: 10
        }

    },

    additionalProperties: false

} as const


export const createEventBodySchema = {

    type: 'object',

    required: [
        'title',
        'description',
        'location',
        'startsAt',
        'capacity'
    ],

    properties: {

        title: {
            type: 'string',
            minLength: 3,
            maxLength: 120,
            pattern: '\\S'
        },

        description: {
            type: 'string',
            minLength: 10,
            maxLength: 3000
        },

        location: {
            type: 'string',
            minLength: 2,
            maxLength: 160,
            pattern: '\\S'
        },

        startsAt: {
            type: 'string',
            format: 'date-time'
        },

        capacity: {
            type: 'integer',
            minimum: 1,
            maximum: 10_000
        },

        category: {
            type: 'string',
            enum: [...EVENT_CATEGORIES],
            default: 'OTHER'
        }

    },

    additionalProperties: false

} as const


export const updateEventBodySchema = {

    type: 'object',

    minProperties: 1,

    properties: {

        title: {
            type: 'string',
            minLength: 3,
            maxLength: 120,
            pattern: '\\S'
        },

        description: {
            type: 'string',
            minLength: 10,
            maxLength: 3000
        },

        location: {
            type: 'string',
            minLength: 2,
            maxLength: 160,
            pattern: '\\S'
        },

        startsAt: {
            type: 'string',
            format: 'date-time'
        },

        capacity: {
            type: 'integer',
            minimum: 1,
            maximum: 10_000
        },

        category: {
            type: 'string',
            enum: [...EVENT_CATEGORIES]
        },

        status: {
            type: 'string',
            enum: [...EVENT_STATUSES]
        }

    },

    additionalProperties: false

} as const


export { paginationQuerySchema }
