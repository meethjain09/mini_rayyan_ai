import { executeEvidenceSynthesis, SynthesizeRequestBody } from '../src/services/evidenceSynthesizer';

export default async function handler(req: any, res: any) {
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,POST');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed. Use POST.' });
  }

  try {
    const { query, pico, bookTitle, includedRecords } = (req.body || {}) as SynthesizeRequestBody;

    if (!query || !query.trim()) {
      return res.status(400).json({ error: 'Clinical query or research question is required.' });
    }

    if (!includedRecords || includedRecords.length === 0) {
      return res.status(400).json({
        error: 'At least one included research article is required to formulate an evidence-based conclusion.',
      });
    }

    const result = await executeEvidenceSynthesis({
      query,
      pico,
      bookTitle,
      includedRecords,
    });

    return res.status(200).json({
      success: true,
      ...result,
    });
  } catch (error: any) {
    console.error('Vercel API synthesis error:', error);
    return res.status(500).json({
      error: 'An unexpected error occurred during evidence synthesis.',
      details: error.message,
    });
  }
}
