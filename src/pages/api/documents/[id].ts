import type { APIRoute } from 'astro';
import { sql } from '@/lib/db';
import { getUserFromCookies } from '@/lib/auth';

/**
 * DELETE: Deletes a document by ID.
 * Cascade deletes its text chunks and vector embeddings at database level.
 */
export const DELETE: APIRoute = async ({ params, cookies }) => {
  const user = getUserFromCookies(cookies);
  if (!user) {
    return new Response(JSON.stringify({ message: 'Unauthorized.' }), { status: 401 });
  }

  try {
    const id = params.id;
    if (!id) {
      return new Response(
        JSON.stringify({ message: 'Document ID is required.' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Verify document exists and belongs to user
    const doc = await sql`
      SELECT id FROM documents WHERE id = ${id} AND user_id = ${user.userId}
    `;

    if (doc.length === 0) {
      return new Response(
        JSON.stringify({ message: 'Document not found or access denied.' }),
        { status: 404, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Delete document (associated document_chunks will cascade delete)
    await sql`
      DELETE FROM documents WHERE id = ${id} AND user_id = ${user.userId}
    `;

    return new Response(
      JSON.stringify({ message: 'Document and vectorized knowledge deleted successfully.' }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error: any) {
    console.error('Delete document API error:', error);
    return new Response(
      JSON.stringify({ message: 'Internal server error.' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};
