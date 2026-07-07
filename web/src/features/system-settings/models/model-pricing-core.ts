/*
Copyright (C) 2023-2026 QuantumNous

This program is free software: you can redistribute it and/or modify
it under the terms of the GNU Affero General Public License as
published by the Free Software Foundation, either version 3 of the
License, or (at your option) any later version.

This program is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
GNU Affero General Public License for more details.

You should have received a copy of the GNU Affero General Public License
along with this program. If not, see <https://www.gnu.org/licenses/>.

For commercial licensing, please contact support@quantumnous.com
*/
import * as z from 'zod'

import {
  formatPricingAmount,
  USD_PRICING_CURRENCY,
  type PricingCurrency,
} from '@/features/model-pricing/currency'
import type {
  CacheWriteMode,
  LegacyBillingDetails,
} from '@/features/model-pricing/pricing'
import { combineBillingExpr } from '@/features/pricing/lib/billing-expr'
import { formatBillingCondition } from '@/features/pricing/lib/billing-expression/condition-display'

import { safeJsonParse } from '../utils/json-parser'
import { formatPricingNumber } from './pricing-format'

export const createModelPricingSchema = (t: (key: string) => string) =>
  z.object({
    name: z.string().min(1, t('Model name is required')),
    price: z.string().optional(),
    ratio: z.string().optional(),
    cacheRatio: z.string().optional(),
    createCacheRatio: z.string().optional(),
    completionRatio: z.string().optional(),
    imageRatio: z.string().optional(),
    audioRatio: z.string().optional(),
    audioCompletionRatio: z.string().optional(),
  })

export type ModelPricingFormValues = z.infer<
  ReturnType<typeof createModelPricingSchema>
>

export type PricingMode = 'per-token' | 'per-request' | 'tiered_expr'

export type LaneKey =
  | 'completion'
  | 'cache'
  | 'createCache'
  | 'image'
  | 'audioInput'
  | 'audioOutput'

export type ModelRatioData = {
  pluginBillingExpr?: Record<string, string>
  name: string
  price?: string
  ratio?: string
  cacheRatio?: string
  createCacheRatio?: string
  completionRatio?: string
  imageRatio?: string
  audioRatio?: string
  audioCompletionRatio?: string
  billingMode?: PricingMode
  billingExpr?: string
  requestRuleExpr?: string
}

export type ModelPricingOptionInput = {
  modelPrice: string
  modelRatio: string
  cacheRatio: string
  createCacheRatio: string
  completionRatio: string
  imageRatio: string
  audioRatio: string
  audioCompletionRatio: string
  billingMode: string
  billingExpr: string
}

export type ModelPricingOptionUpdates = {
  ModelPrice: string
  ModelRatio: string
  CacheRatio: string
  CreateCacheRatio: string
  CompletionRatio: string
  ImageRatio: string
  AudioRatio: string
  AudioCompletionRatio: string
  'billing_setting.billing_mode': string
  'billing_setting.billing_expr': string
}

export type PreviewRow = {
  unit?: 'image' | 'none'
  key: string
  label: string
  value: string
  multiline?: boolean
}

export const EMPTY_LANE_PRICES: Record<LaneKey, string> = {
  completion: '',
  cache: '',
  createCache: '',
  image: '',
  audioInput: '',
  audioOutput: '',
}

export const EMPTY_LANE_ENABLED: Record<LaneKey, boolean> = {
  completion: false,
  cache: false,
  createCache: false,
  image: false,
  audioInput: false,
  audioOutput: false,
}

export const ratioFieldByLane: Record<LaneKey, keyof ModelPricingFormValues> = {
  completion: 'completionRatio',
  cache: 'cacheRatio',
  createCache: 'createCacheRatio',
  image: 'imageRatio',
  audioInput: 'audioRatio',
  audioOutput: 'audioCompletionRatio',
}

