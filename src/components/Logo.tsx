export default function Logo({ big = false }: { big?: boolean }) {
  return (
    <div className={`font-display font-extrabold ${big ? 'text-4xl' : 'text-xl'}`} aria-label="Cznnect">
      Cz<span className="text-accent-text">nn</span>ect
    </div>
  )
}
