// Tipe untuk razeo-shared (implementasi: index.js)
import type { SupabaseClient } from "@supabase/supabase-js";
import type { OAuth2Client } from "googleapis-auth/build/src/auth/oauth2client";

export declare const supabase: SupabaseClient<any, "public", any>;

export interface AuthedUser {
  uid: string;
  email?: string;
}

export interface ProjectInfo {
  id: string;
  name: string | null;
  role: string;
  owner_uid?: string | null;
  created_at?: string | null;
}

export declare function requireUser(req: any): Promise<AuthedUser | null>;
export declare function getRedirectUri(req: any): string;
export declare function newOAuth2Client(redirectUri?: string): OAuth2Client;
export declare function getClientForUser(uid: string, req: any): Promise<OAuth2Client | null>;
export declare function inviteToken(): string;
export declare function listProjects(uid: string): Promise<ProjectInfo[]>;
export declare function isMember(uid: string, projectId: string | null): Promise<string | null>;
export declare function projectFrom(req: any): string | null;
export declare const GOOGLE_SCOPES: string[];