export const laneConfigs: Array<{
  key: LaneKey
  titleKey: string
  descriptionKey: string
  placeholder: string
}> = [
  {
    key: 'completion',
    titleKey: 'Completion price',
    descriptionKey: 'Output token price for generated tokens.',
    placeholder: '15',
  },
  {
    key: 'cache',
    titleKey: 'Cache read price',
    descriptionKey: 'Token price for cache reads.',
    placeholder: '0.3',
  },
  {
    key: 'createCache',
    titleKey: 'Cache write price',
    descriptionKey: 'Token price for creating cache entries.',
    placeholder: '3.75',
  },
  {
    key: 'image',
    titleKey: 'Image input price',
    descriptionKey: 'Token price for image input.',
    placeholder: '2.5',
  },
  {
    key: 'audioInput',
    titleKey: 'Audio input price',
    descriptionKey: 'Token price for audio input.',
    placeholder: '3.81',
  },
  {
    key: 'audioOutput',
    titleKey: 'Audio output price',
    descriptionKey: 'Token price for audio output.',
    placeholder: '15.11',
  },
]

export function hasValue(value: unknown): boolean {
  return (
    value !== '' && value !== null && value !== undefined && value !== false
  )
}

export function toNumberOrNull(value: unknown): number | null {
  if (!hasValue(value) && value !== 0) return null
  const num = Number(value)
  return Number.isFinite(num) ? num : null
}

export function buildModelPricingOptionUpdates({
  current,
  data,
  targetNames = [data.name],
}: {
  current: ModelPricingOptionInput
  data: ModelRatioData
  targetNames?: string[]
}): ModelPricingOptionUpdates {
  const priceMap = safeJsonParse<Record<string, number>>(current.modelPrice, {
    fallback: {},
    silent: true,
  })
  const ratioMap = safeJsonParse<Record<string, number>>(current.modelRatio, {
    fallback: {},
    silent: true,
  })
  const cacheMap = safeJsonParse<Record<string, number>>(current.cacheRatio, {
    fallback: {},
    silent: true,
  })
  const createCacheMap = safeJsonParse<Record<string, number>>(
    current.createCacheRatio,
    { fallback: {}, silent: true }
  )
  const completionMap = safeJsonParse<Record<string, number>>(
    current.completionRatio,
    { fallback: {}, silent: true }
  )
  const imageMap = safeJsonParse<Record<string, number>>(current.imageRatio, {
    fallback: {},
    silent: true,
  })
  const audioMap = safeJsonParse<Record<string, number>>(current.audioRatio, {
    fallback: {},
    silent: true,
  })
  const audioCompletionMap = safeJsonParse<Record<string, number>>(
    current.audioCompletionRatio,
    { fallback: {}, silent: true }
  )
  const billingModeMap = safeJsonParse<Record<string, string>>(
    current.billingMode,
    { fallback: {}, silent: true }
  )
  const billingExprMap = safeJsonParse<Record<string, string>>(
    current.billingExpr,
    { fallback: {}, silent: true }
  )

  const setIfPresent = (
    target: Record<string, number>,
    name: string,
    value: string | undefined
  ) => {
    if (!value || value === '') return
    const parsed = Number.parseFloat(value)
    if (Number.isFinite(parsed)) target[name] = parsed
  }

  targetNames.forEach((name) => {
    delete priceMap[name]
    delete ratioMap[name]
    delete cacheMap[name]
    delete createCacheMap[name]
    delete completionMap[name]
    delete imageMap[name]
    delete audioMap[name]
    delete audioCompletionMap[name]
    delete billingModeMap[name]
    delete billingExprMap[name]

    const mode =
      data.billingMode ||
      (data.price && data.price !== '' ? 'per-request' : 'per-token')

    if (mode === 'tiered_expr') {
      const combined = combineBillingExpr(
        data.billingExpr || '',
        data.requestRuleExpr || ''
      )
      if (combined) {
        billingModeMap[name] = 'tiered_expr'
        billingExprMap[name] = combined
      }
      setIfPresent(priceMap, name, data.price)
      setIfPresent(ratioMap, name, data.ratio)
      setIfPresent(cacheMap, name, data.cacheRatio)
      setIfPresent(createCacheMap, name, data.createCacheRatio)
      setIfPresent(completionMap, name, data.completionRatio)
      setIfPresent(imageMap, name, data.imageRatio)
      setIfPresent(audioMap, name, data.audioRatio)
      setIfPresent(audioCompletionMap, name, data.audioCompletionRatio)
      return
    }

    if (mode === 'per-request') {
      setIfPresent(priceMap, name, data.price)
      return
    }

    setIfPresent(ratioMap, name, data.ratio)
    setIfPresent(cacheMap, name, data.cacheRatio)
    setIfPresent(createCacheMap, name, data.createCacheRatio)
    setIfPresent(completionMap, name, data.completionRatio)
    setIfPresent(imageMap, name, data.imageRatio)
    setIfPresent(audioMap, name, data.audioRatio)
    setIfPresent(audioCompletionMap, name, data.audioCompletionRatio)
  })

  return {
    ModelPrice: JSON.stringify(priceMap, null, 2),
    ModelRatio: JSON.stringify(ratioMap, null, 2),
    CacheRatio: JSON.stringify(cacheMap, null, 2),
    CreateCacheRatio: JSON.stringify(createCacheMap, null, 2),
    CompletionRatio: JSON.stringify(completionMap, null, 2),
    ImageRatio: JSON.stringify(imageMap, null, 2),
    AudioRatio: JSON.stringify(audioMap, null, 2),
    AudioCompletionRatio: JSON.stringify(audioCompletionMap, null, 2),
    'billing_setting.billing_mode': JSON.stringify(billingModeMap, null, 2),
    'billing_setting.billing_expr': JSON.stringify(billingExprMap, null, 2),
  }
}

