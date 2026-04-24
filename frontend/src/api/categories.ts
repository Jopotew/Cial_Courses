import type { Category } from '@/types'
import { categories } from '@/data/mock'
// import { client } from '@/lib/axios'

const MOCK = import.meta.env.VITE_USE_MOCK === 'true'

export const categoriesApi = {
  list: async (): Promise<Category[]> => {
    if (MOCK) return Promise.resolve(categories)
    // TODO: return client.get('/categories').then((r) => r.data)
    return categories
  },
}