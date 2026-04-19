import Link from "next/link";

export default function HomePage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-8 px-6 py-12 bg-[var(--background)]">
      <div className="text-center space-y-2">
        <h1 className="text-6xl font-black tracking-tight text-white">
          SUBZ
        </h1>
        <p className="text-lg text-white/50">
          Write the missing subtitle. Make them laugh.
        </p>
      </div>

      <div className="flex flex-col gap-4 w-full max-w-xs">
        <Link
          href="/join?mode=create"
          className="flex items-center justify-center h-14 rounded-2xl bg-violet-600 text-white font-bold text-lg active:scale-95 transition-transform"
        >
          Create a game
        </Link>
        <Link
          href="/join?mode=random"
          className="flex items-center justify-center h-14 rounded-2xl bg-white/10 text-white font-bold text-lg active:scale-95 transition-transform"
        >
          Join random game
        </Link>
      </div>
    </main>
  );
}