function ratioToBasePrice(ratio: unknown): string {
  const num = toNumberOrNull(ratio)
  if (num === null) return ''
  return formatPricingNumber(num * 2)
}

function deriveLanePrice(
  ratio: unknown,
  denominator: unknown,
  fallback = ''
): string {
  const ratioNumber = toNumberOrNull(ratio)
  const denominatorNumber = toNumberOrNull(denominator)
  if (ratioNumber === null || denominatorNumber === null) return fallback
  return formatPricingNumber(ratioNumber * denominatorNumber)
}

export function createInitialLaneState(data?: ModelRatioData | null) {
  if (!data) {
    return {
      promptPrice: '',
      prices: { ...EMPTY_LANE_PRICES },
      enabled: { ...EMPTY_LANE_ENABLED },
    }
  }

  const promptPrice = ratioToBasePrice(data.ratio)
  const audioInputPrice = deriveLanePrice(data.audioRatio, promptPrice)
  const prices: Record<LaneKey, string> = {
    completion: deriveLanePrice(data.completionRatio, promptPrice),
    cache: deriveLanePrice(data.cacheRatio, promptPrice),
    createCache: deriveLanePrice(data.createCacheRatio, promptPrice),
    image: deriveLanePrice(data.imageRatio, promptPrice),
    audioInput: audioInputPrice,
    audioOutput: deriveLanePrice(data.audioCompletionRatio, audioInputPrice),
  }

  return {
    promptPrice,
    prices,
    enabled: {
      completion: hasValue(data.completionRatio),
      cache: hasValue(data.cacheRatio),
      createCache: hasValue(data.createCacheRatio),
      image: hasValue(data.imageRatio),
      audioInput: hasValue(data.audioRatio),
      audioOutput: hasValue(data.audioCompletionRatio),
    },
  }
}

