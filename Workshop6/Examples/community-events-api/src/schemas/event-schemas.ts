import { paginationProperties } from "./common.js";

export const EVENT_CATEGORIES = [
    "TECHNOLOGY",
    "EDUCATION",
    "ART",
    "COMMUNITY",
    "SPORTS",
    "OTHER"
] as const;

export const EVENT_STATUSES = ["DRAFT", "PUBLISHED"] as const;

export const EVENT_SORTS = ["upcoming", "newest", "title"] as const;

export type EventCategoryValue = (typeof EVENT_CATEGORIES)[number];

export type EventStatusValue = (typeof EVENT_STATUSES)[number];

export type EventSortValue = (typeof EVENT_SORTS)[number];

export const eventListQuerySchema = {
    type: "object",
    additionalProperties: false,
    properties: {
        ...paginationProperties,
        search: {
            type: "string",
            maxLength: 100
        },
        category: {
            type: "string",
            enum: EVENT_CATEGORIES
        },
        sort: {
            type: "string",
            enum: EVENT_SORTS,
            default: "upcoming"
        }
    }
} as const;

export const myEventListQuerySchema = {
    type: "object",
    additionalProperties: false,
    properties: {
        ...paginationProperties,
        search: {
            type: "string",
            maxLength: 100
        },
        category: {
            type: "string",
            enum: EVENT_CATEGORIES
        },
        status: {
            type: "string",
            enum: EVENT_STATUSES
        },
        sort: {
            type: "string",
            enum: EVENT_SORTS,
            default: "upcoming"
        }
    }
} as const;

const eventProperties = {
    title: {
        type: "string",
        minLength: 3,
        maxLength: 120,
        pattern: "\\S"
    },
    description: {
        type: "string",
        minLength: 10,
        maxLength: 3000
    },
    location: {
        type: "string",
        minLength: 2,
        maxLength: 160,
        pattern: "\\S"
    },
    startsAt: {
        type: "string",
        format: "date-time"
    },
    capacity: {
        type: "integer",
        minimum: 1,
        maximum: 10_000
    },
    category: {
        type: "string",
        enum: EVENT_CATEGORIES
    },
    status: {
        type: "string",
        enum: EVENT_STATUSES
    }
} as const;

export const createEventBodySchema = {
    type: "object",
    required: [
        "title",
        "description",
        "location",
        "startsAt",
        "capacity"
    ],
    additionalProperties: false,
    properties: eventProperties
} as const;

export const updateEventBodySchema = {
    type: "object",
    minProperties: 1,
    additionalProperties: false,
    properties: eventProperties
} as const;

export type EventListQuery = {
    page?: number;
    limit?: number;
    search?: string;
    category?: EventCategoryValue;
    sort?: EventSortValue;
};

export type MyEventListQuery = EventListQuery & {
    status?: EventStatusValue;
};

export type CreateEventBody = {
    title: string;
    description: string;
    location: string;
    startsAt: string;
    capacity: number;
    category?: EventCategoryValue;
    status?: EventStatusValue;
};

export type UpdateEventBody = Partial<CreateEventBody>;
