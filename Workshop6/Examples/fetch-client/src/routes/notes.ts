import { open } from 'node:fs/promises'

import { extname } from 'node:path'

import type { FastifyPluginAsync } from 'fastify'

import { MIME_BY_EXTENSION } from '../config.js'

import {
    ApiError,
    notFound
} from '../lib/api-error.js'

import {
    drainFileStream,
    imagePathFor,
    removeImage,
    storeImage
} from '../lib/image-store.js'

import {
    createNote,
    deleteNote,
    getNote,
    listNotes,
    listTopics,
    setNoteImage,
    updateNote
} from '../services/note-service.js'

import type {
    NoteInput,
    NoteUpdate
} from '../types/note.js'


type NoteParams = {
    id: number
}


type NoteListQuery = {
    search?: string
    topic?: string
}


// ---------- Schemas ----------


const noteSchema = {

    type: 'object',

    properties: {

        id: { type: 'integer' },

        title: { type: 'string' },

        body: { type: 'string' },

        topic: { type: 'string' },

        createdAt: {
            type: 'string',
            format: 'date-time'
        },

        imageName: {
            type: ['string', 'null']
        }

    },

    required: [
        'id',
        'title',
        'body',
        'topic',
        'createdAt',
        'imageName'
    ],

    additionalProperties: false

} as const


const noteEnvelopeSchema = {

    type: 'object',

    properties: {

        message: { type: 'string' },

        data: {

            type: 'object',

            properties: {

                note: noteSchema

            },

            required: ['note'],

            additionalProperties: false

        }

    },

    required: ['message', 'data'],

    additionalProperties: false

} as const


const noteListResponseSchema = {

    type: 'object',

    properties: {

        message: { type: 'string' },

        data: {

            type: 'object',

            properties: {

                notes: {
                    type: 'array',
                    items: noteSchema
                },

                total: { type: 'integer' }

            },

            required: ['notes', 'total'],

            additionalProperties: false

        }

    },

    required: ['message', 'data'],

    additionalProperties: false

} as const


const topicsResponseSchema = {

    type: 'object',

    properties: {

        message: { type: 'string' },

        data: {

            type: 'object',

            properties: {

                topics: {
                    type: 'array',
                    items: { type: 'string' }
                }

            },

            required: ['topics'],

            additionalProperties: false

        }

    },

    required: ['message', 'data'],

    additionalProperties: false

} as const


const noteIdParamsSchema = {

    type: 'object',

    properties: {

        id: {
            type: 'integer',
            minimum: 1,
            maximum: 2_147_483_647
        }

    },

    required: ['id'],

    additionalProperties: false

} as const


const noteListQuerySchema = {

    type: 'object',

    properties: {

        search: {
            type: 'string',
            maxLength: 100
        },

        topic: {
            type: 'string',
            maxLength: 60
        }

    },

    additionalProperties: false

} as const


const createNoteSchema = {

    type: 'object',

    required: ['title', 'body', 'topic'],

    properties: {

        title: {
            type: 'string',
            minLength: 1,
            maxLength: 120,
            pattern: '\\S'
        },

        body: {
            type: 'string',
            minLength: 1,
            maxLength: 2000,
            pattern: '\\S'
        },

        topic: {
            type: 'string',
            minLength: 1,
            maxLength: 60,
            pattern: '\\S'
        }

    },

    additionalProperties: false

} as const


const updateNoteSchema = {

    type: 'object',

    minProperties: 1,

    properties: {

        title: {
            type: 'string',
            minLength: 1,
            maxLength: 120,
            pattern: '\\S'
        },

        body: {
            type: 'string',
            minLength: 1,
            maxLength: 2000,
            pattern: '\\S'
        },

        topic: {
            type: 'string',
            minLength: 1,
            maxLength: 60,
            pattern: '\\S'
        }

    },

    additionalProperties: false

} as const


// ---------- Routes ----------


