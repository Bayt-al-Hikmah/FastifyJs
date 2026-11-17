/**
 * Domain types for the Community Library API.
 *
 * These types describe the shape of a book inside the application. They do not
 * validate HTTP requests; the JSON Schemas in `schemas/book-schemas.ts` do
 * that at runtime.
 */

export const GENRES = [
    'Fiction',
    'Science',
    'History',
    'Technology',
    'Biography',
    'Poetry'
] as const

export type Genre = (typeof GENRES)[number]


/**
 * The fields clients may sort by. A leading `-` means descending order, a
 * convention that is easy to express in a query string and easy to explain.
 */

export const SORT_FIELDS = [
    'id',
    'title',
    'author',
    'publishedYear'
] as const

export type SortField = (typeof SORT_FIELDS)[number]

export type BookSort = SortField | `-${SortField}`


export interface Book {

    id: number

    title: string

    author: string

    isbn: string

    genre: Genre

    publishedYear: number

    copies: number

    available: boolean

    description: string

}


/** Everything needed to add a new book except the server-generated id. */

export type CreateBookInput = Omit<Book, 'id'>


/** PATCH requests may change any subset of the editable fields. */

export type UpdateBookInput = Partial<CreateBookInput>


export interface ListBooksQuery {

    search?: string

    genre?: Genre

    available?: boolean

    sort?: BookSort

    page?: number

    limit?: number

}


export interface Pagination {

    page: number

    limit: number

    total: number

    totalPages: number

}


export interface BookListResult {

    books: Book[]

    pagination: Pagination

}


export interface BookIdParams {

    id: number

}
