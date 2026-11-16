export type GuestbookEntry = {
    id: string
    name: string
    message: string
    createdAt: Date
}

export type GuestbookEntryView = {
    id: string
    name: string
    message: string
    initial: string
    signedAt: string
}

type SeedEntry = {
    name: string
    message: string
    daysAgo: number
}

const seedEntries: SeedEntry[] = [
    {
        name: 'Maya Chen',
        message: 'Left this book on the studio table after the autumn open house. Lovely evening.',
        daysAgo: 2
    },
    {
        name: 'Jonas Reed',
        message: 'Came for the letterpress demo, stayed for the coffee. I will be back.',
        daysAgo: 5
    }
]

const dateFormatter = new Intl.DateTimeFormat('en', {
    dateStyle: 'medium',
    timeStyle: 'short'
})

export class MessageStore {
    private readonly entries: GuestbookEntry[]

    constructor() {
        const now = Date.now()

        this.entries = seedEntries.map((seed, index) => ({
            id: `seed-${index + 1}`,
            name: seed.name,
            message: seed.message,
            createdAt: new Date(now - seed.daysAgo * 24 * 60 * 60 * 1000)
        }))
    }

    add(name: string, message: string): GuestbookEntry {
        const entry: GuestbookEntry = {
            id: crypto.randomUUID(),
            name,
            message,
            createdAt: new Date()
        }

        this.entries.push(entry)

        return entry
    }

    getNewest(limit: number): GuestbookEntry[] {
        return [...this.entries]
            .sort((left, right) => right.createdAt.getTime() - left.createdAt.getTime())
            .slice(0, Math.max(0, limit))
    }

    getCount(): number {
        return this.entries.length
    }

    toView(entry: GuestbookEntry): GuestbookEntryView {
        return {
            id: entry.id,
            name: entry.name,
            message: entry.message,
            initial: entry.name.trim().charAt(0).toUpperCase() || '?',
            signedAt: dateFormatter.format(entry.createdAt)
        }
    }
}
