import { NextRequest, NextResponse } from 'next/server'

// Internal AI proxy — Lambda calls this instead of Bedrock
// Auth: requires X-Internal-Key header matching INTERNAL_AI_KEY env var
// This bypasses session auth since Lambda is a trusted internal caller

export async function POST(req: NextRequest) {
  try {
    const internalKey = req.headers.get('x-internal-key')
    if (!internalKey || internalKey !== (process.env.INTERNAL_AI_KEY || 'mcloud-internal-2026')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json()
    const { prompt, max_tokens = 2000, system } = body

    const apiKey = process.env.ANTHROPIC_API_KEY
    if (!apiKey) {
      return NextResponse.json({ error: 'API key not configured' }, { status: 500 })
    }

    const model = process.env.ANTHROPIC_MODEL || 'claude-sonnet-4-20250514'

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model,
        max_tokens,
        system: system || 'You are an expert medical coding and billing AI assistant.',
        messages: [{ role: 'user', content: prompt }],
      }),
    })

    if (!response.ok) {
      const err = await response.text()
      console.error('[ai-internal] Anthropic error:', response.status, err)
      return NextResponse.json({ error: 'AI service error', status: response.status }, { status: 502 })
    }

    const data = await response.json()
    const text = data.content?.map((c: any) => c.text || '').join('') || ''

    return NextResponse.json({ text, model, usage: data.usage })
  } catch (error) {
    console.error('[ai-internal] Error:', error)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
