/**
 * Serializers deliberately build plain objects. Prisma models, Date values,
 * and internal storage keys never leak into an HTTP response.
 */

type AttachmentRow = {

    id: number

    originalName: string

    mimeType: string

    extension: string

    size: number

    createdAt: Date

}


export type ResourceRow = {

    id: number

    title: string

    description: string

    subject: string

    type: 'VIDEO' | 'ARTICLE' | 'BOOK' | 'EXERCISE'

    status: 'DRAFT' | 'PUBLISHED'

    instructorId: number

    createdAt: Date

    updatedAt: Date

    instructor: {
        name: string
    }

    attachment: AttachmentRow | null

}


/**
 * One shared select keeps every resource endpoint's shape identical.
 */

export const resourceSelect = {

    id: true,

    title: true,

    description: true,

    subject: true,

    type: true,

    status: true,

    instructorId: true,

    createdAt: true,

    updatedAt: true,

    instructor: {
        select: {
            name: true
        }
    },

    attachment: {
        select: {
            id: true,
            originalName: true,
            mimeType: true,
            extension: true,
            size: true,
            createdAt: true
        }
    }

} as const


export function serializeResource(resource: ResourceRow) {

    return {

        id: resource.id,

        title: resource.title,

        description: resource.description,

        subject: resource.subject,

        type: resource.type,

        status: resource.status,

        instructorId: resource.instructorId,

        instructorName: resource.instructor.name,

        createdAt: resource.createdAt,

        updatedAt: resource.updatedAt,

        attachment: resource.attachment
            ? {
                id: resource.attachment.id,
                originalName: resource.attachment.originalName,
                mimeType: resource.attachment.mimeType,
                extension: resource.attachment.extension,
                size: resource.attachment.size,
                createdAt: resource.attachment.createdAt,
                downloadUrl: `/api/resources/${resource.id}/attachment/download`
            }
            : null

    }

}
