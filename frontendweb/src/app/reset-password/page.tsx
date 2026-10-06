'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { api } from '@/lib/api'

export default function ResetPasswordPage() {
  const router = useRouter()
  const [uid, setUid] = useState('')
  const [token, setToken] = useState('')
  const [password, setPassword] = useState('')
  const [passwordConfirmation, setPasswordConfirmation] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    setUid(params.get('uid') ?? '')
    setToken(params.get('token') ?? '')
  }, [])

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError('')
    if (!uid || !token) {
      setError('Le lien de réinitialisation est incomplet. Demandez-en un nouveau.')
      return
    }
    if (password !== passwordConfirmation) {
      setError('Les deux mots de passe ne correspondent pas.')
      return
    }

    setLoading(true)
    try {
      await api.post<{ detail: string }>('/password-reset/confirm/', { uid, token, password })
      router.replace('/login?passwordReset=success')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Le mot de passe n’a pas pu être modifié.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="flex min-h-dvh items-center justify-center bg-background p-4">
      <Card className="w-full max-w-lg border-border/70 bg-card shadow-lg">
        <CardHeader className="space-y-2">
          <Link href="/login" className="inline-flex min-h-11 w-fit items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground">
            <ArrowLeft className="size-4" /> Retour à la connexion
          </Link>
          <CardTitle className="pt-2 text-xl sm:text-2xl">Créer un nouveau mot de passe</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <label htmlFor="password" className="text-sm font-medium">Nouveau mot de passe</label>
              <Input id="password" type="password" autoComplete="new-password" minLength={8} required value={password} onChange={(event) => setPassword(event.target.value)} />
            </div>
            <div className="space-y-2">
              <label htmlFor="password-confirmation" className="text-sm font-medium">Confirmer le mot de passe</label>
              <Input id="password-confirmation" type="password" autoComplete="new-password" minLength={8} required value={passwordConfirmation} onChange={(event) => setPasswordConfirmation(event.target.value)} />
            </div>
            {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? 'Enregistrement…' : 'Modifier le mot de passe'}
            </Button>
          </form>
          <Link href="/" className="mt-4 flex min-h-11 items-center justify-center rounded-full border border-border text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground">
            Retour à l’accueil
          </Link>
        </CardContent>
      </Card>
    </main>
  )
}
