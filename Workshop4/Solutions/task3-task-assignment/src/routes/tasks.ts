import type { FastifyPluginAsync } from 'fastify'


type CreateTaskBody = {
    title: string
    description?: string
}

type UpdateTaskBody = {
    title?: string
    description?: string | null
    status?: 'TODO' | 'IN_PROGRESS' | 'DONE'
}

type AssignTaskBody = {
    assigneeId: number
}

type TaskListQuery = {
    page?: number
    limit?: number
}


const taskResponseSchema = {

    type: 'object',

    properties: {

        id: { type: 'integer' },

        title: { type: 'string' },

        description: { type: ['string', 'null'] },

        status: {
            type: 'string',
            enum: ['TODO', 'IN_PROGRESS', 'DONE']
        },

        createdById: { type: 'integer' },

        assigneeId: { type: ['integer', 'null'] },

        createdAt: {
            type: 'string',
            format: 'date-time'
        },

        updatedAt: {
            type: 'string',
            format: 'date-time'
        }

    },

    required: [
        'id',
        'title',
        'description',
        'status',
        'createdById',
        'assigneeId',
        'createdAt',
        'updatedAt'
    ],

    additionalProperties: false

} as const


const createTaskSchema = {

    type: 'object',

    required: ['title'],

    properties: {

        title: {
            type: 'string',
            minLength: 1,
            maxLength: 120,
            pattern: '\\S'
        },

        description: {
            type: 'string',
            maxLength: 1000
        }

    },

    additionalProperties: false

} as const


const updateTaskSchema = {

    type: 'object',

    minProperties: 1,

    properties: {

        title: {
            type: 'string',
            minLength: 1,
            maxLength: 120,
            pattern: '\\S'
        },

        description: {
            type: ['string', 'null'],
            maxLength: 1000
        },

        status: {
            type: 'string',
            enum: ['TODO', 'IN_PROGRESS', 'DONE']
        }

    },

    additionalProperties: false

} as const


const assignTaskSchema = {

    type: 'object',

    required: ['assigneeId'],

    properties: {

        assigneeId: {
            type: 'integer',
            minimum: 1,
            maximum: 2_147_483_647
        }

    },

    // createdById and every other field are rejected.
    // Assignment can only change assigneeId.

    additionalProperties: false

} as const


