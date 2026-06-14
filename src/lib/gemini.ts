import { GoogleGenerativeAI } from '@google/generative-ai';

const apiKey = process.env.GEMINI_API_KEY || '';

// Initialize the Google Generative AI SDK
// Note: If apiKey is empty, we will warn the user and throw error when called
export const genAI = apiKey ? new GoogleGenerativeAI(apiKey) : null;

/**
 * Generates a 768-dimensional vector embedding for the given text.
 */
export async function getEmbedding(text: string): Promise<number[]> {
  if (!genAI) {
    throw new Error('GEMINI_API_KEY is not set in environment variables.');
  }

  try {
    const model = genAI.getGenerativeModel({ model: 'gemini-embedding-001' });
    const result = await model.embedContent({
      content: { parts: [{ text }] },
      outputDimensionality: 768
    });
    if (!result.embedding || !result.embedding.values) {
      throw new Error('Failed to get embeddings: Empty response values.');
    }
    return result.embedding.values;
  } catch (error) {
    console.error('Error generating embedding:', error);
    throw error;
  }
}

interface ContextChunk {
  text_content: string;
  page_number: number;
  document_name: string;
  document_id: string;
}

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

/**
 * Generates an answer using gemini-1.5-flash, augmented with context chunks and chat history.
 * Enforces strict adherence to provided source context and requires citations.
 */
export async function generateAnswer(
  query: string,
  contextChunks: ContextChunk[],
  chatHistory: ChatMessage[] = []
): Promise<{ text: string; citations: Array<{ page: number; docName: string; docId: string; snippet: string }> }> {
  if (!genAI) {
    throw new Error('GEMINI_API_KEY is not set in environment variables.');
  }

  try {
    // 1. Prepare context text with reference indices
    const contextText = contextChunks
      .map(
        (chunk, idx) =>
          `Source [${idx + 1}] (Document: "${chunk.document_name}", Page: ${chunk.page_number}):\n${chunk.text_content}`
      )
      .join('\n\n');

    // 2. Build system instructions
    const systemInstruction = `You are a precise document Q&A assistant.
You must answer the user's question using ONLY the provided text sources.
For every claim or piece of information you provide, you MUST cite the source by appending its bracketed index, like [1], [2], etc. Multiple citations can be used if appropriate (e.g. [1][3]).
Only cite sources that directly back up the claim.
If the provided sources do not contain the answer, reply with: "I'm sorry, but I couldn't find the answer to that in the provided documents." Do not use outside knowledge.

Here are the text sources:
${contextText}`;

    const model = genAI.getGenerativeModel({
      model: 'gemini-3.5-flash',
      systemInstruction: systemInstruction,
      generationConfig: {
        temperature: 0.1, // low temperature for high precision and low hallucination
      },
    });

    // 3. Format history for Gemini (requires roles: 'user' | 'model')
    const formattedHistory = chatHistory.map((msg) => ({
      role: msg.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: msg.content }],
    }));

    // 4. Start chat session with instructions
    const chat = model.startChat({
      history: formattedHistory,
    });

    // 5. Send current question
    const result = await chat.sendMessage(query);
    const text = result.response.text();

    // 6. Map the citation numbers in the response text to actual source chunks
    // We will scan for patterns like [1], [2], etc.
    const citations: Array<{ page: number; docName: string; docId: string; snippet: string }> = [];
    const citationRegex = /\[(\d+)\]/g;
    let match;
    const seenIndices = new Set<number>();

    while ((match = citationRegex.exec(text)) !== null) {
      const idx = parseInt(match[1], 10) - 1;
      if (idx >= 0 && idx < contextChunks.length && !seenIndices.has(idx)) {
        seenIndices.add(idx);
        const chunk = contextChunks[idx];
        citations.push({
          page: chunk.page_number,
          docName: chunk.document_name,
          docId: chunk.document_id,
          snippet: chunk.text_content,
        });
      }
    }

    return {
      text,
      citations,
    };
  } catch (error) {
    console.error('Error generating answer:', error);
    throw error;
  }
}
