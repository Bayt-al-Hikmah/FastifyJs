import type { FastifyReply, FastifyRequest } from "fastify";

import {
    createBook,
    deleteBook,
    getBookById,
    listBooks,
    updateBook
} from "../services/book-service.js";
import type {
    BookListQuery,
    CreateBookInput,
    UpdateBookInput
} from "../types/book.js";

type BookParams = {
    id: number;
};

export async function listBookCollection(
    request: FastifyRequest<{ Querystring: BookListQuery }>,
    reply: FastifyReply
): Promise<void> {
    const result = listBooks(request.query);

    return reply.send({
        data: result.books,
        meta: {
            pagination: result.pagination,
            filters: result.filters,
            sort: result.sort
        }
    });
}

export async function getBook(
    request: FastifyRequest<{ Params: BookParams }>,
    reply: FastifyReply
): Promise<void> {
    const book = getBookById(request.params.id);

    return reply.send({
        data: book
    });
}

export async function createBookHandler(
    request: FastifyRequest<{ Body: CreateBookInput }>,
    reply: FastifyReply
): Promise<void> {
    const book = createBook(request.body);

    return reply
        .header("Location", `/api/books/${book.id}`)
        .code(201)
        .send({
            data: book
        });
}

export async function updateBookHandler(
    request: FastifyRequest<{
        Params: BookParams;
        Body: UpdateBookInput;
    }>,
    reply: FastifyReply
): Promise<void> {
    const book = updateBook(request.params.id, request.body);

    return reply.send({
        data: book
    });
}

export async function deleteBookHandler(
    request: FastifyRequest<{ Params: BookParams }>,
    reply: FastifyReply
): Promise<void> {
    deleteBook(request.params.id);

    return reply.code(204).send();
}
