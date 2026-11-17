import type {
    Note,
    NoteInput,
    NoteListOptions,
    NoteUpdate
} from '../types/note.js'


/**
 * A deliberately tiny in-memory store. Nothing is persisted, so restarting
 * the process restores the seed data. This keeps the focus on the browser
 * side of the workshop rather than on database setup.
 */

const seedNotes: Note[] = [

    {

        id: 1,

        title: 'Welcome to Field Notes',

        body: 'A field note is a short observation you can write down before the detail disappears. Search, filter, edit, and delete a few notes to see every Fetch concept in action.',

        topic: 'General',

        createdAt: '2026-02-18T09:15:00.000Z',

        imageName: null

    },

    {

        id: 2,

        title: 'Spring garden ledger',

        body: 'The broad beans are away. The rosemary cutting by the gate has taken root, and the raised bed needs another inch of compost before the tomatoes go in.',

        topic: 'Gardening',

        createdAt: '2026-02-16T16:40:00.000Z',

        imageName: null

    },

    {

        id: 3,

        title: 'Light on the estuary',

        body: 'Twenty minutes before sunset the mud flats turn copper. A polariser and a low shutter speed keep the reflections without losing the grain of the silt.',

        topic: 'Photography',

        createdAt: '2026-02-14T18:05:00.000Z',

        imageName: null

    },

    {

        id: 4,

        title: 'The riverside loop',

        body: 'The towpath is clear after the rain. Two bridges, one sharp corner by the old mill, and a good place to stop for water halfway round.',

        topic: 'Cycling',

        createdAt: '2026-02-11T07:30:00.000Z',

        imageName: null

    },

    {

        id: 5,

        title: 'Bread experiment no. 7',

        body: 'A longer autolyse gave a much softer crumb. Next time, reduce the salt by two grams and bake with the lid off for the final five minutes.',

        topic: 'Cooking',

        createdAt: '2026-02-08T12:20:00.000Z',

        imageName: null

    },

    {

        id: 6,

        title: 'Knot practice',

        body: 'A bowline and a trucker\'s hitch cover most of what a weekend trip needs. Practise both with cold hands so the muscle memory actually sticks.',

        topic: 'Field Craft',

        createdAt: '2026-02-03T14:10:00.000Z',

        imageName: null

    }

]


let notes: Note[] = seedNotes.map(
    (note) => ({ ...note })
)

let nextId = notes.length + 1


export function listNotes(
    options: NoteListOptions = {}
): Note[] {

    const search = (
        options.search ?? ''
    )
        .trim()
        .toLowerCase()

    const topic = (
        options.topic ?? ''
    )
        .trim()
        .toLowerCase()


    const filtered = notes.filter(
        (note) => {

            const matchesSearch =
                search === '' ||
                note.title.toLowerCase().includes(search) ||
                note.body.toLowerCase().includes(search)

            const matchesTopic =
                topic === '' ||
                note.topic.toLowerCase() === topic

            return matchesSearch && matchesTopic

        }
    )


    return filtered.sort(
        (left, right) =>
            right.createdAt.localeCompare(left.createdAt)
    )

}


export function getNote(
    id: number
): Note | undefined {

    return notes.find(
        (note) => note.id === id
    )

}


export function listTopics(): string[] {

    const topics = new Set(
        notes.map((note) => note.topic)
    )

    return Array.from(topics).sort()

}


export function createNote(
    input: NoteInput
): Note {

    const note: Note = {

        id: nextId,

        title: input.title,

        body: input.body,

        topic: input.topic,

        createdAt: new Date().toISOString(),

        imageName: null

    }

    nextId += 1

    notes.push(note)

    return note

}


export function updateNote(
    id: number,
    update: NoteUpdate
): Note | undefined {

    const note = getNote(id)

    if (!note) {
        return undefined
    }

    if (update.title !== undefined) {
        note.title = update.title
    }

    if (update.body !== undefined) {
        note.body = update.body
    }

    if (update.topic !== undefined) {
        note.topic = update.topic
    }

    return note

}


export function setNoteImage(
    id: number,
    imageName: string
): Note | undefined {

    const note = getNote(id)

    if (!note) {
        return undefined
    }

    note.imageName = imageName

    return note

}


export function deleteNote(
    id: number
): boolean {

    const index = notes.findIndex(
        (note) => note.id === id
    )

    if (index === -1) {
        return false
    }

    notes.splice(index, 1)

    return true

}
