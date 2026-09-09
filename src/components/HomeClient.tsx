'use client'

import { useMemo, useRef, useState } from 'react'
import { downloadBlob, gerarAveriguacao, processarLote } from '@/lib/api'
import { formatMin, type RelatorioPDF, type StatusRelatorio } from '@/lib/types'

type Filtro = 'TODOS' | StatusRelatorio

function statusLabel(s: string) {
  switch (s) {
    case 'CONFORME':
      return 'Conforme'
    case 'INCONSISTENTE':
      return 'Inconsistente'
    case 'ERRO_LEITURA':
      return 'Erro de leitura'
    default:
      return s
  }
}

export default function HomeClient() {
  const inputRef = useRef<HTMLInputElement>(null)
  const [rels, setRels] = useState<RelatorioPDF[]>([])
  const [selecionados, setSelecionados] = useState<Set<string>>(new Set())
  const [filtro, setFiltro] = useState<Filtro>('TODOS')
  const [ativo, setAtivo] = useState<RelatorioPDF | null>(null)
  const [busy, setBusy] = useState(false)
  const [mensagem, setMensagem] = useState('')

  const filtrados = useMemo(() => {
    if (filtro === 'TODOS') return rels
    return rels.filter((r) => r.status === filtro)
  }, [rels, filtro])

  const contagem = useMemo(() => {
    const c = { CONFORME: 0, INCONSISTENTE: 0, ERRO_LEITURA: 0 }
    for (const r of rels) {
      if (r.status in c) c[r.status as keyof typeof c]++
    }
    return c
  }, [rels])

  const pendentesRelatorio = useMemo(() => {
    const marcados = rels.filter((r) => selecionados.has(r.id))
    if (marcados.length) return marcados
    return rels.filter((r) => r.status === 'INCONSISTENTE' || r.status === 'ERRO_LEITURA')
  }, [rels, selecionados])

  async function onFilesSelected(fileList: FileList | null) {
    if (!fileList?.length) return
    const files = Array.from(fileList).filter((f) => f.name.toLowerCase().endsWith('.pdf'))
    if (!files.length) {
      setMensagem('Selecione apenas arquivos PDF')
      return
    }
    setMensagem('')
    setBusy(true)
    try {
      const out = await processarLote(files)
      setRels(out)
      setSelecionados(new Set(out.filter((r) => r.status === 'INCONSISTENTE').map((r) => r.id)))
      setAtivo(out.find((r) => r.status === 'INCONSISTENTE') ?? out[0] ?? null)
      setMensagem(`${out.length} arquivo(s) processado(s)`)
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

  async function averiguacaoUnica() {
    if (!pendentesRelatorio.length) {
      setMensagem('Nenhum relatório inconsistente para averiguar')
      return
    }
    setMensagem('')
    setBusy(true)
    try {
      const blob = await gerarAveriguacao(pendentesRelatorio)
      downloadBlob(blob, 'averiguacao_lote.pdf')
      setMensagem(`Averiguação gerada (${pendentesRelatorio.length} item(ns))`)
    } catch (e) {
      setMensagem(e instanceof Error ? e.message : String(e))
    } finally {
      setBusy(false)
    }
  }

  const taxaOk = rels.length > 0 ? Math.round((contagem.CONFORME / rels.length) * 100) : 0

  return (
    <div className="app">
      <header className="shell-top">
        <div className="brand-block">
          <span className="brand-mark" aria-hidden />
          <div>
            <p className="brand">Pontouau</p>
            <h1>Fluxo de espelho de ponto</h1>
          </div>
        </div>
        <p className="shell-sub">
          Importe o lote, veja o overview e gere o relatório de averiguação.
        </p>
      </header>

      <section className="dashboard">
        <article className="panel overview">
          <div className="panel-head">
            <h2>Overview do lote</h2>
            <span className="pill soft">{rels.length ? `${taxaOk}% conforme` : 'aguardando arquivos'}</span>
          </div>

          <div className="stat-grid">
            <button type="button" className={`stat ${filtro === 'TODOS' ? 'on' : ''}`} onClick={() => setFiltro('TODOS')}>
              <span className="stat-label">Total</span>
              <strong>{rels.length}</strong>
            </button>
            <button type="button" className={`stat ok ${filtro === 'CONFORME' ? 'on' : ''}`} onClick={() => setFiltro('CONFORME')}>
              <span className="stat-label">Conformes</span>
              <strong>{contagem.CONFORME}</strong>
            </button>
            <button type="button" className={`stat warn ${filtro === 'INCONSISTENTE' ? 'on' : ''}`} onClick={() => setFiltro('INCONSISTENTE')}>
              <span className="stat-label">Inconsistentes</span>
              <strong>{contagem.INCONSISTENTE}</strong>
            </button>
            <button type="button" className={`stat bad ${filtro === 'ERRO_LEITURA' ? 'on' : ''}`} onClick={() => setFiltro('ERRO_LEITURA')}>
              <span className="stat-label">Erro leitura</span>
              <strong>{contagem.ERRO_LEITURA}</strong>
            </button>
          </div>

          <div className="overview-meter" aria-hidden={rels.length === 0}>
            <div className="meter-track">
              <div className="meter-ok" style={{ width: rels.length ? `${(contagem.CONFORME / rels.length) * 100}%` : '0%' }} />
              <div className="meter-warn" style={{ width: rels.length ? `${(contagem.INCONSISTENTE / rels.length) * 100}%` : '0%' }} />
              <div className="meter-bad" style={{ width: rels.length ? `${(contagem.ERRO_LEITURA / rels.length) * 100}%` : '0%' }} />
            </div>
            <div className="meter-legend">
              <span>Selecionados: {selecionados.size}</span>
              <span>Para relatório: {pendentesRelatorio.length}</span>
            </div>
          </div>

          {busy && (
            <div className="progress" role="status">
              <div className="bar" style={{ width: '55%' }} />
              <span>Processando lote…</span>
            </div>
          )}

          {mensagem && <p className="toast">{mensagem}</p>}
        </article>

        <article className="panel action upload">
          <p className="action-kicker">Passo 1</p>
          <h2>Importar espelhos</h2>
          <p className="action-copy">Envie um ou vários PDFs de cartão de ponto para auditar de uma vez.</p>
          <div className="action-stack">
            <input
              ref={inputRef}
              type="file"
              accept="application/pdf,.pdf"
              multiple
              hidden
              onChange={(e) => void onFilesSelected(e.target.files)}
            />
            <button type="button" className="cta primary" onClick={() => inputRef.current?.click()} disabled={busy}>
              Selecionar espelhos
            </button>
          </div>
        </article>

        <article className="panel action report">
          <p className="action-kicker">Passo 2</p>
          <h2>Gerar auditoria</h2>
          <p className="action-copy">Consolida as auditorias em um único relatório para revisão.</p>
          <div className="action-stack">
            <button
              type="button"
              className="cta primary wide"
              onClick={() => void averiguacaoUnica()}
              disabled={busy || pendentesRelatorio.length === 0}
            >
              Gerar relatório
              <small>{pendentesRelatorio.length} item(ns)</small>
            </button>
          </div>
        </article>
      </section>

      <section className="workspace">
        <div className="panel table-wrap">
          <div className="panel-head compact">
            <h2>Lote processado</h2>
            <button type="button" className="text-btn" onClick={selecionarInconsistentes}>
              Marcar inconsistentes
            </button>
          </div>
          <table>
            <thead>
              <tr>
                <th />
                <th>Arquivo</th>
                <th>Funcionário</th>
                <th>Chapa</th>
                <th>Período</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {filtrados.length === 0 && (
                <tr>
                  <td colSpan={6} className="empty">
                    O overview aparece assim que o lote for importado.
                  </td>
                </tr>
              )}
              {filtrados.map((r) => (
                <tr
                  key={r.id}
                  className={ativo?.id === r.id ? 'row active' : 'row'}
                  onClick={() => setAtivo(r)}
                >
                  <td onClick={(e) => e.stopPropagation()}>
                    <input type="checkbox" checked={selecionados.has(r.id)} onChange={() => toggle(r.id)} />
                  </td>
                  <td>{r.nomeArquivo || '—'}</td>
                  <td>{r.nomeFuncionario || '—'}</td>
                  <td>{r.matricula || '—'}</td>
                  <td>{r.periodoInicio && r.periodoFim ? `${r.periodoInicio} → ${r.periodoFim}` : '—'}</td>
                  <td>
                    <span className={`badge ${r.status}`}>{statusLabel(r.status)}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <aside className="panel detail">
          {!ativo && <p className="empty">Selecione um item no lote para ver o detalhe.</p>}
          {ativo && (
            <>
              <header>
                <h2>{ativo.nomeFuncionario || ativo.nomeArquivo}</h2>
                <p>
                  Chapa {ativo.matricula || '—'} · {ativo.funcao || 'sem função'}
                </p>
                <span className={`badge ${ativo.status}`}>{statusLabel(ativo.status)}</span>
              </header>

              <div className="dias">
                {(ativo.dias || [])
                  .filter(
                    (d) =>
                      d.inconsistente ||
                      d.lido?.execMin ||
                      d.lido?.atrasoMin ||
                      d.lido?.faltaMin ||
                      d.evento,
                  )
                  .map((d) => (
                    <article key={d.data} className={d.inconsistente ? 'dia bad' : 'dia'}>
                      <div className="dia-head">
                        <strong>
                          {d.data} {d.diaSemana}
                        </strong>
                        {d.evento && <em>{d.evento}</em>}
                      </div>
                      <div className="metrics">
                        <span>
                          Exec {formatMin(d.lido?.execMin)} / {formatMin(d.calculado?.execMin)}
                        </span>
                        <span>
                          Atraso {formatMin(d.lido?.atrasoMin)} / {formatMin(d.calculado?.atrasoMin)}
                        </span>
                        <span>
                          Falta {formatMin(d.lido?.faltaMin)} / {formatMin(d.calculado?.faltaMin)}
                        </span>
                        <span>Abono {formatMin(d.lido?.abonoMin)}</span>
                      </div>
                      {(d.batidas?.length ?? 0) > 0 && (
                        <p className="batidas">
                          {d.batidas!
                            .map((b) => [b.entrada, b.saida].filter(Boolean).join('–'))
                            .filter(Boolean)
                            .join(' · ')}
                        </p>
                      )}
                      {(d.motivosErro?.length ?? 0) > 0 && (
                        <ul>
                          {d.motivosErro!.map((m) => (
                            <li key={m}>{m}</li>
                          ))}
                        </ul>
                      )}
                    </article>
                  ))}
                {(ativo.dias || []).every(
                  (d) =>
                    !d.inconsistente &&
                    !d.lido?.execMin &&
                    !d.lido?.atrasoMin &&
                    !d.lido?.faltaMin &&
                    !d.evento,
                ) && <p className="empty">Sem ocorrências relevantes neste período.</p>}
              </div>
            </>
          )}
        </aside>
      </section>
    </div>
  )
}
