import { paginationProperties } from "./common.js";

export const registrationListQuerySchema = {
    type: "object",
    additionalProperties: false,
    properties: {
        ...paginationProperties
    }
} as const;

export type RegistrationListQuery = {
    page?: number;
    limit?: number;
};
