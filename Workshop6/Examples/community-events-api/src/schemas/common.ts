export const idParamsSchema = {
    type: "object",
    required: ["id"],
    additionalProperties: false,
    properties: {
        id: {
            type: "integer",
            minimum: 1,
            maximum: 2_147_483_647
        }
    }
} as const;

export const paginationProperties = {
    page: {
        type: "integer",
        minimum: 1,
        maximum: 1_000_000,
        default: 1
    },
    limit: {
        type: "integer",
        minimum: 1,
        maximum: 50,
        default: 10
    }
} as const;
