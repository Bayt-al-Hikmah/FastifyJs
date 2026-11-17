import { DEFAULT_LIMIT, DEFAULT_PAGE, MAX_LIMIT } from '../config.js'
import { GENRES, SORT_FIELDS } from '../types/book.js'


/**
 * The validation rules shared by POST and PATCH.
 *
 * `additionalProperties: false` is important: a client must not be able to
 * sneak in an `id` or any other field the service owns. JSON Schema is runtime
 * validation, so it still protects the API when requests come from curl or a
 * script instead of our TypeScript-typed frontend.
 */

const bookProperties = {

    title: {
        type: 'string',
        minLength: 1,
        maxLength: 160,
        pattern: '\\S'
    },

    author: {
        type: 'string',
        minLength: 1,
        maxLength: 120,
        pattern: '\\S'
    },

    isbn: {
        type: 'string',
        minLength: 10,
        maxLength: 24,
        pattern: '^[0-9Xx-]+$'
    },

    genre: {
        type: 'string',
        enum: [...GENRES]
    },

    publishedYear: {
        type: 'integer',
        minimum: 0,
        maximum: 2100
    },

    copies: {
        type: 'integer',
        minimum: 0,
        maximum: 10_000
    },

    available: {
        type: 'boolean'
    },

    description: {
        type: 'string',
        maxLength: 2000
    }

} as const


/** Every accepted sort token, including the descending `-field` variants. */

const sortValues: string[] = SORT_FIELDS.flatMap((field) => [
    field,
    `-${field}`
])


export const bookIdParamsSchema = {

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


export const listBooksQuerySchema = {

    type: 'object',

    properties: {

        search: {
            type: 'string',
            minLength: 1,
            maxLength: 120
        },

        genre: {
            type: 'string',
            enum: [...GENRES]
        },

        available: {
            type: 'boolean'
        },

        sort: {
            type: 'string',
            enum: sortValues,
            default: 'id'
        },

        page: {
            type: 'integer',
            minimum: 1,
            maximum: 1_000_000,
            default: DEFAULT_PAGE
        },

        limit: {
            type: 'integer',
            minimum: 1,
            maximum: MAX_LIMIT,
            default: DEFAULT_LIMIT
        }

    },

    additionalProperties: false

} as const


export const createBookSchema = {

    type: 'object',

    required: [
        'title',
        'author',
        'isbn',
        'genre',
        'publishedYear',
        'copies'
    ],

    properties: { ...bookProperties },

    additionalProperties: false

} as const


export const updateBookSchema = {

    type: 'object',

    // A PATCH with nothing to change is almost always a client mistake.
    minProperties: 1,

    properties: { ...bookProperties },

    additionalProperties: false

} as const
