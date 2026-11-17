import { paginationQuerySchema } from './common-schemas.js'


const categoryValues = [
    'BREAKFAST',
    'LUNCH',
    'DINNER',
    'DESSERT',
    'SNACK',
    'BEVERAGE'
]

const publicationStatusValues = ['DRAFT', 'PUBLISHED']


export const photoMetadataSchema = {

    type: 'object',

    properties: {

        id: { type: 'integer' },

        originalName: { type: 'string' },

        mimeType: { type: 'string' },

        extension: { type: 'string' },

        size: { type: 'integer' },

        createdAt: {
            type: 'string',
            format: 'date-time'
        },

        downloadUrl: { type: 'string' }

    },

    required: [
        'id',
        'originalName',
        'mimeType',
        'extension',
        'size',
        'createdAt',
        'downloadUrl'
    ],

    additionalProperties: false

} as const


export const recipeResponseSchema = {

    type: 'object',

    properties: {

        id: { type: 'integer' },

        title: { type: 'string' },

        summary: { type: 'string' },

        ingredients: { type: 'string' },

        steps: { type: 'string' },

        category: {
            type: 'string',
            enum: categoryValues
        },

        prepMinutes: { type: 'integer' },

        status: {
            type: 'string',
            enum: publicationStatusValues
        },

        authorId: { type: 'integer' },

        authorName: { type: 'string' },

        favoriteCount: { type: 'integer' },

        isFavorite: { type: 'boolean' },

        createdAt: {
            type: 'string',
            format: 'date-time'
        },

        updatedAt: {
            type: 'string',
            format: 'date-time'
        },

        photo: {
            type: ['object', 'null'],
            properties: photoMetadataSchema.properties,
            required: photoMetadataSchema.required,
            additionalProperties: false
        }

    },

    required: [
        'id',
        'title',
        'summary',
        'ingredients',
        'steps',
        'category',
        'prepMinutes',
        'status',
        'authorId',
        'authorName',
        'favoriteCount',
        'isFavorite',
        'createdAt',
        'updatedAt',
        'photo'
    ],

    additionalProperties: false

} as const


export const createRecipeSchema = {

    type: 'object',

    required: [
        'title',
        'summary',
        'ingredients',
        'steps',
        'category',
        'prepMinutes'
    ],

    properties: {

        title: {
            type: 'string',
            minLength: 4,
            maxLength: 160,
            pattern: '\\S'
        },

        summary: {
            type: 'string',
            minLength: 10,
            maxLength: 600,
            pattern: '\\S'
        },

        ingredients: {
            type: 'string',
            minLength: 10,
            maxLength: 8000,
            pattern: '\\S'
        },

        steps: {
            type: 'string',
            minLength: 10,
            maxLength: 8000,
            pattern: '\\S'
        },

        category: {
            type: 'string',
            enum: categoryValues
        },

        prepMinutes: {
            type: 'integer',
            minimum: 1,
            maximum: 1440
        }

    },

    additionalProperties: false

} as const


export const updateRecipeSchema = {

    type: 'object',

    minProperties: 1,

    properties: {

        title: {
            type: 'string',
            minLength: 4,
            maxLength: 160,
            pattern: '\\S'
        },

        summary: {
            type: 'string',
            minLength: 10,
            maxLength: 600,
            pattern: '\\S'
        },

        ingredients: {
            type: 'string',
            minLength: 10,
            maxLength: 8000,
            pattern: '\\S'
        },

        steps: {
            type: 'string',
            minLength: 10,
            maxLength: 8000,
            pattern: '\\S'
        },

        category: {
            type: 'string',
            enum: categoryValues
        },

        prepMinutes: {
            type: 'integer',
            minimum: 1,
            maximum: 1440
        },

        status: {
            type: 'string',
            enum: publicationStatusValues
        }

    },

    additionalProperties: false

} as const


export const recipeListQuerySchema = {

    type: 'object',

    properties: {

        ...paginationQuerySchema.properties,

        search: {
            type: 'string',
            minLength: 1,
            maxLength: 100
        },

        category: {
            type: 'string',
            enum: categoryValues
        },

        maxPrep: {
            type: 'integer',
            minimum: 1,
            maximum: 1440
        }

    },

    additionalProperties: false

} as const


export const myRecipesQuerySchema = {

    type: 'object',

    properties: {

        ...paginationQuerySchema.properties,

        search: {
            type: 'string',
            minLength: 1,
            maxLength: 100
        },

        status: {
            type: 'string',
            enum: publicationStatusValues
        },

        category: {
            type: 'string',
            enum: categoryValues
        }

    },

    additionalProperties: false

} as const


export const favoriteActionResponseSchema = {

    type: 'object',

    properties: {

        message: { type: 'string' },

        data: {
            type: 'object',
            properties: {
                recipeId: { type: 'integer' },
                isFavorite: { type: 'boolean' },
                favoriteCount: { type: 'integer' }
            },
            required: ['recipeId', 'isFavorite', 'favoriteCount'],
            additionalProperties: false
        }

    },

    required: ['message', 'data'],

    additionalProperties: false

} as const
