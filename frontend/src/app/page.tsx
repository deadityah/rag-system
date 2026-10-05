export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-6 text-center">
      <div className="max-w-md rounded-2xl border border-glass-border bg-glass-fill p-8 shadow-glass backdrop-blur-md">
        <h1 className="text-3xl font-bold tracking-tight text-text-primary">
          DocuMind
        </h1>
        <p className="mt-2 text-sm text-text-secondary">
          Document Intelligence with Retrieval-Augmented Generation
        </p>
        <div className="mt-6 inline-flex items-center gap-2 rounded-full bg-accent-soft px-3 py-1 text-xs font-medium text-text-secondary">
          <span className="h-2 w-2 rounded-full bg-success"></span>
          Phase 1 Setup Complete
        </div>
      </div>
    </main>
  );
}
