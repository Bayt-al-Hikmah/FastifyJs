export type UserRole = 'USER' | 'MANAGER' | 'ADMIN'


export type AuthenticatedUser = {

    id: number

    name: string

    email: string

    role: UserRole

}
