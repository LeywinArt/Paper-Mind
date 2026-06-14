import type { APIRoute } from 'astro';
import { sql } from '@/lib/db';
import { getUserFromCookies } from '@/lib/auth';

export const GET: APIRoute = async ({ request, cookies, url }) => {
  const user = getUserFromCookies(cookies);
  if (!user) {
    return new Response(JSON.stringify({ message: 'Unauthorized.' }), { status: 401 });
  }

  const id = url.searchParams.get('id');
  if (!id) {
    return new Response(JSON.stringify({ message: 'Missing document ID.' }), { status: 400 });
  }

  try {
    const docs = await sql`SELECT name, file_data FROM documents WHERE id = ${id} AND user_id = ${user.userId}`;
    if (docs.length === 0) {
      return new Response(JSON.stringify({ message: 'Document not found.' }), { status: 404 });
    }

    const doc = docs[0];
    if (!doc.file_data) {
      return new Response(JSON.stringify({ message: 'Document file data not found. It may have been uploaded before this feature was added.' }), { status: 404 });
    }

    return new Response(doc.file_data, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `inline; filename="${doc.name}"`
      }
    });
  } catch (error: any) {
    console.error('Download error:', error);
    return new Response(JSON.stringify({ message: 'Internal Server Error' }), { status: 500 });
  }
};
