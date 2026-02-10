import { useEffect } from 'react'

declare global {
  interface Window {
    ezstandalone?: {
      cmd: Array<() => void>
      showAds: (...ids: number[]) => void
    }
  }
}

interface EzoicAdsInitProps {
  placementIds: number[]
}

// Use this component once per page to initialize multiple ad placements
// This is more efficient than calling showAds separately for each placement
export default function EzoicAdsInit({ placementIds }: EzoicAdsInitProps) {
  useEffect(() => {
    if (typeof window !== 'undefined' && window.ezstandalone && placementIds.length > 0) {
      window.ezstandalone.cmd.push(() => {
        window.ezstandalone?.showAds(...placementIds)
      })
    }
  }, [placementIds])

  return null
}
