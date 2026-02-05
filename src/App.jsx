import React, { useState, useEffect } from 'react';
import { signInWithPopup, signOut, onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore'; 
import { auth, googleProvider, db } from './firebase'; 
import CoinDetail from './CoinDetail';
import ManageAccount from './ManageAccount'; 
import { translations } from './translations';
import './App.css';

const DEFAULT_COINS = ['bitcoin', 'ethereum', 'solana', 'cardano', 'dogecoin', 'ripple'];

const ID_FIXES = {
  'shiba': 'shiba-inu', 'shib': 'shiba-inu', 'shiba inu': 'shiba-inu',
  'bnb': 'binancecoin', 'binance': 'binancecoin',
  'matic': 'matic-network', 'polygon': 'matic-network',
  'pepe': 'pepe', 'pepecoin': 'pepe',
};

function App() {
  const [user, setUser] = useState(null);
  const [coins, setCoins] = useState([]);
  const [portfolio, setPortfolio] = useState({});
  const [selectedCoin, setSelectedCoin] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showAccount, setShowAccount] = useState(false);
  const [lang, setLang] = useState(localStorage.getItem('lang') || 'en');

  const t = translations[lang];

  const toggleLang = () => {
    const newLang = lang === 'en' ? 'tr' : 'en';
    setLang(newLang);
    localStorage.setItem('lang', newLang);
  };

  const signIn = async () => {
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (error) {
      console.error(error);
    }
  };

  const signOutUser = async () => {
    await signOut(auth);
    setUser(null);
    setPortfolio({});
  };

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (u) => {
      if (u) {
        setUser(u);
        const ref = doc(db, 'users', u.uid);
        const snap = await getDoc(ref);

        if (snap.exists()) {
          setPortfolio(snap.data().holdings || {});
          setCoins(snap.data().watchedCoins || DEFAULT_COINS);
        } else {
          await setDoc(ref, {
            holdings: {},
            watchedCoins: DEFAULT_COINS
          });
          setCoins(DEFAULT_COINS);
        }
      } else {
        setUser(null);
        setPortfolio({});
        setCoins(DEFAULT_COINS);
      }
      setLoading(false);
    });

    return () => unsub();
  }, []);

  if (loading) {
    return (
      <div className="cv-app min-h-screen flex items-center justify-center">
        <div className="animate-pulse text-white text-xl">Loading...</div>
      </div>
    );
  }

  return (
    <div className="cv-app">
      <main className="min-h-screen px-4 py-8 max-w-7xl mx-auto">
        {/* HEADER */}
        <header className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold text-white">CryptoVault</h1>

          <div className="flex items-center gap-4">
            {user ? (
              <>
                <button
                  onClick={() => setShowAccount(true)}
                  className="px-4 py-2 bg-white/80 rounded-lg font-semibold hover:bg-white transition"
                >
                  {t.account}
                </button>
                <button
                  onClick={signOutUser}
                  className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition"
                >
                  {t.signOut}
                </button>
              </>
            ) : (
              <button
                onClick={signIn}
                className="px-4 py-2 bg-white text-black rounded-lg font-semibold hover:bg-gray-200 transition"
              >
                {t.signIn}
              </button>
            )}
          </div>
        </header>

        {/* ACCOUNT SCREEN */}
        {showAccount && user ? (
          <ManageAccount
            user={user}
            onBack={() => setShowAccount(false)}
            lang={lang}
          />
        ) : selectedCoin ? (
          <CoinDetail
            coinId={selectedCoin}
            portfolio={portfolio}
            setPortfolio={setPortfolio}
            user={user}
            lang={lang}
          />
        ) : (
          <div className="grid gap-6">
            {coins.map((coin) => (
              <div
                key={coin}
                onClick={() => setSelectedCoin(ID_FIXES[coin] || coin)}
                className="bg-white rounded-xl p-6 shadow-lg cursor-pointer hover:scale-[1.02] transition-transform"
              >
                <h2 className="text-xl font-bold capitalize">{coin}</h2>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* DESKTOP FLOATING LANG BUTTON */}
      <button 
        onClick={toggleLang} 
        className="hidden md:flex fixed bottom-6 right-6 bg-white rounded-full w-14 h-14 items-center justify-center shadow-xl text-2xl hover:scale-110 transition-transform z-50 cursor-pointer"
        title="Switch Language"
      >
        {lang === 'en' ? '🇹🇷' : '🇬🇧'}
      </button>
    </div>
  );
}

export default App;
