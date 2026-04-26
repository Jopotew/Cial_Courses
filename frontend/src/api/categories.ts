import type { Category } from '@/types'
import { categories as mockCategories } from '@/data/mock'
import { client } from '@/lib/axios'

const MOCK = import.meta.env.VITE_USE_MOCK === 'true'

const CATEGORY_PALETTE: Record<string, { color: string; bg: string }> = {}
const COLORS = [
  { color: '#7c3aed', bg: '#f5f3ff' },
  { color: '#0284c7', bg: '#e0f2fe' },
  { color: '#db2777', bg: '#fce7f3' },
  { color: '#059669', bg: '#d1fae5' },
  { color: '#b45309', bg: '#fef3c7' },
  { color: '#7c3aed', bg: '#ede9fe' },
]

function mapCategory(raw: Record<string, unknown>, index: number): Category {
  const id = raw.id as string
  if (!CATEGORY_PALETTE[id]) {
    CATEGORY_PALETTE[id] = COLORS[index % COLORS.length]
  }
  const palette = CATEGORY_PALETTE[id]
  return {
    id,
    name: raw.name as string,
    description: (raw.description as string | null) ?? null,
    coursesCount: (raw.courses_count as number) ?? 0,
    color: palette.color,
    bg: palette.bg,
  }
}

export const categoriesApi = {
  list: async (): Promise<Category[]> => {
    if (MOCK) return Promise.resolve(mockCategories)
    const res = await client.get('/categories')
    return (res.data as Record<string, unknown>[]).map(mapCategory)
  },
}
