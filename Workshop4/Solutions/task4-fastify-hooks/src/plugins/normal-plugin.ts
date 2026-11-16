import type { FastifyPluginAsync } from 'fastify'


// This plugin is intentionally NOT wrapped with fastify-plugin.
// Fastify therefore creates a new encapsulated scope.

const normalPlugin: FastifyPluginAsync = async (fastify) => {

    const value = 'only visible inside the normal plugin scope'

    fastify.decorate('normalScopeValue', value)


    fastify.get('/normal', async () => {

        return {

            scope: 'normal plugin',

            decoratorValue: value,

            visibleOutside: false,

            note:
                'The parent scope reports hasDecorator("normalScopeValue") as false.'

        }

    })

}


export default normalPlugin
