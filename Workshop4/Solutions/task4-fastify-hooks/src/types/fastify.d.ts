declare module 'fastify' {

    interface FastifyRequest {

        startedAt: number

    }

    interface FastifyInstance {

        sharedScopeValue: string

    }

}


export {}
