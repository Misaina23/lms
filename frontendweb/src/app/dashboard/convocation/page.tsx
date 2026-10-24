'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function ConvocationRoute() {
  const router = useRouter()

  useEffect(() => {
    router.replace('/dashboard?section=office')
  }, [router])

  return <main className="p-8 text-sm text-muted-foreground">Ouverture des convocations…</main>
}
