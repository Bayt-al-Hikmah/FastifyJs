export type EquipmentWithOwner = {

    id: number

    name: string

    description: string | null

    category: string

    availability: string

    quantity: number

    imageStorageKey: string | null

    imageOriginalName: string | null

    imageMimeType: string | null

    imageSize: number | null

    createdAt: Date

    updatedAt: Date

    owner: {
        id: number
        name: string
    }

}


export type EquipmentImageView = {

    originalName: string

    mimeType: string

    size: number

    url: string

}


export type EquipmentView = {

    id: number

    name: string

    description: string | null

    category: string

    availability: string

    quantity: number

    image: EquipmentImageView | null

    owner: {
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
    equipmentId: number,
    originalName: string | null,
    mimeType: string | null,
    size: number | null
): EquipmentImageView | null {

    if (!originalName || !mimeType || size === null) {
        return null
    }

    return {

        originalName,

        mimeType,

        size,

        url: `/api/equipment/${equipmentId}/image`

    }

}


export function serializeEquipment(
    record: EquipmentWithOwner
): EquipmentView {

    return {

        id: record.id,

        name: record.name,

        description: record.description,

        category: record.category,

        availability: record.availability,

        quantity: record.quantity,

        image: buildImageView(
            record.id,
            record.imageOriginalName,
            record.imageMimeType,
            record.imageSize
        ),

        owner: {
            id: record.owner.id,
            name: record.owner.name
        },

        createdAt: record.createdAt,

        updatedAt: record.updatedAt

    }

}
