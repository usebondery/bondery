/**
 * Bondery API Server
 * Fastify-based REST API for Bondery application
 */
declare module "fastify" {
    interface FastifyInstance {
        config: {
            LOG_LEVEL: string;
            PUBLIC_SUPABASE_URL: string;
            PUBLIC_SUPABASE_PUBLISHABLE_KEY: string;
            PRIVATE_SUPABASE_SECRET_KEY: string;
            NEXT_PUBLIC_WEBAPP_URL: string;
            NEXT_PUBLIC_WEBSITE_URL: string;
            NEXT_PUBLIC_API_URL: string;
            API_PORT: number;
            API_HOST: string;
        };
    }
}
export {};
