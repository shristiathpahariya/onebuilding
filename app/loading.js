export default function Loading() {
  return (
    <main className="flex min-h-full flex-1 items-center justify-center bg-[#030305] px-6 py-16">
      <div className="w-full max-w-3xl animate-pulse space-y-6 rounded-sm border border-zinc-800/90 bg-[#0a0a0c] p-5">
        <div className="h-3 w-20 rounded bg-zinc-600" />
        <div className="grid grid-cols-5 gap-4">
          {Array.from({ length: 15 }).map((_, i) => (
            <div key={i} className="aspect-[4/5] rounded-sm border border-zinc-300/50 bg-zinc-500" />
          ))}
        </div>
      </div>
    </main>
  );
}
