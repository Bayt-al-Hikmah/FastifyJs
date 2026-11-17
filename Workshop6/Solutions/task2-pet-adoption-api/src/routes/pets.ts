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
    serializePet
} from '../lib/serializers.js'

import {
    createPetBodySchema,
    petIdParamsSchema,
    petListQuerySchema,
    updatePetBodySchema
} from '../schemas/pet.js'

import type { AuthenticatedUser } from '../types/auth.js'


type Species = 'DOG' | 'CAT' | 'RABBIT' | 'OTHER'

type PetStatusValue = 'AVAILABLE' | 'ADOPTED' | 'PENDING'


type PetIdParams = {
    id: number
}

type PetListQuery = {
    page?: number
    limit?: number
    search?: string
    species?: Species
    status?: PetStatusValue
}

type CreatePetBody = {
    name: string
    species?: Species
    age?: number
    description?: string
    status?: PetStatusValue
}

type UpdatePetBody = {
    name?: string
    species?: Species
    age?: number
    description?: string | null
    status?: PetStatusValue
}


/**
 * Only STAFF accounts reach the mutation routes. The shelterId filter is
 * always part of the Prisma condition, so a staff member cannot change a pet
 * listed by a colleague by guessing its id.
 */
function ownershipWhere(
    user: AuthenticatedUser,
    id: number
): Prisma.PetWhereInput {

    return {

        id,

        ...(user.role === 'STAFF'
            ? { shelterId: user.id }
            : {})

    }

}


