
import Logo from './Logo'

export default function Splash() {
  return (
    <div className="flex min-h-full flex-col items-center justify-center gap-5">
      <Logo big />
      <p className="text-xs tracking-wide opacity-60">
        Made by Sabahat Faizan
      </p>
    </div>
  )
}
