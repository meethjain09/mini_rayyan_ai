export default function handler(req: any, res: any) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.status(200).json({
    status: 'healthy',
    hasGeminiKey: !!process.env.GEMINI_API_KEY,
    environment: 'vercel-serverless',
    timestamp: new Date().toISOString(),
  });
}
