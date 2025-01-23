import Head from 'next/head'
import Link from 'next/link'
import { ArrowLeftIcon } from '@heroicons/react/24/outline'

export default function TryOn() {
  return (
    <div className="min-h-screen bg-gray-50">
      <Head>
        <title>Virtual Try-On Experience | DressMeAI</title>
        <meta name="description" content="Try on clothes virtually with our advanced AI technology. Experience how different outfits look on you before making a purchase." />
      </Head>

      <main>
        {/* Header */}
        <div className="bg-white shadow-sm">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="flex h-16 justify-between items-center">
              <div className="flex items-center">
                <Link 
                  href="/"
                  className="flex items-center text-gray-500 hover:text-gray-700 transition-colors duration-200"
                >
                  <ArrowLeftIcon className="h-5 w-5 mr-2" />
                  Back to Home
                </Link>
              </div>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="py-20">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="text-center">
              <h1 className="text-4xl font-bold tracking-tight text-gray-900 sm:text-5xl">
                Coming Soon
              </h1>
              <p className="mt-6 text-lg leading-8 text-gray-600">
                We're working hard to bring you the best virtual try-on experience. Leave your email to get notified when we launch.
              </p>
              
              {/* Email Signup Form */}
              <form className="mt-10 max-w-md mx-auto">
                <div className="flex flex-col sm:flex-row gap-4">
                  <div className="flex-grow">
                    <label htmlFor="email" className="sr-only">Email address</label>
                    <input
                      type="email"
                      name="email"
                      id="email"
                      className="block w-full rounded-lg border-0 px-4 py-3 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-indigo-500"
                      placeholder="Enter your email"
                      required
                    />
                  </div>
                  <button
                    type="submit"
                    className="flex-none rounded-lg bg-indigo-600 px-6 py-3 text-base font-semibold text-white shadow-sm hover:bg-indigo-500 transition-colors duration-200"
                  >
                    Notify Me
                  </button>
                </div>
                <p className="mt-3 text-sm text-gray-500">
                  We'll notify you when the feature is ready. No spam, we promise!
                </p>
              </form>

              {/* Feature Preview */}
              <div className="mt-20">
                <h2 className="text-2xl font-semibold text-gray-900">
                  What to Expect
                </h2>
                <div className="mt-10 grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3">
                  <div className="bg-white p-6 rounded-lg shadow-sm">
                    <h3 className="text-lg font-semibold text-gray-900">Realistic Try-On</h3>
                    <p className="mt-2 text-gray-600">See exactly how clothes will look on you with our advanced AI technology.</p>
                  </div>
                  <div className="bg-white p-6 rounded-lg shadow-sm">
                    <h3 className="text-lg font-semibold text-gray-900">Multiple Angles</h3>
                    <p className="mt-2 text-gray-600">View outfits from different angles to make confident decisions.</p>
                  </div>
                  <div className="bg-white p-6 rounded-lg shadow-sm">
                    <h3 className="text-lg font-semibold text-gray-900">Mix & Match</h3>
                    <p className="mt-2 text-gray-600">Try different combinations to create your perfect outfit.</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
} 