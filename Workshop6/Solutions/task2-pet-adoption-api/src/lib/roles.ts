import type { UserRole } from '../types/auth.js'


/**
 * Bootstrap roles are deliberately simple: any email listed in STAFF_EMAILS
 * at registration time receives the STAFF role. Everyone else is a VISITOR.
 * This is a workshop convenience, not a production-grade provisioning flow.
 */
export function roleForEmail(email: string): UserRole {

    const bootstrapEmails = (process.env.STAFF_EMAILS ?? '')
        .split(',')
        .map((value) => value.trim().toLowerCase())
        .filter((value) => value.length > 0)

    return bootstrapEmails.includes(email.trim().toLowerCase())
        ? 'STAFF'
        : 'VISITOR'

}
