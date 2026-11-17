import { paginationQuerySchema } from './common-schemas.js'


const resourceTypeValues = ['VIDEO', 'ARTICLE', 'BOOK', 'EXERCISE']

const publicationStatusValues = ['DRAFT', 'PUBLISHED']


export const attachmentMetadataSchema = {

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


export const resourceResponseSchema = {

    type: 'object',

    properties: {

        id: { type: 'integer' },

        title: { type: 'string' },

        description: { type: 'string' },

        subject: { type: 'string' },

        type: {
            type: 'string',
            enum: resourceTypeValues
        },

        status: {
            type: 'string',
            enum: publicationStatusValues
        },

        instructorId: { type: 'integer' },

        instructorName: { type: 'string' },

        createdAt: {
            type: 'string',
            format: 'date-time'
        },

        updatedAt: {
            type: 'string',
            format: 'date-time'
        },

        attachment: {
            type: ['object', 'null'],
            properties: attachmentMetadataSchema.properties,
            required: attachmentMetadataSchema.required,
            additionalProperties: false
        }

    },

    required: [
        'id',
        'title',
        'description',
        'subject',
        'type',
        'status',
        'instructorId',
        'instructorName',
        'createdAt',
        'updatedAt',
        'attachment'
    ],

    additionalProperties: false

} as const


export const createResourceSchema = {

    type: 'object',

    required: ['title', 'description', 'subject', 'type'],

    properties: {

        title: {
            type: 'string',
            minLength: 4,
            maxLength: 160,
            pattern: '\\S'
        },

        description: {
            type: 'string',
            minLength: 10,
            maxLength: 2000,
            pattern: '\\S'
        },

        subject: {
            type: 'string',
            minLength: 2,
            maxLength: 80,
            pattern: '\\S'
        },

        type: {
            type: 'string',
            enum: resourceTypeValues
        }

    },

    additionalProperties: false

} as const


export const updateResourceSchema = {

    type: 'object',

    minProperties: 1,

    properties: {

        title: {
            type: 'string',
            minLength: 4,
            maxLength: 160,
            pattern: '\\S'
        },

        description: {
            type: 'string',
            minLength: 10,
            maxLength: 2000,
            pattern: '\\S'
        },

        subject: {
            type: 'string',
            minLength: 2,
            maxLength: 80,
            pattern: '\\S'
        },

        type: {
            type: 'string',
            enum: resourceTypeValues
        },

        status: {
            type: 'string',
            enum: publicationStatusValues
        }

    },

    additionalProperties: false

} as const


export const resourceListQuerySchema = {

    type: 'object',

    properties: {

        ...paginationQuerySchema.properties,

        search: {
            type: 'string',
            minLength: 1,
            maxLength: 100
        },

        subject: {
            type: 'string',
            minLength: 1,
            maxLength: 80
        },

        type: {
            type: 'string',
            enum: resourceTypeValues
        }

    },

    additionalProperties: false

} as const


export const myResourcesQuerySchema = {

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

        type: {
            type: 'string',
            enum: resourceTypeValues
        }

    },

    additionalProperties: false

} as const
