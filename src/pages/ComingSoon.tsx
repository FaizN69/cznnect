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
      <h1 className="font-display text-3xl font-bold">{title}</h1>
      <div className="card flex flex-col gap-3">
        <span className="w-fit rounded-full border-2 border-ink bg-sun px-3 py-0.5 text-sm font-bold">
          Coming in stage {stage}
        </span>
        <p className="text-lg font-semibold">{blurb}</p>
        <ul className="list-disc space-y-1 pl-5">
          {items.map((i) => (
            <li key={i}>{i}</li>
          ))}
        </ul>
      </div>
    </div>
  )
}
