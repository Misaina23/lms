'use client'

import { useState } from 'react'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { api } from '@/lib/api'

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setLoading(true)
    setError('')
    setMessage('')
    try {
      const response = await api.post<{ detail: string }>('/password-reset/', { email })
      setMessage(response.detail)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'La demande n’a pas pu être envoyée.')
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
          <CardTitle className="pt-2 text-xl sm:text-2xl">Mot de passe oublié ?</CardTitle>
          <p className="text-sm text-muted-foreground">
            Indiquez l’adresse e-mail associée à votre compte. Si elle existe, vous recevrez un lien de réinitialisation.
          </p>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <label htmlFor="email" className="text-sm font-medium">Adresse e-mail</label>
              <Input id="email" type="email" autoComplete="email" required value={email} onChange={(event) => setEmail(event.target.value)} />
            </div>
            {message && <p role="status" className="text-sm text-primary">{message}</p>}
            {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? 'Envoi en cours…' : 'Envoyer le lien'}
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
