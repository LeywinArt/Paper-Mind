import type { APIRoute } from 'astro';

export const POST: APIRoute = async ({ cookies }) => {
  try {
    cookies.delete('token', { path: '/' });
    
    return new Response(
      JSON.stringify({ message: 'Logout successful.' }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error: any) {
    console.error('Logout API error:', error);
    return new Response(
      JSON.stringify({ message: 'Internal server error occurred.' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};
