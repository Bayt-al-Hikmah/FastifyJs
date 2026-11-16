export type Pitch = {

    id: string

    name: string

    email: string

    subject: string

    message: string

    createdAt: Date

}


export type PitchView = {

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


const seedPitches: Array<Pick<Pitch, 'name' | 'email' | 'subject' | 'message'> & { hoursAgo: number }> = [

    {

        name: 'Rosa Ibarra',

        email: 'rosa.ibarra@example.com',

        subject: 'The last letterpress in the valley',

        message: 'A photo essay about the family that still sets type by hand for wedding invitations and protest posters.',

        hoursAgo: 3

    },

    {

        name: 'Theo Marsh',

        email: 'theo.marsh@example.com',

        subject: 'What a bus timetable can teach us about design',

        message: 'A short cultural history of public information design, told through one coastal town and its stubbornly beautiful timetable.',

        hoursAgo: 11

    },

    {

        name: 'Nadia Okafor',

        email: 'nadia.okafor@example.com',
        
        subject: 'Notes from a community print shop',

        message: 'Five lessons from running free screen-printing nights in a neighbourhood arts centre for a year.',

        hoursAgo: 26

    }

]


function maskEmail(email: string): string {

    const [localPart = '', domain = ''] = email.split('@')

    if (localPart.length <= 2) {

        return `••@${domain}`

    }

    return `${localPart.slice(0, 2)}${'•'.repeat(Math.min(6, localPart.length - 2))}@${domain}`

}


export class PitchStore {

    private readonly pitches: Pitch[]


    constructor() {

        const now = Date.now()

        this.pitches = seedPitches.map((seed, index) => ({

            id: `seed-${index + 1}`,

            name: seed.name,

            email: seed.email,

            subject: seed.subject,

            message: seed.message,

            createdAt: new Date(now - seed.hoursAgo * 60 * 60 * 1000)

        }))

    }


    add(input: Pick<Pitch, 'name' | 'email' | 'subject' | 'message'>): Pitch {

        const pitch: Pitch = {

            id: crypto.randomUUID(),

            ...input,

            createdAt: new Date()

        }

        this.pitches.push(pitch)

        return pitch

    }


    getNewest(limit: number): Pitch[] {

        return [...this.pitches]

            .sort((left, right) => right.createdAt.getTime() - left.createdAt.getTime())

            .slice(0, Math.max(0, limit))

    }


    getCount(): number {

        return this.pitches.length

    }


    toView(pitch: Pitch): PitchView {

        return {

            id: pitch.id,

            name: pitch.name,

            subject: pitch.subject,

            preview: pitch.message.length > 128

                ? `${pitch.message.slice(0, 125).trimEnd()}…`

                : pitch.message,

            initial: pitch.name.trim().charAt(0).toUpperCase() || '?',

            receivedAt: dateFormatter.format(pitch.createdAt),

            maskedEmail: maskEmail(pitch.email)

        }

    }

}
