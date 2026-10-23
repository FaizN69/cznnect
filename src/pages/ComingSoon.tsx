export default function ComingSoon({
  title,
  stage,
  blurb,
  items,
}: {
  title: string
  stage: number
  blurb: string
  items: string[]
}) {
  return (
    <div className="flex flex-col gap-4">
      <h1 className="font-display text-2xl font-extrabold">{title}</h1>
      <div className="card flex flex-col gap-3">
        <span className="w-fit rounded-[var(--radius-ctl)] bg-accent-soft px-2.5 py-1 text-xs font-bold uppercase tracking-wider text-accent-text">
          Coming in stage {stage}
        </span>
        <p className="text-lg font-semibold">{blurb}</p>
        <ul className="list-disc space-y-1 pl-5 text-muted">
          {items.map((i) => (
            <li key={i}>{i}</li>
          ))}
        </ul>
      </div>
    </div>
  )
}
