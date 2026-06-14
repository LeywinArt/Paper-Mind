import type { APIRoute } from 'astro';
import { sql } from '@/lib/db';
import { verifyPassword, generateToken } from '@/lib/auth';

export const POST: APIRoute = async ({ request, cookies }) => {
  try {
    const { email, password } = await request.json();

    if (!email || !password) {
      return new Response(
        JSON.stringify({ message: 'Email and password are required.' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const emailTrimmed = email.trim().toLowerCase();

    // Fetch user
    const users = await sql`
      SELECT id, email, password_hash FROM users WHERE email = ${emailTrimmed}
    `;

    if (users.length === 0) {
      return new Response(
        JSON.stringify({ message: 'Invalid credentials.' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const user = users[0];

    // Verify password
    const isValid = verifyPassword(password, user.password_hash);
    if (!isValid) {
      return new Response(
        JSON.stringify({ message: 'Invalid credentials.' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Generate token
    const token = generateToken({ userId: user.id, email: user.email });

    // Set cookie
    cookies.set('token', token, {
      path: '/',
      httpOnly: true,
      secure: false, // Set to true in production with HTTPS
      maxAge: 60 * 60 * 24 * 7, // 7 days
      sameSite: 'lax',
    });

    return new Response(
      JSON.stringify({ message: 'Login successful.' }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error: any) {
    console.error('Login API error:', error);
    return new Response(
      JSON.stringify({ message: 'Internal server error occurred.' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};
