import type { FastifyPluginAsync } from 'fastify'


type ContactBody = {

    name?: string

    email?: string

    subject?: string

    message?: string

}


type ContactValues = {

    name: string

    email: string

    subject: string

    message: string

}


type ContactErrors = {

    name?: string

    email?: string

    subject?: string

    message?: string

}


const NAME_MIN = 3
const NAME_MAX = 60
const SUBJECT_MIN = 4
const SUBJECT_MAX = 100
const MESSAGE_MIN = 10
const MESSAGE_MAX = 1000

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/


function readValues(body: ContactBody | undefined): ContactValues {

    return {

        name: typeof body?.name === 'string' ? body.name.trim() : '',

        email: typeof body?.email === 'string' ? body.email.trim() : '',

        subject: typeof body?.subject === 'string' ? body.subject.trim() : '',

        message: typeof body?.message === 'string' ? body.message.trim() : ''

    }

}


// This solution validates by hand. The task2 solution replaces these checks with JSON Schema.
function validate(values: ContactValues): ContactErrors {

    const errors: ContactErrors = {}

    if (values.name.length < NAME_MIN || values.name.length > NAME_MAX) {

        errors.name = `Please use a name between ${NAME_MIN} and ${NAME_MAX} characters.`

    }

    if (!emailPattern.test(values.email) || values.email.length > 254) {

        errors.email = 'Please enter a valid email address, such as name@example.com.'

    }

    if (values.subject.length < SUBJECT_MIN || values.subject.length > SUBJECT_MAX) {

        errors.subject = `Please add a subject between ${SUBJECT_MIN} and ${SUBJECT_MAX} characters.`

    }

    if (values.message.length < MESSAGE_MIN || values.message.length > MESSAGE_MAX) {

        errors.message = `Please write a message between ${MESSAGE_MIN} and ${MESSAGE_MAX} characters.`

    }

    return errors

}


const contactRoutes: FastifyPluginAsync = async (fastify) => {

    fastify.get<{ Querystring: { submitted?: string } }>('/', async (request, reply) => {

        const recent = fastify.contactStore
            .getNewest(3)
            .map((inquiry) => fastify.contactStore.toView(inquiry))

        return reply.viewAsync('index', {

            title: 'Contact the studio',

            description: 'Send a note to the Northwind studio team.',

            recent,

            totalInquiries: fastify.contactStore.getCount(),

            submitted: request.query.submitted === '1',

            values: {

                name: '',

                email: '',

                subject: '',

                message: ''

            },

            errors: {}

        })

    })


    fastify.post<{ Body: ContactBody }>('/', async (request, reply) => {

        const values = readValues(request.body)

        const errors = validate(values)

        if (Object.keys(errors).length > 0) {

            const recent = fastify.contactStore
                .getNewest(3)
                .map((inquiry) => fastify.contactStore.toView(inquiry))

            return reply.code(400).viewAsync('index', {

                title: 'Contact the studio',

                description: 'Send a note to the Northwind studio team.',

                recent,

                totalInquiries: fastify.contactStore.getCount(),

                submitted: false,

                values,

                errors,

                formError: 'Please correct the highlighted fields and send the note again.'

            })

        }

        fastify.contactStore.add({

            name: values.name,

            email: values.email,

            subject: values.subject,

            message: values.message

        })

        fastify.log.info({ subject: values.subject }, 'Contact inquiry received')

        // Post/Redirect/Get keeps a refresh from sending the message twice.
        return reply.redirect('/?submitted=1', 303)

    })

}


export default contactRoutes
