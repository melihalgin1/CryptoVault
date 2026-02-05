import React, { useState } from 'react';
import { deleteDoc, doc, setDoc } from 'firebase/firestore';
import { deleteUser, reauthenticateWithPopup } from 'firebase/auth';
import { db, auth, googleProvider } from './firebase';
import { translations } from './translations';

// Keep in sync with App.jsx default list (duplicated here to avoid circular imports)
const DEFAULT_COINS = ['bitcoin', 'ethereum', 'solana', 'cardano', 'dogecoin', 'ripple'];

const ManageAccount = ({ user, onBack, lang = 'en' }) => {
  const [isDeleting, setIsDeleting] = useState(false);
  const t = translations[lang];

  // Some Firestore rules allow update/write but not delete.
  // Fallback: scrub the user document instead of deleting it.
  const scrubUserDoc = async () => {
    const userRef = doc(db, 'users', user.uid);
    await setDoc(
      userRef,
      {
        holdings: {},
        watchedCoins: DEFAULT_COINS,
      },
      { merge: true }
    );
  };

  // 1) CLEAR DATA ONLY (Keep Account)
  const handleClearData = async () => {
    if (!window.confirm(t.confirmReset)) return;

    setIsDeleting(true);
    try {
      try {
        await deleteDoc(doc(db, 'users', user.uid));
      } catch (err) {
        // If delete is blocked by rules, fall back to clearing fields.
        if (err?.code === 'permission-denied' || err?.message?.toLowerCase?.().includes('permission')) {
          await scrubUserDoc();
        } else {
          throw err;
        }
      }

      window.location.reload();
    } catch (error) {
      console.error('Error clearing data:', error);
      alert('Error: ' + (error?.message || String(error)));
      setIsDeleting(false);
    }
  };

  // 2) DELETE EVERYTHING (Nuke Account)
  const handleDeleteAccount = async () => {
    const confirm1 = window.confirm(`⚠ ${t.confirmDelete}`);
    if (!confirm1) return;

    setIsDeleting(true);
    try {
      // Step A: Delete / scrub Firestore user data
      try {
        await deleteDoc(doc(db, 'users', user.uid));
      } catch (err) {
        if (error.code === 'auth/popup-blocked') {
  alert(
    "To delete your account, we need to re-verify your identity.\n\n" +
    "Your browser blocked the sign-in popup.\n\n" +
    "Please allow pop-ups for this site and try again.\n\n" +
    "Safari: Settings → Websites → Pop-up Windows → Allow"
  );
  return;
}

      }

      // Step B: Delete Authentication user (may require recent login)
      try {
        await deleteUser(auth.currentUser);
      } catch (err) {
        if (err?.code === 'auth/requires-recent-login') {
          await reauthenticateWithPopup(auth.currentUser, googleProvider);
          await deleteUser(auth.currentUser);
        } else {
          throw err;
        }
      }

      // Auth listener in App.jsx will handle redirect to guest mode
    } catch (error) {
      console.error('Delete Error:', error);
      setIsDeleting(false);

      if (error?.code === 'auth/popup-closed-by-user' || error?.code === 'auth/cancelled-popup-request') {
        alert('Re-authentication was cancelled. Please try again and complete the sign-in popup to delete your account.');
        return;
      }

      alert('Error deleting account: ' + (error?.message || String(error)));
    }
  };

  return (
    <div className="w-full max-w-2xl mx-auto">
      <button
        onClick={onBack}
        className="mb-6 text-sm text-gray-500 hover:text-black flex items-center gap-1 transition-colors"
      >
        {t.back}
      </button>

      <div className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden">
        <div className="bg-gray-50 px-8 py-6 border-b border-gray-100 flex items-center gap-4">
          <img
            src={user.photoURL || 'https://ui-avatars.com/api/?name=' + user.displayName}
            alt="Profile"
            className="w-16 h-16 rounded-full border-2 border-white shadow-md"
          />
          <div>
            <h2 className="text-2xl font-bold text-gray-900">{user.displayName}</h2>
            <p className="text-gray-500">{user.email}</p>
          </div>
        </div>

        <div className="p-8 space-y-8">
          <div>
            <h3 className="text-lg font-bold text-gray-900 mb-2">{t.portfolioData}</h3>
            <p className="text-gray-600 mb-4 text-sm">{t.resetDesc}</p>
            <button
              onClick={handleClearData}
              disabled={isDeleting}
              className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold rounded-lg transition-colors border border-gray-200"
            >
              {t.resetPortfolio}
            </button>
          </div>

          <div className="border-t border-gray-100 my-4"></div>

          <div>
            <h3 className="text-lg font-bold text-red-600 mb-2">{t.dangerZone}</h3>
            <p className="text-gray-600 mb-4 text-sm">{t.deleteDesc}</p>
            <button
              onClick={handleDeleteAccount}
              disabled={isDeleting}
              className="px-4 py-2 bg-red-50 hover:bg-red-100 text-red-600 font-bold rounded-lg transition-colors border border-red-200"
            >
              {isDeleting ? t.processing : t.deleteAccount}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ManageAccount;