const petRoutes: FastifyPluginAsync = async (fastify) => {

    /**
     * Public adoption gallery: search by name, filter by species and status,
     * and paginate the result set. Only metadata is returned here.
     */
    fastify.get<{ Querystring: PetListQuery }>(
        '/pets',

        {
            schema: {
                querystring: petListQuerySchema
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

            const { search, species, status } = request.query


            const where: Prisma.PetWhereInput = {

                ...(search
                    ? {
                        name: {
                            contains: search,
                            mode: 'insensitive' as const
                        }
                    }
                    : {}),

                ...(species ? { species } : {}),

                ...(status ? { status } : {})

            }


            const [records, total] = await Promise.all([

                fastify.prisma.pet.findMany({

                    where,

                    include: {
                        shelter: {
                            select: {
                                id: true,
                                name: true
                            }
                        }
                    },

                    orderBy: {
                        dateAdded: 'desc'
                    },

                    skip: (page - 1) * limit,

                    take: limit

                }),

                fastify.prisma.pet.count({
                    where
                })

            ])


            return reply.code(200).send({

                message: 'Pets retrieved successfully.',

                data: {

                    pets: records.map(serializePet),

                    pagination: buildPagination(page, limit, total)

                }

            })

        }
    )


    /**
     * Public single-pet detail. A missing id deliberately returns 404, just
     * like a pet that is outside the visible collection.
     */
    fastify.get<{ Params: PetIdParams }>(
        '/pets/:id',

        {
            schema: {
                params: petIdParamsSchema
            }

        },

        async (request, reply) => {

            const record = await fastify.prisma.pet.findFirst({

                where: {
                    id: request.params.id
                },

                include: {
                    shelter: {
                        select: {
                            id: true,
                            name: true
                        }
                    }
                }

            })


            if (!record) {

                return reply.code(404).send({
                    message: 'That pet was not found.'
                })

            }


            return reply.code(200).send({

                message: 'Pet retrieved successfully.',

                data: {
                    pet: serializePet(record)
                }

            })

        }
    )


    /**
     * STAFF-only creation. The shelter id comes from the verified token, so a
     * client cannot assign a listing to another staff account.
     */
    fastify.post<{ Body: CreatePetBody }>(
        '/pets',

        {
            preHandler: [
                fastify.authenticate,
                fastify.authorize('STAFF')
            ],

            schema: {
                body: createPetBodySchema
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


            const record = await fastify.prisma.pet.create({

                data: {

                    name: body.name,

                    species: body.species ?? 'OTHER',

                    age: body.age ?? 0,

                    description: body.description || null,

                    status: body.status ?? 'AVAILABLE',

                    shelterId: user.id

                },

                include: {
                    shelter: {
                        select: {
                            id: true,
                            name: true
                        }
                    }
                }

            })


            return reply.code(201).send({

                message: 'Pet listed successfully.',

                data: {
                    pet: serializePet(record)
                }

            })

        }
    )


    /**
     * PATCH allows partial updates. The body schema has minProperties: 1 and
     * forbids extra fields such as shelterId or internal timestamps.
     */
    fastify.patch<{
        Params: PetIdParams
        Body: UpdatePetBody
    }>(
        '/pets/:id',

        {
            preHandler: [
                fastify.authenticate,
                fastify.authorize('STAFF')
            ],

            schema: {
                params: petIdParamsSchema,
                body: updatePetBodySchema
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


            const existing = await fastify.prisma.pet.findFirst({

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
                    message: 'That pet was not found.'
                })

            }


            const body = request.body

            const data: Prisma.PetUncheckedUpdateInput = {}


            if (body.name !== undefined) {
                data.name = body.name
            }

            if (body.species !== undefined) {
                data.species = body.species
            }

            if (body.age !== undefined) {
                data.age = body.age
            }

            if (body.description !== undefined) {
                data.description = body.description
            }

            if (body.status !== undefined) {
                data.status = body.status
            }


            const record = await fastify.prisma.pet.update({

                where: {
                    id: existing.id
                },

                data,

                include: {
                    shelter: {
                        select: {
                            id: true,
                            name: true
                        }
                    }
                }

            })


            return reply.code(200).send({

                message: 'Pet updated successfully.',

                data: {
                    pet: serializePet(record)
                }

            })

        }
    )


    /**
     * DELETE removes the database row and its private image object. The
     * ownership filter is part of the delete condition itself, so a guessed
     * id belonging to another staff member can never remove their listing.
     */
    fastify.delete<{ Params: PetIdParams }>(
        '/pets/:id',

        {
            preHandler: [
                fastify.authenticate,
                fastify.authorize('STAFF')
            ],

            schema: {
                params: petIdParamsSchema
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


            const existing = await fastify.prisma.pet.findFirst({

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
                    message: 'That pet was not found.'
                })

            }


            const result = await fastify.prisma.pet.deleteMany({

                where: ownershipWhere(
                    user,
                    request.params.id
                )

            })


            if (result.count === 0) {

                return reply.code(404).send({
                    message: 'That pet was not found.'
                })

            }


            if (existing.imageStorageKey) {

                try {

                    await deleteImageObject(existing.imageStorageKey)

                } catch (error) {

                    request.log.error(
                        error,
                        'Could not remove image object after pet deletion'
                    )

                }

            }


            return reply.code(204).send()

        }
    )


    /**
     * Upload or replace a photo. Ownership is checked before any multipart
     * bytes are read, so an unauthorised caller cannot make the server store
     * files for a listing they do not control.
     */
    fastify.put<{ Params: PetIdParams }>(
        '/pets/:id/image',

        {
            preHandler: [
                fastify.authenticate,
                fastify.authorize('STAFF')
            ],

            schema: {
                params: petIdParamsSchema
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

            const petId = request.params.id


            const existing = await fastify.prisma.pet.findFirst({

                where: ownershipWhere(
                    user,
                    petId
                ),

                select: {
                    id: true,
                    imageStorageKey: true
                }

            })


            if (!existing) {

                return reply.code(404).send({
                    message: 'That pet was not found.'
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

                record = await fastify.prisma.pet.update({

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
                        shelter: {
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
                    pet: serializePet(record)
                }

            })

        }
    )


    /**
     * Remove only the image metadata and private object, leaving the listing.
     */
    fastify.delete<{ Params: PetIdParams }>(
        '/pets/:id/image',

        {
            preHandler: [
                fastify.authenticate,
                fastify.authorize('STAFF')
            ],

            schema: {
                params: petIdParamsSchema
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


            const existing = await fastify.prisma.pet.findFirst({

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
                    message: 'That pet was not found.'
                })

            }


            if (!existing.imageStorageKey) {

                return reply.code(404).send({
                    message: 'That pet does not have an image.'
                })

            }


            await fastify.prisma.pet.update({

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
    fastify.get<{ Params: PetIdParams }>(
        '/pets/:id/image',

        {
            preHandler: [
                fastify.authenticate
            ],

            schema: {
                params: petIdParamsSchema
            }

        },

        async (request, reply) => {

            const record = await fastify.prisma.pet.findFirst({

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
                record.imageSize === null
            ) {

                return reply.code(404).send({
                    message: 'This pet does not have an image.'
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
                    `attachment; filename="pet-${record.id}.${extension}"`
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


export default petRoutes
