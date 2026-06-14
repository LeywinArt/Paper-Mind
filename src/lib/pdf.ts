import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const pdfParseModule = require('pdf-parse');
let pdfParse = pdfParseModule;
while (pdfParse && typeof pdfParse !== 'function' && (pdfParse as any).default) {
  pdfParse = (pdfParse as any).default;
}

export interface PdfPage {
  pageNumber: number;
  text: string;
}

export interface TextChunk {
  pageNumber: number;
  text: string;
}

/**
 * Parses a PDF buffer and returns an array of page texts.
 */
export async function parsePdf(buffer: Buffer): Promise<PdfPage[]> {
  const pages: string[] = [];

  // Custom pagerender to capture text from each page separately
  async function pagerender(pageData: any) {
    const textContent = await pageData.getTextContent();
    let lastY = null;
    let text = '';
    
    for (const item of textContent.items) {
      if (lastY === item.transform[5] || lastY === null) {
        text += item.str;
      } else {
        text += '\n' + item.str;
      }
      lastY = item.transform[5];
    }
    
    pages.push(text);
    return text;
  }

  try {
    await pdfParse(buffer, { pagerender });
  } catch (error) {
    console.error('Error parsing PDF:', error);
    throw error;
  }

  return pages.map((text, index) => ({
    pageNumber: index + 1,
    text: text || '',
  }));
}

/**
 * Chunks PDF pages into overlapping sections.
 * Guarantees that each chunk is mapped to exactly one page for accurate citation.
 */
export function chunkPdfPages(pages: PdfPage[], chunkSize = 800, overlap = 150): TextChunk[] {
  const chunks: TextChunk[] = [];

  for (const page of pages) {
    const text = page.text.replace(/\s+/g, ' ').trim(); // Normalize whitespace
    if (!text) continue;

    if (text.length <= chunkSize) {
      chunks.push({
        pageNumber: page.pageNumber,
        text,
      });
      continue;
    }

    let start = 0;
    while (start < text.length) {
      let end = start + chunkSize;
      
      // If we're not at the end, try to break at a space boundary to prevent cutting words
      if (end < text.length) {
        const nextSpace = text.indexOf(' ', end - 20);
        if (nextSpace !== -1 && nextSpace < end + 20) {
          end = nextSpace;
        }
      } else {
        end = text.length;
      }

      const chunkText = text.substring(start, end).trim();
      if (chunkText) {
        chunks.push({
          pageNumber: page.pageNumber,
          text: chunkText,
        });
      }

      start = end - overlap;
      if (start >= text.length || end >= text.length) {
        break;
      }
      
      // Safety guard against infinite loops
      if (end <= start) {
        start = end;
      }
    }
  }

  return chunks;
}
