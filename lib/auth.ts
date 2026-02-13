import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";

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

export const VERIFICATION_EXPIRY_MS = 10 * 60 * 1000; // 10 minutes

export function generateOTP() {
    return Math.floor(100000 + Math.random() * 900000).toString();
}

/**
 * Creates a signed verification token containing the OTP and user info.
 * This allows us to verify the code without storing it on a server filesystem or DB.
 */
export async function createVerificationToken(data: { email: string; name: string; code: string }) {
    return await new SignJWT(data)
        .setProtectedHeader({ alg: "HS256" })
        .setIssuedAt()
        .setExpirationTime("10m")
        .sign(key);
}

/**
 * Verifies a verification token and returns its payload if valid.
 */
export async function verifyVerificationToken(token: string) {
    try {
        const { payload } = await jwtVerify(token, key, {
            algorithms: ["HS256"],
        });
        return payload as { email: string; name: string; code: string };
    } catch (error) {
        return null;
    }
}
