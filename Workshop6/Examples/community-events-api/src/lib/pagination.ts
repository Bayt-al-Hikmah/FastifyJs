export type PaginationMeta = {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPreviousPage: boolean;
};

export function buildPagination(
    page: number,
    limit: number,
    total: number
): PaginationMeta {
    const totalPages = Math.max(1, Math.ceil(total / limit));

    return {
        page,
        limit,
        total,
        totalPages,
        hasNextPage: page < totalPages,
        hasPreviousPage: page > 1 && total > 0
    };
}
