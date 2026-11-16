import type { FastifyPluginAsync, FastifyRequest } from 'fastify'


type PitchBody = {

    name?: string

    email?: string

    subject?: string

    message?: string

    _csrf?: string

}


type PitchValues = {

    name: string

    email: string

    subject: string

    message: string

}


type PitchErrors = Partial<Record<keyof PitchValues, string>>


type ValidationIssue = {

    instancePath?: string

    keyword?: string

    params?: Record<string, unknown>

}


type AttachedValidationError = Error & {

    validation?: ValidationIssue[]

}


const NAME_MIN = 3
const NAME_MAX = 60
const SUBJECT_MIN = 4
const SUBJECT_MAX = 100
const MESSAGE_MIN = 10
const MESSAGE_MAX = 1000


// The schema is the single source of truth for the accepted shape of a pitch.
// Fastify compiles it with Ajv and validates the form body before the handler runs.
const pitchBodySchema = {

    type: 'object',

    required: ['name', 'email', 'subject', 'message', '_csrf'],

    properties: {

        name: {

            type: 'string',

            minLength: NAME_MIN,

            maxLength: NAME_MAX,

            pattern: '\\S'

        },

        email: {

            type: 'string',

            maxLength: 254,

            pattern: '^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$'

        },

        subject: {

            type: 'string',

            minLength: SUBJECT_MIN,

            maxLength: SUBJECT_MAX,

            pattern: '\\S'

        },

        message: {

            type: 'string',

            minLength: MESSAGE_MIN,

            maxLength: MESSAGE_MAX,

            pattern: '\\S'

        },

        _csrf: {

            type: 'string',

            minLength: 1

        }

    },

    additionalProperties: false

}


function readValues(body: PitchBody | undefined): PitchValues {

    return {

        name: typeof body?.name === 'string' ? body.name.trim() : '',

        email: typeof body?.email === 'string' ? body.email.trim() : '',

        subject: typeof body?.subject === 'string' ? body.subject.trim() : '',

        message: typeof body?.message === 'string' ? body.message.trim() : ''

    }

}


function readIssues(error: AttachedValidationError): ValidationIssue[] {

    return Array.isArray(error.validation) ? error.validation : []

}


function fieldForIssue(issue: ValidationIssue): string | null {

    if (issue.keyword === 'required') {

        const missing = issue.params?.missingProperty

        return typeof missing === 'string' ? missing : null

    }

    const path = issue.instancePath ?? ''

    return path.startsWith('/') ? path.slice(1) : null

}


function messageForIssue(field: string, issue: ValidationIssue): string {

    const limit = issue.params?.limit

    switch (issue.keyword) {

        case 'required':
            return 'This field is required.'

        case 'minLength':
            return Number(limit) === 1
                ? 'This field is required.'
                : `Use at least ${String(limit)} characters.`

        case 'maxLength':
            return `Keep this to ${String(limit)} characters or fewer.`

        case 'pattern':
            return field === 'email'
                ? 'Enter a valid email address, such as name@example.com.'
                : 'This field cannot contain only spaces.'

        case 'type':
            return 'Please enter text.'

        default:
            return 'Please check this value.'

    }

}


function collectErrors(error: AttachedValidationError): { errors: PitchErrors; formError?: string } {

    const errors: PitchErrors = {}
    let formError: string | undefined

    for (const issue of readIssues(error)) {

        const field = fieldForIssue(issue)

        if (field === 'name' || field === 'email' || field === 'subject' || field === 'message') {

            // Ajv can report several problems for one field; keep the first useful one.
            if (!errors[field]) {

                errors[field] = messageForIssue(field, issue)

            }

            continue

        }

        formError = 'The form could not be validated. Please check the fields and try again.'

    }

    return { errors, formError }

}


const pitchRoutes: FastifyPluginAsync = async (fastify) => {

    fastify.get<{ Querystring: { submitted?: string } }>('/', async (request, reply) => {

        const csrfToken = await reply.generateCsrf()

        const recent = fastify.pitchStore
            .getNewest(3)
            .map((pitch) => fastify.pitchStore.toView(pitch))

        return reply.viewAsync('index', {

            title: 'Pitch a story',

            description: 'Send a story pitch to The Margin, an independent magazine about making things.',

            csrfToken,

            recent,

            totalPitches: fastify.pitchStore.getCount(),

            submitted: request.query.submitted === '1',

            values: {

                name: '',

                email: '',

                subject: '',

                message: ''

            },

            errors: {},

            formError: undefined

        })

    })


    fastify.post<{ Body: PitchBody }>(
        '/',

        {
            schema: {

                body: {

                    content: {

                        'application/x-www-form-urlencoded': {

                            schema: pitchBodySchema

                        },

                        'application/json': {

                            schema: pitchBodySchema

                        }

                    }

                }

            },

            // Let the handler render HTML instead of Fastify's default JSON error.
            attachValidation: true,

            // Trim before validation so whitespace-only values cannot pass.
            preValidation: async (request: FastifyRequest<{ Body: PitchBody }>) => {

                const body = request.body

                if (!body || typeof body !== 'object') {

                    return

                }

                const fields: Array<keyof PitchValues> = ['name', 'email', 'subject', 'message']

                for (const field of fields) {

                    if (typeof body[field] === 'string') {

                        body[field] = body[field].trim()

                    }

                }

            },

            // The token is in the parsed body, so verification belongs in preHandler.
            preHandler: fastify.csrfProtection

        },

        async (request, reply) => {

            const values = readValues(request.body)

            if (request.validationError) {

                const { errors, formError } = collectErrors(request.validationError)

                const csrfToken = await reply.generateCsrf()

                const recent = fastify.pitchStore
                    .getNewest(3)
                    .map((pitch) => fastify.pitchStore.toView(pitch))

                return reply.code(400).viewAsync('index', {

                    title: 'Pitch a story',

                    description: 'Send a story pitch to The Margin, an independent magazine about making things.',

                    csrfToken,

                    recent,

                    totalPitches: fastify.pitchStore.getCount(),

                    submitted: false,

                    values,

                    errors,

                    formError: formError ?? 'The schema rejected this submission. Correct the highlighted fields and try again.'

                })

            }

            fastify.pitchStore.add({

                name: values.name,

                email: values.email,

                subject: values.subject,

                message: values.message

            })

            fastify.log.info({ subject: values.subject }, 'Pitch received')

            // Post/Redirect/Get prevents a refresh from sending the pitch twice.
            return reply.redirect('/?submitted=1', 303)

        }
    )

}


export default pitchRoutes
