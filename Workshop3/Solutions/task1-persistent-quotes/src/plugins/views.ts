import { readdirSync, readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import view from '@fastify/view'
import fp from 'fastify-plugin'
import handlebars from 'handlebars'

import type { FastifyPluginAsync } from 'fastify'

const currentDirectory = path.dirname(fileURLToPath(import.meta.url))
const projectRoot = path.resolve(currentDirectory, '..', '..')
const viewsRoot = path.join(projectRoot, 'views')
const partialsRoot = path.join(viewsRoot, 'partials')

function formatDate(value: unknown): string {
    const date = value instanceof Date ? value : new Date(String(value))

    if (Number.isNaN(date.getTime())) {
        return ''
    }

    return new Intl.DateTimeFormat('en', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
    }).format(date)
}

function dateISO(value: unknown): string {
    const date = value instanceof Date ? value : new Date(String(value))

    if (Number.isNaN(date.getTime())) {
        return ''
    }

    return date.toISOString()
}

function slug(value: unknown): string {
    return String(value ?? '')
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '')
}

handlebars.registerHelper('eq', (left: unknown, right: unknown) => left === right)
handlebars.registerHelper('formatDate', (value: unknown) => formatDate(value))
handlebars.registerHelper('dateISO', (value: unknown) => dateISO(value))
handlebars.registerHelper('slug', (value: unknown) => slug(value))

function registerPartials(): void {
    for (const file of readdirSync(partialsRoot)) {
        if (!file.endsWith('.hbs')) {
            continue
        }

        const name = path.basename(file, '.hbs')
        const source = readFileSync(path.join(partialsRoot, file), 'utf8')

        handlebars.registerPartial(name, source)
    }
}

const viewsPlugin: FastifyPluginAsync = async (fastify) => {
    registerPartials()

    await fastify.register(view, {
        engine: {
            handlebars
        },
        root: viewsRoot,
        layout: 'layout.hbs',
        defaultContext: {
            appName: 'Quote Sharing',
            currentYear: new Date().getFullYear()
        }
    })
}

export default fp(viewsPlugin, {
    name: 'views'
})
