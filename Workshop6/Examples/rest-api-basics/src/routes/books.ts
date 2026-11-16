import type { FastifyPluginAsync } from "fastify";

import {
    createBookHandler,
    deleteBookHandler,
    getBook,
    listBookCollection,
    updateBookHandler
} from "../controllers/book-controller.js";
import {
    bookIdParamsSchema,
    bookListQuerySchema,
    createBookBodySchema,
    updateBookBodySchema
} from "../schemas/book-schemas.js";
import type {
    BookCategory,
    BookListQuery,
    CreateBookInput,
    UpdateBookInput
} from "../types/book.js";

const readLimit = {
    max: 120,
    timeWindow: "1 minute"
} as const;

const writeLimit = {
    max: 30,
    timeWindow: "1 minute"
} as const;

function normalizeBookBody(body: CreateBookInput | UpdateBookInput): void {
    if (typeof body.title === "string") {
        body.title = body.title.trim();
    }

    if (typeof body.author === "string") {
        body.author = body.author.trim();
    }

    if (typeof body.description === "string") {
        body.description = body.description.trim();
    }

    if (typeof body.isbn === "string") {
        body.isbn = body.isbn.trim();
    }

    if (typeof body.category === "string") {
        body.category = body.category.toUpperCase() as BookCategory;
    }
}

const bookRoutes: FastifyPluginAsync = async (fastify) => {
    fastify.get<{ Querystring: BookListQuery }>(
        "/",
        {
            schema: {
                querystring: bookListQuerySchema
            },
            config: {
                rateLimit: readLimit
            },
            preValidation: async (request) => {
                if (typeof request.query.search === "string") {
                    request.query.search = request.query.search.trim();
                }

                if (typeof request.query.category === "string") {
                    request.query.category =
                        request.query.category.toUpperCase() as BookCategory;
                }

                if (typeof request.query.sort === "string") {
                    request.query.sort =
                        request.query.sort.toLowerCase() as BookListQuery["sort"];
                }
            }
        },
        listBookCollection
    );

    fastify.get<{ Params: { id: number } }>(
        "/:id",
        {
            schema: {
                params: bookIdParamsSchema
            },
            config: {
                rateLimit: readLimit
            }
        },
        getBook
    );

    fastify.post<{ Body: CreateBookInput }>(
        "/",
        {
            schema: {
                body: createBookBodySchema
            },
            config: {
                rateLimit: writeLimit
            },
            preValidation: async (request) => {
                normalizeBookBody(request.body);
            }
        },
        createBookHandler
    );

    fastify.patch<{
        Params: { id: number };
        Body: UpdateBookInput;
    }>(
        "/:id",
        {
            schema: {
                params: bookIdParamsSchema,
                body: updateBookBodySchema
            },
            config: {
                rateLimit: writeLimit
            },
            preValidation: async (request) => {
                normalizeBookBody(request.body);
            }
        },
        updateBookHandler
    );

    fastify.delete<{ Params: { id: number } }>(
        "/:id",
        {
            schema: {
                params: bookIdParamsSchema
            },
            config: {
                rateLimit: writeLimit
            }
        },
        deleteBookHandler
    );
};

export default bookRoutes;
