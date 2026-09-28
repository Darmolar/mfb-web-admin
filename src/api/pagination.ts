import type { PaginatedData } from './types'

/** Collect every server page before offering whole-dataset search/export. */
export async function allPages<T>(fetchPage: (page: number) => Promise<{ data: PaginatedData<T> }>): Promise<PaginatedData<T>> {
  const first = (await fetchPage(0)).data
  const content = [...first.content]
  let previous = JSON.stringify(first.content)
  for (let page = 1; content.length < first.totalElements; page++) {
    if (page > 1000) throw new Error('Too many records. Narrow the filters before loading.')
    const next = (await fetchPage(page)).data
    const fingerprint = JSON.stringify(next.content)
    if (!next.content.length || fingerprint === previous) throw new Error('The server returned incomplete pagination. Please retry.')
    content.push(...next.content); previous = fingerprint
  }
  return { ...first, content }
}
