export type UserRole = 'CHEF' | 'MEMBER'


export type AuthenticatedUser = {

    id: number

    name: string

    email: string

    role: UserRole

}
