export default function Loading() {
  return (
    <main className="flex min-h-full flex-1 flex-col bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950">
      <div className="border-b border-zinc-800/80 bg-zinc-950/90 px-6 py-4">
        <div className="mx-auto flex max-w-3xl animate-pulse justify-between">
          <div className="h-4 w-32 rounded bg-zinc-800" />
          <div className="h-4 w-48 rounded bg-zinc-800" />
        </div>
      </div>
      <div className="flex flex-1 items-center justify-center px-6 py-10">
        <div className="w-full max-w-2xl animate-pulse space-y-8 rounded-sm border border-zinc-800/80 p-10">
          <div className="h-24 rounded bg-zinc-900/80" />
          <div className="h-32 rounded bg-zinc-900/80" />
        </div>
      </div>
    </main>
  );
}
