import type { FastifyPluginAsync } from 'fastify'

import { getAllNotes, getTopics, toNoteView } from '../data/notes.js'

const homeRoutes: FastifyPluginAsync = async (fastify) => {
    fastify.get('/', async (_request, reply) => {
        const notes = getAllNotes()
        const [featuredNote, ...otherNotes] = notes
        const topics = getTopics()

        const totalMinutes = notes.reduce(
            (total, note) => total + note.readMinutes,
            0
        )

        return reply.viewAsync('index', {
            title: 'Field Notes',
            description: 'A small library of notes on design, engineering, and the craft of paying attention.',
            featuredNote: featuredNote ? toNoteView(featuredNote) : undefined,
            notes: otherNotes.map(toNoteView),
            topics,
            totalNotes: notes.length,
            totalMinutes,
            isHome: true
        })
    })

    fastify.get('/about', async (_request, reply) => {
        return reply.viewAsync('about', {
            title: 'About',
            description: 'Why this small Field Notes demo exists and which Handlebars features it demonstrates.',
            isAbout: true
        })
    })
}

export default homeRoutes
