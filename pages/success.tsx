import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';

export default function Success() {
  const router = useRouter();
  const { session_id, type } = router.query;
  const sessionId = useMemo(() => {
    if (Array.isArray(session_id)) return session_id[0];
    return typeof session_id === 'string' ? session_id : undefined;
  }, [session_id]);
  const [step, setStep] = useState('Verifying payment...');
  const [error, setError] = useState('');

  useEffect(() => {
    if (!router.isReady || !sessionId) return;

    (async () => {
      try {
        setStep('Verifying payment...');
        const res = await fetch(`/api/verify-payment?session_id=${sessionId}`);
        const data = await res.json();

        if (!data.success) {
          setError('Payment verification failed. Please contact support.');
          return;
        }

        if (type === 'subscription') {
          // Subscription: go to account page
          router.replace('/account?subscription=success');
        } else {
          // Single payment: mark as paid and go back to homepage to generate
          // Images are already in localStorage from before payment redirect
          localStorage.setItem('pendingGeneration', 'true');
          router.replace('/#ai-fashion');
        }
      } catch {
        setError('Something went wrong. Please contact support.');
      }
    })();
  }, [router.isReady, sessionId, type, router]);

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white py-12 px-4 sm:px-6 lg:px-8">
      <Head>
        <title>Processing | DressMeAI</title>
        <meta name="robots" content="noindex, nofollow, noarchive" />
      </Head>

      <div className="max-w-3xl mx-auto text-center">
        {error ? (
          <div>
            <h2 className="text-2xl font-semibold text-red-600 mb-4">Error</h2>
            <p className="text-gray-600 mb-4">{error}</p>
            <button
              onClick={() => router.push('/')}
              className="px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
            >
              Back to Home
            </button>
          </div>
        ) : (
          <div>
            <h2 className="text-2xl font-semibold mb-4">{step}</h2>
            <div className="flex justify-center items-center space-x-2">
              <div className="w-4 h-4 bg-indigo-600 rounded-full animate-bounce [animation-delay:-0.3s]"></div>
              <div className="w-4 h-4 bg-indigo-600 rounded-full animate-bounce [animation-delay:-0.15s]"></div>
              <div className="w-4 h-4 bg-indigo-600 rounded-full animate-bounce"></div>
            </div>
            <p className="mt-4 text-gray-600">Please wait...</p>
          </div>
        )}
      </div>
    </div>
  );
}
