# Paper-Mind Architecture

Paper-Mind is a Full-Stack AI Document Q&A application. This document outlines the system architecture, data flow, and the AI components powering the RAG (Retrieval-Augmented Generation) pipeline.

## High-Level Architecture Diagram

![Architecture Diagram](./Paper-Mind%20Architectural%20Diagram.png)

## Component Breakdown

### 1. Client Interface
- **Technologies**: Astro, React, Tailwind CSS v4.
- **Responsibility**: Provides the user interface for authenticating, uploading documents, and interacting with the chat assistant. React is used for dynamic client-side components like the chat window.

### 2. Backend Server
- **Technologies**: Astro API Routes (`/api/*`).
- **Responsibility**: Acts as a secure intermediary layer. It handles user authentication, receives document uploads, orchestrates document parsing (`pdf-parse`, `mammoth`, `xlsx`), and manages the chat requests. It securely holds API keys and database credentials without exposing them to the frontend.

### 3. Database & AI Services
- **Database**: PostgreSQL with the `pgvector` extension. Stores user data, document metadata, and high-dimensional vector embeddings of the document text chunks.
- **Embedding Model (`gemini-embedding-001`)**: Converts extracted document text into mathematical vectors that capture semantic meaning.
- **Language Model (`gemini-3.5-flash`)**: The core LLM that acts as the chat assistant. It takes the user's natural language query, combines it with the relevant document context retrieved from the database, and synthesizes an accurate response based solely on the uploaded files.

## Key Data Flows

1. **Authentication Flow**: User submits credentials -> Auth API -> PostgreSQL (Users table).
2. **Document Ingestion**: User uploads file -> Doc API extracts text -> Text is chunked and vectorized by Embedding Model -> Vector chunks are saved in pgvector.
3. **RAG Chat Pipeline**: User asks question -> Chat API vectorizes the query -> Similarity search is performed in pgvector -> Top most relevant chunks are passed as context to Gemini 3.5 Flash -> Final synthesized answer is returned to the user.
