import { seedBooks } from "../data/seed-books.js";
import { ApiError } from "../lib/api-error.js";
import type {
    Book,
    BookListQuery,
    BookListResult,
    BookSort,
    CreateBookInput,
    UpdateBookInput
} from "../types/book.js";

const books = new Map<number, Book>();

let nextBookId = 1;

function resetStore(): void {
    books.clear();

    nextBookId = 1;

    for (const seedBook of seedBooks) {
        books.set(seedBook.id, { ...seedBook });
    }

    nextBookId = Math.max(...seedBooks.map((book) => book.id)) + 1;
}

resetStore();

function normalizeOptionalText(value: string | null | undefined): string | null {
    if (typeof value !== "string") {
        return null;
    }

    const trimmed = value.trim();

    return trimmed.length > 0 ? trimmed : null;
}

function assertCopyCounts(
    totalCopies: number,
    availableCopies: number
): void {
    if (availableCopies > totalCopies) {
        throw ApiError.unprocessable(
            "Available copies cannot exceed total copies.",
            [
                {
                    field: "availableCopies",
                    message: "Available copies must be less than or equal to total copies."
                }
            ]
        );
    }

    if (availableCopies < 0) {
        throw ApiError.unprocessable(
            "Available copies cannot be negative.",
            [
                {
                    field: "availableCopies",
                    message: "Available copies must be zero or greater."
                }
            ]
        );
    }
}

function assertUniqueIsbn(
    isbn: string | null,
    ignoredBookId?: number
): void {
    if (!isbn) {
        return;
    }

    const normalized = isbn.replaceAll("-", "").toLowerCase();

    for (const book of books.values()) {
        if (book.id === ignoredBookId || !book.isbn) {
            continue;
        }

        if (book.isbn.replaceAll("-", "").toLowerCase() === normalized) {
            throw ApiError.conflict(
                "A book with this ISBN already exists.",
                [
                    {
                        field: "isbn",
                        message: "Use a unique ISBN or leave the field empty."
                    }
                ]
            );
        }
    }
}

function sortBooks(bookList: Book[], sort: BookSort): Book[] {
    const sorted = [...bookList];

    switch (sort) {
        case "oldest":
            sorted.sort((left, right) => {
                return left.addedAt.localeCompare(right.addedAt);
            });
            break;

        case "title":
            sorted.sort((left, right) => {
                return left.title.localeCompare(right.title);
            });
            break;

        case "author":
            sorted.sort((left, right) => {
                const authorOrder = left.author.localeCompare(right.author);

                return authorOrder !== 0
                    ? authorOrder
                    : left.title.localeCompare(right.title);
            });
            break;

        case "year":
            sorted.sort((left, right) => {
                return right.publishedYear - left.publishedYear;
            });
            break;

        case "newest":
        default:
            sorted.sort((left, right) => {
                return right.addedAt.localeCompare(left.addedAt);
            });
            break;
    }

    return sorted;
}

export function listBooks(query: BookListQuery): BookListResult {
    const page = query.page ?? 1;
    const limit = query.limit ?? 10;
    const sort = query.sort ?? "newest";
    const search = normalizeOptionalText(query.search);
    const category = query.category ?? null;

    const normalizedSearch = search?.toLowerCase() ?? null;

    const filtered = [...books.values()].filter((book) => {
        if (category && book.category !== category) {
            return false;
        }

        if (!normalizedSearch) {
            return true;
        }

        return (
            book.title.toLowerCase().includes(normalizedSearch) ||
            book.author.toLowerCase().includes(normalizedSearch) ||
            book.description.toLowerCase().includes(normalizedSearch)
        );
    });

    const sorted = sortBooks(filtered, sort);
    const total = sorted.length;
    const totalPages = Math.max(1, Math.ceil(total / limit));
    const offset = (page - 1) * limit;
    const paginatedBooks = sorted.slice(offset, offset + limit);

    return {
        books: paginatedBooks,
        pagination: {
            page,
            limit,
            total,
            totalPages,
            hasNextPage: page < totalPages,
            hasPreviousPage: page > 1 && total > 0
        },
        filters: {
            search,
            category
        },
        sort
    };
}

export function getBookById(bookId: number): Book {
    const book = books.get(bookId);

    if (!book) {
        throw ApiError.notFound(`No book exists with id ${bookId}.`);
    }

    return book;
}

export function createBook(input: CreateBookInput): Book {
    const totalCopies = input.totalCopies;
    const availableCopies = input.availableCopies ?? totalCopies;

    assertCopyCounts(totalCopies, availableCopies);

    const isbn = normalizeOptionalText(input.isbn);

    assertUniqueIsbn(isbn);

    const now = new Date().toISOString();

    const book: Book = {
        id: nextBookId,
        title: input.title.trim(),
        author: input.author.trim(),
        category: input.category,
        description: input.description.trim(),
        publishedYear: input.publishedYear,
        isbn,
        totalCopies,
        availableCopies,
        addedAt: now,
        updatedAt: now
    };

    nextBookId += 1;

    books.set(book.id, book);

    return book;
}

export function updateBook(bookId: number, input: UpdateBookInput): Book {
    const existing = getBookById(bookId);

    const totalCopies = input.totalCopies ?? existing.totalCopies;
    const availableCopies = input.availableCopies ?? existing.availableCopies;

    assertCopyCounts(totalCopies, availableCopies);

    if (
        input.totalCopies !== undefined &&
        input.availableCopies === undefined &&
        totalCopies < existing.availableCopies
    ) {
        throw ApiError.unprocessable(
            "Total copies cannot be lower than the number of available copies.",
            [
                {
                    field: "totalCopies",
                    message: "Reduce available copies first or lower both values together."
                }
            ]
        );
    }

    const isbn =
        input.isbn === undefined
            ? existing.isbn
            : normalizeOptionalText(input.isbn);

    assertUniqueIsbn(isbn, existing.id);

    const updated: Book = {
        ...existing,
        title: input.title?.trim() ?? existing.title,
        author: input.author?.trim() ?? existing.author,
        category: input.category ?? existing.category,
        description: input.description?.trim() ?? existing.description,
        publishedYear: input.publishedYear ?? existing.publishedYear,
        isbn,
        totalCopies,
        availableCopies,
        updatedAt: new Date().toISOString()
    };

    books.set(updated.id, updated);

    return updated;
}

export function deleteBook(bookId: number): void {
    const deleted = books.delete(bookId);

    if (!deleted) {
        throw ApiError.notFound(`No book exists with id ${bookId}.`);
    }
}

export function getCollectionStats(): {
    totalBooks: number;
    availableTitles: number;
    totalCopies: number;
} {
    const allBooks = [...books.values()];

    return {
        totalBooks: allBooks.length,
        availableTitles: allBooks.filter((book) => book.availableCopies > 0).length,
        totalCopies: allBooks.reduce((sum, book) => sum + book.totalCopies, 0)
    };
}
