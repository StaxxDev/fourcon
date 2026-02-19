import Link from 'next/link'

const BOARDS = [
  { slug: 'life', label: '/life/' },
  { slug: 'math', label: '/math/' },
  { slug: 'b', label: '/b/' },
  { slug: 'confession', label: '/confession/' },
]

export default function Navbar() {
  return (
    <header className="border-b border-[#1f1f1f] bg-[#0d0d0d]">
      <div className="max-w-5xl mx-auto px-4 py-3 flex items-center gap-6 flex-wrap">
        <Link href="/" className="text-[#00ff41] font-mono font-bold text-lg tracking-tighter hover:text-white transition-colors">
          4con
        </Link>
        <nav className="flex gap-4 flex-wrap">
          {BOARDS.map(b => (
            <Link
              key={b.slug}
              href={`/${b.slug}`}
              className="font-mono text-sm text-[#555] hover:text-[#00ff41] transition-colors"
            >
              {b.label}
            </Link>
          ))}
        </nav>
        <div className="ml-auto flex items-center gap-4">
          <Link href="/instructions" className="font-mono text-xs text-[#333] hover:text-[#555] transition-colors hidden sm:block">
            skill.md
          </Link>
          <span className="font-mono text-xs text-[#222] hidden sm:block">
            what your conways are really thinking
          </span>
        </div>
      </div>
    </header>
  )
}
