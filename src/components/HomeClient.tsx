import { useCallback, useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import type { Relatorio } from '@/lib/types'
import { listarRelatorios, importarArquivos, consolidar, marcarInconsistentes } from '@/lib/api'
import { formatMin, formatHora, formatDataCurta, statusLabel, statusClass } from '@/lib/format'

export default function HomeClient() {
  const router = useRouter()
  const [rels, setRels] = useState<Relatorio[]>([])
  const [busy, setBusy] = useState(false)
  const [consolidando, setConsolidando] = useState(false)
  const [marcando, setMarcando] = useState(false)
  const [filtro, setFiltro] = useState<'TODOS' | 'CONFORME' | 'INCONSISTENTE' | 'ERRO_LEITURA'>('TODOS')
  const [selecionados, setSelecionados] = useState<Set<string>>(new Set())
  const [mensagem, setMensagem] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const carregar = useCallback(async () => {
    try {
      const data = await listarRelatorios()
      setRels(data)
    } catch (e) {
      setMensagem(e instanceof Error ? e.message : String(e))
    }
  }, [])

  useEffect(() => {
    carregar()
  }, [carregar])

  async function onFiles(files: FileList | null) {
    if (!files || files.length === 0) return
    setBusy(true)
    setMensagem(null)
    try {
      const arr = Array.from(files)
      const results = await importarArquivos(arr)
      const erros = results.filter((r) => r.status === 'ERRO_LEITURA')
      if (erros.length > 0) {
        setMensagem(`${erros.length} arquivo(s) com erro de leitura: ${erros.map((e) => e.arquivo).join(', ')}`)
      } else {
        setMensagem(`${results.length} arquivo(s) importado(s) com sucesso.`)
      }
      await carregar()
    } catch (e) {
      setMensagem(e instanceof Error ? e.message : String(e))
    } finally {
      setBusy(false)
      if (inputRef.current) inputRef.current.value = ''
    }
  }

  function toggle(id: string) {
    setSelecionados((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function selecionarInconsistentes() {
    setSelecionados(new Set(rels.filter((r) => r.status === 'INCONSISTENTE').map((r) => r.id)))
  }

  function limparSelecao() {
    setSelecionados(new Set())
  }

  async function onConsolidar() {
    setConsolidando(true)
    setMensagem(null)
    try {
      const r = await consolidar(Array.from(selecionados))
      setMensagem(`Relatório consolidado gerado (${r.totalDias} dias).`)
      setSelecionados(new Set())
    } catch (e) {
      setMensagem(e instanceof Error ? e.message : String(e))
    } finally {
      setConsolidando(false)
    }
  }

  async function onMarcarInconsistentes() {
    setMarcando(true)
    setMensagem(null)
    try {
      const r = await marcarInconsistentes(Array.from(selecionados))
      setMensagem(`${r.atualizados} relatório(s) marcado(s) como inconsistente(s).`)
      setSelecionados(new Set())
      await carregar()
    } catch (e) {
     