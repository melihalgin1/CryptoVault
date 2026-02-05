import React, { useMemo, useState } from "react";
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  sendPasswordResetEmail,
  updateProfile,
} from "firebase/auth";

export default function AuthModal({
  isOpen,
  onClose,
  auth,
  onGoogleSignIn,
}) {
  const [tab, setTab] = useState("signin"); // "signin" | "signup"
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");

  const canSubmit = useMemo(() => {
    if (!email.trim() || !password) return false;
    if (tab === "signup" && displayName.trim().length === 0) return false;
    return true;
  }, [email, password, displayName, tab]);

  if (!isOpen) return null;

  const close = () => {
    if (busy) return;
    setMsg("");
    onClose();
  };

  const signInEmail = async () => {
    setMsg("");
    setBusy(true);
    try {
      await signInWithEmailAndPassword(auth, email.trim(), password);
      close();
    } catch (e) {
      setMsg(e?.message || String(e));
    } finally {
      setBusy(false);
    }
  };

  const signUpEmail = async () => {
    setMsg("");
    setBusy(true);
    try {
      const cred = await createUserWithEmailAndPassword(auth, email.trim(), password);
      await updateProfile(cred.user, { displayName: displayName.trim() });
      close();
    } catch (e) {
      setMsg(e?.message || String(e));
    } finally {
      setBusy(false);
    }
  };

  const resetPw = async () => {
    setMsg("");
    setBusy(true);
    try {
      if (!email.trim()) {
        setMsg("Enter your email first, then click reset.");
        return;
      }
      await sendPasswordResetEmail(auth, email.trim());
      setMsg("Password reset email sent. Check your inbox.");
    } catch (e) {
      setMsg(e?.message || String(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      onMouseDown={(e) => {
        // click outside closes
        if (e.target === e.currentTarget) close();
      }}
    >
      {/* overlay */}
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />

      {/* modal */}
      <div className="relative w-full max-w-md rounded-2xl bg-white shadow-2xl border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
          <div className="text-lg font-bold text-gray-900">Sign in</div>
          <button
            className="text-gray-500 hover:text-gray-900 transition p-2 rounded-lg hover:bg-gray-100"
            onClick={close}
            disabled={busy}
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        <div className="p-6 space-y-5">
          {/* Google */}
          <button
            onClick={async () => {
              setMsg("");
              setBusy(true);
              try {
                await onGoogleSignIn();
                close();
              } catch (e) {
                setMsg(e?.message || String(e));
              } finally {
                setBusy(false);
              }
            }}
            disabled={busy}
            className="w-full px-4 py-3 rounded-xl font-bold border border-gray-200 hover:bg-gray-50 transition disabled:opacity-60"
          >
            Continue with Google
          </button>

          <div className="flex items-center gap-3">
            <div className="h-px bg-gray-200 flex-1" />
            <div className="text-xs text-gray-500">OR</div>
            <div className="h-px bg-gray-200 flex-1" />
          </div>

          {/* Tabs */}
          <div className="flex gap-2 bg-gray-50 p-1 rounded-xl border border-gray-200">
            <button
              onClick={() => setTab("signin")}
              className={`flex-1 px-3 py-2 rounded-lg font-bold transition ${
                tab === "signin" ? "bg-white shadow-sm" : "text-gray-600 hover:text-gray-900"
              }`}
            >
              Sign in
            </button>
            <button
              onClick={() => setTab("signup")}
              className={`flex-1 px-3 py-2 rounded-lg font-bold transition ${
                tab === "signup" ? "bg-white shadow-sm" : "text-gray-600 hover:text-gray-900"
              }`}
            >
              Sign up
            </button>
          </div>

          {/* Email form */}
          <div className="space-y-3">
            {tab === "signup" && (
              <input
                type="text"
                placeholder="Name"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-500 outline-none"
              />
            )}

            <input
              type="email"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-500 outline-none"
            />
            <input
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-500 outline-none"
            />

            {msg && (
              <div className="text-sm text-gray-700 bg-gray-50 border border-gray-200 rounded-xl px-4 py-3">
                {msg}
              </div>
            )}

            <button
              onClick={tab === "signin" ? signInEmail : signUpEmail}
              disabled={busy || !canSubmit}
              className="w-full px-4 py-3 rounded-xl font-bold text-white bg-blue-600 hover:bg-blue-700 transition disabled:opacity-60"
            >
              {tab === "signin" ? "Sign in with Email" : "Create account"}
            </button>

            <button
              onClick={resetPw}
              disabled={busy}
              className="w-full text-sm text-gray-600 hover:text-gray-900 underline underline-offset-4"
            >
              Forgot password?
            </button>
          </div>
        </div>

        <div className="px-6 py-4 border-t border-gray-100 text-xs text-gray-500">
          Tip: If you later publish on iOS, consider adding “Sign in with Apple”.
        </div>
      </div>
    </div>
  );
}
