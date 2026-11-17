export type UserRole = 'INSTRUCTOR' | 'STUDENT'


export type AuthenticatedUser = {

    id: number

    name: string

    email: string

    role: UserRole

}
