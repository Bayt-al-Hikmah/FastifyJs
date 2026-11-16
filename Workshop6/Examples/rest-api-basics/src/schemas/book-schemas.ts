import { BOOK_CATEGORIES, BOOK_SORT_OPTIONS } from "../types/book.js";

export const bookIdParamsSchema = {
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

export const bookListQuerySchema = {
    type: "object",
    additionalProperties: false,
    properties: {
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
        },
        search: {
            type: "string",
            maxLength: 100
        },
        category: {
            type: "string",
            enum: BOOK_CATEGORIES
        },
        sort: {
            type: "string",
            enum: BOOK_SORT_OPTIONS,
            default: "newest"
        }
    }
} as const;

const bookProperties = {
    title: {
        type: "string",
        minLength: 1,
        maxLength: 160,
        pattern: "\\S"
    },
    author: {
        type: "string",
        minLength: 1,
        maxLength: 120,
        pattern: "\\S"
    },
    category: {
        type: "string",
        enum: BOOK_CATEGORIES
    },
    description: {
        type: "string",
        minLength: 10,
        maxLength: 2000
    },
    publishedYear: {
        type: "integer",
        minimum: 1450,
        maximum: 2100
    },
    isbn: {
        type: ["string", "null"],
        maxLength: 20,
        pattern: "^[0-9Xx-]+$"
    },
    totalCopies: {
        type: "integer",
        minimum: 1,
        maximum: 1000
    },
    availableCopies: {
        type: "integer",
        minimum: 0,
        maximum: 1000
    }
} as const;

export const createBookBodySchema = {
    type: "object",
    required: [
        "title",
        "author",
        "category",
        "description",
        "publishedYear",
        "totalCopies"
    ],
    additionalProperties: false,
    properties: bookProperties
} as const;

export const updateBookBodySchema = {
    type: "object",
    minProperties: 1,
    additionalProperties: false,
    properties: bookProperties
} as const;
