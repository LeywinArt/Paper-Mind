import type { APIRoute } from 'astro';
import { sql, getSubfolderIds } from '@/lib/db';
import { getUserFromCookies } from '@/lib/auth';
import { getEmbedding, generateAnswer } from '@/lib/gemini';

export const POST: APIRoute = async ({ request, cookies }) => {
  const user = getUserFromCookies(cookies);
  if (!user) {
    return new Response(JSON.stringify({ message: 'Unauthorized.' }), { status: 401 });
  }

  try {
    const { query, conversation_id, context_type, context_id } = await request.json();

    if (!query || !query.trim()) {
      return new Response(
        JSON.stringify({ message: 'Query string is required.' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const trimmedQuery = query.trim();
    const contextType = context_type || 'all'; // 'all', 'folder', 'document'
    const contextId = context_id || null;
    let conversationId = conversation_id || null;

    // 1. Resolve or Create Conversation Session
    if (!conversationId) {
      // Generate a title based on the first few words of the query
      const title = trimmedQuery.length > 40 ? trimmedQuery.substring(0, 40) + '...' : trimmedQuery;
      
      const docId = contextType === 'document' ? contextId : null;
      const fldId = contextType === 'folder' ? contextId : null;

      const result = await sql`
        INSERT INTO conversations (title, user_id, folder_id, document_id)
        VALUES (${title}, ${user.userId}, ${fldId}, ${docId})
        RETURNING id
      `;
      conversationId = result[0].id;
    }

    // 2. Fetch Chat History (excluding the current user message being sent)
    const chatHistory = await sql`
      SELECT role, content 
      FROM messages 
      WHERE conversation_id = ${conversationId} 
      ORDER BY created_at ASC
    `;

    // 3. Generate Embedding for the User's Query
    const queryEmbedding = await getEmbedding(trimmedQuery);
    const queryEmbeddingString = `[${queryEmbedding.join(',')}]`;

    // 4. Retrieve Context Chunks using Cosine Distance (<=>) in pgvector
    let contextChunks: any[] = [];
    const limit = 5;

    if (contextType === 'document' && contextId) {
      // Single Document Context
      contextChunks = await sql`
        SELECT dc.text_content, dc.page_number, d.name as document_name, d.id as document_id, (dc.embedding <=> ${queryEmbeddingString}) as distance
        FROM document_chunks dc
        INNER JOIN documents d ON dc.document_id = d.id
        WHERE d.id = ${contextId} AND d.user_id = ${user.userId} AND d.status = 'processed'
        ORDER BY distance ASC
        LIMIT ${limit}
      `;
    } else if (contextType === 'folder' && contextId) {
      // Folder-level Context (Recursive nested folders)
      const subfolderIds = await getSubfolderIds(contextId, user.userId);
      
      if (subfolderIds.length > 0) {
        contextChunks = await sql`
          SELECT dc.text_content, dc.page_number, d.name as document_name, d.id as document_id, (dc.embedding <=> ${queryEmbeddingString}) as distance
          FROM document_chunks dc
          INNER JOIN documents d ON dc.document_id = d.id
          WHERE d.folder_id = ANY(${subfolderIds}) AND d.user_id = ${user.userId} AND d.status = 'processed'
          ORDER BY distance ASC
          LIMIT ${limit}
        `;
      }
    } else {
      // Entire Library Context
      contextChunks = await sql`
        SELECT dc.text_content, dc.page_number, d.name as document_name, d.id as document_id, (dc.embedding <=> ${queryEmbeddingString}) as distance
        FROM document_chunks dc
        INNER JOIN documents d ON dc.document_id = d.id
        WHERE d.user_id = ${user.userId} AND d.status = 'processed'
        ORDER BY distance ASC
        LIMIT ${limit}
      `;
    }

    // 5. Generate Answer using Gemini RAG Pipeline
    const mappedContext = contextChunks.map((c) => ({
      text_content: c.text_content,
      page_number: c.page_number,
      document_name: c.document_name,
      document_id: c.document_id,
    }));

    const formattedHistory = chatHistory.map((h) => ({
      role: h.role as 'user' | 'assistant',
      content: h.content,
    }));

    const { text, citations } = await generateAnswer(
      trimmedQuery,
      mappedContext,
      formattedHistory
    );

    // 6. Save both User Message and Assistant Message to database
    await sql.begin(async (tx) => {
      // Save User Message
      await tx`
        INSERT INTO messages (conversation_id, role, content)
        VALUES (${conversationId}, 'user', ${trimmedQuery})
      `;

      // Save Assistant Message with JSON citations array
      await tx`
        INSERT INTO messages (conversation_id, role, content, citations)
        VALUES (${conversationId}, 'assistant', ${text}, ${JSON.stringify(citations)})
      `;
    });

    return new Response(
      JSON.stringify({
        text,
        citations,
        conversationId,
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error: any) {
    console.error('Chat API Error:', error);
    return new Response(
      JSON.stringify({ message: error.message || 'Internal server error during chat processing.' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};