const taskIdSchema = {

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


const taskListQuerySchema = {

    type: 'object',

    properties: {

        page: {
            type: 'integer',
            minimum: 1,
            maximum: 1_000_000,
            default: 1
        },

        limit: {
            type: 'integer',
            minimum: 1,
            maximum: 100,
            default: 20
        }

    },

    additionalProperties: false

} as const


const adminUserSchema = {

    type: 'object',

    properties: {

        id: { type: 'integer' },

        name: { type: 'string' },

        email: { type: 'string' },

        role: {
            type: 'string',
            enum: ['USER', 'MANAGER', 'ADMIN']
        },

        createdAt: {
            type: 'string',
            format: 'date-time'
        }

    },

    required: [
        'id',
        'name',
        'email',
        'role',
        'createdAt'
    ],

    additionalProperties: false

} as const


const taskRoutes: FastifyPluginAsync = async (fastify) => {

    const canManageAllTasks = (role: string): boolean => {

        return role === 'MANAGER' || role === 'ADMIN'

    }


    fastify.get<{ Querystring: TaskListQuery }>(
        '/tasks',

        {

            preHandler: [
                fastify.authenticate
            ],

            schema: {

                querystring: taskListQuerySchema,

                response: {

                    200: {

                        type: 'object',

                        properties: {

                            data: {
                                type: 'array',
                                items: taskResponseSchema
                            },

                            pagination: {

                                type: 'object',

                                properties: {

                                    page: { type: 'integer' },

                                    limit: { type: 'integer' },

                                    total: { type: 'integer' },

                                    totalPages: { type: 'integer' }

                                },

                                required: [
                                    'page',
                                    'limit',
                                    'total',
                                    'totalPages'
                                ],

                                additionalProperties: false

                            }

                        },

                        required: ['data', 'pagination'],

                        additionalProperties: false

                    }

                }

            }

        },

        async (request) => {

            const user = request.currentUser!

            const page = request.query.page ?? 1

            const limit = request.query.limit ?? 20

            // Regular users see tasks they created or tasks assigned
            // to them. Managers and administrators see all tasks.

            const where = canManageAllTasks(user.role)
                ? {}
                : {
                    OR: [
                        { createdById: user.id },
                        { assigneeId: user.id }
                    ]
                }


            const [tasks, total] = await Promise.all([

                fastify.prisma.task.findMany({

                    where,

                    orderBy: {
                        createdAt: 'desc'
                    },

                    skip: (page - 1) * limit,

                    take: limit

                }),

                fastify.prisma.task.count({
                    where
                })

            ])


            return {

                data: tasks,

                pagination: {

                    page,

                    limit,

                    total,

                    totalPages: Math.ceil(total / limit)

                }

            }

        }
    )


    fastify.post<{ Body: CreateTaskBody }>(
        '/tasks',

        {

            preHandler: [
                fastify.authenticate
            ],

            schema: {

                body: createTaskSchema,

                response: {

                    201: taskResponseSchema

                }

            },

            preValidation: async (request) => {

                const body = request.body

                if (typeof body?.title === 'string') {
                    body.title = body.title.trim()
                }

                if (typeof body?.description === 'string') {
                    body.description = body.description.trim()
                }

            }

        },

        async (request, reply) => {

            const user = request.currentUser!

            const task = await fastify.prisma.task.create({

                data: {

                    title: request.body.title,

                    description: request.body.description || null,

                    // The creator always comes from the token.
                    // Assignment is a separate, authorized operation.

                    createdById: user.id

                }

            })

            return reply.code(201).send(task)

        }
    )


    fastify.get<{ Params: { id: number } }>(
        '/tasks/:id',

        {

            preHandler: [
                fastify.authenticate
            ],

            schema: {

                params: taskIdSchema,

                response: {

                    200: taskResponseSchema

                }

            }

        },

        async (request, reply) => {

            const user = request.currentUser!

            const task = await fastify.prisma.task.findFirst({

                where: {

                    id: request.params.id,

                    ...(canManageAllTasks(user.role)
                        ? {}
                        : {
                            OR: [
                                { createdById: user.id },
                                { assigneeId: user.id }
                            ]
                        })

                }

            })


            if (!task) {

                return reply.code(404).send({
                    error: 'Task not found'
                })

            }

            return task

        }
    )


    fastify.patch<{
        Params: { id: number }
        Body: UpdateTaskBody
    }>(
        '/tasks/:id',

        {

            preHandler: [
                fastify.authenticate
            ],

            schema: {

                params: taskIdSchema,

                body: updateTaskSchema,

                response: {

                    200: taskResponseSchema

                }

            },

            preValidation: async (request) => {

                const body = request.body

                if (typeof body?.title === 'string') {
                    body.title = body.title.trim()
                }

                if (typeof body?.description === 'string') {
                    body.description = body.description.trim()
                }

            }

        },

        async (request, reply) => {

            const user = request.currentUser!

            const task = await fastify.prisma.task.findUnique({

                where: {
                    id: request.params.id
                },

                select: {
                    createdById: true,
                    assigneeId: true
                }

            })


            if (!task) {

                return reply.code(404).send({
                    error: 'Task not found'
                })

            }


            const canManageAll = canManageAllTasks(user.role)

            const isCreator = task.createdById === user.id

            const isAssignee = task.assigneeId === user.id


            // Do not reveal that a task exists when the caller has no
            // relationship with it.

            if (!canManageAll && !isCreator && !isAssignee) {

                return reply.code(404).send({
                    error: 'Task not found'
                })

            }


            // An assignee who did not create the task may only update
            // its status. Title and description remain creator-owned.

            if (!canManageAll && !isCreator && isAssignee) {

                const hasNonStatusField = Object
                    .keys(request.body)
                    .some((key) => key !== 'status')

                if (hasNonStatusField) {

                    return reply.code(403).send({
                        error: 'Assignees may only update the task status'
                    })

                }

            }


            const updatedTask = await fastify.prisma.task.update({

                where: {
                    id: request.params.id
                },

                data: request.body

            })


            return updatedTask

        }
    )


    fastify.delete<{ Params: { id: number } }>(
        '/tasks/:id',

        {

            preHandler: [
                fastify.authenticate
            ],

            schema: {

                params: taskIdSchema

            }

        },

        async (request, reply) => {

            const user = request.currentUser!

            // Assignees cannot delete a task unless they also created
            // it. Managers and administrators can manage all tasks.

            const result = await fastify.prisma.task.deleteMany({

                where: {

                    id: request.params.id,

                    ...(canManageAllTasks(user.role)
                        ? {}
                        : { createdById: user.id })

                }

            })


            if (result.count === 0) {

                return reply.code(404).send({
                    error: 'Task not found'
                })

            }

            return reply.code(204).send()

        }
    )


    fastify.patch<{
        Params: { id: number }
        Body: AssignTaskBody
    }>(
        '/tasks/:id/assign',

        {

            preHandler: [
                fastify.authenticate,
                fastify.authorize('MANAGER', 'ADMIN')
            ],

            schema: {

                params: taskIdSchema,

                body: assignTaskSchema,

                response: {

                    200: taskResponseSchema

                }

            }

        },

        async (request, reply) => {

            const task = await fastify.prisma.task.findUnique({

                where: {
                    id: request.params.id
                },

                select: {
                    id: true
                }

            })


            if (!task) {

                return reply.code(404).send({
                    error: 'Task not found'
                })

            }


            const assignee = await fastify.prisma.user.findUnique({

                where: {
                    id: request.body.assigneeId
                },

                select: {
                    id: true
                }

            })


            if (!assignee) {

                return reply.code(404).send({
                    error: 'Assignee not found'
                })

            }


            // Only assigneeId changes. createdById keeps its original
            // value because the client cannot submit it.

            const updatedTask = await fastify.prisma.task.update({

                where: {
                    id: task.id
                },

                data: {
                    assigneeId: assignee.id
                }

            })


            return updatedTask

        }
    )


    // Only administrators can manage users.

    fastify.get(
        '/admin/users',

        {

            preHandler: [
                fastify.authenticate,
                fastify.authorize('ADMIN')
            ],

            schema: {

                response: {

                    200: {
                        type: 'array',
                        items: adminUserSchema
                    }

                }

            }

        },

        async () => {

            return fastify.prisma.user.findMany({

                select: {
                    id: true,
                    name: true,
                    email: true,
                    role: true,
                    createdAt: true
                },

                orderBy: {
                    id: 'asc'
                }

            })

        }
    )

}


export default taskRoutes
