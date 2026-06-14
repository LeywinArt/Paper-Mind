import type { APIRoute } from 'astro';
import { sql } from '@/lib/db';
import { hashPassword } from '@/lib/auth';

export const POST: APIRoute = async ({ request }) => {
  try {
    const { email, password } = await request.json();

    if (!email || !password) {
      return new Response(
        JSON.stringify({ message: 'Email and password are required.' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const emailTrimmed = email.trim().toLowerCase();

    // Check if user already exists
    const existing = await sql`
      SELECT id FROM users WHERE email = ${emailTrimmed}
    `;

    if (existing.length > 0) {
      return new Response(
        JSON.stringify({ message: 'Email is already registered.' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Hash password and save
    const passwordHash = hashPassword(password);

    await sql`
      INSERT INTO users (email, password_hash)
      VALUES (${emailTrimmed}, ${passwordHash})
    `;

    return new Response(
      JSON.stringify({ message: 'User registered successfully.' }),
      { status: 201, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error: any) {
    console.error('Registration API error:', error);
    return new Response(
      JSON.stringify({ message: 'Internal server error occurred.' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};
