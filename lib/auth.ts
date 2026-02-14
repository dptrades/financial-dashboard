import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import { kv } from "@vercel/kv";
import fs from 'fs/promises';
import path from 'path';

const SECRET_KEY = process.env.JWT_SECRET || "antigravity-trade-desk-secret-key-2026";
const key = new TextEncoder().encode(SECRET_KEY);

export const SESSION_EXPIRY_MS = 4 * 60 * 60 * 1000; // 4 hours

export async function encrypt(payload: any) {
    return await new SignJWT(payload)
        .setProtectedHeader({ alg: "HS256" })
        .setIssuedAt()
        .setExpirationTime("4h")
        .sign(key);
}

export async function decrypt(input: string): Promise<any> {
    const { payload } = await jwtVerify(input, key, {
        algorithms: ["HS256"],
    });
    return payload;
}

export async function login(user: { name: string; email: string }) {
    // Create the session
    const expires = new Date(Date.now() + SESSION_EXPIRY_MS);
    const session = await encrypt({ user, expires });

    // Save the session in a cookie
    (await cookies()).set("session", session, { expires, httpOnly: true, secure: true, sameSite: 'lax' });
}

export async function logout() {
    // Destroy the session
    (await cookies()).set("session", "", { expires: new Date(0) });
}

export async function getSession() {
    const session = (await cookies()).get("session")?.value;
    if (!session) return null;
    try {
        return await decrypt(session);
    } catch (error) {
        return null;
    }
}

export const SIGNUP_EXPIRY_MS = 10 * 60 * 1000; // 10 minutes

/**
 * Creates a signed token containing user info.
 * This carries user data from the "Info" step to the "Verify" step statelessly.
 */
export async function createSignupToken(data: { email: string; name: string }) {
    return await new SignJWT(data)
        .setProtectedHeader({ alg: "HS256" })
        .setIssuedAt()
        .setExpirationTime("10m")
        .sign(key);
}

/**
 * Verifies a signup token and returns its payload if valid.
 */
export async function verifySignupToken(token: string) {
    try {
        const { payload } = await jwtVerify(token, key, {
            algorithms: ["HS256"],
        });
        return payload as { email: string; name: string };
    } catch (error) {
        return null;
    }
}

/**
 * Persists user data to Vercel KV (Redis).
 * Stores name, email, and timestamp.
 */
export async function saveUser(user: { name: string; email: string }) {
    try {
        const timestamp = new Date().toISOString();
        const userData = {
            ...user,
            lastLogin: timestamp
        };

        // 1. Store in Vercel KV (Primary)
        try {
            await kv.hset(`user:${user.email}`, userData);
            await kv.sadd('users', user.email);
        } catch (kvError) {
            console.error('KV Storage failed:', kvError);
        }

        // 2. Store in Local File (Backup/Local Dev)
        try {
            const dataDir = path.join(process.cwd(), 'data');
            const filePath = path.join(dataDir, 'users.json');

            let users = [];
            try {
                const content = await fs.readFile(filePath, 'utf-8');
                users = JSON.parse(content);
            } catch (e) {
                // If file doesnt exist, start with empty array
                users = [];
            }

            // Update or add user
            const index = users.findIndex((u: any) => u.email === user.email);
            if (index >= 0) {
                users[index] = { ...users[index], ...userData };
            } else {
                users.push(userData);
            }

            await fs.writeFile(filePath, JSON.stringify(users, null, 2));
        } catch (fsError) {
            // This will naturally fail on Vercel (read-only), which is fine
            console.warn('Local file storage skipped or failed:', fsError instanceof Error ? fsError.message : 'Unknown error');
        }

        return true;
    } catch (error) {
        console.error('General failure in saveUser:', error);
        return false;
    }
}
