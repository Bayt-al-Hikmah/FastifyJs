export type Note = {
    id: string
    title: string
    excerpt: string
    body: string[]
    topic: string
    publishedAt: Date
    readMinutes: number
    featured: boolean
}

export type NoteView = {
    id: string
    title: string
    excerpt: string
    body: string[]
    topic: string
    publishedAt: string
    readMinutes: number
    featured: boolean
}

const noteRecords: Note[] = [
    {
        id: 'designing-for-calm',
        title: 'Designing for calm',
        excerpt: 'Interfaces become easier to trust when they stop competing for attention.',
        body: [
            'A calm interface does not mean an empty one. It means every element has a clear reason to be present.',
            'Start with reading order, then spacing, then colour. If the page still feels busy, remove something instead of decorating it.'
        ],
        topic: 'Design',
        publishedAt: new Date('2026-10-28T09:30:00Z'),
        readMinutes: 4,
        featured: true
    },
    {
        id: 'small-server-routines',
        title: 'Small server routines',
        excerpt: 'A few predictable checks prevent most unpleasant surprises in production.',
        body: [
            'Health checks, structured logs, and graceful shutdown are not advanced features. They are basic courtesy to the people who operate the service.',
            'Write the routine down, run it often, and make the output easy to scan.'
        ],
        topic: 'Engineering',
        publishedAt: new Date('2026-10-24T15:10:00Z'),
        readMinutes: 6,
        featured: false
    },
    {
        id: 'notes-on-reading',
        title: 'Notes on reading slowly',
        excerpt: 'A commonplace book is less about collecting and more about returning.',
        body: [
            'The value of a note is not in how quickly it was captured. It is in how often it sends you back to the original thought.',
            'Keep the quotation, the source, and one sentence of your own. That is usually enough.'
        ],
        topic: 'Practice',
        publishedAt: new Date('2026-10-19T07:45:00Z'),
        readMinutes: 3,
        featured: false
    },
    {
        id: 'the-quiet-checklist',
        title: 'The quiet checklist',
        excerpt: 'A short list that keeps a release from becoming an improvisation.',
        body: [
            'Check the environment, the migration, the logs, and the rollback path. In that order.',
            'If one item cannot be checked, write down why. An unexplained exception is a future incident.'
        ],
        topic: 'Engineering',
        publishedAt: new Date('2026-10-12T11:20:00Z'),
        readMinutes: 5,
        featured: false
    }
]

const dateFormatter = new Intl.DateTimeFormat('en', {
    dateStyle: 'long'
})

export function toNoteView(note: Note): NoteView {
    return {
        id: note.id,
        title: note.title,
        excerpt: note.excerpt,
        body: note.body,
        topic: note.topic,
        publishedAt: dateFormatter.format(note.publishedAt),
        readMinutes: note.readMinutes,
        featured: note.featured
    }
}

export function getAllNotes(): Note[] {
    return [...noteRecords].sort(
        (left, right) => right.publishedAt.getTime() - left.publishedAt.getTime()
    )
}

export function findNote(noteId: string): Note | undefined {
    return noteRecords.find((note) => note.id === noteId)
}

export function getTopics(): string[] {
    return [...new Set(noteRecords.map((note) => note.topic))].sort()
}
