import type { APIRoute } from 'astro';
import { sql } from '@/lib/db';
import { getUserFromCookies } from '@/lib/auth';
import { parsePdf, chunkPdfPages } from '@/lib/pdf';
import { parseDocument } from '@/lib/documentParser';
import { getEmbedding } from '@/lib/gemini';

/**
 * Handles background document parsing, chunking, and embedding generation
 */
async function processDocumentInBackground(
  documentId: string,
  buffer: Buffer,
  fileName: string,
  userId: string
) {
  try {
    console.log(`[Background] Processing doc ${documentId}...`);
    
    // 1. Parse document pages based on file type
    const pages = await parseDocument(buffer, fileName);
    const pageCount = pages.length;

    // Update page count in the database
    await sql`
      UPDATE documents 
      SET page_count = ${pageCount} 
      WHERE id = ${documentId}
    `;

    // 2. Chunk pages into overlapping segments
    const chunks = chunkPdfPages(pages);
    console.log(`[Background] Generated ${chunks.length} chunks for doc ${documentId}`);

    // 3. Generate embeddings and save to DB in parallel batches
    const CONCURRENCY_LIMIT = 10;
    for (let i = 0; i < chunks.length; i += CONCURRENCY_LIMIT) {
      const batch = chunks.slice(i, i + CONCURRENCY_LIMIT);
      await Promise.all(batch.map(async (chunk) => {
        const embedding = await getEmbedding(chunk.text);
        
        // PostgreSQL pgvector expects an array string format: '[0.1, 0.2, ...]'
        const embeddingVectorString = `[${embedding.join(',')}]`;

        await sql`
          INSERT INTO document_chunks (document_id, page_number, text_content, embedding)
          VALUES (${documentId}, ${chunk.pageNumber}, ${chunk.text}, ${embeddingVectorString})
        `;
      }));
    }

    // 4. Set status to processed
    await sql`
      UPDATE documents 
      SET status = 'processed' 
      WHERE id = ${documentId}
    `;
    console.log(`[Background] Completed doc ${documentId} successfully.`);
  } catch (error) {
    console.error(`[Background] Failed to process doc ${documentId}:`, error);
    
    // Set status to failed
    await sql`
      UPDATE documents 
      SET status = 'failed' 
      WHERE id = ${documentId}
    `;
  }
}

/**
 * POST: Uploads a PDF, creates a processing entry, and kicks off background vectorization
 */
export const POST: APIRoute = async ({ request, cookies }) => {
  const user = getUserFromCookies(cookies);
  if (!user) {
    return new Response(JSON.stringify({ message: 'Unauthorized.' }), { status: 401 });
  }

  try {
    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const folderIdRaw = formData.get('folder_id') as string | null;
    const folderId = folderIdRaw && folderIdRaw.trim() !== '' ? folderIdRaw.trim() : null;

    if (!file || !(file instanceof File) || !file.name.match(/\.(pdf|docx|xlsx|xls|csv|txt|md)$/i)) {
      return new Response(
        JSON.stringify({ message: 'Please upload a valid document file (PDF, DOCX, XLSX, TXT, etc.).' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Verify folder belongs to user if specified
    if (folderId) {
      const folder = await sql`
        SELECT id FROM folders WHERE id = ${folderId} AND user_id = ${user.userId}
      `;
      if (folder.length === 0) {
        return new Response(
          JSON.stringify({ message: 'Target folder not found.' }),
          { status: 400, headers: { 'Content-Type': 'application/json' } }
        );
      }
    }

    const fileName = file.name;
    const fileSize = file.size;

    // Convert file stream to Buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Create a pending document record
    const result = await sql`
      INSERT INTO documents (name, file_size, page_count, folder_id, user_id, status, file_data)
      VALUES (${fileName}, ${fileSize}, 0, ${folderId}, ${user.userId}, 'processing', ${buffer})
      RETURNING id
    `;
    const documentId = result[0].id;

    // Kick off background job (do not await it, let it execute asynchronously)
    setTimeout(() => {
      processDocumentInBackground(documentId, buffer, file.name, user.userId).catch((err) => {
        console.error('Unhandled background task execution error:', err);
      });
    }, 0);

    return new Response(
      JSON.stringify({ 
        message: 'File upload accepted and processing started in background.', 
        documentId 
      }),
      { status: 202, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error: any) {
    console.error('Upload API error:', error);
    return new Response(
      JSON.stringify({ message: 'Internal server error during upload.' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};
