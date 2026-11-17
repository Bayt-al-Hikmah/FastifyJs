import type { AuthenticatedUser } from '../types/auth.js'


/**
 * Drafts are visible only to the instructor who owns them. Everyone else,
 * including anonymous visitors and students, sees published resources only.
 *
 * The same fragment protects resource detail, attachment downloads, and any
 * future read endpoint so visibility cannot drift between routes.
 */

export function resourceVisibilityWhere(
    user: AuthenticatedUser | null
) {

    if (user && user.role === 'INSTRUCTOR') {

        return {

            OR: [
                { status: 'PUBLISHED' as const },
                { instructorId: user.id }
            ]

        }

    }

    return {
        status: 'PUBLISHED' as const
    }

}
