/**
 * Side-effect imports so Fastify module augmentations from plugins are
 * visible across the API project under pnpm isolated linking.
 */
import "@fastify/multipart";
import "@fastify/rate-limit";
import "@fastify/swagger";
import "@fastify/websocket";
