import 'dotenv/config'

import { defineConfig } from 'prisma/config'


export default defineConfig({

    schema: 'prisma/schema.prisma',

    migrations: {
        path: 'prisma/migrations'
    },

    datasource: {
        url:
            process.env.DATABASE_URL ??
            'postgresql://localhost:5432/w4_task2_rbac?schema=public'
    }

})
