import type { Role } from "../generated/prisma/enums.js";

export type AuthenticatedUser = {
    id: number;
    username: string;
    email: string;
    role: Role;
    createdAt: Date;
};

export type PublicUser = {
    id: number;
    username: string;
    email: string;
    role: Role;
    createdAt: string;
};

export type UserRole = Role;
