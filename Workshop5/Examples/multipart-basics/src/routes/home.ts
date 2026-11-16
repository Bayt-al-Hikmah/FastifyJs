import type { FastifyPluginAsync } from 'fastify'

import {
    getUploadStats,
    listFiles,
    toFileView
} from '../lib/upload-store.js'

import { UPLOAD_ERROR_MESSAGES } from '../lib/upload-errors.js'

type HomeQuery = {
    notice?: string
    error?: string
}

const homeRoutes: FastifyPluginAsync = async (fastify) => {
    fastify.get<{ Querystring: HomeQuery }>(
        '/',
        async (request, reply) => {
            const files = listFiles().map(toFileView)
            const stats = getUploadStats()

            let noticeMessage: string | undefined
            let errorMessage: string | undefined

            if (request.query.notice === 'uploaded') {
                noticeMessage = 'File uploaded and verified successfully.'
            }

            if (request.query.notice === 'deleted') {
                noticeMessage = 'File removed from the cabinet.'
            }

            if (
                typeof request.query.error === 'string' &&
                request.query.error in UPLOAD_ERROR_MESSAGES
            ) {
                errorMessage =
                    UPLOAD_ERROR_MESSAGES[
                        request.query.error as keyof typeof UPLOAD_ERROR_MESSAGES
                    ]
            }

            return reply.viewAsync('index', {
                title: 'File Cabinet',
                description:
                    'A small, careful single-file upload example built with Fastify and @fastify/multipart.',
                files,
                stats,
                noticeMessage,
                errorMessage,
                isHome: true
            })
        }
    )
}

export default homeRoutes
