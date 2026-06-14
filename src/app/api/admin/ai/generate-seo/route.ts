import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { getToken } from 'next-auth/jwt'
import OpenAI from 'openai'
import {
  SEO_SYSTEM_PROMPT,
  buildSeoUserPrompt,
  FAQ_SYSTEM_PROMPT,
  buildFaqUserPrompt,
  type SeoData,
  type FaqData,
} from '@/lib/ai-prompts'
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
  const { content, slug, title, currentMeta } = body

  if (!content || !slug || !title) {
    return NextResponse.json(
      { error: 'content, slug, and title are required' },
      { status: 400 }
    )
  }

  const openai = new OpenAI({ apiKey: aiConfig.apiKey })

  try {
    const [seoResult, faqResult] = await Promise.all([
      openai.chat.completions.create({
        model: aiConfig.model,
        temperature: 0.7,
        response_format: { type: 'json_object' },
        messages: [
          { role: 'system', content: SEO_SYSTEM_PROMPT },
          {
            role: 'user',
            content: buildSeoUserPrompt(content, slug, title, currentMeta),
          },
        ],
      }),
      openai.chat.completions.create({
        model: aiConfig.model,
        temperature: 0.7,
        response_format: { type: 'json_object' },
        messages: [
          { role: 'system', content: FAQ_SYSTEM_PROMPT },
          {
            role: 'user',
            content: buildFaqUserPrompt(content, slug, title),
          },
        ],
      }),
    ])

    const seoContent = seoResult.choices[0]?.message?.content
    const faqContent = faqResult.choices[0]?.message?.content

    if (!seoContent || !faqContent) {
      return NextResponse.json(
        { error: 'No response from AI model' },
        { status: 502 }
      )
    }

    const seoData: SeoData = JSON.parse(seoContent)
    const faqData: FaqData = JSON.parse(faqContent)

    return NextResponse.json({
      metaTitle: seoData.metaTitle,
      metaDescription: seoData.metaDescription,
      metaKeywords: seoData.metaKeywords,
      faqItems: faqData.faqs,
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'AI generation failed'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
