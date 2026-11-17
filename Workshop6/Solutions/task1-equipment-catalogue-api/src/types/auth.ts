export type UserRole = 'USER' | 'ADMIN'


export type AuthenticatedUser = {

    id: number

    name: string

    email: string

    role: UserRole

}
