import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { getToken } from 'next-auth/jwt'
import OpenAI from 'openai'
import { IMPROVE_SYSTEM_PROMPT, buildImproveUserPrompt } from '@/lib/ai-prompts'
import { getAIConfig } from '@/lib/ai'

async function getSessionToken() {
  const cookieStore = await cookies()
  return getToken({
    req: {
      cookies: Object.fromEntries(
        cookieStore.getAll().map((c) => [c.name, c.value])
      ),
    } as any,
    secret: process.env.NEXTAUTH_SECRET,
  })
}

export async function POST(request: Request) {
  const token = await getSessionToken()
  if (!token) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const aiConfig = await getAIConfig()
  if (!aiConfig) {
    return NextResponse.json(
      { error: 'OpenAI API Key ist nicht konfiguriert. Bitte unter Seiteneinstellungen hinterlegen.' },
      { status: 500 }
    )
  }

  const body = await request.json()
  const { text, fieldType, context } = body

  if (!text || !fieldType) {
    return NextResponse.json(
      { error: 'text and fieldType are required' },
      { status: 400 }
    )
  }

  const openai = new OpenAI({ apiKey: aiConfig.apiKey })

  try {
    const result = await openai.chat.completions.create({
      model: aiConfig.model,
      temperature: 0.7,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: IMPROVE_SYSTEM_PROMPT },
        { role: 'user', content: buildImproveUserPrompt(text, fieldType, context) },
      ],
    })

    const content = result.choices[0]?.message?.content
    if (!content) {
      return NextResponse.json(
        { error: 'No response from AI model' },
        { status: 502 }
      )
    }

    const parsed: { improved: string } = JSON.parse(content)
    return NextResponse.json({ improved: parsed.improved })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'AI improvement failed'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
