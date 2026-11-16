import { env } from "./config/env.js";
import { buildApp } from "./app.js";

const start = async () => {
    const app = await buildApp();

    try {
        await app.listen({
            port: env.port,
            host: env.host
        });
        app.log.info(`Community Events API running at http://${env.host}:${env.port}`);
    } catch (error) {
        app.log.error(error);
        process.exit(1);
    }
};

void start();
