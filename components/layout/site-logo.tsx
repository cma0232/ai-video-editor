import Image from 'next/image'
import Link from 'next/link'
import { cn } from '@/lib/utils/cn'

interface SiteLogoProps {
  className?: string
  showText?: boolean
}

const LOGO_SRC = process.env.NEXT_PUBLIC_APP_LOGO || '/icon.png'
const LOGO_ALT = '创剪视频工作流'

export function SiteLogo({ className, showText = true }: SiteLogoProps) {
  return (
    <Link href="/" className={cn('group inline-flex items-center gap-3', className)}>
      <div className="relative h-10 w-10 overflow-hidden rounded-xl shadow-xs transition group-hover:scale-105">
        <Image src={LOGO_SRC} alt={LOGO_ALT} fill sizes="40px" className="object-cover" priority />
      </div>
      {showText && (
        <div className="flex flex-col gap-0.5">
          <span className="text-xs font-medium uppercase tracking-normal text-claude-dark-300 leading-tight">
            ChuangCut Video Workflow
          </span>
          <span className="text-base font-semibold tracking-wide text-claude-dark-900 group-hover:text-violet-600 transition leading-tight">
            创剪视频工作流
          </span>
        </div>
      )}
    </Link>
  )
}
