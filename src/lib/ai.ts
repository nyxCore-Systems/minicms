import { prisma } from './prisma'
import { getTenant } from './tenant'
import { decrypt } from './crypto'

/** Available OpenAI models with metadata for auto-selection */
const MODELS = {
  'gpt-4o-mini': { label: 'GPT-4o Mini', speed: 'schnell', quality: 'gut', seoRank: 1 },
  'gpt-4o': { label: 'GPT-4o', speed: 'mittel', quality: 'sehr gut', seoRank: 2 },
  'gpt-4.1-mini': { label: 'GPT-4.1 Mini', speed: 'sehr schnell', quality: 'gut', seoRank: 0 },
  'gpt-4.1': { label: 'GPT-4.1', speed: 'mittel', quality: 'exzellent', seoRank: 3 },
} as const

export type OpenAIModelId = keyof typeof MODELS

/** Best model for SEO: fast, cheap, good structured output */
const AUTO_SEO_MODEL: OpenAIModelId = 'gpt-4.1-mini'

export const MODEL_OPTIONS = [
  { value: 'auto', label: 'Automatisch (schnellstes & bestes für SEO)' },
  ...Object.entries(MODELS).map(([id, m]) => ({
    value: id,
    label: `${m.label} — ${m.speed}, ${m.quality}`,
  })),
]

interface AIConfig {
  apiKey: string
  model: OpenAIModelId
}

/**
 * Resolve the OpenAI API key and model from site settings (DB),
 * falling back to OPENAI_API_KEY env var.
 */
export async function getAIConfig(): Promise<AIConfig | null> {
  const tenant = await getTenant()

  if (tenant) {
    const settings = await prisma.siteSettings.findUnique({
      where: { tenantId: tenant.id },
      select: { openaiApiKeyEncrypted: true, openaiModel: true },
    })

    if (settings?.openaiApiKeyEncrypted) {
      try {
        const apiKey = decrypt(settings.openaiApiKeyEncrypted)
        const model = resolveModel(settings.openaiModel || 'auto')
        return { apiKey, model }
      } catch {
        // Decryption failed — fall through to env var
      }
    }
  }

  // Fallback to env var
  const envKey = process.env.OPENAI_API_KEY
  if (envKey) {
    return { apiKey: envKey, model: AUTO_SEO_MODEL }
  }

  return null
}

function resolveModel(model: string): OpenAIModelId {
  if (model === 'auto') return AUTO_SEO_MODEL
  if (model in MODELS) return model as OpenAIModelId
  return AUTO_SEO_MODEL
}
