'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { Eye, EyeOff } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { api } from '@/lib/api'
import { clearSession, isValidPortalRole } from '@/lib/auth'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
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
      if (!isValidPortalRole(response.user.role)) {
        clearSession()
        throw new Error('Ce compte n’est pas autorisé à accéder au portail.')
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
        <CardHeader className="flex items-center justify-center pb-2">
          <Image
            src="/drapeau.jpeg"
            alt="Emblème du lycée"
            width={160}
            height={160}
            className="mx-auto size-28 rounded-full border border-border bg-white object-contain p-1 sm:size-36"
          />
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <label htmlFor="email" className="text-sm font-medium">Email</label>
              <Input
                id="email"
                type="email"
                placeholder="votre.email@lycee.com"
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
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="pr-10"
                />
                <button
                  type="button"
                  aria-label={showPassword ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}
                  onClick={() => setShowPassword((value) => !value)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground transition-colors hover:text-foreground"
                >
                  {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                </button>
              </div>
            </div>
            {message && <p role="status" className="text-sm text-primary">{message}</p>}
            {error && <p className="text-sm text-destructive">{error}</p>}
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? 'Connexion...' : 'Se connecter'}
            </Button>
          </form>
          <div className="mt-5 flex items-center justify-center gap-3">
            <Link href="/" className="flex min-h-11 flex-1 items-center justify-center rounded-full border border-border text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground">
              Accueil
            </Link>
            <Link href="/register" className="flex min-h-11 flex-1 items-center justify-center rounded-full bg-primary text-sm font-semibold text-primary-foreground transition-colors hover:opacity-95">
              S’inscrire
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
