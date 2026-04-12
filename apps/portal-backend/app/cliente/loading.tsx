export default function Loading() {
  return (
    <main className="min-h-screen bg-[#f7f4ee] px-6 py-8 text-[#10261d] sm:px-8 lg:px-10">
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-6">
        <section className="rounded-[32px] border border-[#e7e0d5] bg-white p-6 shadow-[0_20px_60px_rgba(16,38,29,0.05)] sm:p-8">
          <div className="inline-flex rounded-full border border-[#eadfcf] bg-[#fbf7ef] px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-[#8e6a3b]">
            Area do cliente
          </div>
          <h1 className="mt-6 text-3xl font-semibold tracking-[-0.03em] text-[#10261d] sm:text-4xl">
            Carregando seu painel minimo.
          </h1>
          <p className="mt-4 max-w-3xl text-base leading-8 text-[#5f6f68]">
            Estamos preparando uma versao segura da area autenticada para evitar
            falhas silenciosas durante o carregamento.
          </p>
        </section>

        <section className="rounded-3xl border border-[#e7e0d5] bg-white p-6 shadow-[0_20px_60px_rgba(16,38,29,0.05)]">
          <div className="h-4 w-40 animate-pulse rounded-full bg-[#ebe4d8]" />
          <div className="mt-4 h-4 w-full animate-pulse rounded-full bg-[#f0ebe2]" />
          <div className="mt-3 h-4 w-4/5 animate-pulse rounded-full bg-[#f0ebe2]" />
          <div className="mt-6 grid gap-4 md:grid-cols-3">
            <div className="h-28 animate-pulse rounded-3xl bg-[#fcfaf6]" />
            <div className="h-28 animate-pulse rounded-3xl bg-[#fcfaf6]" />
            <div className="h-28 animate-pulse rounded-3xl bg-[#fcfaf6]" />
          </div>
        </section>
      </div>
    </main>
  );
}
