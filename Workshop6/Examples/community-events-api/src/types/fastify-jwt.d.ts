import '@fastify/jwt'


declare module '@fastify/jwt' {

    interface FastifyJWT {

        payload: {
            sub: string
            iss?: string
        }

        user: {
            sub: string
            iss?: string
        }

    }

}
