import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '@/lib/api'
import { useAuth } from '@/store/auth'
import { IconUser, IconLock, IconChevR, IconScale } from '@/components/Icons'
import { HazardStripe } from '@/components/HazardStripe'

export default function Login() {
  const navigate = useNavigate()
  const setSession = useAuth((s) => s.setSession)
  const [username, setUsername] = useState('OP-2847')
  const [password, setPassword] = useState('demo')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      const res = await api.login({ username, password })
      setSession(res.token, {
        code: res.operator.code,
        name: res.operator.name,
        entity_pengirim: res.operator.entity_pengirim,
        entity_penerima: 'PT MITRA LOGISTIK',
      })
      navigate('/dashboard', { replace: true })
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Login gagal')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-dvh flex flex-col px-7 py-10">
      <div className="mt-8 mb-2 flex items-center gap-3">
        <div
          className="w-12 h-12 bg-safety flex items-center justify-center"
          style={{ clipPath: 'polygon(0 0, 100% 0, 100% 75%, 75% 100%, 0 100%)' }}
        >
          <IconScale className="w-7 h-7 text-obsidian" />
        </div>
        <div className="flex-1 h-px bg-edge" />
        <span className="font-mono text-[9px] text-bone-3 tracking-widest">v0.1.0</span>
      </div>

      <h1 className="font-display text-6xl leading-[0.85] tracking-tight">
        ANALISA
        <br />
        <span className="text-safety">TIMBANG</span>
      </h1>
      <p className="font-mono text-[10px] text-bone-3 tracking-[0.3em] mt-3">// EDGE AI · WEIGHT CAPTURE</p>

      <HazardStripe className="mt-6" />

      <form onSubmit={handleSubmit} className="mt-8 space-y-4">
        <div>
          <label className="font-mono text-[10px] text-bone-3 tracking-widest mb-2 block">KODE OPERATOR</label>
          <div className="flex items-center gap-3 bg-ink-1 border border-edge px-4 h-14">
            <IconUser className="w-5 h-5 text-bone-2" />
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              autoCapitalize="characters"
              className="flex-1 bg-transparent outline-none font-mono text-base text-bone-0 tracking-wider"
            />
          </div>
        </div>
        <div>
          <label className="font-mono text-[10px] text-bone-3 tracking-widest mb-2 block">PASSWORD</label>
          <div className="flex items-center gap-3 bg-ink-1 border border-edge px-4 h-14">
            <IconLock className="w-5 h-5 text-bone-2" />
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="flex-1 bg-transparent outline-none font-mono text-base text-bone-0 tracking-widest"
            />
          </div>
        </div>

        {error && (
          <div className="border border-err/40 bg-err/10 px-3 py-2 font-mono text-xs text-err tracking-wide">
            ⚠ {error}
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full mt-3 h-14 bg-safety text-obsidian font-display text-2xl tracking-wider flex items-center justify-center gap-3 disabled:opacity-50"
        >
          {loading ? 'MEMERIKSA...' : 'MASUK'}
          <IconChevR className="w-5 h-5" />
        </button>
      </form>

      <div className="mt-auto pt-8 border-t border-edge">
        <div className="font-mono text-[9px] text-bone-3 tracking-widest text-center">
          DEMO · OP-2847 / demo · v0.1.0 BUILD POC
        </div>
      </div>
    </div>
  )
}
