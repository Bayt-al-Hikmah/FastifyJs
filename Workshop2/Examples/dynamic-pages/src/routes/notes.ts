import type { FastifyPluginAsync } from 'fastify'

import { findNote, toNoteView } from '../data/notes.js'

const noteRoutes: FastifyPluginAsync = async (fastify) => {
    fastify.get<{
        Params: {
            noteId: string
        }
    }>(
        '/notes/:noteId',
        {
            schema: {
                params: {
                    type: 'object',
                    properties: {
                        noteId: {
                            type: 'string',
                            minLength: 1,
                            maxLength: 80
                        }
                    },
                    required: ['noteId'],
                    additionalProperties: false
                }
            }
        },
        async (request, reply) => {
            const note = findNote(request.params.noteId)

            if (!note) {
                return reply.code(404).viewAsync('not-found', {
                    title: 'Note not found',
                    description: 'The requested note does not exist.',
                    message: 'That note is not in this notebook.',
                    isHome: false
                })
            }

            return reply.viewAsync('note', {
                title: note.title,
                description: note.excerpt,
                note: toNoteView(note),
                isHome: false
            })
        }
    )
}

export default noteRoutes