export function buildPreviewRows(
  values: ModelPricingFormValues,
  mode: PricingMode,
  billingExpr: string,
  requestRuleExpr: string,
  promptPrice: string,
  lanePrices: Record<LaneKey, string>,
  laneEnabled: Record<LaneKey, boolean>,
  t: (key: string) => string,
  currency: PricingCurrency = USD_PRICING_CURRENCY,
  cacheWriteMode?: CacheWriteMode,
  billingDetails?: LegacyBillingDetails
): PreviewRow[] {
  if (mode === 'tiered_expr') {
    const effectiveExpr = combineBillingExpr(billingExpr, requestRuleExpr)
    return [
      { key: 'mode', label: t('Pricing'), value: t('Expression') },
      {
        key: 'expr',
        label: `${t('Expression')} (USD)`,
        value: effectiveExpr || t('Empty'),
        multiline: true,
      },
    ]
  }

  if (mode === 'per-request') {
    return [
      {
        key: 'price',
        label: billingDetails?.image_count
          ? t('Price per image')
          : t('Fixed price'),
        ...(billingDetails?.image_count ? { unit: 'image' as const } : {}),
        value: values.price
          ? formatPricingAmount(values.price, currency)
          : t('Empty'),
      },
      ...pricingAdjustmentRows(billingDetails, t),
    ]
  }

  let audioInputValue =
    laneEnabled.audioInput && lanePrices.audioInput
      ? formatPricingAmount(lanePrices.audioInput, currency)
      : t('Empty')
  let audioOutputValue =
    laneEnabled.audioOutput && lanePrices.audioOutput
      ? formatPricingAmount(lanePrices.audioOutput, currency)
      : t('Empty')
  if (billingDetails?.audio_input_price !== undefined) {
    audioInputValue = formatPricingAmount(
      billingDetails.audio_input_price,
      currency
    )
  }
  if (billingDetails?.audio_output_price !== undefined) {
    audioOutputValue = formatPricingAmount(
      billingDetails.audio_output_price,
      currency
    )
  }
  const rows: PreviewRow[] = [
    {
      key: 'inputPrice',
      label: t('Input price'),
      value: promptPrice
        ? formatPricingAmount(promptPrice, currency)
        : t('Empty'),
    },
    {
      key: 'completion',
      label: t('Completion price'),
      value:
        laneEnabled.completion && lanePrices.completion
          ? formatPricingAmount(lanePrices.completion, currency)
          : t('Empty'),
    },
    {
      key: 'cache',
      label: t('Cache read price'),
      value:
        laneEnabled.cache && lanePrices.cache
          ? formatPricingAmount(lanePrices.cache, currency)
          : t('Empty'),
    },
    {
      key: 'createCache',
      label:
        cacheWriteMode === 'claude_ttl'
          ? t('Cache Creation (5m)')
          : t('Cache write price'),
      value:
        laneEnabled.createCache && lanePrices.createCache
          ? formatPricingAmount(lanePrices.createCache, currency)
          : t('Empty'),
    },
    {
      key: 'image',
      label: t('Image input price'),
      value:
        laneEnabled.image && lanePrices.image
          ? formatPricingAmount(lanePrices.image, currency)
          : t('Empty'),
    },
    {
      key: 'audio',
      label: t('Audio input price'),
      value: audioInputValue,
    },
    {
      key: 'audioCompletion',
      label: t('Audio output price'),
      value: audioOutputValue,
    },
  ]
  if (
    cacheWriteMode === 'claude_ttl' &&
    laneEnabled.createCache &&
    lanePrices.createCache
  ) {
    rows.splice(4, 0, {
      key: 'createCache1h',
      label: t('Cache create (1h) price'),
      value: formatPricingAmount(
        Number(lanePrices.createCache) * (6 / 3.75),
        currency
      ),
    })
  }
  const showCacheWrite = cacheWriteMode
    ? cacheWriteMode !== 'none'
    : hasValue(values.createCacheRatio)
  const imageRatio = toNumberOrNull(values.imageRatio) ?? 1
  const cacheRatio = toNumberOrNull(values.cacheRatio) ?? 1
  return [
    ...rows.filter(
      (row) =>
        (row.key !== 'image' || imageRatio !== 1) &&
        (row.key !== 'cache' || cacheRatio !== 1) &&
        (row.key !== 'createCache' || showCacheWrite)
    ),
    ...pricingAdjustmentRows(billingDetails, t),
  ]
}

export function pricingAdjustmentRows(
  details: LegacyBillingDetails | undefined,
  t: (key: string) => string
): PreviewRow[] {
  const rows: PreviewRow[] = []
  if (details?.audio_text_branches) {
    rows.push({
      key: 'audioTextBranches',
      label: t('Pricing'),
      value: t('Audio and text-only requests keep their respective pricing.'),
      unit: 'none',
    })
  }
  if (details?.image_count) {
    rows.push({
      key: 'imageCount',
      label: t('Image count'),
      value: t('Reserve requested images; settle returned images.'),
      unit: 'none',
    })
  }
  for (const [index, rule] of (details?.request_rules ?? []).entries()) {
    rows.push({
      key: `adjustment-${index}`,
      label: formatBillingCondition(rule.condition, t) || rule.condition,
      value: `× ${rule.multiplier}`,
      unit: 'none',
    })
  }
  return rows
}
