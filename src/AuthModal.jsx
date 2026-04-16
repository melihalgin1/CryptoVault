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
  const [tab, setTab] = useState("signin"); // signin | signup
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  const canSubmit = useMemo(() => {
    if (!email.trim() || !password.trim()) return false;
    if (tab === "signup" && !displayName.trim()) return false;
    return true;
  }, [email, password, displayName, tab]);

  if (!isOpen) return null;

  const closeModal = () => {
    if (busy) return;
    setMessage("");
    onClose();
  };

  const handleEmailSignIn = async () => {
    setBusy(true);
    setMessage("");

    try {
      await signInWithEmailAndPassword(auth, email.trim(), password);
      closeModal();
    } catch (err) {
      setMessage(err?.message || "Sign in failed.");
    } finally {
      setBusy(false);
    }
  };

  const handleEmailSignUp = async () => {
    setBusy(true);
    setMessage("");

    try {
      const cred = await createUserWithEmailAndPassword(
        auth,
        email.trim(),
        password
      );

      if (displayName.trim()) {
        await updateProfile(cred.user, {
          displayName: displayName.trim(),
        });
      }

      closeModal();
    } catch (err) {
      setMessage(err?.message || "Account creation failed.");
    } finally {
      setBusy(false);
    }
  };

  const handlePasswordReset = async () => {
    setBusy(true);
    setMessage("");

    try {
      if (!email.trim()) {
        setMessage("Enter your email first.");
        return;
      }

      await sendPasswordResetEmail(auth, email.trim());
      setMessage("Password reset email sent.");
    } catch (err) {
      setMessage(err?.message || "Reset failed.");
    } finally {
      setBusy(false);
    }
  };

  const handleGoogle = async () => {
    setBusy(true);
    setMessage("");

    try {
      await onGoogleSignIn();
      closeModal();
    } catch (err) {
      setMessage(err?.message || "Google sign-in failed.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) closeModal();
      }}
    >
      {/* Overlay */}
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />

      {/* Modal */}
      <div className="relative w-full max-w-md rounded-2xl bg-white shadow-2xl border border-gray-200 overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center">
          <h2 className="text-lg font-bold text-gray-900">
            Sign in to CryptoVault
          </h2>

          <button
            onClick={closeModal}
            disabled={busy}
            className="text-gray-500 hover:text-gray-900 transition p-2 rounded-lg hover:bg-gray-100"
          >
            ✕
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-5">
          {/* Google */}
          <button
            onClick={handleGoogle}
            disabled={busy}
            className="w-full px-4 py-3 rounded-xl font-bold border border-gray-200 hover:bg-gray-50 transition disabled:opacity-60"
          >
            Continue with Google
          </button>

          {/* Divider */}
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
                tab === "signin"
                  ? "bg-white shadow-sm"
                  : "text-gray-600 hover:text-gray-900"
              }`}
            >
              Sign in
            </button>

            <button
              onClick={() => setTab("signup")}
              className={`flex-1 px-3 py-2 rounded-lg font-bold transition ${
                tab === "signup"
                  ? "bg-white shadow-sm"
                  : "text-gray-600 hover:text-gray-900"
              }`}
            >
              Sign up
            </button>
          </div>

          {/* Form */}
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

            {message && (
              <div className="text-sm text-gray-700 bg-gray-50 border border-gray-200 rounded-xl px-4 py-3">
                {message}
              </div>
            )}

            <button
              onClick={
                tab === "signin"
                  ? handleEmailSignIn
                  : handleEmailSignUp
              }
              disabled={busy || !canSubmit}
              className="w-full px-4 py-3 rounded-xl font-bold text-white bg-blue-600 hover:bg-blue-700 transition disabled:opacity-60"
            >
              {tab === "signin"
                ? "Sign in with Email"
                : "Create account"}
            </button>

            <button
              onClick={handlePasswordReset}
              disabled={busy}
              className="w-full text-sm text-gray-600 hover:text-gray-900 underline underline-offset-4"
            >
              Forgot password?
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}