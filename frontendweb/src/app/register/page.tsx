'use client'

import Link from 'next/link'
import { useState } from 'react'
import Image from 'next/image'
import { ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { api } from '@/lib/api'

export default function TeacherRegistrationPage() {
  const [form, setForm] = useState({
    first_name: '',
    last_name: '',
    username: '',
    matricule: '',
    email: '',
    phone: '',
    teacher_type: 'FONCTIONNAIRE',
    password: '',
  })
  const [error, setError] = useState('')
  const [submitted, setSubmitted] = useState(false)
  const [loading, setLoading] = useState(false)

  const update = (field: keyof typeof form, value: string) => {
    setForm((current) => ({ ...current, [field]: value }))
  }

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError('')
    setLoading(true)

    try {
      await api.post('/register/', { ...form, role: 'PROFESSEUR' })
      setSubmitted(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Impossible d’envoyer la demande.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="flex min-h-dvh items-center justify-center bg-background px-4 py-10">
      <div className="w-full max-w-2xl">
        <Link href="/" className="mb-6 inline-flex items-center gap-2 text-sm font-medium text-muted-foreground transition hover:text-primary">
          <ArrowLeft className="size-4" /> Retour au site
        </Link>
        <Card className="border-border/80 bg-card shadow-lg">
          <CardHeader className="px-6 pt-7 sm:px-9 sm:pt-9">
            <div className="mb-3 flex items-center gap-3">
              <Image src="/logo%20%282%29.jpeg" alt="Logo LMS" width={96} height={46} className="h-11 w-20 shrink-0 object-contain" />
              <p className="font-display text-sm font-bold">Lycée Midongy Sud</p>
              <Image src="/drapeau.jpeg" alt="Emblème LMS" width={48} height={48} className="ml-auto size-12 shrink-0 rounded-full border border-border bg-white object-contain p-0.5" />
            </div>
            <p className="text-xs font-bold uppercase tracking-[.16em] text-primary">Espace enseignant</p>
            <CardTitle className="text-2xl">Demande d’accès</CardTitle>
            <p className="text-sm leading-6 text-muted-foreground">Les demandes sont vérifiées par l’administration avant l’activation du compte.</p>
          </CardHeader>
          <CardContent className="px-6 pb-7 sm:px-9 sm:pb-9">
            {submitted ? (
              <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5 text-sm leading-6 text-emerald-900" role="status">
                Votre demande a bien été envoyée. L’administration doit valider votre compte avant votre première connexion.
                <Link href="/login" className="mt-3 block font-semibold underline">Retour à la connexion</Link>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="grid gap-4 sm:grid-cols-2">
                <label className="grid gap-1.5 text-xs font-semibold">Prénom
                  <Input required autoComplete="given-name" value={form.first_name} onChange={(event) => update('first_name', event.target.value)} />
                </label>
                <label className="grid gap-1.5 text-xs font-semibold">Nom
                  <Input required autoComplete="family-name" value={form.last_name} onChange={(event) => update('last_name', event.target.value)} />
                </label>
                <label className="grid gap-1.5 text-xs font-semibold">Identifiant
                  <Input required autoComplete="username" value={form.username} onChange={(event) => update('username', event.target.value)} />
                </label>
                <label className="grid gap-1.5 text-xs font-semibold">Matricule enseignant
                  <Input required value={form.matricule} onChange={(event) => update('matricule', event.target.value)} />
                </label>
                <label className="grid gap-1.5 text-xs font-semibold">Adresse e-mail
                  <Input required type="email" autoComplete="email" value={form.email} onChange={(event) => update('email', event.target.value)} />
                </label>
                <label className="grid gap-1.5 text-xs font-semibold">Téléphone <span className="font-normal text-muted-foreground">Facultatif</span>
                  <Input autoComplete="tel" value={form.phone} onChange={(event) => update('phone', event.target.value)} />
                </label>
                <label className="grid gap-1.5 text-xs font-semibold">Statut professionnel
                  <select className="h-10 rounded-xl border border-input px-3 text-sm font-normal" value={form.teacher_type} onChange={(event) => update('teacher_type', event.target.value)}>
                    <option value="FONCTIONNAIRE">Fonctionnaire</option>
                    <option value="SUPPLEANT">Suppléant</option>
                  </select>
                </label>
                <label className="grid gap-1.5 text-xs font-semibold">Mot de passe
                  <Input required type="password" minLength={8} autoComplete="new-password" value={form.password} onChange={(event) => update('password', event.target.value)} />
                </label>
                {error && <p className="sm:col-span-2 text-sm font-medium text-destructive" role="alert">{error}</p>}
                <div className="sm:col-span-2 mt-2 flex flex-col-reverse items-stretch justify-between gap-3 border-t border-border pt-5 sm:flex-row sm:items-center">
                  <p className="text-xs text-muted-foreground">Vous avez déjà un compte ? <Link href="/login" className="font-semibold text-primary">Se connecter</Link></p>
                  <Button type="submit" disabled={loading}>{loading ? 'Envoi…' : 'Envoyer la demande'}</Button>
                </div>
              </form>
            )}
          </CardContent>
        </Card>
      </div>
    </main>
  )
}
