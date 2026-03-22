import Head from "next/head";
import Link from "next/link";
import Image from "next/image";
import { useSession } from "next-auth/react";
import { useRouter } from "next/router";
import { useEffect, useState } from "react";
import UserMenu from "../components/UserMenu";

interface TryOnRecord {
  id: string;
  resultImageUrl: string | null;
  status: string;
  createdAt: string;
}

export default function Account() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [history, setHistory] = useState<TryOnRecord[]>([]);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/");
    }
  }, [status, router]);

  useEffect(() => {
    if (session?.user) {
      fetch("/api/user/history?page=1")
        .then((r) => r.json())
        .then((data) => setHistory(data.jobs || []))
        .catch(() => {});
    }
  }, [session]);

  if (status === "loading" || !session) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const planLabel =
    session.user.subscriptionStatus === "PRO"
      ? "Pro"
      : session.user.subscriptionStatus === "BASIC"
      ? "Basic"
      : "Free";

  const isSubscribed = session.user.subscriptionStatus !== "FREE";

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white">
      <Head>
        <title>Account - DressMeAI</title>
        <meta name="robots" content="noindex, nofollow" />
      </Head>

      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between py-4 mb-8">
          <Link href="/" className="text-4xl font-bold text-indigo-600">
            DressMeAI
          </Link>
          <UserMenu />
        </div>

        <div className="max-w-4xl mx-auto">
          <h1 className="text-3xl font-bold text-gray-900 mb-8">Account</h1>

          {/* Profile Section */}
          <div className="bg-white rounded-2xl shadow-sm ring-1 ring-gray-100 p-6 mb-6">
            <div className="flex items-center gap-4">
              {session.user.image ? (
                <Image
                  src={session.user.image}
                  alt={session.user.name || "User"}
                  width={56}
                  height={56}
                  className="rounded-full"
                />
              ) : (
                <div className="w-14 h-14 rounded-full bg-indigo-600 flex items-center justify-center text-white text-xl font-medium">
                  {(session.user.name || session.user.email || "U")[0].toUpperCase()}
                </div>
              )}
              <div>
                <h2 className="text-lg font-semibold text-gray-900">
                  {session.user.name}
                </h2>
                <p className="text-sm text-gray-500">{session.user.email}</p>
              </div>
            </div>
          </div>

          {/* Subscription Section */}
          <div className="bg-white rounded-2xl shadow-sm ring-1 ring-gray-100 p-6 mb-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Subscription
            </h3>
            <div className="flex items-center justify-between">
              <div>
                <div className="flex items-center gap-3 mb-2">
                  <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-indigo-100 text-indigo-800">
                    {planLabel} Plan
                  </span>
                  {session.user.subscriptionExpiry && (
                    <span className="text-sm text-gray-500">
                      Renews{" "}
                      {new Date(
                        session.user.subscriptionExpiry
                      ).toLocaleDateString()}
                    </span>
                  )}
                </div>
                <p className="text-2xl font-bold text-gray-900">
                  {session.user.credits}{" "}
                  <span className="text-base font-normal text-gray-500">
                    credits remaining
                  </span>
                </p>
              </div>
              <div className="flex gap-3">
                <Link
                  href="/pricing"
                  className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 transition-colors"
                >
                  {isSubscribed ? "Change Plan" : "Upgrade"}
                </Link>
              </div>
            </div>
          </div>

          {/* History Section */}
          <div className="bg-white rounded-2xl shadow-sm ring-1 ring-gray-100 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Recent Try-Ons
            </h3>
            {history.length === 0 ? (
              <p className="text-gray-500 text-center py-8">
                No try-ons yet.{" "}
                <Link href="/" className="text-indigo-600 hover:underline">
                  Try your first one!
                </Link>
              </p>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {history.map((job) => (
                  <div
                    key={job.id}
                    className="relative aspect-[3/4] rounded-lg overflow-hidden bg-gray-100"
                  >
                    {job.resultImageUrl ? (
                      <Image
                        src={job.resultImageUrl}
                        alt="Try-on result"
                        fill
                        className="object-cover"
                        unoptimized
                      />
                    ) : (
                      <div className="flex items-center justify-center h-full text-gray-400 text-sm">
                        {job.status === "FAILED" ? "Failed" : "Processing..."}
                      </div>
                    )}
                    <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-2">
                      <p className="text-xs text-white">
                        {new Date(job.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
