import type { FastifyPluginAsync } from 'fastify'

type GuestbookBody = {
    name?: string
    message?: string
}

type FormValues = {
    name: string
    message: string
}

type FormErrors = {
    name?: string
    message?: string
}

const NAME_MIN = 3
const NAME_MAX = 25
const MESSAGE_MAX = 200

function readValues(body: GuestbookBody | undefined): FormValues {
    return {
        name: typeof body?.name === 'string' ? body.name.trim() : '',
        message: typeof body?.message === 'string' ? body.message.trim() : ''
    }
}

// This example validates by hand. Workshop 2 later replaces these checks with JSON Schema.
function validate(values: FormValues): FormErrors {
    const errors: FormErrors = {}

    if (values.name.length < NAME_MIN || values.name.length > NAME_MAX) {
        errors.name = `Please sign with a name between ${NAME_MIN} and ${NAME_MAX} characters.`
    }

    if (values.message.length === 0 || values.message.length > MESSAGE_MAX) {
        errors.message = `A note needs between 1 and ${MESSAGE_MAX} characters.`
    }

    return errors
}

const guestbookRoutes: FastifyPluginAsync = async (fastify) => {
    fastify.get<{ Querystring: { submitted?: string } }>('/', async (request, reply) => {
        const entries = fastify.messageStore
            .getNewest(8)
            .map((entry) => fastify.messageStore.toView(entry))

        return reply.viewAsync('index', {
            title: 'The Guestbook',
            description: 'Sign the studio guestbook with a name and a short note.',
            entries,
            totalEntries: fastify.messageStore.getCount(),
            submitted: request.query.submitted === '1',
            values: { name: '', message: '' },
            errors: {}
        })
    })

    fastify.post<{ Body: GuestbookBody }>('/', async (request, reply) => {
        const values = readValues(request.body)
        const errors = validate(values)

        // Redisplay the form with the visitor's input when validation fails.
        if (Object.keys(errors).length > 0) {
            const entries = fastify.messageStore
                .getNewest(8)
                .map((entry) => fastify.messageStore.toView(entry))

            return reply.code(400).viewAsync('index', {
                title: 'The Guestbook',
                description: 'Sign the studio guestbook with a name and a short note.',
                entries,
                totalEntries: fastify.messageStore.getCount(),
                submitted: false,
                values,
                errors,
                formError: 'The book is still open — please correct the highlighted fields.'
            })
        }

        fastify.messageStore.add(values.name, values.message)
        fastify.log.info({ name: values.name }, 'Guestbook entry submitted')

        // Post/Redirect/Get: refreshing the confirmation page will not submit again.
        return reply.redirect('/?submitted=1', 303)
    })
}

export default guestbookRoutes
