import { useMemo, useState } from 'react'
import { ArrowUpRight, Bot, BrainCircuit, Check, ChevronDown, CircleHelp, Gavel, Loader2, MessageSquare, RotateCcw, Scale, Send, ShieldCheck, Sparkles, Trophy, UserRound, X } from 'lucide-react'

type Message = { role: 'user' | 'assistant'; content: string; phase?: string }
type Result = { winner: string; scores: { user: number; ai: number }; categories: { name: string; user: number; ai: number; note: string }[]; summary: string; strengths: string[]; improvements: string[] }
const API = (import.meta.env.VITE_API_BASE_URL || '').replace(/\/$/, '')
const topics = ['AIによって人間の仕事は奪われるのか？', '大学入試における学力試験は廃止すべきか？', '義務教育で金融教育を必修化すべきか？', 'SNSの利用に年齢制限を設けるべきか？']
const phases = ['立論', '反駁', '再反駁', '最終弁論']

export default function App() {
  const [topic, setTopic] = useState(topics[0])
  const [customTopic, setCustomTopic] = useState('')
  const [side, setSide] = useState<'affirmative' | 'negative'>('negative')
  const [level, setLevel] = useState('advanced')
  const [round, setRound] = useState(0)
  const [messages, setMessages] = useState<Message[]>([])
  const [draft, setDraft] = useState('')
  const [busy, setBusy] = useState(false)
  const [started, setStarted] = useState(false)
  const [result, setResult] = useState<Result | null>(null)
  const [error, setError] = useState('')
  const activeTopic = customTopic.trim() || topic
  const phase = phases[Math.min(round, 3)]
  const progress = Math.min((round / 4) * 100, 100)
  const canUseApi = Boolean(API)

  const opening = useMemo(() => side === 'affirmative' ? 'あなたは賛成側です。主張と根拠を明確に示してください。' : 'あなたは反対側です。主張と根拠を明確に示してください。', [side])

  async function callApi(action: 'reply' | 'judge', extra?: string) {
    if (!API) throw new Error('API接続先が未設定です。READMEのセットアップ手順を確認してください。')
    const res = await fetch(`${API}/api/${action}`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ topic: activeTopic, userSide: side, level, messages, userMessage: extra })
    })
    const data = await res.json()
    if (!res.ok) throw new Error(data.error || 'APIリクエストに失敗しました。')
    return data
  }

  async function startDebate() {
    if (!activeTopic.trim()) return
    setBusy(true); setError(''); setStarted(true); setResult(null); setRound(0)
    const intro: Message = { role: 'assistant', phase: '開会', content: `議題「${activeTopic}」でディベートを開始します。\n\n${opening}\n\n大会形式に沿って、まずあなたの立論を提示してください。主張・理由・具体例を含め、論点を明確にすると効果的です。` }
    setMessages([intro]); setBusy(false)
  }

  async function sendMessage() {
    const value = draft.trim()
    if (!value || busy) return
    const next = [...messages, { role: 'user' as const, content: value }]
    setMessages(next); setDraft(''); setBusy(true); setError('')
    try {
      const data = await callApi('reply', value)
      setMessages([...next, { role: 'assistant', content: data.reply, phase }])
      setRound(r => Math.min(r + 1, 4))
    } catch (e) { setError(e instanceof Error ? e.message : '通信エラーが発生しました。') }
    finally { setBusy(false) }
  }

  async function judge() {
    setBusy(true); setError('')
    try { const data = await callApi('judge'); setResult(data.result) }
    catch (e) { setError(e instanceof Error ? e.message : '判定に失敗しました。') }
    finally { setBusy(false) }
  }

  function reset() { setStarted(false); setMessages([]); setRound(0); setResult(null); setError('') }

  return <div className="app-shell">
    <header className="topbar">
      <a className="brand" href="#"><span className="brand-mark"><Scale size={19}/></span><span>DEBATE<span className="brand-accent"> ARENA</span><small>THINK SHARPER. ARGUE BETTER.</small></span></a>
      <div className="top-right"><span className="status-dot"/><span>日本語 / JAPANESE</span><span className="top-divider"/><span className="version">BETA 1.0</span></div>
    </header>
    {!started ? <main className="landing">
      <div className="hero">
        <div className="eyebrow"><Sparkles size={14}/> THE ART OF REASONING</div>
        <h1>議論で、<span>思考</span>を鍛える。</h1>
        <p className="hero-copy">意見をぶつけ、論理を磨き、視点を広げる。<br/>本格的なディベートを、AIと。</p>
        <div className="feature-row"><span><BrainCircuit size={15}/> 論理的な反論</span><span><Gavel size={15}/> 大会形式の進行</span><span><Trophy size={15}/> 公平な講評</span></div>
      </div>
      <section className="setup-card">
        <div className="section-kicker">01 / DEBATE SETUP</div>
        <h2>議論をセッティング</h2>
        <label className="field-label">ディベートテーマ</label>
        <select value={topic} onChange={e => {setTopic(e.target.value); setCustomTopic('')}} className="select-field">{topics.map(t=><option key={t}>{t}</option>)}</select>
        <div className="or-label"><span/> OR CUSTOM TOPIC <span/></div>
        <input className="text-field" value={customTopic} onChange={e=>setCustomTopic(e.target.value)} placeholder="独自のテーマを入力..." />
        <div className="setup-grid">
          <div><label className="field-label">あなたの立場</label><div className="segmented">
            <button className={side==='affirmative'?'selected':''} onClick={()=>setSide('affirmative')}><span className="side-symbol">＋</span> 賛成側</button>
            <button className={side==='negative'?'selected':''} onClick={()=>setSide('negative')}><span className="side-symbol">−</span> 反対側</button>
          </div></div>
          <div><label className="field-label">議論レベル</label><div className="select-wrap"><select className="select-field" value={level} onChange={e=>setLevel(e.target.value)}><option value="standard">標準</option><option value="advanced">上級・大会レベル</option><option value="expert">競技ディベート上級</option></select><ChevronDown size={15}/></div></div>
        </div>
        <div className="notice"><ShieldCheck size={16}/><span>AIは反対の立場から議論し、終了後に双方を同じ基準で評価します。</span></div>
        <button className="primary-button" onClick={startDebate}>ディベートを開始 <ArrowUpRight size={17}/></button>
        <p className="setup-foot"><CircleHelp size={13}/> 議論はいつでも終了して判定できます。</p>
      </section>
      <div className="bottom-stats"><div><strong>01</strong><span>ONE ON ONE</span></div><i/><div><strong>04</strong><span>DEBATE PHASES</span></div><i/><div><strong>05</strong><span>JUDGING CRITERIA</span></div></div>
    </main> : <main className="debate-layout">
      <aside className="debate-sidebar">
        <button className="back-button" onClick={reset}><X size={15}/> セッションを終了</button>
        <div className="sidebar-block"><div className="section-kicker">CURRENT MOTION</div><h3>{activeTopic}</h3><div className="side-pill">{side==='affirmative'?'あなた：賛成側':'あなた：反対側'}</div></div>
        <div className="sidebar-block"><div className="section-kicker">DEBATE PROGRESS</div><div className="progress-head"><span>進行状況</span><b>{Math.min(round,4)} / 4</b></div><div className="progress-track"><span style={{width:`${progress}%`}}/></div><div className="phase-list">{phases.map((p,i)=><div className={`phase-item ${i===Math.min(round,3)?'active':''} ${i<round?'done':''}`} key={p}><span className="phase-num">{i<round?<Check size={12}/>:`0${i+1}`}</span>{p}</div>)}</div></div>
        <div className="judge-hint"><Gavel size={18}/><b>ジャッジについて</b><p>議論終了後、論理性・根拠・反駁力など5つの基準で双方を評価します。</p></div>
      </aside>
      <section className="chat-panel">
        <div className="chat-header"><div><div className="section-kicker">LIVE DEBATE SESSION</div><h2>ディベートルーム</h2></div><span className="live-badge"><span/> LIVE</span></div>
        <div className="chat-messages">
          {messages.map((m,i)=><div className={`message-row ${m.role}`} key={i}><div className={`avatar ${m.role}`}>{m.role==='assistant'?<Bot size={18}/>:<UserRound size={18}/>}</div><div className="message-content"><div className="message-meta"><b>{m.role==='assistant'?'DEBATE AI':'あなた'}</b>{m.phase&&<span>{m.phase}</span>}</div><div className="message-bubble">{m.content}</div></div></div>)}
          {busy&&<div className="message-row assistant"><div className="avatar assistant"><Bot size={18}/></div><div className="message-content"><div className="message-meta"><b>DEBATE AI</b><span>分析中</span></div><div className="message-bubble typing"><Loader2 size={15} className="spin"/> 主張を分析しています...</div></div></div>}
          {result&&<div className="result-card"><div className="result-top"><Trophy size={20}/><span>OFFICIAL JUDGEMENT</span></div><h3>{result.winner}</h3><p>{result.summary}</p><div className="score-row"><div><small>あなた</small><b>{result.scores.user}</b></div><div className="score-divider"/><div><small>AI</small><b>{result.scores.ai}</b></div></div><div className="criteria">{result.categories.map(c=><div className="criteria-row" key={c.name}><b>{c.name}</b><span>{c.user} : {c.ai}</span><small>{c.note}</small></div>)}</div><div className="feedback-grid"><div><b>あなたの強み</b>{result.strengths.map(x=><p key={x}>＋ {x}</p>)}</div><div><b>改善ポイント</b>{result.improvements.map(x=><p key={x}>↗ {x}</p>)}</div></div></div>}
          <div id="chat-bottom"/>
        </div>
        {error&&<div className="error-banner"><span>{error}</span><button onClick={()=>setError('')}><X size={14}/></button></div>}
        <div className="composer">
          {round>=4&&!result?<button className="judge-button" onClick={judge} disabled={busy}><Gavel size={16}/> 最終判定を受ける</button>:<><textarea value={draft} onChange={e=>setDraft(e.target.value)} onKeyDown={e=>{if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();sendMessage()}}} placeholder="あなたの主張・反論を入力... (Enterで送信 / Shift+Enterで改行)" rows={3}/><div className="composer-bottom"><span>論点を明確にし、根拠と具体例を示しましょう。</span><button className="send-button" onClick={sendMessage} disabled={!draft.trim()||busy}><Send size={15}/> 送信</button></div></>}
          {round>0&&round<4&&<button className="end-button" onClick={judge} disabled={busy}>ここで判定する <ArrowUpRight size={13}/></button>}
          {result&&<button className="judge-button" onClick={reset}><RotateCcw size={15}/> 新しいディベートを始める</button>}
        </div>
      </section>
    </main>}
    <footer><span>© 2026 DEBATE ARENA</span><span>BUILT FOR BETTER THINKING.</span></footer>
  </div>
}