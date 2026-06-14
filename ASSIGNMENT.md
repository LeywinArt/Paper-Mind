# AI Full-Stack Document Q&A App: Assignment Details & Architecture Guide

Welcome! This guide outlines the requirements for your **AI Full-Stack Document Q&A** web application, explains the modern tech stack selected for it, and breaks down the core concepts (RAG, Embeddings, Vector Databases) in a beginner-friendly way.

---

## 1. Assignment Overview & Requirements

The goal is to build a web application that allows users to upload PDF documents and interact with them using natural language.

### Core Requirements
1. **Authentication:** Register, Login, and Logout functionality (JWT-based).
2. **Document Management:**
   - Upload PDF documents.
   - List and view uploaded documents.
   - Delete documents.
   - View document metadata (file size, pages, upload date, processing status).
3. **AI-Powered Chat (RAG):**
   - Select a specific document or folder.
   - Ask natural language questions about the content.
   - Receive LLM-generated answers based *only* on the document content.
4. **Source Citations:** Include page numbers and snippets of text representing where the LLM retrieved the answers from.
5. **Chat History:** Save conversations so users can view and continue past chat sessions.
6. **User Interface:** A beautiful, responsive frontend with screens for login/register, document library, and the chat console.
7. **Deployment:** Dockerfile/Docker Compose configuration, environment variables, and setup instructions.

### Bonus / Brownie Points (Implemented in this project)
- **Folder Organization:** Organize documents into folders.
- **Folder-Level Chat:** Query all documents in a selected folder.
- **Nested Folders (Double Brownie Points):** Build a hierarchical folder structure. Querying a parent folder searches all its subfolders and their documents recursively.

---

## 2. Selected Tech Stack (Optimal & Latest)

For a beginner, the chosen stack is the industry standard for building modern AI applications. It balances simplicity, performance, and scalability.

```
                  ┌─────────────────────────────────────────┐
                  │          Frontend (Web Browser)         │
                  │   React + Vite + TypeScript + CSS       │
                  └────────────────────┬────────────────────┘
                                       │ (API Requests / JWT Auth)
                                       ▼
                  ┌─────────────────────────────────────────┐
                  │            Backend (API)                │
                  │          FastAPI (Python)               │
                  └──────┬─────────────┬─────────────┬──────┘
                         │             │             │
                         │ (SQL Query) │             │ (Embeddings & Chat)
                         ▼             │             ▼
 ┌─────────────────────────────────┐   │   ┌─────────────────────────────────┐
 │            Database             │   │   │         AI LLM Provider         │
 │     PostgreSQL + pgvector       │◄──┘   │           Gemini API            │
 └─────────────────────────────────┘       └─────────────────────────────────┘
```

### 1. Frontend: React + Vite + TypeScript
* **React:** The most popular web library for building interactive user interfaces.
* **Vite:** A blazing fast, modern development tool and bundler that makes frontend coding quick and painless.
* **TypeScript:** Adds type-safety to Javascript, helping prevent bugs before the code runs.

### 2. Backend: FastAPI (Python)
* **FastAPI:** A high-performance, modern Python web framework for building APIs.
* **Why it's optimal:** It automatically generates interactive API documentation (`/docs`), runs extremely fast, and integrates seamlessly with Python's rich ecosystem of AI libraries.

### 3. Database: PostgreSQL with `pgvector`
* **PostgreSQL:** An extremely reliable, enterprise-grade open-source relational database.
* **`pgvector` Extension:** Adds vector similarity search capabilities directly to PostgreSQL.
* **Why it's optimal:** Instead of needing a separate vector database (like Pinecone or Chroma), `pgvector` allows you to store users, folders, documents, chat messages, *and* document embeddings in **one single database**. This simplifies your project architecture immensely.

### 4. AI Provider: Google Gemini API (`gemini-1.5-flash`)
* **Gemini 1.5 Flash:** A state-of-the-art model from Google, known for its high speed, low cost, and exceptional context window.
* **Text Embeddings:** We use `models/text-embedding-004` to convert text into mathematical vector coordinates.

---

## 3. Explaining Key AI Concepts

As a beginner, here is how the RAG (Retrieval-Augmented Generation) process works under the hood.

### A. What is RAG?
Large Language Models (like Gemini) have a knowledge cutoff and don't know about your private documents. **RAG** solves this by:
1. Finding the parts of your documents that are relevant to the user's question (**Retrieval**).
2. Feeding those parts to the LLM as context (**Augmentation**).
3. Asking the LLM to write an answer using that context (**Generation**).

### B. What are Embeddings & Chunking?
* **Chunking:** A whole PDF is too big to send to the LLM all at once. We split the text of the PDF into smaller, overlapping sections (e.g., 500-1000 characters), which we call **chunks**. We keep track of which page each chunk came from.
* **Embeddings:** We send these text chunks to Gemini's embedding model. The model turns each chunk into a list of numbers (a **vector** of 768 dimensions). This vector represents the **semantic meaning** of the text. Chunks with similar meanings will have vectors close to each other in mathematical space.

### C. Vector Retrieval
1. When a user asks: *"What is the refund policy?"*, we convert their question into a **question embedding**.
2. We query our database using `pgvector` to find the chunks whose embeddings are closest to the question embedding (using cosine similarity).
3. The database returns the top-K matching text chunks, along with their page numbers.

### D. Generation with Citations
We construct a prompt for Gemini:
> "Answer the user's question using only the following excerpts. Cite the excerpt number [n] when referencing it.
> Excerpt [1] (Page 4): 'Refunds are issued within 14 days...'
> Question: What is the refund policy?"

Gemini generates a response like:
> "Refunds are processed within 14 days of purchase [1]."

---

## 4. Setup & Running Instructions (Docker)

To make running the project as easy as possible, the entire application has been containerized using Docker.

### Prerequisites
1. **Docker Desktop** installed on your computer.
2. A **Gemini API Key** (configured in your `.env` file).

### How to Run
1. Verify that your `.env` file has the `GEMINI_API_KEY` set.
2. Open your terminal in the `full-stack-assignment-main` directory and run:
   ```bash
   docker compose up --build
   ```
3. Once the build is complete:
   - **Frontend UI:** Open [http://localhost:3000](http://localhost:3000)
   - **Backend API & Interactive Docs:** Open [http://localhost:8000/docs](http://localhost:8000/docs)
