interface Env { OPENAI_API_KEY: string; OPENAI_MODEL?: string; ALLOWED_ORIGIN?: string }
type Msg = { role: 'user' | 'assistant'; content: string }
const cors = (origin: string) => ({
  'Access-Control-Allow-Origin': origin, 'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type', 'Vary': 'Origin'
})
const json = (data: unknown, status = 200, origin = '*') =>
  new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json', ...cors(origin) } })
function promptForReply(topic: string, userSide: string, level: string, history: Msg[], userMessage: string) {
  const aiSide = userSide === 'affirmative' ? '反対側' : '賛成側'
  const difficulty = level === 'expert' ? '競技ディベート上級。定義・立証責任・因果関係・比較衡量まで厳密に検討する。' : level === 'standard' ? '標準。明快で建設的な議論を行う。' : '上級・大会レベル。論点の優先順位、根拠の質、因果関係、反駁の妥当性を厳しく検討する。'
  return `あなたは日本語の競技ディベート大会に出場する熟練ディベーターです。議題は「${topic}」。ユーザーは${userSide === 'affirmative' ? '賛成側' : '反対側'}、あなたは${aiSide}です。
${difficulty}
ルール:
- ユーザーの主張を正確に要約してから、最も重要な論点に絞って反駁する。
- 論点ずらし、藁人形論法、人格攻撃、根拠の捏造は禁止。
- 事実が不確かな場合は断定せず、一般論と事実を区別する。出典を見ていない統計や引用を作らない。
- 反論は「相手の主張の要約」「反駁」「こちらの主張」「相手への質問」の流れを基本とする。
- 勝つためだけでなく、議論の質を高める。相手の強い点は認める。
- 日本語で、専門的だが読みやすく回答する。400〜700字程度。
- 今回はAI側の反論だけを返す。採点や最終判定はしない。
これまでの議論:
${history.map(m => `${m.role === 'user' ? 'ユーザー' : 'AI'}: ${m.content}`).join('\n\n')}
今回のユーザーの発言:
${userMessage}`
}
async function askOpenAI(env: Env, instructions: string, input: string, maxOutputTokens = 900) {
  const response = await fetch('https://api.openai.com/v1/responses', {
    method: 'POST',
    headers: { Authorization: `Bearer ${env.OPENAI_API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: env.OPENAI_MODEL || 'gpt-4.1-mini',
      instructions, input, max_output_tokens: maxOutputTokens
    })
  })
  const data: any = await response.json()
  if (!response.ok) throw new Error(data?.error?.message || `OpenAI API error (${response.status})`)
  const text = data.output?.flatMap((item: any) => item.content || []).filter((c: any) => c.type === 'output_text').map((c: any) => c.text).join('\n')
  if (!text) throw new Error('AIから空の応答が返されました。')
  return text
}
export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const origin = request.headers.get('Origin') || '*'
    const allowed = env.ALLOWED_ORIGIN || '*'
    const responseOrigin = allowed === '*' || origin === allowed ? origin : allowed
    if (request.method === 'OPTIONS') return new Response(null, { headers: cors(responseOrigin) })
    const url = new URL(request.url)
    if (request.method !== 'POST' || !['/api/reply', '/api/judge'].includes(url.pathname)) return json({ error: 'Not found' }, 404, responseOrigin)
    if (!env.OPENAI_API_KEY) return json({ error: 'サーバーにOPENAI_API_KEYが設定されていません。' }, 503, responseOrigin)
    try {
      const body: any = await request.json()
      const topic = String(body.topic || '').slice(0, 300)
      const side = body.userSide === 'affirmative' ? 'affirmative' : 'negative'
      const level = ['standard', 'advanced', 'expert'].includes(body.level) ? body.level : 'advanced'
      const messages: Msg[] = Array.isArray(body.messages) ? body.messages.slice(-20).map((m: any) => ({ role: m.role === 'user' ? 'user' : 'assistant', content: String(m.content || '').slice(0, 4000) })) : []
      if (!topic) return json({ error: '議題を入力してください。' }, 400, responseOrigin)
      if (url.pathname === '/api/reply') {
        const userMessage = String(body.userMessage || '').slice(0, 4000)
        if (!userMessage) return json({ error: '発言内容が空です。' }, 400, responseOrigin)
        const reply = await askOpenAI(env, promptForReply(topic, side, level, messages, userMessage), 'AIとして次の反論を行ってください。')
        return json({ reply }, 200, responseOrigin)
      }
      const transcript = messages.map(m => `${m.role === 'user' ? 'ユーザー' : 'AI'}: ${m.content}`).join('\n\n')
      const instructions = `あなたは中立・公平な競技ディベート審判です。議題「${topic}」。ユーザーの立場は${side === 'affirmative' ? '賛成側' : '反対側'}、AIは反対側です。会話記録だけを根拠に判定し、外部事実を捏造しない。両者を同一基準で評価する。JSONのみを返し、形式は {"winner":"ユーザー側 / AI側 / 引き分け","scores":{"user":0,"ai":0},"categories":[{"name":"論理構成","user":0,"ai":0,"note":"短評"},{"name":"根拠の質","user":0,"ai":0,"note":"短評"},{"name":"反駁力","user":0,"ai":0,"note":"短評"},{"name":"一貫性","user":0,"ai":0,"note":"短評"},{"name":"説得力","user":0,"ai":0,"note":"短評"}],"summary":"総評","strengths":["強み1","強み2"],"improvements":["改善点1","改善点2"]}。各項目20点満点、合計100点。実際の発言内容に即して具体的に評価する。`
      const raw = await askOpenAI(env, instructions, `以下が議論記録です。\n${transcript}\n\nJSONで最終判定してください。`, 1200)
      const cleaned = raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '')
      const result = JSON.parse(cleaned)
      return json({ result }, 200, responseOrigin)
    } catch (error) {
      return json({ error: error instanceof Error ? error.message : '内部エラーが発生しました。' }, 500, responseOrigin)
    }
  }
}