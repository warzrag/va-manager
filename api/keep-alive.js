export default async function handler(req, res) {
  const SUPABASE_URL = process.env.SUPABASE_URL;

  if (!SUPABASE_URL) {
    return res.status(500).json({
      status: 'error',
      message: 'server_misconfigured',
      timestamp: new Date().toISOString()
    });
  }

  try {
    const response = await fetch(`${SUPABASE_URL}/auth/v1/health`);

    return res.status(200).json({
      status: 'ok',
      supabase: 'alive',
      upstreamStatus: response.status,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    return res.status(500).json({
      status: 'error',
      message: error.message,
      timestamp: new Date().toISOString()
    });
  }
}
