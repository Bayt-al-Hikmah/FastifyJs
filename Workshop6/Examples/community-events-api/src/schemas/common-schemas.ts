export const EVENT_CATEGORIES = [
    'TECHNOLOGY',
    'EDUCATION',
    'ART',
    'COMMUNITY',
    'SPORTS',
    'OTHER'
] as const


export const EVENT_STATUSES = [
    'DRAFT',
    'PUBLISHED'
] as const


export const USER_ROLES = [
    'ORGANIZER',
    'MEMBER'
] as const


export const idParamSchema = {

    type: 'object',

    properties: {

        eventId: {
            type: 'integer',
            minimum: 1,
            maximum: 2_147_483_647
        }

    },

    required: ['eventId'],

    additionalProperties: false

} as const


export const paginationQuerySchema = {

    type: 'object',

    properties: {

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
