// OCR fallback for scanned (image-only) PDFs, using AWS Textract.
// Each page is rendered to a PNG by pdf-parse, then sent to Textract's
// AnalyzeDocument (synchronous, one page per call) to recover text lines.
// The reconstructed line text is fed back into the same heuristic parsers
// used for native-text PDFs, so downstream logic is identical.

let _client = null;

function getClient() {
  const region = process.env.AWS_REGION;
  if (!process.env.AWS_ACCESS_KEY_ID || !process.env.AWS_SECRET_ACCESS_KEY || !region) {
    const err = new Error(
      'This PDF appears to be scanned (no text layer). OCR requires AWS Textract, ' +
      'but AWS credentials are not configured. Set AWS_REGION, AWS_ACCESS_KEY_ID and ' +
      'AWS_SECRET_ACCESS_KEY, or upload a text-based PDF / Excel BQ instead.'
    );
    err.code = 'OCR_NOT_CONFIGURED';
    throw err;
  }
  if (!_client) {
    const { TextractClient } = require('@aws-sdk/client-textract');
    _client = new TextractClient({ region });
  }
  return _client;
}

// Reconstruct newline-separated text from Textract LINE blocks, ordered
// top-to-bottom then left-to-right so multi-column rate tables stay coherent.
function blocksToText(blocks) {
  const lines = blocks
    .filter(b => b.BlockType === 'LINE' && b.Text)
    .map(b => {
      const bb = b.Geometry?.BoundingBox || { Top: 0, Left: 0 };
      return { text: b.Text, top: bb.Top, left: bb.Left };
    })
    .sort((a, b) => (Math.abs(a.top - b.top) > 0.01 ? a.top - b.top : a.left - b.left));
  return lines.map(l => l.text).join('\n');
}

// pages: Array<{ data: Uint8Array, pageNumber: number }> from PDFParse.getScreenshot()
async function ocrScreenshots(pages) {
  const { AnalyzeDocumentCommand } = require('@aws-sdk/client-textract');
  const client = getClient();
  const out = [];
  for (const pg of pages) {
    const cmd = new AnalyzeDocumentCommand({
      Document: { Bytes: pg.data },
      FeatureTypes: ['TABLES'],
    });
    const resp = await client.send(cmd);
    out.push({ num: pg.pageNumber, text: blocksToText(resp.Blocks || []) });
  }
  return out;
}

module.exports = { ocrScreenshots };
