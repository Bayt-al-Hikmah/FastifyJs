import type { FastifyPluginAsync } from 'fastify'

import {
    getUploadStats,
    listUploads,
    toUploadView
} from '../lib/upload-store.js'

const pagesRoutes: FastifyPluginAsync = async (fastify) => {
    fastify.get('/', async (_request, reply) => {
        const uploads = listUploads().map(toUploadView)
        const stats = getUploadStats()

        return reply.viewAsync('index', {
            title: 'Stream Lab',
            description:
                'A streaming upload lab with byte metering, SHA-256 checksums, and live browser progress.',
            uploads,
            stats,
            isHome: true
        })
    })
}

export default pagesRoutes
