import Link from 'next/link'
import Image from 'next/image'
import {
  ArrowRight,
  BookOpenCheck,
  CalendarDays,
  Check,
  ChevronDown,
  ClipboardCheck,
  GraduationCap,
  HeartHandshake,
  MessageCircle,
  ShieldCheck,
  Sparkles,
  UsersRound,
} from 'lucide-react'

const services = [
  {
    icon: ClipboardCheck,
    title: 'Un suivi clair',
    text: 'Retrouvez les informations scolaires et le suivi de la vie de l’établissement au même endroit.',
  },
  {
    icon: CalendarDays,
    title: 'Une organisation partagée',
    text: 'Les équipes consultent les emplois du temps et coordonnent les activités selon leurs responsabilités.',
  },
  {
    icon: MessageCircle,
    title: 'Une communication utile',
    text: 'Les espaces privés facilitent les échanges entre les équipes pédagogiques et administratives.',
  },
]

const steps = [
  ['01', 'Les familles s’informent', 'Consultez les repères de l’établissement et les démarches d’inscription.'],
  ['02', 'Les équipes se coordonnent', 'Les enseignants et les services scolaires accèdent à leur espace dédié.'],
  ['03', 'L’administration pilote', 'Les comptes, les périodes scolaires et les services sont gérés par les personnes habilitées.'],
]

const faqs = [
  {
    question: 'Comment accéder à mon espace ?',
    answer: 'Utilisez le bouton « Se connecter ». Votre compte et vos autorisations sont fournis par l’administration.',
  },
  {
    question: 'Comment devenir enseignant sur la plateforme ?',
    answer: 'Envoyez une demande d’accès depuis le formulaire enseignant. L’administration doit valider le compte avant son activation.',
  },
  {
    question: 'L’inscription d’un élève dépend-elle du paiement ?',
    answer: 'Non. L’enregistrement du dossier scolaire est distinct du suivi des règlements. Une situation financière ne bloque pas l’inscription.',
  },
  {
    question: 'Où trouver le règlement officiel ?',
    answer: 'Les repères ci-dessous ne remplacent pas le règlement intérieur remis par l’établissement. Pour une situation précise, référez-vous au document officiel.',
  },
]

