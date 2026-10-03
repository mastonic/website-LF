import type { FontKey } from '@/types/brand'

export interface FontMeta {
  key: FontKey
  label: string
  path: string   // relative to public/fonts/
  style: 'normal'
  weight: 400 | 700
}

export const FONT_REGISTRY: Record<FontKey, FontMeta> = {
  'Inter': {
    key: 'Inter',
    label: 'Inter',
    path: 'Inter-Regular.ttf',
    style: 'normal',
    weight: 400,
  },
  'Playfair Display': {
    key: 'Playfair Display',
    label: 'Playfair Display',
    path: 'PlayfairDisplay-Regular.ttf',
    style: 'normal',
    weight: 400,
  },
  'Montserrat': {
    key: 'Montserrat',
    label: 'Montserrat',
    path: 'Montserrat-Regular.ttf',
    style: 'normal',
    weight: 400,
  },
  'Lora': {
    key: 'Lora',
    label: 'Lora',
    path: 'Lora-Regular.ttf',
    style: 'normal',
    weight: 400,
  },
  'Raleway': {
    key: 'Raleway',
    label: 'Raleway',
    path: 'Raleway-Regular.ttf',
    style: 'normal',
    weight: 400,
  },
  'Source Serif 4': {
    key: 'Source Serif 4',
    label: 'Source Serif 4',
    path: 'SourceSerif4-Regular.ttf',
    style: 'normal',
    weight: 400,
  },
  'DM Sans': {
    key: 'DM Sans',
    label: 'DM Sans',
    path: 'DMSans-Regular.ttf',
    style: 'normal',
    weight: 400,
  },
  'Cormorant Garamond': {
    key: 'Cormorant Garamond',
    label: 'Cormorant Garamond',
    path: 'CormorantGaramond-Regular.ttf',
    style: 'normal',
    weight: 400,
  },
}

export const FONT_KEYS = Object.keys(FONT_REGISTRY) as FontKey[]
