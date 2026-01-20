/**
 * Supabase Client Configuration
 * Creates authenticated Supabase client from request cookies
 */
import { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@bondery/types/database";
import type { FastifyRequest, FastifyReply } from "fastify";
/**
 * Creates an anonymous Supabase client (for public endpoints)
 */
export declare function createAnonClient(): SupabaseClient<Database>;
/**
 * Creates an admin Supabase client (for privileged operations)
 */
export declare function createAdminClient(): SupabaseClient<Database>;
/**
 * Creates an authenticated Supabase client from request
 */
export declare function createAuthenticatedClient(request: FastifyRequest): Promise<{
    client: SupabaseClient<Database>;
    user: {
        id: string;
        email: string;
    } | null;
}>;
/**
 * Authentication middleware result
 */
export interface AuthResult {
    user: {
        id: string;
        email: string;
    };
    client: SupabaseClient<Database>;
}
/**
 * Verify authentication and return user + client, or send 401 response
 */
export declare function requireAuth(request: FastifyRequest, reply: FastifyReply): Promise<AuthResult | null>;
