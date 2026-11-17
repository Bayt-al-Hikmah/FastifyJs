export type Note = {
    id: number
    title: string
    body: string
    topic: string
    createdAt: string
    imageName: string | null
}


export type NoteInput = {
    title: string
    body: string
    topic: string
}


export type NoteUpdate = Partial<NoteInput>


export type NoteListOptions = {
    search?: string
    topic?: string
}


export type StoredImage = {
    storageName: string
    originalName: string
    mimeType: string
    size: number
}
