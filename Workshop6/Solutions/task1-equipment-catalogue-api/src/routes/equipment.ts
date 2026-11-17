import type { FastifyPluginAsync } from 'fastify'

import { open } from 'node:fs/promises'

import { join } from 'node:path'

import type { Prisma } from '../generated/prisma/client.js'

import { OBJECTS_DIR, STORAGE_KEY_PATTERN } from '../config/storage.js'

import { IMAGE_EXTENSIONS_BY_MIME } from '../config/uploads.js'

import { ApiError } from '../lib/api-error.js'

import {
    deleteImageObject,
    drainFileStream,
    receiveImage
} from '../lib/image-storage.js'

import { buildPagination } from '../lib/pagination.js'

import {
    serializeEquipment
} from '../lib/serializers.js'

import {
    createEquipmentBodySchema,
    equipmentIdParamsSchema,
    equipmentListQuerySchema,
    updateEquipmentBodySchema
} from '../schemas/equipment.js'

import type { AuthenticatedUser } from '../types/auth.js'


type Category =
    | 'TOOLS'
    | 'ELECTRONICS'
    | 'FURNITURE'
    | 'SPORTS'
    | 'CAMPING'
    | 'OTHER'

type AvailabilityValue = 'AVAILABLE' | 'ON_LOAN' | 'MAINTENANCE'


type EquipmentIdParams = {
    id: number
}

type EquipmentListQuery = {
    page?: number
    limit?: number
    search?: string
    category?: Category
    availability?: AvailabilityValue
}

type CreateEquipmentBody = {
    name: string
    description?: string
    category?: Category
    availability?: AvailabilityValue
    quantity?: number
}

type UpdateEquipmentBody = {
    name?: string
    description?: string | null
    category?: Category
    availability?: AvailabilityValue
    quantity?: number
}


/**
 * Ownership is always derived from the verified token. ADMIN accounts may
 * manage every record; USER accounts only see their own rows in mutations.
 */
function ownershipWhere(
    user: AuthenticatedUser,
    id: number
): Prisma.EquipmentWhereInput {

    return {

        id,

        ...(user.role === 'ADMIN'
            ? {}
            : { ownerId: user.id })

    }

}


