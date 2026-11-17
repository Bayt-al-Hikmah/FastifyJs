import type { FastifyReply, FastifyRequest } from 'fastify'

import type { BookService } from '../services/book-service.js'
import type {
    BookIdParams,
    CreateBookInput,
    ListBooksQuery,
    UpdateBookInput
} from '../types/book.js'


type ListBooksRequest = FastifyRequest<{
    Querystring: ListBooksQuery
}>

type BookIdRequest = FastifyRequest<{
    Params: BookIdParams
}>

type CreateBookRequest = FastifyRequest<{
    Body: CreateBookInput
}>

type UpdateBookRequest = FastifyRequest<{
    Params: BookIdParams
    Body: UpdateBookInput
}>


/**
 * Controllers translate between HTTP and the service layer.
 *
 * They choose status codes, build the consistent `message` / `data` envelope,
 * and let expected failures (ApiError) bubble up to the central error handler.
 * Arrow properties keep `this` bound when the methods are passed directly to
 * Fastify as route handlers.
 */

export class BookController {

    constructor(private readonly books: BookService) {}


    list = async (
        request: ListBooksRequest,
        reply: FastifyReply
    ): Promise<FastifyReply> => {

        const result = this.books.list(request.query)

        return reply.code(200).send({

            message: 'Books retrieved successfully.',

            data: result.books,

            pagination: result.pagination

        })

    }


    getById = async (
        request: BookIdRequest,
        reply: FastifyReply
    ): Promise<FastifyReply> => {

        const book = this.books.findById(request.params.id)

        return reply.code(200).send({

            message: 'Book retrieved successfully.',

            data: book

        })

    }


    create = async (
        request: CreateBookRequest,
        reply: FastifyReply
    ): Promise<FastifyReply> => {

        const book = this.books.create(request.body)

        return reply.code(201).send({

            message: 'Book created successfully.',

            data: book

        })

    }


    update = async (
        request: UpdateBookRequest,
        reply: FastifyReply
    ): Promise<FastifyReply> => {

        const book = this.books.update(
            request.params.id,
            request.body
        )

        return reply.code(200).send({

            message: 'Book updated successfully.',

            data: book

        })

    }


    remove = async (
        request: BookIdRequest,
        reply: FastifyReply
    ): Promise<FastifyReply> => {

        this.books.remove(request.params.id)

        // 204 responses must not carry a body.
        return reply.code(204).send()

    }

}
