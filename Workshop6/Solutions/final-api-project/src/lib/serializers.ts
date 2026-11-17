/**
 * Serializers deliberately build plain objects. Prisma models, Date values,
 * and internal storage keys never leak into an HTTP response.
 */

type PhotoRow = {

    id: number

    originalName: string

    mimeType: string

    extension: string

    size: number

    createdAt: Date

}


export type RecipeRow = {

    id: number

    title: string

    summary: string

    ingredients: string

    steps: string

    category: 'BREAKFAST' | 'LUNCH' | 'DINNER' | 'DESSERT' | 'SNACK' | 'BEVERAGE'

    prepMinutes: number

    status: 'DRAFT' | 'PUBLISHED'

    authorId: number

    createdAt: Date

    updatedAt: Date

    author: {
        name: string
    }

    photo: PhotoRow | null

    _count: {
        favorites: number
    }

}


/**
 * One shared select keeps every recipe endpoint's shape identical. The photo
 * storage key is intentionally omitted; only an authenticated download route
 * resolves it from the database.
 */

export const recipeSelect = {

    id: true,

    title: true,

    summary: true,

    ingredients: true,

    steps: true,

    category: true,

    prepMinutes: true,

    status: true,

    authorId: true,

    createdAt: true,

    updatedAt: true,

    author: {
        select: {
            name: true
        }
    },

    photo: {
        select: {
            id: true,
            originalName: true,
            mimeType: true,
            extension: true,
            size: true,
            createdAt: true
        }
    },

    _count: {
        select: {
            favorites: true
        }
    }

} as const


export function serializeRecipe(
    recipe: RecipeRow,
    isFavorite = false
) {

    return {

        id: recipe.id,

        title: recipe.title,

        summary: recipe.summary,

        ingredients: recipe.ingredients,

        steps: recipe.steps,

        category: recipe.category,

        prepMinutes: recipe.prepMinutes,

        status: recipe.status,

        authorId: recipe.authorId,

        authorName: recipe.author.name,

        favoriteCount: recipe._count.favorites,

        isFavorite,

        createdAt: recipe.createdAt,

        updatedAt: recipe.updatedAt,

        photo: recipe.photo
            ? {
                id: recipe.photo.id,
                originalName: recipe.photo.originalName,
                mimeType: recipe.photo.mimeType,
                extension: recipe.photo.extension,
                size: recipe.photo.size,
                createdAt: recipe.photo.createdAt,
                downloadUrl: `/api/recipes/${recipe.id}/photo/download`
            }
            : null

    }

}
