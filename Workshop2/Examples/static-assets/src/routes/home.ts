import type { FastifyPluginAsync } from 'fastify'

type Project = {
    name: string
    category: string
    summary: string
    year: string
    tone: string
}

const projects: Project[] = [
    {
        name: 'Harbour Identity',
        category: 'Brand system',
        summary: 'A quiet visual language for a coastal research institute.',
        year: '2026',
        tone: 'seafoam'
    },
    {
        name: 'Loom Reader',
        category: 'Product design',
        summary: 'A reading interface that remembers where attention tends to drift.',
        year: '2025',
        tone: 'clay'
    },
    {
        name: 'Common Room',
        category: 'Editorial',
        summary: 'A printed quarterly about the places people return to.',
        year: '2025',
        tone: 'ink'
    }
]

const homeRoutes: FastifyPluginAsync = async (fastify) => {
    fastify.get('/', async (_request, reply) => {
        return reply.viewAsync('index', {
            title: 'Paper & Pixel',
            description: 'A small design studio page demonstrating static assets in Fastify.',
            projects,
            isHome: true
        })
    })
}

export default homeRoutes
