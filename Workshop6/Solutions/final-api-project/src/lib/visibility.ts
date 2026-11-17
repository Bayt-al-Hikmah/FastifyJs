import type { AuthenticatedUser } from '../types/auth.js'


/**
 * Drafts are visible only to the chef who owns them. Everyone else,
 * including anonymous visitors and members, sees published recipes only.
 *
 * The same fragment protects recipe detail, favorites, photo downloads, and
 * any future read endpoint so visibility cannot drift between routes.
 */

export function recipeVisibilityWhere(
    user: AuthenticatedUser | null
) {

    if (user && user.role === 'CHEF') {

        return {

            OR: [
                { status: 'PUBLISHED' as const },
                { authorId: user.id }
            ]

        }

    }

    return {
        status: 'PUBLISHED' as const
    }

}
