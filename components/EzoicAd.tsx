import { useEffect, useRef } from 'react'

declare global {
  interface Window {
    ezstandalone?: {
      cmd: Array<() => void>
      showAds: (...ids: number[]) => void
    }
  }
}

interface EzoicAdProps {
  placementId: number
  className?: string
}

export default function EzoicAd({ placementId, className = '' }: EzoicAdProps) {
  const adRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (typeof window !== 'undefined' && window.ezstandalone) {
      window.ezstandalone.cmd.push(() => {
        window.ezstandalone?.showAds(placementId)
      })
    }
  }, [placementId])

  return (
    <div
      ref={adRef}
      id={`ezoic-pub-ad-placeholder-${placementId}`}
      className={className}
    />
  )
}
