import type { APIRoute } from 'astro';
import { sql } from '@/lib/db';
import { getUserFromCookies } from '@/lib/auth';

/**
 * POST: Create a new folder or nested subfolder
 */
export const POST: APIRoute = async ({ request, cookies }) => {
  const user = getUserFromCookies(cookies);
  if (!user) {
    return new Response(JSON.stringify({ message: 'Unauthorized.' }), { status: 401 });
  }

  try {
    const { name, parent_id } = await request.json();
    if (!name || !name.trim()) {
      return new Response(
        JSON.stringify({ message: 'Folder name is required.' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const folderName = name.trim();
    const parentId = parent_id || null;

    // Check parent exists and belongs to user if provided
    if (parentId) {
      const parent = await sql`
        SELECT id FROM folders WHERE id = ${parentId} AND user_id = ${user.userId}
      `;
      if (parent.length === 0) {
        return new Response(
          JSON.stringify({ message: 'Parent folder not found.' }),
          { status: 400, headers: { 'Content-Type': 'application/json' } }
        );
      }
    }

    // Insert new folder
    const result = await sql`
      INSERT INTO folders (name, parent_id, user_id)
      VALUES (${folderName}, ${parentId}, ${user.userId})
      RETURNING id, name, parent_id
    `;

    return new Response(
      JSON.stringify({ message: 'Folder created successfully.', folder: result[0] }),
      { status: 201, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error: any) {
    console.error('Create folder API error:', error);
    return new Response(
      JSON.stringify({ message: 'Internal server error.' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};

/**
 * DELETE: Delete a folder.
 * Cascadely deletes subfolders at database level.
 */
export const DELETE: APIRoute = async ({ url, cookies }) => {
  const user = getUserFromCookies(cookies);
  if (!user) {
    return new Response(JSON.stringify({ message: 'Unauthorized.' }), { status: 401 });
  }

  try {
    const id = url.searchParams.get('id');
    if (!id) {
      return new Response(
        JSON.stringify({ message: 'Folder ID is required.' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Verify folder exists and belongs to user
    const folder = await sql`
      SELECT id FROM folders WHERE id = ${id} AND user_id = ${user.userId}
    `;

    if (folder.length === 0) {
      return new Response(
        JSON.stringify({ message: 'Folder not found or access denied.' }),
        { status: 404, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Delete folder
    await sql`
      DELETE FROM folders WHERE id = ${id} AND user_id = ${user.userId}
    `;

    return new Response(
      JSON.stringify({ message: 'Folder and subfolders deleted successfully.' }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error: any) {
    console.error('Delete folder API error:', error);
    return new Response(
      JSON.stringify({ message: 'Internal server error.' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};