export default function Home() {
  return (
    <main className="overflow-hidden bg-background text-foreground">
      <header className="sticky top-0 z-30 border-b border-border/80 bg-card/90 backdrop-blur-xl">
        <nav className="mx-auto flex h-[76px] max-w-7xl items-center justify-between px-5 sm:px-8" aria-label="Navigation principale">
          <Link href="/" className="flex min-w-0 items-center gap-2 sm:gap-3" aria-label="Lycée Midongy Sud, accueil">
            <Image src="/logo%20%282%29.jpeg" alt="Logo LMS" width={104} height={50} className="h-8 w-16 shrink-0 object-contain sm:h-12 sm:w-24" priority />
            <span className="min-w-0">
              <span className="block truncate font-display text-xs font-bold tracking-tight sm:text-base">Lycée Midongy Sud</span>
              <span className="hidden text-[10px] font-medium uppercase tracking-[.16em] text-muted-foreground sm:block">Apprendre · grandir · réussir</span>
            </span>
            <Image src="/drapeau.jpeg" alt="Emblème LMS" width={56} height={56} className="ml-1 size-10 shrink-0 rounded-full border border-border bg-white object-contain p-0.5 sm:ml-2 sm:size-14" />
          </Link>
          <div className="hidden items-center gap-8 text-sm font-medium text-muted-foreground md:flex">
            <a className="transition-colors hover:text-primary" href="#fonctionnement">Fonctionnement</a>
            <a className="transition-colors hover:text-primary" href="#reglement">Vie scolaire</a>
            <a className="transition-colors hover:text-primary" href="#faq">FAQ</a>
          </div>
          <Link href="/login" className="inline-flex h-10 shrink-0 items-center gap-2 rounded-full bg-primary px-3 text-xs font-semibold text-primary-foreground shadow-sm transition hover:-translate-y-0.5 hover:shadow-md sm:px-5 sm:text-sm">
            Se connecter <ArrowRight className="size-4" />
          </Link>
        </nav>
      </header>

      <section className="relative isolate">
        <div className="pointer-events-none absolute -right-40 -top-28 -z-10 size-[480px] rounded-full bg-emerald-100/80 blur-3xl" />
        <div className="mx-auto grid max-w-7xl items-center gap-12 px-5 pb-20 pt-16 sm:px-8 sm:pb-28 sm:pt-24 lg:grid-cols-[1.03fr_.97fr] lg:gap-16">
          <div className="animate-fade-in">
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-primary/15 bg-primary/5 px-3.5 py-2 text-xs font-semibold text-primary">
              <Sparkles className="size-3.5" /> Le portail du Lycée Midongy Sud
            </div>
            <h1 className="max-w-3xl font-display text-4xl font-extrabold leading-[1.08] tracking-[-.055em] sm:text-5xl lg:text-[62px]">
              Une école mieux organisée, <span className="text-primary">ensemble.</span>
            </h1>
            <p className="mt-6 max-w-xl text-base leading-7 text-muted-foreground sm:text-lg sm:leading-8">
              Les informations de l’établissement et les outils de travail des équipes réunis dans un portail simple, clair et sécurisé.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href="/login" className="inline-flex h-12 items-center gap-2 rounded-full bg-primary px-6 text-sm font-semibold text-primary-foreground shadow-md transition hover:-translate-y-0.5 hover:shadow-lg">
                Accéder à mon espace <ArrowRight className="size-4" />
              </Link>
              <Link href="/register" className="inline-flex h-12 items-center gap-2 rounded-full border border-border bg-card px-6 text-sm font-semibold text-foreground transition hover:border-primary/40 hover:bg-secondary">
                Demande enseignant
              </Link>
            </div>
            <div className="mt-10 flex flex-wrap items-center gap-x-7 gap-y-3 text-xs font-medium text-muted-foreground">
              <span className="inline-flex items-center gap-2"><ShieldCheck className="size-4 text-primary" /> Accès selon votre rôle</span>
              <span className="inline-flex items-center gap-2"><HeartHandshake className="size-4 text-primary" /> Inscription sans condition de paiement</span>
            </div>
          </div>

          <div className="relative mx-auto w-full max-w-[540px] lg:justify-self-end">
            <div className="absolute -left-6 top-10 size-24 rounded-full bg-amber-100 blur-2xl" />
            <div className="absolute -bottom-8 -right-4 size-36 rounded-full bg-emerald-100 blur-3xl" />
            <div className="relative rounded-[28px] border border-white bg-white p-3 shadow-[0_32px_90px_-34px_rgba(9,70,48,.32)] sm:p-5">
              <div className="rounded-[20px] bg-[#f7faf8] p-4 sm:p-6">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-[.18em] text-primary">Portail scolaire</p>
                    <p className="mt-1 font-display text-lg font-bold tracking-tight text-[#0a1e2c]">Une vue d’ensemble</p>
                  </div>
                  <div className="grid size-10 place-items-center rounded-xl bg-white text-primary shadow-sm"><BookOpenCheck className="size-5" /></div>
                </div>
                <div className="mt-5 grid grid-cols-2 gap-3">
                  <div className="rounded-2xl border border-[#e8edf2] bg-white p-4">
                    <span className="grid size-9 place-items-center rounded-xl bg-[#e5f5ef] text-primary"><UsersRound className="size-4" /></span>
                    <p className="mt-4 text-xs text-[#5a6e7c]">Communauté scolaire</p>
                    <p className="mt-1 font-display text-base font-bold text-[#0a1e2c]">Des équipes réunies</p>
                  </div>
                  <div className="rounded-2xl border border-[#e8edf2] bg-white p-4">
                    <span className="grid size-9 place-items-center rounded-xl bg-[#fff7e5] text-[#a36600]"><CalendarDays className="size-4" /></span>
                    <p className="mt-4 text-xs text-[#5a6e7c]">Organisation</p>
                    <p className="mt-1 font-display text-base font-bold text-[#0a1e2c]">Un planning partagé</p>
                  </div>
                </div>
                <div className="mt-3 rounded-2xl border border-[#e8edf2] bg-white p-4">
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <span className="grid size-10 place-items-center rounded-xl bg-[#e5f5ef] text-primary"><Check className="size-5" /></span>
                      <div>
                        <p className="text-sm font-semibold text-[#0a1e2c]">Chaque équipe son espace</p>
                        <p className="mt-0.5 text-xs text-[#5a6e7c]">Enseignement · Vie scolaire · Administration</p>
                      </div>
                    </div>
                    <span className="hidden rounded-full bg-[#e5f5ef] px-3 py-1 text-[10px] font-bold text-primary sm:inline-flex">SÉCURISÉ</span>
                  </div>
                </div>
                <div className="mt-3 flex items-center justify-between rounded-2xl bg-primary px-4 py-3.5 text-white">
                  <div>
                    <p className="text-xs font-medium text-white/75">Dossiers scolaires</p>
                    <p className="mt-0.5 text-sm font-semibold">Un suivi qui accompagne chaque élève</p>
                  </div>
                  <ArrowRight className="size-5 shrink-0" />
                </div>
              </div>
            </div>
            <div className="absolute -bottom-5 left-4 hidden items-center gap-3 rounded-2xl border border-border bg-card px-4 py-3 shadow-lg sm:flex">
              <span className="grid size-9 place-items-center rounded-full bg-[#fff7e5] text-[#a36600]"><HeartHandshake className="size-4" /></span>
              <span className="text-xs font-semibold">Un parcours scolaire sans obstacle financier</span>
            </div>
          </div>
        </div>
      </section>

      <section className="border-y border-border/70 bg-card">
        <div className="mx-auto grid max-w-7xl gap-7 px-5 py-8 sm:grid-cols-3 sm:px-8 sm:py-10">
          {services.map(({ icon: Icon, title, text }) => (
            <article key={title} className="flex gap-4">
              <span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-secondary text-primary"><Icon className="size-5" /></span>
              <div><h2 className="font-display text-sm font-bold">{title}</h2><p className="mt-1.5 text-xs leading-5 text-muted-foreground">{text}</p></div>
            </article>
          ))}
        </div>
      </section>

      <section id="fonctionnement" className="scroll-mt-24 px-5 py-20 sm:px-8 sm:py-28">
        <div className="mx-auto max-w-7xl">
          <div className="max-w-2xl">
            <p className="text-xs font-bold uppercase tracking-[.18em] text-primary">Un fonctionnement lisible</p>
            <h2 className="mt-3 font-display text-3xl font-extrabold tracking-tight sm:text-4xl">Les bons outils, au bon endroit.</h2>
            <p className="mt-4 text-sm leading-7 text-muted-foreground sm:text-base">Un accès unique, puis des espaces distincts afin que chacun retrouve les informations utiles à sa mission.</p>
          </div>
          <div className="mt-10 grid gap-4 md:grid-cols-3">
            {steps.map(([number, title, text]) => (
              <article key={number} className="group rounded-3xl border border-border bg-card p-6 shadow-sm transition duration-300 hover:-translate-y-1 hover:border-primary/30 hover:shadow-lg sm:p-8">
                <span className="font-display text-4xl font-extrabold tracking-tight text-primary/20 transition group-hover:text-primary/70">{number}</span>
                <h3 className="mt-6 font-display text-lg font-bold">{title}</h3>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">{text}</p>
              </article>
            ))}
          </div>
          <div className="mt-5 grid gap-3 rounded-3xl bg-[#10251d] p-6 text-white sm:grid-cols-3 sm:p-8">
            {[
              ['Enseignants', 'Notes · présences · emploi du temps'],
              ['Secrétariat & vie scolaire', 'Dossiers élèves · suivi des présences'],
              ['Administration', 'Comptes · pédagogie · finances'],
            ].map(([title, text]) => <div key={title} className="border-white/10 sm:border-l sm:pl-5 first:sm:border-0 first:sm:pl-0"><p className="font-display text-sm font-bold">{title}</p><p className="mt-1 text-xs leading-5 text-white/65">{text}</p></div>)}
          </div>
        </div>
      </section>

      <section id="reglement" className="scroll-mt-24 bg-[#f0f6f2] px-5 py-20 sm:px-8 sm:py-24">
        <div className="mx-auto grid max-w-7xl gap-10 lg:grid-cols-[.8fr_1.2fr] lg:items-center">
          <div>
            <span className="grid size-12 place-items-center rounded-2xl bg-white text-primary shadow-sm"><ShieldCheck className="size-6" /></span>
            <p className="mt-6 text-xs font-bold uppercase tracking-[.18em] text-primary">Bien vivre l’école</p>
            <h2 className="mt-3 font-display text-3xl font-extrabold tracking-tight sm:text-4xl">Des repères partagés, dans le respect de chacun.</h2>
            <p className="mt-4 text-sm leading-7 text-muted-foreground">La communauté scolaire s’appuie sur un cadre commun pour protéger le temps d’apprentissage et assurer un accueil attentif de chaque élève.</p>
            <p className="mt-4 text-xs leading-5 text-muted-foreground">Ces repères sont indicatifs. Le règlement intérieur officiel de l’établissement reste la référence.</p>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {[
              ['Respect', 'Adopter une attitude respectueuse envers les élèves, les familles et les équipes.'],
              ['Ponctualité', 'Se référer aux horaires communiqués par l’établissement et signaler les absences.'],
              ['Cadre scolaire', 'Prendre soin des espaces, du matériel et des ressources partagées.'],
              ['Communication', 'Utiliser les canaux adaptés et transmettre les informations avec responsabilité.'],
            ].map(([title, text]) => (
              <article key={title} className="rounded-2xl border border-white bg-white p-5 shadow-sm">
                <span className="grid size-8 place-items-center rounded-full bg-secondary text-primary"><Check className="size-4" /></span>
                <h3 className="mt-4 font-display text-sm font-bold">{title}</h3>
                <p className="mt-1.5 text-xs leading-5 text-muted-foreground">{text}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section id="faq" className="scroll-mt-24 px-5 py-20 sm:px-8 sm:py-28">
        <div className="mx-auto max-w-3xl">
          <p className="text-center text-xs font-bold uppercase tracking-[.18em] text-primary">FAQ</p>
          <h2 className="mt-3 text-center font-display text-3xl font-extrabold tracking-tight sm:text-4xl">Vous avez une question ?</h2>
          <div className="mt-9 space-y-3">
            {faqs.map(({ question, answer }) => (
              <details key={question} className="group rounded-2xl border border-border bg-card px-5 py-4 open:border-primary/30 open:bg-primary/[.025]">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-semibold">
                  <span className="text-sm">{question}</span>
                  <ChevronDown className="size-4 shrink-0 text-primary transition-transform group-open:rotate-180" />
                </summary>
                <p className="max-w-2xl pb-1 pt-3 text-sm leading-6 text-muted-foreground">{answer}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      <section className="px-5 pb-20 sm:px-8 sm:pb-24">
        <div className="relative mx-auto max-w-7xl overflow-hidden rounded-[32px] bg-primary px-6 py-12 text-center text-white sm:px-12 sm:py-16">
          <div className="pointer-events-none absolute -right-20 -top-32 size-72 rounded-full bg-white/10 blur-3xl" />
          <p className="relative text-xs font-bold uppercase tracking-[.18em] text-white/70">Lycée Midongy Sud</p>
          <h2 className="relative mx-auto mt-3 max-w-2xl font-display text-3xl font-extrabold tracking-tight sm:text-4xl">Votre espace scolaire vous attend.</h2>
          <p className="relative mx-auto mt-3 max-w-xl text-sm leading-6 text-white/80">Connectez-vous pour rejoindre votre espace sécurisé et retrouver les outils associés à votre rôle.</p>
          <Link href="/login" className="relative mt-7 inline-flex h-12 items-center gap-2 rounded-full bg-white px-6 text-sm font-bold text-primary transition hover:-translate-y-0.5 hover:shadow-lg">Se connecter <ArrowRight className="size-4" /></Link>
        </div>
      </section>

      <footer className="border-t border-border bg-card px-5 py-8 sm:px-8">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-4 sm:flex-row">
          <Link href="/" className="flex items-center gap-2 font-display text-sm font-bold">
            <Image src="/logo%20%282%29.jpeg" alt="Logo LMS" width={72} height={36} className="h-8 w-16 object-contain" />
            Lycée Midongy Sud
            <Image src="/drapeau.jpeg" alt="Emblème LMS" width={40} height={40} className="ml-2 size-10 rounded-full border border-border bg-white object-contain p-0.5" />
          </Link>
          <p className="text-center text-xs text-muted-foreground">Portail d’information et de services scolaires</p>
          <Link href="/login" className="text-xs font-semibold text-primary hover:underline">Accès au portail</Link>
        </div>
      </footer>
    </main>
  )
}
