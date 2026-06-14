import { parsePdf, type PdfPage } from './pdf';
import * as mammoth from 'mammoth';
import * as xlsx from 'xlsx';

export async function parseDocument(buffer: Buffer, filename: string): Promise<PdfPage[]> {
  const ext = filename.split('.').pop()?.toLowerCase();

  switch (ext) {
    case 'pdf':
      return await parsePdf(buffer);

    case 'docx':
      return await parseDocx(buffer);

    case 'xlsx':
    case 'xls':
    case 'csv':
      return parseExcel(buffer);

    case 'txt':
    case 'md':
      return parseTxt(buffer);

    default:
      throw new Error(`Unsupported file type: ${ext}`);
  }
}

async function parseDocx(buffer: Buffer): Promise<PdfPage[]> {
  const result = await mammoth.extractRawText({ buffer });
  return [
    {
      pageNumber: 1,
      text: result.value || '',
    },
  ];
}

function parseExcel(buffer: Buffer): PdfPage[] {
  const workbook = xlsx.read(buffer, { type: 'buffer' });
  const pages: PdfPage[] = [];
  
  workbook.SheetNames.forEach((sheetName, index) => {
    const sheet = workbook.Sheets[sheetName];
    // Convert sheet to CSV format text
    const text = xlsx.utils.sheet_to_csv(sheet);
    if (text.trim()) {
      pages.push({
        pageNumber: index + 1, // Treat each sheet as a separate "page"
        text: `Sheet: ${sheetName}\n${text}`,
      });
    }
  });

  return pages.length > 0 ? pages : [{ pageNumber: 1, text: '' }];
}

function parseTxt(buffer: Buffer): PdfPage[] {
  const text = buffer.toString('utf-8');
  return [
    {
      pageNumber: 1,
      text: text,
    },
  ];
}
