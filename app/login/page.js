'use client'
import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'

const supabase = createClient()

export default function Login() {
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)

  async function handleLogin() {
    await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    });
    setSent(true);
  }

  if (sent) return <p>Check your email for a magic link.</p>

  return (
    <div suppressHydrationWarning>
      <input
        type="email"
        placeholder="your@email.com"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        suppressHydrationWarning
      />
      <button type="button" onClick={handleLogin} suppressHydrationWarning>
        Enter the Building
      </button>
    </div>
  )
}