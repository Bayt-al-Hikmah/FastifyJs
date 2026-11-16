export type Quote = {
    id: string
    author: string
    text: string
    createdAt: Date
}

export type QuoteView = {
    id: string
    author: string
    text: string
    initial: string
    submittedAt: string
    isNew: boolean
}

export type QuoteStats = {
    totalQuotes: number
    distinctAuthors: number
    submittedThisRun: number
}

export type AuthorSummary = {
    name: string
    count: number
}

type SeedQuote = {
    author: string
    text: string
    hoursAgo: number
}

const seedQuotes: SeedQuote[] = [
    {
        author: 'Marcus Aurelius',
        text: 'You have power over your mind — not outside events. Realize this, and you will find strength.',
        hoursAgo: 2
    },
    {
        author: 'Virginia Woolf',
        text: 'Arrange whatever pieces come your way.',
        hoursAgo: 8
    },
    {
        author: 'Rumi',
        text: 'The wound is the place where the light enters you.',
        hoursAgo: 26
    },
    {
        author: 'Seneca',
        text: 'We suffer more often in imagination than in reality.',
        hoursAgo: 50
    },
    {
        author: 'Toni Morrison',
        text: "If there's a book that you want to read, but it hasn't been written yet, then you must write it.",
        hoursAgo: 75
    },
    {
        author: 'Lao Tzu',
        text: 'A journey of a thousand miles begins with a single step.',
        hoursAgo: 120
    }
]

const dateFormatter = new Intl.DateTimeFormat('en', {
    dateStyle: 'medium',
    timeStyle: 'short'
})

function normalizeAuthor(author: string): string {
    return author.trim().toLocaleLowerCase('en-US')
}

export class QuoteStore {
    private readonly quotes: Quote[]
    private readonly startedAt: number

    constructor() {
        this.startedAt = Date.now()

        this.quotes = seedQuotes.map((seed, index) => ({
            id: `seed-${index + 1}`,
            author: seed.author,
            text: seed.text,
            createdAt: new Date(this.startedAt - seed.hoursAgo * 60 * 60 * 1000)
        }))
    }

    add(author: string, text: string): Quote {
        const quote: Quote = {
            id: crypto.randomUUID(),
            author,
            text,
            createdAt: new Date()
        }

        this.quotes.push(quote)

        return quote
    }

    getNewest(limit: number): Quote[] {
        return [...this.quotes]
            .sort((left, right) => right.createdAt.getTime() - left.createdAt.getTime())
            .slice(0, Math.max(0, limit))
    }

    findByAuthor(author: string): Quote[] {
        const normalized = normalizeAuthor(author)

        return [...this.quotes]
            .filter((quote) => normalizeAuthor(quote.author) === normalized)
            .sort((left, right) => right.createdAt.getTime() - left.createdAt.getTime())
    }

    getDistinctAuthors(): string[] {
        const authors = new Map<string, string>()

        for (const quote of this.quotes) {
            const key = normalizeAuthor(quote.author)

            if (!authors.has(key)) {
                authors.set(key, quote.author)
            }
        }

        return [...authors.values()].sort((left, right) => left.localeCompare(right))
    }

    getAuthorLeaderboard(limit: number): AuthorSummary[] {
        const counts = new Map<string, AuthorSummary>()

        for (const quote of this.quotes) {
            const key = normalizeAuthor(quote.author)
            const existing = counts.get(key)

            if (existing) {
                existing.count += 1
            } else {
                counts.set(key, { name: quote.author, count: 1 })
            }
        }

        return [...counts.values()]
            .sort((left, right) => {
                if (right.count !== left.count) {
                    return right.count - left.count
                }

                return left.name.localeCompare(right.name)
            })
            .slice(0, Math.max(0, limit))
    }

    getStats(): QuoteStats {
        const distinctAuthors = new Set(this.quotes.map((quote) => normalizeAuthor(quote.author)))
        const submittedThisRun = this.quotes.filter(
            (quote) => quote.createdAt.getTime() >= this.startedAt
        ).length

        return {
            totalQuotes: this.quotes.length,
            distinctAuthors: distinctAuthors.size,
            submittedThisRun
        }
    }

    toView(quote: Quote): QuoteView {
        const initial = quote.author.trim().charAt(0).toUpperCase()

        return {
            id: quote.id,
            author: quote.author,
            text: quote.text,
            initial: initial.length > 0 ? initial : '?',
            submittedAt: dateFormatter.format(quote.createdAt),
            isNew: quote.createdAt.getTime() >= this.startedAt
        }
    }
}