const equipmentRoutes: FastifyPluginAsync = async (fastify) => {

    /**
     * Public catalogue collection: search by name, filter by category and
     * availability, and paginate the result set.
     */
    fastify.get<{ Querystring: EquipmentListQuery }>(
        '/equipment',

        {
            schema: {
                querystring: equipmentListQuerySchema
            },

            preValidation: async (request) => {

                const query = request.query

                if (typeof query.search === 'string') {
                    query.search = query.search.trim()
                }

            }

        },

        async (request, reply) => {

            const page = request.query.page ?? 1

            const limit = request.query.limit ?? 12

            const { search, category, availability } = request.query


            const where: Prisma.EquipmentWhereInput = {

                ...(search
                    ? {
                        name: {
                            contains: search,
                            mode: 'insensitive' as const
                        }
                    }
                    : {}),

                ...(category ? { category } : {}),

                ...(availability ? { availability } : {})

            }


            const [records, total] = await Promise.all([

                fastify.prisma.equipment.findMany({

                    where,

                    include: {
                        owner: {
                            select: {
                                id: true,
                                name: true
                            }
                        }
                    },

                    orderBy: {
                        createdAt: 'desc'
                    },

                    skip: (page - 1) * limit,

                    take: limit

                }),

                fastify.prisma.equipment.count({
                    where
                })

            ])


            return reply.code(200).send({

                message: 'Equipment retrieved successfully.',

                data: {

                    equipment: records.map(serializeEquipment),

                    pagination: buildPagination(page, limit, total)

                }

            })

        }
    )


    /**
     * Public single-item detail. Only metadata is returned; the image itself
     * is downloaded through an authenticated route.
     */
    fastify.get<{ Params: EquipmentIdParams }>(
        '/equipment/:id',

        {
            schema: {
                params: equipmentIdParamsSchema
            }

        },

        async (request, reply) => {

            const record = await fastify.prisma.equipment.findFirst({

                where: {
                    id: request.params.id
                },

                include: {
                    owner: {
                        select: {
                            id: true,
                            name: true
                        }
                    }
                }

            })


            if (!record) {

                return reply.code(404).send({
                    message: 'That equipment item was not found.'
                })

            }


            return reply.code(200).send({

                message: 'Equipment retrieved successfully.',

                data: {
                    equipment: serializeEquipment(record)
                }

            })

        }
    )


    /**
     * Any authenticated user may add an item to the catalogue. The owner is
     * taken from the token, so a client cannot assign ownership to someone else.
     */
    fastify.post<{ Body: CreateEquipmentBody }>(
        '/equipment',

        {
            preHandler: [
                fastify.authenticate
            ],

            schema: {
                body: createEquipmentBodySchema
            },

            config: {
                rateLimit: {
                    max: 60,
                    timeWindow: '1 hour'
                }
            },

            preValidation: async (request) => {

                const body = request.body

                if (typeof body?.name === 'string') {
                    body.name = body.name.trim()
                }

                if (typeof body?.description === 'string') {
                    body.description = body.description.trim()
                }

            }

        },

        async (request, reply) => {

            const user = request.currentUser!

            const body = request.body


            const record = await fastify.prisma.equipment.create({

                data: {

                    name: body.name,

                    description: body.description || null,

                    category: body.category ?? 'OTHER',

                    availability: body.availability ?? 'AVAILABLE',

                    quantity: body.quantity ?? 1,

                    ownerId: user.id

                },

                include: {
                    owner: {
                        select: {
                            id: true,
                            name: true
                        }
                    }
                }

            })


            return reply.code(201).send({

                message: 'Equipment created successfully.',

                data: {
                    equipment: serializeEquipment(record)
                }

            })

        }
    )


    /**
     * PATCH allows partial updates. The body schema has minProperties: 1 and
     * forbids extra fields such as ownerId, quantity overrides by another
     * user, or internal timestamps.
     */
    fastify.patch<{
        Params: EquipmentIdParams
        Body: UpdateEquipmentBody
    }>(
        '/equipment/:id',

        {
            preHandler: [
                fastify.authenticate
            ],

            schema: {
                params: equipmentIdParamsSchema,
                body: updateEquipmentBodySchema
            },

            config: {
                rateLimit: {
                    max: 60,
                    timeWindow: '1 hour'
                }
            },

            preValidation: async (request) => {

                const body = request.body

                if (typeof body?.name === 'string') {
                    body.name = body.name.trim()
                }

                if (typeof body?.description === 'string') {
                    body.description = body.description.trim()
                }

            }

        },

        async (request, reply) => {

            const user = request.currentUser!

            const existing = await fastify.prisma.equipment.findFirst({

                where: ownershipWhere(
                    user,
                    request.params.id
                ),

                select: {
                    id: true
                }

            })


            if (!existing) {

                return reply.code(404).send({
                    message: 'That equipment item was not found.'
                })

            }


            const body = request.body

            const data: Prisma.EquipmentUncheckedUpdateInput = {}


            if (body.name !== undefined) {
                data.name = body.name
            }

            if (body.description !== undefined) {
                data.description = body.description
            }

            if (body.category !== undefined) {
                data.category = body.category
            }

            if (body.availability !== undefined) {
                data.availability = body.availability
            }

            if (body.quantity !== undefined) {
                data.quantity = body.quantity
            }


            const record = await fastify.prisma.equipment.update({

                where: {
                    id: existing.id
                },

                data,

                include: {
                    owner: {
                        select: {
                            id: true,
                            name: true
                        }
                    }
                }

            })


            return reply.code(200).send({

                message: 'Equipment updated successfully.',

                data: {
                    equipment: serializeEquipment(record)
                }

            })

        }
    )


    /**
     * DELETE removes the database row and its private image object. The
     * ownership filter is part of the delete condition itself, so a guessed
     * id belonging to another user can never remove their record.
     */
    fastify.delete<{ Params: EquipmentIdParams }>(
        '/equipment/:id',

        {
            preHandler: [
                fastify.authenticate
            ],

            schema: {
                params: equipmentIdParamsSchema
            },

            config: {
                rateLimit: {
                    max: 60,
                    timeWindow: '1 hour'
                }
            }

        },

        async (request, reply) => {

            const user = request.currentUser!


            const existing = await fastify.prisma.equipment.findFirst({

                where: ownershipWhere(
                    user,
                    request.params.id
                ),

                select: {
                    id: true,
                    imageStorageKey: true
                }

            })


            if (!existing) {

                return reply.code(404).send({
                    message: 'That equipment item was not found.'
                })

            }


            const result = await fastify.prisma.equipment.deleteMany({

                where: ownershipWhere(
                    user,
                    request.params.id
                )

            })


            if (result.count === 0) {

                return reply.code(404).send({
                    message: 'That equipment item was not found.'
                })

            }


            if (existing.imageStorageKey) {

                try {

                    await deleteImageObject(existing.imageStorageKey)

                } catch (error) {

                    request.log.error(
                        error,
                        'Could not remove image object after equipment deletion'
                    )

                }

            }


            return reply.code(204).send()

        }
    )


    /**
     * Upload or replace an image. Ownership is checked before any multipart
     * bytes are read, so an unauthorised caller cannot make the server store
     * files for an item they do not control.
     */
    fastify.put<{ Params: EquipmentIdParams }>(
        '/equipment/:id/image',

        {
            preHandler: [
                fastify.authenticate
            ],

            schema: {
                params: equipmentIdParamsSchema
            },

            config: {
                rateLimit: {
                    max: 30,
                    timeWindow: '1 hour'
                }
            }

        },

        async (request, reply) => {

            const user = request.currentUser!

            const equipmentId = request.params.id


            const existing = await fastify.prisma.equipment.findFirst({

                where: ownershipWhere(
                    user,
                    equipmentId
                ),

                select: {
                    id: true,
                    imageStorageKey: true
                }

            })


            if (!existing) {

                return reply.code(404).send({
                    message: 'That equipment item was not found.'
                })

            }


            if (!request.isMultipart()) {

                throw new ApiError(
                    415,
                    'This endpoint expects multipart/form-data.'
                )

            }


            const part = await request.file({
                throwFileSizeLimit: false
            })


            if (!part) {

                throw new ApiError(
                    400,
                    'Select an image to upload.'
                )

            }


            if (part.fieldname !== 'file') {

                await drainFileStream(part.file)

                throw new ApiError(
                    400,
                    'The image field must be named "file".'
                )

            }


            const image = await receiveImage(part)


            let record


            try {

                record = await fastify.prisma.equipment.update({

                    where: {
                        id: existing.id
                    },

                    data: {

                        imageStorageKey: image.storageKey,

                        imageOriginalName: image.originalName,

                        imageMimeType: image.mimeType,

                        imageExtension: image.extension,

                        imageSize: image.size

                    },

                    include: {
                        owner: {
                            select: {
                                id: true,
                                name: true
                            }
                        }
                    }

                })

            } catch (error) {

                await deleteImageObject(image.storageKey)
                    .catch((cleanupError) => {
                        request.log.error(
                            cleanupError,
                            'Could not remove an image after a failed database update'
                        )
                    })

                throw error

            }


            if (existing.imageStorageKey) {

                try {

                    await deleteImageObject(existing.imageStorageKey)

                } catch (error) {

                    request.log.error(
                        error,
                        'Could not remove the previous image object'
                    )

                }

            }


            return reply.code(200).send({

                message: 'Image uploaded successfully.',

                data: {
                    equipment: serializeEquipment(record)
                }

            })

        }
    )


    /**
     * Remove only the image metadata and private object, leaving the item.
     */
    fastify.delete<{ Params: EquipmentIdParams }>(
        '/equipment/:id/image',

        {
            preHandler: [
                fastify.authenticate
            ],

            schema: {
                params: equipmentIdParamsSchema
            },

            config: {
                rateLimit: {
                    max: 30,
                    timeWindow: '1 hour'
                }
            }

        },

        async (request, reply) => {

            const user = request.currentUser!


            const existing = await fastify.prisma.equipment.findFirst({

                where: ownershipWhere(
                    user,
                    request.params.id
                ),

                select: {
                    id: true,
                    imageStorageKey: true
                }

            })


            if (!existing) {

                return reply.code(404).send({
                    message: 'That equipment item was not found.'
                })

            }


            if (!existing.imageStorageKey) {

                return reply.code(404).send({
                    message: 'That equipment item does not have an image.'
                })

            }


            await fastify.prisma.equipment.update({

                where: {
                    id: existing.id
                },

                data: {

                    imageStorageKey: null,

                    imageOriginalName: null,

                    imageMimeType: null,

                    imageExtension: null,

                    imageSize: null

                }

            })


            try {

                await deleteImageObject(existing.imageStorageKey)

            } catch (error) {

                request.log.error(
                    error,
                    'Could not remove the image object'
                )

            }


            return reply.code(204).send()

        }
    )


    /**
     * Authenticated streaming download. The storage name comes only from
     * PostgreSQL; no filesystem path is accepted from the URL.
     */
    fastify.get<{ Params: EquipmentIdParams }>(
        '/equipment/:id/image',

        {
            preHandler: [
                fastify.authenticate
            ],

            schema: {
                params: equipmentIdParamsSchema
            }

        },

        async (request, reply) => {

            const record = await fastify.prisma.equipment.findFirst({

                where: {
                    id: request.params.id
                },

                select: {
                    id: true,
                    imageStorageKey: true,
                    imageMimeType: true,
                    imageExtension: true,
                    imageSize: true
                }

            })


            if (
                !record ||
                !record.imageStorageKey ||
                !record.imageMimeType ||
                !record.imageSize
            ) {

                return reply.code(404).send({
                    message: 'This item does not have an image.'
                })

            }


            if (!STORAGE_KEY_PATTERN.test(record.imageStorageKey)) {

                throw new ApiError(
                    500,
                    'The image could not be resolved safely.'
                )

            }


            if (!IMAGE_EXTENSIONS_BY_MIME.has(record.imageMimeType)) {

                throw new ApiError(
                    500,
                    'The image has an unsupported content type.'
                )

            }


            let handle


            try {

                handle = await open(
                    join(OBJECTS_DIR, record.imageStorageKey),
                    'r'
                )

            } catch (error) {

                const code = (
                    error as NodeJS.ErrnoException
                ).code


                if (code === 'ENOENT') {

                    return reply.code(404).send({
                        message: 'The image content was not found.'
                    })

                }

                throw error

            }


            const extension = record.imageExtension ?? 'img'


            return reply
                .header('Content-Type', record.imageMimeType)
                .header(
                    'Content-Disposition',
                    `attachment; filename="equipment-${record.id}.${extension}"`
                )
                .header('X-Content-Type-Options', 'nosniff')
                .header('Cache-Control', 'private, no-store')
                .header('Content-Length', String(record.imageSize))
                .send(
                    handle.createReadStream({
                        autoClose: true
                    })
                )

        }
    )


}


export default equipmentRoutes
