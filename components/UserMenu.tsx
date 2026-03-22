import { useSession, signIn, signOut } from "next-auth/react";
import { useState, useRef, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";

export default function UserMenu() {
  const { data: session, status } = useSession();
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  if (status === "loading") {
    return <div className="w-8 h-8 rounded-full bg-gray-200 animate-pulse" />;
  }

  if (!session) {
    return (
      <button
        onClick={() => signIn("google")}
        className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
      >
        <svg className="w-4 h-4" viewBox="0 0 24 24">
          <path
            fill="#4285F4"
            d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"
          />
          <path
            fill="#34A853"
            d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
          />
          <path
            fill="#FBBC05"
            d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
          />
          <path
            fill="#EA4335"
            d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
          />
        </svg>
        Sign In
      </button>
    );
  }

  const planLabel =
    session.user.subscriptionStatus === "PRO"
      ? "Pro"
      : session.user.subscriptionStatus === "BASIC"
      ? "Basic"
      : "Free";

  return (
    <div className="relative" ref={menuRef}>
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 rounded-full hover:ring-2 hover:ring-blue-300 transition-all"
      >
        {session.user.image ? (
          <Image
            src={session.user.image}
            alt={session.user.name || "User"}
            width={32}
            height={32}
            className="rounded-full"
          />
        ) : (
          <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-white text-sm font-medium">
            {(session.user.name || session.user.email || "U")[0].toUpperCase()}
          </div>
        )}
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-64 bg-white rounded-xl shadow-lg border border-gray-100 py-2 z-50">
          <div className="px-4 py-3 border-b border-gray-100">
            <p className="text-sm font-medium text-gray-900 truncate">
              {session.user.name}
            </p>
            <p className="text-xs text-gray-500 truncate">
              {session.user.email}
            </p>
            <div className="mt-2 flex items-center gap-2">
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                {planLabel}
              </span>
              {session.user.credits > 0 && (
                <span className="text-xs text-gray-500">
                  {session.user.credits} credits
                </span>
              )}
            </div>
          </div>

          <Link
            href="/account"
            className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
            onClick={() => setOpen(false)}
          >
            Account & Subscription
          </Link>
          <Link
            href="/pricing"
            className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
            onClick={() => setOpen(false)}
          >
            Upgrade Plan
          </Link>
          <Link
            href="/history"
            className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
            onClick={() => setOpen(false)}
          >
            History
          </Link>
          <div className="border-t border-gray-100 mt-1">
            <button
              onClick={() => signOut()}
              className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50"
            >
              Sign Out
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
