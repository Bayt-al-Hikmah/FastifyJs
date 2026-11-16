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
            'postgresql://localhost:5432/w5_task3_image_thumbnails?schema=public'
    }

})
