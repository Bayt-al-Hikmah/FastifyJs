export type Pagination = {

    page: number

    limit: number

    total: number

    totalPages: number

}


export function buildPagination(
    page: number,
    limit: number,
    total: number
): Pagination {

    return {

        page,

        limit,

        total,

        totalPages: Math.ceil(total / limit)

    }

}
