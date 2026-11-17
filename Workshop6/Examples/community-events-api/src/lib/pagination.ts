export type PaginationQuery = {

    page?: number

    limit?: number

}


export type PaginationMeta = {

    page: number

    limit: number

    total: number

    totalPages: number

}


export type PageWindow = {

    page: number

    limit: number

    skip: number

}


export const DEFAULT_PAGE = 1

export const DEFAULT_LIMIT = 10

export const MAX_LIMIT = 50


export function buildPageWindow(
    query: PaginationQuery
): PageWindow {

    const page = query.page ?? DEFAULT_PAGE

    const limit = Math.min(
        query.limit ?? DEFAULT_LIMIT,
        MAX_LIMIT
    )

    return {

        page,

        limit,

        skip: (page - 1) * limit

    }

}


export function buildPaginationMeta(
    page: number,
    limit: number,
    total: number
): PaginationMeta {

    return {

        page,

        limit,

        total,

        totalPages: Math.ceil(total / limit)

    }

}
