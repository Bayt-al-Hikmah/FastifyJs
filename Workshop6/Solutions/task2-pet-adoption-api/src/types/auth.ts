export type UserRole = 'VISITOR' | 'STAFF'


export type AuthenticatedUser = {

    id: number

    name: string

    email: string

    role: UserRole

}
