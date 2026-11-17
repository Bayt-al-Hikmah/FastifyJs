export type UserRole = 'ORGANIZER' | 'MEMBER'


/**
 * The minimal snapshot of the signed-in user that the auth plugin attaches to
 * every authenticated request. Ownership decisions always use this id.
 */
export type AuthenticatedUser = {

    id: number

    username: string

    email: string

    role: UserRole

}


/**
 * The public representation returned by /api/auth/register, /login and /me.
 * It deliberately contains no password hash.
 */
export type PublicUser = AuthenticatedUser & {

    createdAt: string

}
