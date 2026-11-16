export const registerBodySchema = {
    type: "object",
    required: ["username", "email", "password"],
    additionalProperties: false,
    properties: {
        username: {
            type: "string",
            minLength: 3,
            maxLength: 40,
            pattern: "^[A-Za-z0-9_]+$"
        },
        email: {
            type: "string",
            format: "email",
            maxLength: 254
        },
        password: {
            type: "string",
            minLength: 12,
            maxLength: 128
        }
    }
} as const;

export const loginBodySchema = {
    type: "object",
    required: ["email", "password"],
    additionalProperties: false,
    properties: {
        email: {
            type: "string",
            format: "email",
            maxLength: 254
        },
        password: {
            type: "string",
            minLength: 1,
            maxLength: 128
        }
    }
} as const;

export type RegisterBody = {
    username: string;
    email: string;
    password: string;
};

export type LoginBody = {
    email: string;
    password: string;
};
