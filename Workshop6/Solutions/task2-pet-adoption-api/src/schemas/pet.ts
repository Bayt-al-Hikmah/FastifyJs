export const petIdParamsSchema = {

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


export const petListQuerySchema = {

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
            default: 12
        },

        search: {
            type: 'string',
            minLength: 1,
            maxLength: 100
        },

        species: {
            type: 'string',
            enum: [
                'DOG',
                'CAT',
                'RABBIT',
                'OTHER'
            ]
        },

        status: {
            type: 'string',
            enum: [
                'AVAILABLE',
                'ADOPTED',
                'PENDING'
            ]
        }

    },

    additionalProperties: false

} as const


const speciesProperty = {

    type: 'string',

    enum: [
        'DOG',
        'CAT',
        'RABBIT',
        'OTHER'
    ]

} as const


const statusProperty = {

    type: 'string',

    enum: [
        'AVAILABLE',
        'ADOPTED',
        'PENDING'
    ]

} as const


export const createPetBodySchema = {

    type: 'object',

    required: ['name'],

    properties: {

        name: {
            type: 'string',
            minLength: 2,
            maxLength: 120,
            pattern: '\\S'
        },

        species: speciesProperty,

        age: {
            type: 'integer',
            minimum: 0,
            maximum: 40
        },

        description: {
            type: 'string',
            maxLength: 2000
        },

        status: statusProperty

    },

    additionalProperties: false

} as const


export const updatePetBodySchema = {

    type: 'object',

    minProperties: 1,

    properties: {

        name: {
            type: 'string',
            minLength: 2,
            maxLength: 120,
            pattern: '\\S'
        },

        species: speciesProperty,

        age: {
            type: 'integer',
            minimum: 0,
            maximum: 40
        },

        description: {
            type: ['string', 'null'],
            maxLength: 2000
        },

        status: statusProperty

    },

    additionalProperties: false

} as const
