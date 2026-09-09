import type { LoteResponse, RelatorioPDF } from './types'

const API_URL = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8700').replace(/\/$/, '')

async function readError(res: Response): Promise<string> {
  try {
    const data = (await res.json()) as { error?: string }
    if (data.error) return data.error
  } catch {
    /* ignore */
  }
  return res.statusText || `HTTP ${res.status}`
}

export async function processarLote(files: File[]): Promise<RelatorioPDF[]> {
  const form = new FormData()
  for (const file of files) {
    form.append('files', file)
  }
  const res = await fetch(`${API_URL}/v1/lote`, {
    method: 'POST',
    body: form,
  })
  if (!res.ok) throw new Error(await readError(res))
  const data = (await res.json()) as LoteResponse
  return data.relatorios ?? []
}

export async function gerarAveriguacao(relatorios: RelatorioPDF[]): Promise<Blob> {
  const res = await fetch(`${API_URL}/v1/averiguacao`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ relatorios }),
  })
  if (!res.ok) throw new Error(await readError(res))
  return res.blob()
}

export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

export { API_URL }
