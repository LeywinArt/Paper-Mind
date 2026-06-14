import type { APIRoute } from 'astro';
import { sql } from '@/lib/db';
import { getUserFromCookies } from '@/lib/auth';

/**
 * GET: Retrieves the user's conversation list OR conversation messages (with citations)
 */
export const GET: APIRoute = async ({ url, cookies }) => {
  const user = getUserFromCookies(cookies);
  if (!user) {
    return new Response(JSON.stringify({ message: 'Unauthorized.' }), { status: 401 });
  }

  try {
    const conversationId = url.searchParams.get('conversation_id');

    if (conversationId) {
      // 1. Fetch details & messages for a specific conversation
      const conversation = await sql`
        SELECT * FROM conversations 
        WHERE id = ${conversationId} AND user_id = ${user.userId}
      `;

      if (conversation.length === 0) {
        return new Response(
          JSON.stringify({ message: 'Conversation not found.' }),
          { status: 404, headers: { 'Content-Type': 'application/json' } }
        );
      }

      const messages = await sql`
        SELECT id, role, content, citations, created_at
        FROM messages
        WHERE conversation_id = ${conversationId}
        ORDER BY created_at ASC
      `;

      // Aggregate all citations in order to build the historical citations pool
      const allCitations: any[] = [];
      messages.forEach((msg) => {
        if (msg.role === 'assistant' && Array.isArray(msg.citations)) {
          allCitations.push(...msg.citations);
        }
      });

      return new Response(
        JSON.stringify({
          conversation: conversation[0],
          messages,
          allCitations,
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    } else {
      // 2. Fetch list of all conversations for the user
      const list = await sql`
        SELECT * FROM conversations 
        WHERE user_id = ${user.userId} 
        ORDER BY created_at DESC
      `;
      return new Response(JSON.stringify(list), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }
  } catch (error: any) {
    console.error('Fetch chat history error:', error);
    return new Response(
      JSON.stringify({ message: 'Internal server error.' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};

/**
 * DELETE: Deletes a chat session
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
        JSON.stringify({ message: 'Session ID is required.' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const conv = await sql`
      SELECT id FROM conversations WHERE id = ${id} AND user_id = ${user.userId}
    `;

    if (conv.length === 0) {
      return new Response(
        JSON.stringify({ message: 'Conversation not found or access denied.' }),
        { status: 404, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Delete conversation (cascade deletes messages)
    await sql`
      DELETE FROM conversations WHERE id = ${id} AND user_id = ${user.userId}
    `;

    return new Response(
      JSON.stringify({ message: 'Conversation deleted successfully.' }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error: any) {
    console.error('Delete chat session error:', error);
    return new Response(
      JSON.stringify({ message: 'Internal server error.' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};
