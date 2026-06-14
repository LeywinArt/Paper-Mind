import { chunkPdfPages, type PdfPage } from '../lib/pdf.js';

/**
 * Basic tests to verify that libraries load and execute correctly
 */
async function testPdfChunking() {
  console.log('Testing PDF text chunking logic...');
  
  const mockPages: PdfPage[] = [
    {
      pageNumber: 1,
      text: 'This is page one text. It contains some basic information. This is to test if the chunking works correctly and respects page limits.'
    },
    {
      pageNumber: 2,
      text: 'This is page two text. We want to ensure that chunking page two text creates chunks that are linked exclusively to page 2, not page 1.'
    }
  ];

  const chunks = chunkPdfPages(mockPages, 40, 10);
  
  console.log(`Generated ${chunks.length} chunks.`);
  
  let passed = true;
  for (const chunk of chunks) {
    console.log(` - Chunk (Page ${chunk.pageNumber}): "${chunk.text}"`);
    if (chunk.pageNumber === 1 && chunk.text.includes('page two')) {
      passed = false;
      console.error('FAIL: Chunk from page 1 contains text from page 2!');
    }
    if (chunk.pageNumber === 2 && chunk.text.includes('page one')) {
      passed = false;
      console.error('FAIL: Chunk from page 2 contains text from page 1!');
    }
  }

  if (passed && chunks.length > 0) {
    console.log('SUCCESS: PDF page chunking verification passed.');
    return true;
  } else {
    console.error('FAIL: PDF page chunking verification failed.');
    return false;
  }
}

async function verifyEnvironment() {
  console.log('Verifying environment variables...');
  const geminiKey = process.env.GEMINI_API_KEY;
  if (!geminiKey) {
    console.warn('WARNING: GEMINI_API_KEY is not set. Embedding and QA pipelines will fail at runtime.');
  } else {
    console.log('SUCCESS: GEMINI_API_KEY is configured.');
  }

  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl) {
    console.log('DATABASE_URL is not set. Defaulting to: postgres://postgres:postgres@localhost:5432/document_qa');
  } else {
    console.log(`DATABASE_URL is set: ${dbUrl}`);
  }
}

async function main() {
  console.log('=== STARTING INTEGRATION VERIFICATION ===');
  await verifyEnvironment();
  console.log('');
  const chunkSuccess = await testPdfChunking();
  console.log('');
  if (chunkSuccess) {
    console.log('=== VERIFICATION COMPLETED: ALL LOCAL CHECKS PASSED ===');
  } else {
    console.error('=== VERIFICATION FAILED ===');
    process.exit(1);
  }
}

main().catch(err => {
  console.error('Verification crashed:', err);
  process.exit(1);
});
