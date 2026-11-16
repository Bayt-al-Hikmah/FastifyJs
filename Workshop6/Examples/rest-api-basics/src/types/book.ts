export const BOOK_CATEGORIES = [
    "FICTION",
    "NON_FICTION",
    "SCIENCE",
    "HISTORY",
    "POETRY",
    "CHILDREN",
    "TECHNOLOGY"
] as const;

export type BookCategory = (typeof BOOK_CATEGORIES)[number];

export const BOOK_SORT_OPTIONS = [
    "newest",
    "oldest",
    "title",
    "author",
    "year"
] as const;

export type BookSort = (typeof BOOK_SORT_OPTIONS)[number];

export type Book = {
    id: number;
    title: string;
    author: string;
    category: BookCategory;
    description: string;
    publishedYear: number;
    isbn: string | null;
    totalCopies: number;
    availableCopies: number;
    addedAt: string;
    updatedAt: string;
};

export type CreateBookInput = {
    title: string;
    author: string;
    category: BookCategory;
    description: string;
    publishedYear: number;
    isbn?: string | null;
    totalCopies: number;
    availableCopies?: number;
};

export type UpdateBookInput = Partial<CreateBookInput>;

export type BookListQuery = {
    page?: number;
    limit?: number;
    search?: string;
    category?: BookCategory;
    sort?: BookSort;
};

export type Pagination = {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPreviousPage: boolean;
};

export type BookListResult = {
    books: Book[];
    pagination: Pagination;
    filters: {
        search: string | null;
        category: BookCategory | null;
    };
    sort: BookSort;
};
