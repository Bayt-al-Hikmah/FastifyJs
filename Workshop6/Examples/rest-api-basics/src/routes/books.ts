import type { FastifyPluginAsync } from 'fastify'

import { BookController } from '../controllers/book-controller.js'
import {
    bookIdParamsSchema,
    createBookSchema,
    listBooksQuerySchema,
    updateBookSchema
} from '../schemas/book-schemas.js'
import { BookService } from '../services/book-service.js'
import type {
    BookIdParams,
    CreateBookInput,
    ListBooksQuery,
    UpdateBookInput
} from '../types/book.js'


/**
 * The /books endpoints.
 *
 * Routes only describe the HTTP contract: path, method, JSON Schema, and small
 * normalisation hooks. All decisions about the collection are delegated to the
 * controller and service layers.
 */

const bookRoutes: FastifyPluginAsync = async (fastify) => {

    const service = new BookService()

    const controller = new BookController(service)


    fastify.get<{ Querystring: ListBooksQuery }>(
        '/books',

        {

            schema: {

                querystring: listBooksQuerySchema

            },


            preValidation: async (request) => {

                const search = request.query.search

                if (typeof search === 'string') {

                    const trimmed = search.trim()

                    if (trimmed.length === 0) {

                        // An empty search is the same as no search. Removing it
                        // here avoids a needless schema error for whitespace.
                        delete request.query.search

                    } else {

                        request.query.search = trimmed

                    }

                }

            }

        },

        controller.list
    )


    fastify.get<{ Params: BookIdParams }>(
        '/books/:id',

        {

            schema: {

                params: bookIdParamsSchema

            }

        },

        controller.getById
    )


    fastify.post<{ Body: CreateBookInput }>(
        '/books',

        {

            schema: {

                body: createBookSchema

            },


            preValidation: async (request) => {

                const body = request.body as CreateBookInput

                if (typeof body?.title === 'string') {
                    body.title = body.title.trim()
                }

                if (typeof body?.author === 'string') {
                    body.author = body.author.trim()
                }

                if (typeof body?.isbn === 'string') {
                    body.isbn = body.isbn.trim()
                }

                if (typeof body?.description === 'string') {
                    body.description = body.description.trim()
                }

            }

        },

        controller.create
    )


    fastify.patch<{
        Params: BookIdParams
        Body: UpdateBookInput
    }>(
        '/books/:id',

        {

            schema: {

                params: bookIdParamsSchema,

                body: updateBookSchema

            },


            preValidation: async (request) => {

                const body = request.body as UpdateBookInput

                if (typeof body?.title === 'string') {
                    body.title = body.title.trim()
                }

                if (typeof body?.author === 'string') {
                    body.author = body.author.trim()
                }

                if (typeof body?.isbn === 'string') {
                    body.isbn = body.isbn.trim()
                }

                if (typeof body?.description === 'string') {
                    body.description = body.description.trim()
                }

            }

        },

        controller.update
    )


    fastify.delete<{ Params: BookIdParams }>(
        '/books/:id',

        {

            schema: {

                params: bookIdParamsSchema

            }

        },

        controller.remove
    )

}

export default bookRoutes