const noteRoutes: FastifyPluginAsync = async (fastify) => {


    // GET /api/notes — the list endpoint the dashboard loads first.
    // Search and topic filtering happen on the server via query strings.

    fastify.get<{ Querystring: NoteListQuery }>(
        '/notes',

        {

            schema: {

                querystring: noteListQuerySchema,

                response: {

                    200: noteListResponseSchema

                }

            },

            preValidation: async (request) => {

                if (typeof request.query.search === 'string') {
                    request.query.search = request.query.search.trim()
                }

                if (typeof request.query.topic === 'string') {
                    request.query.topic = request.query.topic.trim()
                }

            }

        },

        async (request) => {

            const notes = listNotes({
                search: request.query.search,
                topic: request.query.topic
            })

            return {

                message: 'Notes retrieved successfully.',

                data: {

                    notes,

                    total: notes.length

                }

            }

        }
    )


    // GET /api/meta/topics — used to populate the filter and form suggestions.

    fastify.get(
        '/meta/topics',

        {

            schema: {

                response: {

                    200: topicsResponseSchema

                }

            }

        },

        async () => {

            return {

                message: 'Topics retrieved successfully.',

                data: {

                    topics: listTopics()

                }

            }

        }
    )


    // GET /api/notes/:id — one note, used when a card is selected for editing.

    fastify.get<{ Params: NoteParams }>(
        '/notes/:id',

        {

            schema: {

                params: noteIdParamsSchema,

                response: {

                    200: noteEnvelopeSchema

                }

            }

        },

        async (request) => {

            const note = getNote(request.params.id)

            if (!note) {
                throw notFound('Note not found.')
            }

            return {

                message: 'Note retrieved successfully.',

                data: { note }

            }

        }
    )


    // POST /api/notes — create a note from JSON sent by Fetch.

    fastify.post<{ Body: NoteInput }>(
        '/notes',

        {

            schema: {

                body: createNoteSchema,

                response: {

                    201: noteEnvelopeSchema

                }

            },

            preValidation: async (request) => {

                const body = request.body

                if (typeof body?.title === 'string') {
                    body.title = body.title.trim()
                }

                if (typeof body?.body === 'string') {
                    body.body = body.body.trim()
                }

                if (typeof body?.topic === 'string') {
                    body.topic = body.topic.trim()
                }

            }

        },

        async (request, reply) => {

            const note = createNote(request.body)

            return reply.code(201).send({

                message: 'Note created successfully.',

                data: { note }

            })

        }
    )


    // PATCH /api/notes/:id — partial update of an existing note.

    fastify.patch<{
        Params: NoteParams
        Body: NoteUpdate
    }>(
        '/notes/:id',

        {

            schema: {

                params: noteIdParamsSchema,

                body: updateNoteSchema,

                response: {

                    200: noteEnvelopeSchema

                }

            },

            preValidation: async (request) => {

                const body = request.body

                if (typeof body?.title === 'string') {
                    body.title = body.title.trim()
                }

                if (typeof body?.body === 'string') {
                    body.body = body.body.trim()
                }

                if (typeof body?.topic === 'string') {
                    body.topic = body.topic.trim()
                }

            }

        },

        async (request) => {

            const note = updateNote(
                request.params.id,
                request.body
            )

            if (!note) {
                throw notFound('Note not found.')
            }

            return {

                message: 'Note updated successfully.',

                data: { note }

            }

        }
    )


    // DELETE /api/notes/:id — returns 204, which the api helper turns into null.

    fastify.delete<{ Params: NoteParams }>(
        '/notes/:id',

        {

            schema: {

                params: noteIdParamsSchema

            }

        },

        async (request, reply) => {

            const note = getNote(request.params.id)

            if (!note) {
                throw notFound('Note not found.')
            }

            deleteNote(request.params.id)

            await removeImage(note.imageName)

            return reply.code(204).send()

        }
    )


    // POST /api/notes/:id/image — multipart upload via FormData.
    // The browser sets the Content-Type and boundary; we never do it ourselves.

    fastify.post<{ Params: NoteParams }>(
        '/notes/:id/image',

        {

            schema: {

                params: noteIdParamsSchema,

                response: {

                    201: noteEnvelopeSchema

                }

            }

        },

        async (request, reply) => {

            if (!request.isMultipart()) {
                throw new ApiError(
                    'Expected multipart/form-data.',
                    415
                )
            }

            const part = await request.file({
                throwFileSizeLimit: false
            })

            if (!part) {
                throw new ApiError(
                    'No image was provided.',
                    400
                )
            }


            // Check the note before reading the file contents. If the note is
            // missing, drain the stream so the parser can finish cleanly.

            const existingNote = getNote(request.params.id)

            if (!existingNote) {

                await drainFileStream(part.file)

                throw notFound('Note not found.')

            }


            const image = await storeImage({

                fieldName: part.fieldname,

                originalFilename: part.filename,

                declaredMimeType: part.mimetype,

                stream: part.file,

                truncated: part.file.truncated

            })

            const updatedNote = setNoteImage(
                request.params.id,
                image.storageName
            )


            // Replacing an image removes the previous private file.

            await removeImage(existingNote.imageName)


            return reply.code(201).send({

                message: 'Image uploaded successfully.',

                data: {
                    note: updatedNote!
                }

            })

        }
    )


    // GET /api/notes/:id/image — stream a stored image for the <img> preview.
    // The path comes from the note record, never from a client-supplied name.

    fastify.get<{ Params: NoteParams }>(
        '/notes/:id/image',

        {

            schema: {

                params: noteIdParamsSchema

            }

        },

        async (request, reply) => {

            const note = getNote(request.params.id)

            if (!note || !note.imageName) {
                throw notFound('Image not found.')
            }

            const filePath = imagePathFor(note.imageName)


            let handle

            try {
                handle = await open(filePath, 'r')
            } catch (error) {

                if (
                    typeof error === 'object' &&
                    error !== null &&
                    'code' in error &&
                    error.code === 'ENOENT'
                ) {
                    throw notFound('Image content not found.')
                }

                throw error

            }


            const extension = extname(
                note.imageName
            )
                .toLowerCase()
                .slice(1)

            const mimeType =
                MIME_BY_EXTENSION[extension] ??
                'application/octet-stream'


            return reply
                .header('Content-Type', mimeType)
                .header('X-Content-Type-Options', 'nosniff')
                .header('Cache-Control', 'private, no-store')
                .header(
                    'Content-Disposition',
                    `inline; filename="note-${note.id}.${extension}"`
                )
                .send(
                    handle.createReadStream({
                        autoClose: true
                    })
                )

        }
    )

}


export default noteRoutes
