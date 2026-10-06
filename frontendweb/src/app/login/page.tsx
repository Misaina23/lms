'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { api } from '@/lib/api'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  useEffect(() => {
    if (new URLSearchParams(window.location.search).get('passwordReset') === 'success') {
      setMessage('Votre mot de passe a été modifié. Vous pouvez vous connecter.')
    }
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      const response = await api.post<{ token: string; user: import('@/lib/api').User }>('/login/', { email, password })
      if (!response.token || !response.user) {
        throw new Error('La réponse du serveur est incomplète. Réessayez ou contactez l’administration.')
      }
      localStorage.setItem('token', response.token)
      localStorage.setItem('user', JSON.stringify(response.user))
      router.push('/dashboard')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur de connexion')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-dvh items-center justify-center bg-background p-4">
      <Card className="w-full max-w-lg border-border/70 bg-card/80 shadow-lg">
        <CardHeader className="space-y-1">
          <div className="mb-2 flex flex-wrap items-center gap-3">
            <div className="flex min-w-0 flex-1 items-center gap-3">
              <Image src="/logo%20%282%29.jpeg" alt="Logo LMS" width={112} height={54} className="h-8 w-16 shrink-0 object-contain sm:h-12 sm:w-24" />
              <div className="min-w-0">
                <CardTitle className="text-base sm:text-xl">Lycée Midongy Sud</CardTitle>
                <p className="text-xs text-muted-foreground">Administration centrale</p>
              </div>
            </div>
            <Image src="/drapeau.jpeg" alt="Emblème du lycée" width={64} height={64} className="ml-auto size-12 shrink-0 rounded-full border border-border bg-white object-contain p-0.5 sm:size-14" />
          </div>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <label htmlFor="email" className="text-sm font-medium">Email</label>
              <Input
                id="email"
                type="email"
                placeholder="admin@lycee.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between gap-3">
                <label htmlFor="password" className="text-sm font-medium">Mot de passe</label>
                <Link href="/forgot-password" className="text-xs font-medium text-primary hover:underline sm:text-sm">
                  Mot de passe oublié ?
                </Link>
              </div>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
            {message && <p role="status" className="text-sm text-primary">{message}</p>}
            {error && <p className="text-sm text-destructive">{error}</p>}
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? 'Connexion...' : 'Se connecter'}
            </Button>
          </form>
          <Link href="/" className="mt-5 flex min-h-11 items-center justify-center rounded-full border border-border text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground">
            Retour à l’accueil
          </Link>
        </CardContent>
      </Card>
    </div>
  )
}
