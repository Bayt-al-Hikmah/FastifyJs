export type Inquiry = {

    id: string

    name: string

    email: string

    subject: string

    message: string

    createdAt: Date

}


export type InquiryView = {

    id: string

    name: string

    subject: string

    preview: string

    initial: string

    receivedAt: string

    maskedEmail: string

}


const dateFormatter = new Intl.DateTimeFormat('en', {

    dateStyle: 'medium',

    timeStyle: 'short'

})


const seedInquiries: Array<Pick<Inquiry, 'name' | 'email' | 'subject' | 'message'> & { daysAgo: number }> = [

    {

        name: 'Maya Chen',

        email: 'maya.chen@example.com',

        subject: 'Workshop booking',

        message: 'I would like to reserve four seats for the November letterpress workshop.',

        daysAgo: 1

    },

    {

        name: 'Jonas Reed',

        email: 'jonas.reed@example.com',

        subject: 'Studio visit',

        message: 'Could we visit the studio on Friday afternoon to discuss a small identity project?',

        daysAgo: 3

    }

]


function maskEmail(email: string): string {

    const [localPart = '', domain = ''] = email.split('@')

    if (localPart.length <= 2) {

        return `••@${domain}`

    }

    return `${localPart.slice(0, 2)}${'•'.repeat(Math.min(6, localPart.length - 2))}@${domain}`

}


export class ContactStore {

    private readonly inquiries: Inquiry[]

    constructor() {

        const now = Date.now()

        this.inquiries = seedInquiries.map((seed, index) => ({

            id: `seed-${index + 1}`,

            name: seed.name,

            email: seed.email,

            subject: seed.subject,

            message: seed.message,

            createdAt: new Date(now - seed.daysAgo * 24 * 60 * 60 * 1000)

        }))

    }

    add(input: Pick<Inquiry, 'name' | 'email' | 'subject' | 'message'>): Inquiry {

        const inquiry: Inquiry = {

            id: crypto.randomUUID(),

            ...input,

            createdAt: new Date()

        }

        this.inquiries.push(inquiry)

        return inquiry

    }

    getNewest(limit: number): Inquiry[] {

        return [...this.inquiries]

            .sort((left, right) => right.createdAt.getTime() - left.createdAt.getTime())

            .slice(0, Math.max(0, limit))

    }

    getCount(): number {

        return this.inquiries.length

    }

    toView(inquiry: Inquiry): InquiryView {

        return {

            id: inquiry.id,

            name: inquiry.name,

            subject: inquiry.subject,

            preview: inquiry.message.length > 120

                ? `${inquiry.message.slice(0, 117).trimEnd()}…`

                : inquiry.message,

            initial: inquiry.name.trim().charAt(0).toUpperCase() || '?',

            receivedAt: dateFormatter.format(inquiry.createdAt),

            maskedEmail: maskEmail(inquiry.email)

        }

    }

}
