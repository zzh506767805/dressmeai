import { useEffect, useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { CheckIcon, LockClosedIcon, SparklesIcon } from '@heroicons/react/24/solid'

type PaywallCopy = {
  title: string
  description: string
  beforeLabel: string
  afterLabel: string
  featureResult: string
  featureRefund: string
  featureHistory: string
  subscriptionTitle: string
  subscriptionDescription: string
  subscriptionCta: string
  singleNote: string
  singleCta: string
  secureNote: string
  plansLink: string
  closeLabel: string
}

type GenerationPaywallProps = {
  copy: PaywallCopy
  subscriptionPrice: string
  checkoutLoading: 'subscription' | 'single' | null
  onSubscribe: () => void
  onSingleCheckout: () => void
  onClose: () => void
}

const demoLooks = [
  {
    result: '/images/paywall-demo/look-floral.jpg',
    garment: '/garments/dress-floral.jpg',
  },
  {
    result: '/images/paywall-demo/look-blazer.jpg',
    garment: '/garments/blazer-navy.jpg',
  },
  {
    result: '/images/paywall-demo/look-coat.jpg',
    garment: '/garments/coat-camel.jpg',
  },
]

export default function GenerationPaywall({
  copy,
  subscriptionPrice,
  checkoutLoading,
  onSubscribe,
  onSingleCheckout,
  onClose,
}: GenerationPaywallProps) {
  const [lookIndex, setLookIndex] = useState(0)

  useEffect(() => {
    const timer = window.setInterval(() => {
      setLookIndex(current => (current + 1) % demoLooks.length)
    }, 3600)
    return () => window.clearInterval(timer)
  }, [])

  const look = demoLooks[lookIndex]

  return (
    <div
      className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/70 px-4 py-6 backdrop-blur-md sm:py-10"
      role="dialog"
      aria-modal="true"
      aria-labelledby="generation-paywall-title"
      onClick={onClose}
    >
      <div className="flex min-h-full items-center justify-center">
        <div
          className="relative grid w-full max-w-4xl overflow-hidden rounded-[28px] bg-white shadow-2xl lg:grid-cols-[0.92fr_1.08fr]"
          onClick={event => event.stopPropagation()}
        >
          <button
            type="button"
            onClick={onClose}
            className="absolute right-4 top-4 z-20 flex h-9 w-9 items-center justify-center rounded-full bg-white/90 text-xl text-slate-500 shadow-sm ring-1 ring-black/5 transition hover:bg-white hover:text-slate-900"
            aria-label={copy.closeLabel}
          >
            ×
          </button>

          <div className="relative min-h-[290px] overflow-hidden bg-[#ddd6ce] sm:min-h-[500px] lg:min-h-[620px]">
            <Image
              src="/images/paywall-demo/model-base.jpg"
              alt={copy.beforeLabel}
              fill
              priority
              sizes="(max-width: 1024px) 100vw, 42vw"
              className="object-cover"
            />

            <div key={look.result} className="paywall-result-reveal absolute inset-0">
              <Image
                src={look.result}
                alt={copy.afterLabel}
                fill
                priority
                sizes="(max-width: 1024px) 100vw, 42vw"
                className="object-cover"
              />
            </div>

            <div key={`scan-${lookIndex}`} className="paywall-scan-line absolute inset-x-0 z-10 h-px bg-white shadow-[0_0_22px_6px_rgba(255,255,255,0.85)]" />

            <div className="absolute left-4 top-4 z-10 rounded-full bg-slate-950/65 px-3 py-1.5 text-xs font-semibold text-white backdrop-blur">
              {copy.beforeLabel}
            </div>
            <div className="absolute bottom-4 left-4 z-10 rounded-full bg-white/90 px-3 py-1.5 text-xs font-semibold text-indigo-700 shadow-sm backdrop-blur">
              {copy.afterLabel}
            </div>

            <div className="absolute bottom-4 right-4 z-10 flex items-center gap-2 rounded-2xl bg-white/90 p-2 shadow-lg backdrop-blur">
              <div className="relative h-14 w-11 overflow-hidden rounded-xl bg-white ring-1 ring-slate-200">
                <Image src={look.garment} alt="" fill sizes="44px" className="object-cover" />
              </div>
              <SparklesIcon className="h-5 w-5 text-indigo-600" />
            </div>

            <div className="absolute bottom-4 left-1/2 z-10 flex -translate-x-1/2 gap-1.5">
              {demoLooks.map((item, index) => (
                <button
                  key={item.result}
                  type="button"
                  onClick={() => setLookIndex(index)}
                  className={`h-1.5 rounded-full transition-all ${
                    index === lookIndex ? 'w-6 bg-white' : 'w-1.5 bg-white/55'
                  }`}
                  aria-label={`${copy.afterLabel} ${index + 1}`}
                />
              ))}
            </div>
          </div>

          <div className="flex flex-col justify-center px-6 py-6 sm:px-10 sm:py-10 lg:px-12">
            <h2 id="generation-paywall-title" className="text-2xl font-bold tracking-tight text-slate-950 sm:text-4xl">
              {copy.title}
            </h2>
            <p className="mt-4 text-base leading-7 text-slate-600">{copy.description}</p>

            <div className="mt-5 rounded-2xl border-2 border-indigo-600 bg-gradient-to-br from-indigo-50 to-purple-50 p-5">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h3 className="text-lg font-bold text-slate-950">{copy.subscriptionTitle}</h3>
                  <p className="mt-1 text-sm leading-6 text-slate-600">{copy.subscriptionDescription}</p>
                </div>
                <div className="flex-none text-right">
                  <p className="text-3xl font-black tracking-tight text-slate-950">{subscriptionPrice}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={onSubscribe}
                disabled={checkoutLoading !== null}
                className="mt-4 w-full rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 px-5 py-3.5 text-base font-bold text-white shadow-lg shadow-indigo-200 transition hover:-translate-y-0.5 hover:shadow-xl disabled:cursor-wait disabled:opacity-70"
              >
                {checkoutLoading === 'subscription' ? '…' : copy.subscriptionCta}
              </button>
            </div>

            <ul className="mt-4 space-y-2.5 text-sm text-slate-700 sm:mt-6 sm:space-y-3">
              {[copy.featureResult, copy.featureRefund, copy.featureHistory].map(feature => (
                <li key={feature} className="flex items-start gap-3">
                  <span className="mt-0.5 flex h-5 w-5 flex-none items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
                    <CheckIcon className="h-3.5 w-3.5" />
                  </span>
                  {feature}
                </li>
              ))}
            </ul>

            <div className="my-5 flex items-center gap-3">
              <div className="h-px flex-1 bg-slate-200" />
              <span className="text-xs text-slate-400">{copy.singleNote}</span>
              <div className="h-px flex-1 bg-slate-200" />
            </div>
            <button
              type="button"
              onClick={onSingleCheckout}
              disabled={checkoutLoading !== null}
              className="w-full rounded-xl border border-slate-300 bg-white px-5 py-3 text-sm font-semibold text-slate-700 transition hover:border-indigo-300 hover:bg-indigo-50 disabled:cursor-wait disabled:opacity-70"
            >
              {checkoutLoading === 'single' ? '…' : copy.singleCta}
            </button>
            <p className="mt-3 flex items-center justify-center gap-1.5 text-xs text-slate-500">
              <LockClosedIcon className="h-3.5 w-3.5" />
              {copy.secureNote}
            </p>
            <Link href="/pricing" className="mt-4 text-center text-sm font-medium text-indigo-600 hover:underline">
              {copy.plansLink}
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
