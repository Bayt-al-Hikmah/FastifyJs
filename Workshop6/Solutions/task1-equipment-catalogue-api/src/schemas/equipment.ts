export const equipmentIdParamsSchema = {

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


export const equipmentListQuerySchema = {

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

        category: {
            type: 'string',
            enum: [
                'TOOLS',
                'ELECTRONICS',
                'FURNITURE',
                'SPORTS',
                'CAMPING',
                'OTHER'
            ]
        },

        availability: {
            type: 'string',
            enum: [
                'AVAILABLE',
                'ON_LOAN',
                'MAINTENANCE'
            ]
        }

    },

    additionalProperties: false

} as const


const categoryProperty = {

    type: 'string',

    enum: [
        'TOOLS',
        'ELECTRONICS',
        'FURNITURE',
        'SPORTS',
        'CAMPING',
        'OTHER'
    ]

} as const


const availabilityProperty = {

    type: 'string',

    enum: [
        'AVAILABLE',
        'ON_LOAN',
        'MAINTENANCE'
    ]

} as const


export const createEquipmentBodySchema = {

    type: 'object',

    required: ['name'],

    properties: {

        name: {
            type: 'string',
            minLength: 2,
            maxLength: 140,
            pattern: '\\S'
        },

        description: {
            type: 'string',
            maxLength: 2000
        },

        category: categoryProperty,

        availability: availabilityProperty,

        quantity: {
            type: 'integer',
            minimum: 0,
            maximum: 100_000
        }

    },

    additionalProperties: false

} as const


export const updateEquipmentBodySchema = {

    type: 'object',

    minProperties: 1,

    properties: {

        name: {
            type: 'string',
            minLength: 2,
            maxLength: 140,
            pattern: '\\S'
        },

        description: {
            type: ['string', 'null'],
            maxLength: 2000
        },

        category: categoryProperty,

        availability: availabilityProperty,

        quantity: {
            type: 'integer',
            minimum: 0,
            maximum: 100_000
        }

    },

    additionalProperties: false

} as const
