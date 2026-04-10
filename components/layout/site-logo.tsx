import Link from 'next/link'
import { cn } from '@/lib/utils/cn'

interface SiteLogoProps {
  className?: string
  showText?: boolean
}

export function SiteLogo({ className, showText = true }: SiteLogoProps) {
  return (
    <Link href="/" className={cn('group inline-flex items-center', className)}>
      {showText && (
        <span className="text-base font-semibold tracking-wide text-claude-dark-900 group-hover:text-violet-600 transition leading-tight">
          Video Auto Clipper
        </span>
      )}
    </Link>
  )
}
