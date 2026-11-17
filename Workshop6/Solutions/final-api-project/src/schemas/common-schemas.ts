/**
 * Reusable JSON Schema fragments. Every object schema sets
 * `additionalProperties: false` so unexpected client fields are rejected
 * rather than silently persisted.
 */

export const validationIssueSchema = {

    type: 'object',

    properties: {

        field: { type: 'string' },

        message: { type: 'string' }

    },

    required: ['field', 'message'],

    additionalProperties: false

} as const


export const errorResponseSchema = {

    type: 'object',

    properties: {

        message: { type: 'string' },

        errors: {
            type: 'array',
            items: validationIssueSchema
        }

    },

    required: ['message'],

    additionalProperties: false

} as const


export const recipeIdParamSchema = {

    type: 'object',

    properties: {

        id: {
            type: 'integer',
            minimum: 1,
            maximum: 2_147_483_647
        }

    },

    required: ['id'],

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
            maximum: 100,
            default: 20
        }

    },

    additionalProperties: false

} as const


export const paginationMetadataSchema = {

    type: 'object',

    properties: {

        page: { type: 'integer' },

        limit: { type: 'integer' },

        total: { type: 'integer' },

        totalPages: { type: 'integer' }

    },

    required: ['page', 'limit', 'total', 'totalPages'],

    additionalProperties: false

} as const


/**
 * Build the standard `{ message, data, pagination }` list envelope schema.
 */

export function listResponseSchema(itemSchema: Record<string, unknown>) {

    return {

        type: 'object',

        properties: {

            message: { type: 'string' },

            data: {
                type: 'array',
                items: itemSchema
            },

            pagination: paginationMetadataSchema

        },

        required: ['message', 'data', 'pagination'],

        additionalProperties: false

    }

}
