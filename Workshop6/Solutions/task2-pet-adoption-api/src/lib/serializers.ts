export type PetWithShelter = {

    id: number

    name: string

    species: string

    age: number

    description: string | null

    status: string

    dateAdded: Date

    imageStorageKey: string | null

    imageOriginalName: string | null

    imageMimeType: string | null

    imageSize: number | null

    createdAt: Date

    updatedAt: Date

    shelter: {
        id: number
        name: string
    }

}


export type PetImageView = {

    originalName: string

    mimeType: string

    size: number

    url: string

}


export type PetView = {

    id: number

    name: string

    species: string

    age: number

    description: string | null

    status: string

    dateAdded: Date

    image: PetImageView | null

    shelter: {
        id: number
        name: string
    }

    createdAt: Date

    updatedAt: Date

}


/**
 * Build the public image descriptor from server-owned metadata. The client
 * never sees a filesystem path or a storage key.
 */
export function buildImageView(
    petId: number,
    originalName: string | null,
    mimeType: string | null,
    size: number | null
): PetImageView | null {

    if (!originalName || !mimeType || size === null) {
        return null
    }

    return {

        originalName,

        mimeType,

        size,

        url: `/api/pets/${petId}/image`

    }

}


export function serializePet(
    record: PetWithShelter
): PetView {

    return {

        id: record.id,

        name: record.name,

        species: record.species,

        age: record.age,

        description: record.description,

        status: record.status,

        dateAdded: record.dateAdded,

        image: buildImageView(
            record.id,
            record.imageOriginalName,
            record.imageMimeType,
            record.imageSize
        ),

        shelter: {
            id: record.shelter.id,
            name: record.shelter.name
        },

        createdAt: record.createdAt,

        updatedAt: record.updatedAt

    }

}
