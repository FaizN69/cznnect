export default function Logo({ big = false }: { big?: boolean }) {
  return (
    <div
      className={`text-center font-display font-bold tracking-tight ${big ? 'text-5xl' : 'text-2xl'}`}
      aria-label="Cznnect"
    >
      Cz<span className="text-brand">nn</span>ect
    </div>
  )
}
