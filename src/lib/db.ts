import postgres from 'postgres';

const databaseUrl = process.env.DATABASE_URL || 'postgres://postgres:postgres@localhost:5432/document_qa';

// Initialize the postgres client. It will automatically manage a connection pool.
export const sql = postgres(databaseUrl, {
  max: 10,
  idle_timeout: 20,
  connect_timeout: 10,
  // We can add ssl: 'require' or similar if needed for hosting providers
});

let dbInitialized = false;

/**
 * Initializes the database tables and extensions if they do not exist.
 */
export async function initDb() {
  if (dbInitialized) return;

  try {
    console.log('Initializing database schema...');
    
    // 1. Create pgvector extension
    await sql`CREATE EXTENSION IF NOT EXISTS vector;`;
    
    // 2. Create users table
    await sql`
      CREATE TABLE IF NOT EXISTS users (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        email TEXT UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `;

    // 3. Create folders table
    await sql`
      CREATE TABLE IF NOT EXISTS folders (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name TEXT NOT NULL,
        parent_id UUID REFERENCES folders(id) ON DELETE CASCADE,
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `;

    // 4. Create documents table
    await sql`
      CREATE TABLE IF NOT EXISTS documents (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name TEXT NOT NULL,
        file_size INTEGER NOT NULL,
        page_count INTEGER NOT NULL,
        folder_id UUID REFERENCES folders(id) ON DELETE SET NULL,
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        status TEXT NOT NULL DEFAULT 'processing',
        file_data BYTEA,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `;

    try {
      await sql`ALTER TABLE documents ADD COLUMN file_data BYTEA;`;
    } catch (e: any) {}

    // 5. Create document_chunks table with embedding
    await sql`
      CREATE TABLE IF NOT EXISTS document_chunks (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
        page_number INTEGER NOT NULL,
        text_content TEXT NOT NULL,
        embedding vector(768) NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `;

    // 6. Create conversations table
    await sql`
      CREATE TABLE IF NOT EXISTS conversations (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        title TEXT NOT NULL,
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        folder_id UUID REFERENCES folders(id) ON DELETE SET NULL,
        document_id UUID REFERENCES documents(id) ON DELETE SET NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `;

    // 7. Create messages table with citations JSON
    await sql`
      CREATE TABLE IF NOT EXISTS messages (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
        role TEXT NOT NULL,
        content TEXT NOT NULL,
        citations JSONB DEFAULT '[]'::jsonb,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `;

    // 8. Add index on vector embeddings for cosine similarity if not exists
    // (Note: HNSW is usually used for production, ivfflat or default B-tree/GIN for small scales.
    // We can just rely on standard scan for this project scale, or add an index later.)
    
    dbInitialized = true;
    console.log('Database schema initialization completed successfully.');
  } catch (error) {
    console.error('Failed to initialize database schema:', error);
    throw error;
  }
}

/**
 * Recursively fetches all folder IDs under a given parent folder ID (inclusive).
 * This implements the nested folders hierarchical querying requirement.
 */
export async function getSubfolderIds(parentFolderId: string, userId: string): Promise<string[]> {
  const result = await sql`
    WITH RECURSIVE subfolders AS (
      SELECT id FROM folders WHERE id = ${parentFolderId} AND user_id = ${userId}
      UNION ALL
      SELECT f.id FROM folders f
      INNER JOIN subfolders s ON f.parent_id = s.id
      WHERE f.user_id = ${userId}
    )
    SELECT id FROM subfolders;
  `;
  return result.map(row => row.id);
}
