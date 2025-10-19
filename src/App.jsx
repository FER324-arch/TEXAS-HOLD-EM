import TexasHoldem from './TexasHoldem.jsx'

export default function App() {
  return (
    <main className="min-h-screen bg-gradient-to-br from-emerald-950 via-emerald-900 to-slate-900 text-slate-100">
      <div className="mx-auto flex max-w-6xl flex-col gap-6 px-4 py-10">
        <header className="text-center">
          <h1 className="text-4xl font-semibold tracking-tight md:text-5xl">
            Texas Hold'em Trainer
          </h1>
          <p className="mt-2 text-sm text-emerald-200">
            Practica estrategias, gestiona partidas locales o prueba el modo P2P sin backend.
          </p>
        </header>
        <TexasHoldem />
      </div>
    </main>
  )
}
