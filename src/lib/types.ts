export type StatusRelatorio = 'CONFORME' | 'INCONSISTENTE' | 'ERRO_LEITURA' | string

export interface Batida {
  entrada?: string
  saida?: string
}

export interface MetricasDia {
  execMin?: number
  atrasoMin?: number
  faltaMin?: number
  abonoMin?: number
}

export interface RegistroDia {
  data: string
  diaSemana?: string
  evento?: string
  inconsistente?: boolean
  motivosErro?: string[]
  batidas?: Batida[]
  lido: MetricasDia
  calculado: MetricasDia
}

export interface RelatorioPDF {
  id: string
  nomeArquivo?: string
  nomeFuncionario?: string
  matricula?: string
  funcao?: string
  periodoInicio?: string
  periodoFim?: string
  status: StatusRelatorio
  dias?: RegistroDia[]
}

export interface LoteResponse {
  total: number
  relatorios: RelatorioPDF[]
}

export function formatMin(min?: number): string {
  if (!min) return '—'
  const h = Math.floor(Math.abs(min) / 60)
  const m = Math.abs(min) % 60
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
}
