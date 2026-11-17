/**
 * Pagination helpers shared by every collection endpoint. The numbers have
 * already been coerced and bounded by JSON Schema when these run.
 */

export type PaginationQuery = {

    page?: number

    limit?: number

}


export type PaginationMetadata = {

    page: number

    limit: number

    total: number

    totalPages: number

}


export function resolvePagination(
    query: PaginationQuery
): { page: number; limit: number; skip: number } {

    const page = query.page ?? 1

    const limit = query.limit ?? 20


    return {

        page,

        limit,

        skip: (page - 1) * limit

    }

}


export function buildPagination(
    page: number,
    limit: number,
    total: number
): PaginationMetadata {

    return {

        page,

        limit,

        total,

        totalPages: Math.ceil(total / limit)

    }

}
