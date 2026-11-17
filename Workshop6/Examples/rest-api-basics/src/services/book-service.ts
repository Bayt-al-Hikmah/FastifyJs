import { DEFAULT_LIMIT, DEFAULT_PAGE } from '../config.js'
import { createSeedBooks } from '../data/seed-books.js'
import { ApiError } from '../lib/api-error.js'
import type {
    Book,
    BookListResult,
    CreateBookInput,
    ListBooksQuery,
    UpdateBookInput
} from '../types/book.js'


type SortableField = 'id' | 'title' | 'author' | 'publishedYear'


/**
 * Compares ISBNs without relying on hyphen placement or capitalisation, so
 * `978-0-201-61622-4` and `9780201616224` are correctly seen as duplicates.
 */

function normaliseIsbn(isbn: string): string {

    return isbn.replace(/-/g, '').trim().toLowerCase()

}


/**
 * All business logic lives here. The service knows nothing about HTTP: it does
 * not read request headers, choose status codes, or build response envelopes.
 * That job belongs to the controller layer.
 *
 * The collection is held in memory and rebuilt from the seed module whenever a
 * new service instance is created at application startup.
 */

export class BookService {

    private books: Book[]

    private nextId: number


    constructor() {

        this.books = createSeedBooks()

        this.nextId = this.books.reduce(
            (highest, book) => Math.max(highest, book.id),
            0
        ) + 1

    }


    /**
     * Applies search, filters, sorting, and pagination, then returns the page
     * of books together with metadata the client can use to build controls.
     */

    list(query: ListBooksQuery = {}): BookListResult {

        let filtered = [...this.books]


        const search = query.search?.trim().toLowerCase()

        if (search) {

            filtered = filtered.filter((book) => {

                const searchableFields = [
                    book.title,
                    book.author,
                    book.isbn,
                    book.description
                ]

                return searchableFields.some((value) =>
                    value.toLowerCase().includes(search)
                )

            })

        }


        if (query.genre) {

            filtered = filtered.filter(
                (book) => book.genre === query.genre
            )

        }


        if (typeof query.available === 'boolean') {

            filtered = filtered.filter(
                (book) => book.available === query.available
            )

        }


        const sorted = this.sortBooks(filtered, query.sort)


        const page = query.page ?? DEFAULT_PAGE

        const limit = query.limit ?? DEFAULT_LIMIT

        const start = (page - 1) * limit


        return {

            books: sorted.slice(start, start + limit),

            pagination: {

                page,
                limit,
                total: sorted.length,
                totalPages: Math.ceil(sorted.length / limit)

            }

        }

    }


    private sortBooks(
        books: Book[],
        sort: ListBooksQuery['sort']
    ): Book[] {

        const token = sort ?? 'id'

        const descending = token.startsWith('-')

        const field = (
            descending ? token.slice(1) : token
        ) as SortableField

        const direction = descending ? -1 : 1


        return [...books].sort((left, right) => {

            const leftValue = left[field]

            const rightValue = right[field]


            if (
                typeof leftValue === 'string' &&
                typeof rightValue === 'string'
            ) {

                return leftValue.localeCompare(rightValue) * direction

            }


            return (
                Number(leftValue) - Number(rightValue)
            ) * direction

        })

    }


    findById(id: number): Book {

        const book = this.books.find(
            (candidate) => candidate.id === id
        )

        if (!book) {

            throw ApiError.notFound()

        }

        return book

    }


    create(input: CreateBookInput): Book {

        const requestedIsbn = normaliseIsbn(input.isbn)

        const duplicate = this.books.some(
            (book) => normaliseIsbn(book.isbn) === requestedIsbn
        )

        if (duplicate) {

            throw ApiError.conflict()

        }


        const book: Book = {

            id: this.nextId++,

            title: input.title,

            author: input.author,

            isbn: input.isbn,

            genre: input.genre,

            publishedYear: input.publishedYear,

            copies: input.copies,

            // If the client did not state availability, infer it from copies.
            available: input.available ?? input.copies > 0,

            description: input.description ?? ''

        }


        this.books.push(book)

        return book

    }


    update(id: number, input: UpdateBookInput): Book {

        const index = this.books.findIndex(
            (book) => book.id === id
        )

        if (index === -1) {

            throw ApiError.notFound()

        }


        const existing = this.books[index]


        if (input.isbn !== undefined) {

            const requestedIsbn = normaliseIsbn(input.isbn)

            const duplicate = this.books.some(
                (book) =>
                    book.id !== id &&
                    normaliseIsbn(book.isbn) === requestedIsbn
            )

            if (duplicate) {

                throw ApiError.conflict()

            }

        }


        const updated: Book = {

            id: existing.id,

            title: input.title ?? existing.title,

            author: input.author ?? existing.author,

            isbn: input.isbn ?? existing.isbn,

            genre: input.genre ?? existing.genre,

            publishedYear: input.publishedYear ?? existing.publishedYear,

            copies: input.copies ?? existing.copies,

            available: input.available ?? existing.available,

            description: input.description ?? existing.description

        }


        this.books[index] = updated

        return updated

    }


    remove(id: number): void {

        const index = this.books.findIndex(
            (book) => book.id === id
        )

        if (index === -1) {

            throw ApiError.notFound()

        }

        this.books.splice(index, 1)

    }

}
