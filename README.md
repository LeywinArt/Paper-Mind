# Paper-Mind

Paper-Mind is an AI-powered Full-Stack Document Q&A application built with modern web technologies. It allows users to upload documents and interactively ask questions about their content using Google's Gemini API and Retrieval-Augmented Generation (RAG).

## Features

- **Document Upload & Parsing**: Supports PDF, DOCX, and XLSX files.
- **AI-Powered Q&A**: Ask questions and get answers based on the contents of your uploaded documents.
- **RAG Architecture**: Uses embeddings to find relevant context from documents to provide accurate, context-aware answers.
- **Authentication**: Secure user registration and login using JWT.
- **Beautiful UI**: Modern, responsive design built with Tailwind CSS v4 and Astro.

## Tech Stack

- **Framework**: [Astro](https://astro.build/)
- **UI Library**: [React](https://react.dev/)
- **Styling**: [Tailwind CSS v4](https://tailwindcss.com/)
- **Database**: PostgreSQL
- **AI & Embeddings**: Google Gemini API (`@google/generative-ai`)
- **Authentication**: JSON Web Tokens (`jsonwebtoken`)
- **Document Processing**: `pdf-parse`, `mammoth`, `xlsx`

## Getting Started

### Prerequisites

- Node.js (v22.12.0 or higher)
- PostgreSQL running locally or via Docker
- A Google Gemini API Key (get one from [Google AI Studio](https://aistudio.google.com/))

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/LeywinArt/Paper-Mind.git
   cd Paper-Mind
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Configure environment variables:
   Copy `.env.example` to `.env` and fill in your details:
   ```bash
   cp .env.example .env
   ```
   *Note: Make sure to add your actual Gemini API Key and PostgreSQL connection string.*

4. Start the development server:
   ```bash
   npm run dev
   ```

5. Open your browser and navigate to `http://localhost:4321`.

## Project Structure

- `/src/pages` - Astro pages (routes) including API endpoints for Auth and Chat
- `/src/components` - React and Astro UI components
- `/src/layouts` - Astro layout templates
- `/src/lib` - Core logic including DB connection, Gemini integration, and document parsers
- `/public` - Static assets

## License

This project is licensed under the MIT License.
