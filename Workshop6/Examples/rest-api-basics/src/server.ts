import { buildApp } from "./app.js";
import { config } from "./config.js";

async function start(): Promise<void> {
    const app = await buildApp();

    try {
        await app.listen({
            port: config.port,
            host: config.host
        });
    } catch (error) {
        app.log.error(error);
        process.exit(1);
    }
}

void start();
