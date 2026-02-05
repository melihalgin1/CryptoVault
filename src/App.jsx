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
  'doge': 'dogecoin', 'dot': 'polkadot', 'link': 'chainlink',
  'uni': 'uniswap', 'ltc': 'litecoin', 'avax': 'avalanche-2',
  'usdt': 'tether', 'xrp': 'ripple'
};

function App() {
  const [user, setUser] = useState(null);
  const [coins, setCoins] = useState({});
  const [selectedCoin, setSelectedCoin] = useState(null);
  const [showAccount, setShowAccount] = useState(false);
  const [holdings, setHoldings] = useState({});
  const [currency, setCurrency] = useState('usd');

  const [lang, setLang] = useState('en');
  const t = translations[lang];

  const [watchedCoins, setWatchedCoins] = useState(DEFAULT_COINS);
  const [newCoinId, setNewCoinId] = useState('');
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  const currencyConfig = {
    usd: { label: 'USD', symbol: '$' },
    eur: { label: 'EUR', symbol: '€' },
    try: { label: 'TRY', symbol: '₺' },
    gbp: { label: 'GBP', symbol: '£' },
    jpy: { label: 'JPY', symbol: '¥' }
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);

      if (currentUser) {
        try {
          const docRef = doc(db, "users", currentUser.uid);
          const docSnap = await getDoc(docRef);

          if (docSnap.exists()) {
            const data = docSnap.data();
            const rawList = data.watchedCoins || DEFAULT_COINS;
            const cleanList = rawList.map(id => ID_FIXES[id] || id);

            setHoldings(data.holdings || {});
            setWatchedCoins(cleanList);

            // Normalize ids if needed
            if (JSON.stringify(rawList) !== JSON.stringify(cleanList)) {
              await setDoc(docRef, { watchedCoins: cleanList }, { merge: true });
            }
          } else {
            await setDoc(docRef, { holdings: {}, watchedCoins: DEFAULT_COINS });
            setHoldings({});
            setWatchedCoins(DEFAULT_COINS);
          }
        } catch (err) {
          console.error("Error loading user data:", err);
        }
      } else {
        setSelectedCoin(null);
        setShowAccount(false);
        setHoldings({});
        setWatchedCoins(DEFAULT_COINS);
      }
    });

    return () => unsubscribe();
  }, []);

  // Save user data (holdings + watched list) when logged in
  useEffect(() => {
    if (!user) return;
    const saveToDb = setTimeout(async () => {
      try {
        const userRef = doc(db, "users", user.uid);
        await setDoc(userRef, { holdings, watchedCoins }, { merge: true });
      } catch (err) {
        console.error("Error saving data:", err);
      }
    }, 500);

    return () => clearTimeout(saveToDb);
  }, [holdings, watchedCoins, user]);

  const fetchCoins = async () => {
    if (watchedCoins.length === 0) {
      setCoins({});
      return;
    }
    if (error) return;

    if (Object.keys(coins).length === 0) setLoading(true);

    try {
      const ids = watchedCoins.join(',');
      const API_KEY = import.meta.env.VITE_CG_API_KEY;

      const response = await fetch(
        `https://api.coingecko.com/api/v3/simple/price?ids=${ids}&vs_currencies=usd,eur,try,gbp,jpy&include_24hr_change=true&x_cg_demo_api_key=${API_KEY}`
      );

      if (!response.ok) {
        if (response.status === 429) {
          setError(t.rateLimit);
          return;
        }
        throw new Error("Failed to fetch data.");
      }

      const data = await response.json();
      setCoins(data);
      setError(null);
    } catch (err) {
      if (!error) setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // ✅ FIXED: the broken line in your file
  useEffect(() => {
    fetchCoins();
    const interval = setInterval(fetchCoins, 60000);
    return () => clearInterval(interval);
  }, [watchedCoins]);

  const handleGoogleSignIn = async () => {
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (err) {
      console.error(err);
    }
  };

  const handleSignOut = async () => {
    try {
      await signOut(auth);
    } catch (err) {
      console.error(err);
    }
  };

  const executeAddCoin = () => {
    let cleanId = newCoinId.trim().toLowerCase();
    if (!cleanId) return;

    if (ID_FIXES[cleanId]) cleanId = ID_FIXES[cleanId];

    if (!watchedCoins.includes(cleanId)) {
      setWatchedCoins([...watchedCoins, cleanId]);
    }

    setNewCoinId('');
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') executeAddCoin();
  };

  const handleRemoveCoin = (e, coinId) => {
    e.stopPropagation();
    const updatedList = watchedCoins.filter(id => id !== coinId);
    setWatchedCoins(updatedList);

    const updatedData = { ...coins };
    delete updatedData[coinId];
    setCoins(updatedData);
    setError(null);
  };

  const updateHolding = (coinId, value) => {
    setHoldings(prev => ({ ...prev, [coinId]: value }));
  };

  const handleCoinClick = (coinId) => {
    if (user) {
      setSelectedCoin(coinId);
    } else {
      if (window.confirm("Sign in to view charts?")) handleGoogleSignIn();
    }
  };

  const toggleLang = () => setLang(prev => (prev === 'en' ? 'tr' : 'en'));

  const renderContent = () => {
    if (showAccount && user) {
      return <ManageAccount user={user} onBack={() => setShowAccount(false)} lang={lang} />;
    }

    if (selectedCoin && user) {
      return (
        <CoinDetail
          coinId={selectedCoin}
          currency={currency}
          onBack={() => setSelectedCoin(null)}
          lang={lang}
        />
      );
    }

    return (
      <>
        <div className="mb-8 px-2 flex flex-col md:flex-row justify-between items-end gap-4">
          <div>
            <h2 className="text-3xl md:text-4xl font-bold text-white drop-shadow-md">{t.marketOverview}</h2>
            <p className="text-blue-100 mt-2 text-lg md:text-xl">
              {user ? t.managePortfolio : t.customizeDashboard}
            </p>
          </div>

          <div className="flex gap-2 w-full md:w-auto">
            <input
              type="text"
              placeholder={t.searchPlaceholder}
              className="px-4 py-2 rounded-lg border-none focus:ring-2 focus:ring-blue-500 outline-none text-gray-800 w-full md:w-64"
              value={newCoinId}
              onChange={(e) => setNewCoinId(e.target.value)}
              onKeyDown={handleKeyDown}
            />
            <button
              onClick={executeAddCoin}
              className="bg-green-500 hover:bg-green-600 text-white px-6 py-2 rounded-lg font-bold transition-colors shadow-lg"
            >
              {t.add}
            </button>
          </div>
        </div>

        {error && (
          <div className="p-10 text-center flex flex-col items-center justify-center gap-4">
            <div className="text-red-400 text-lg font-medium bg-red-900/20 px-6 py-4 rounded-lg border border-red-500/30">
              ⚠️ {error}
            </div>
            <button
              onClick={() => { setError(null); fetchCoins(); }}
              className="bg-white text-black px-6 py-2 rounded-full font-bold hover:bg-gray-200 transition-colors"
            >
              {t.retry}
            </button>
          </div>
        )}

        {!error && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4 gap-6 w-full">
            {watchedCoins.map(id => {
              const coinData = coins[id] || {};
              const hasData = coinData[currency] !== undefined;
              const currentPrice = hasData ? coinData[currency] : 0;

              const userAmount = parseFloat(holdings[id] || "0") || 0;
              const userValue = userAmount * currentPrice;

              const { symbol } = currencyConfig[currency];

              return (
                <div
                  key={id}
                  onClick={() => handleCoinClick(id)}
                  className="bg-white p-8 rounded-xl shadow-lg border border-white/20 hover:shadow-2xl cursor-pointer transition-all relative overflow-hidden group hover:-translate-y-1 hover:scale-[1.01] flex flex-col min-h-[260px]"
                >
                  {!user && (
                    <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity text-xs bg-gray-100 px-2 py-1 rounded text-gray-500 font-medium">
                      🔒 {t.signIn}
                    </div>
                  )}

                  <button
                    onClick={(e) => handleRemoveCoin(e, id)}
                    className="absolute top-4 right-4 text-gray-300 hover:text-red-500 transition-colors z-10 p-1 rounded-full hover:bg-gray-100 opacity-0 group-hover:opacity-100"
                    title={t.remove}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>

                  <div className="flex justify-between items-center mb-6 pr-8">
                    <div className="flex flex-col overflow-hidden">
                      <h2 className="text-3xl font-bold capitalize text-gray-900 truncate">{id}</h2>
                      <span className="text-[10px] text-gray-400 uppercase tracking-widest font-semibold">ID: {id}</span>
                    </div>

                    {hasData && (
                      <span className={`text-lg font-medium px-3 py-1 rounded-full shrink-0 ${
                        (coinData.usd_24h_change ?? 0) >= 0 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                      }`}>
                        {(coinData.usd_24h_change ?? 0).toFixed(2)}%
                      </span>
                    )}
                  </div>

                  <div className="mb-6">
                    <div className="text-5xl font-bold text-gray-800 tracking-tight break-all">
                      {hasData ? (
                        `${symbol}${currentPrice.toLocaleString(undefined, {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: currentPrice < 1 ? 8 : 2
                        })}`
                      ) : (
                        <span className="text-lg text-red-400 font-medium bg-red-50 px-2 py-1 rounded">{t.loading}</span>
                      )}
                    </div>
                  </div>

                  {user && (
                    <div
                      className="mt-auto pt-4 border-t border-gray-100 flex items-center justify-between"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <div className="flex flex-col">
                        <label className="text-xs text-gray-400 font-semibold uppercase">{t.quantity}</label>
                        <input
                          type="number"
                          min="0"
                          step="any"
                          placeholder="0.00"
                          className="w-32 border border-gray-300 rounded px-2 py-1 text-sm mt-1 focus:ring-2 focus:ring-blue-500 outline-none"
                          value={holdings[id] || ''}
                          onChange={(e) => updateHolding(id, e.target.value)}
                        />
                      </div>

                      {userValue > 0 && (
                        <div className="text-right">
                          <label className="text-xs text-gray-400 font-semibold uppercase">{t.equity} ({currency.toUpperCase()})</label>
                          <div className="text-lg font-bold text-blue-900 truncate max-w-[150px]">
                            {symbol}{userValue.toLocaleString(undefined, {
                              minimumFractionDigits: 2,
                              maximumFractionDigits: userValue < 1 ? 6 : 2
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {loading && Object.keys(coins).length === 0 && (
          <div className="p-10 text-center text-white animate-pulse">{t.loading}</div>
        )}
      </>
    );
  };

  return (
    <div className="cv-app min-h-screen flex flex-col w-full relative">
      <nav className="bg-white/90 backdrop-blur-md border-b border-white/20 px-4 py-3 md:px-6 md:py-4 flex justify-between items-center sticky top-0 z-40 shadow-sm w-full">
        <div className="flex items-center gap-2 md:gap-4">
          <h1
            className="text-xl md:text-2xl font-bold tracking-tight text-gray-900"
            onClick={() => { setShowAccount(false); setSelectedCoin(null); }}
            style={{ cursor: 'pointer' }}
          >
            {t.title}
          </h1>

          {!user && (
            <span className="hidden sm:inline-block text-xs bg-gray-100 px-2 py-1 rounded text-gray-500 font-medium">
              🔒 {t.guest}
            </span>
          )}
        </div>

        <div className="flex items-center gap-2 md:gap-3">
          <button
            onClick={toggleLang}
            className="hidden md:flex bg-white rounded-full w-10 h-10 items-center justify-center shadow text-xl hover:scale-105 transition-transform"
            title="Switch Language"
          >
            {lang === 'en' ? '🇹🇷' : '🇬🇧'}
          </button>

          {user ? (
            <>
              <button
                onClick={() => setShowAccount(true)}
                className="bg-white px-4 py-2 rounded-lg font-bold hover:bg-gray-100 transition"
              >
                {t.account}
              </button>
              <button
                onClick={handleSignOut}
                className="bg-red-500 text-white px-4 py-2 rounded-lg font-bold hover:bg-red-600 transition"
              >
                {t.signOut}
              </button>
            </>
          ) : (
            <button
              onClick={handleGoogleSignIn}
              className="bg-white px-4 py-2 rounded-lg font-bold hover:bg-gray-100 transition"
            >
              {t.signIn}
            </button>
          )}
        </div>
      </nav>

      <div className="flex-1 px-4 py-8 max-w-7xl mx-auto w-full">
        {renderContent()}
      </div>

      {/* Mobile floating language button */}
      <button
        onClick={toggleLang}
        className="md:hidden fixed bottom-6 right-6 bg-white rounded-full w-14 h-14 flex items-center justify-center shadow-xl text-2xl hover:scale-110 transition-transform z-50 cursor-pointer"
        title="Switch Language"
      >
        {lang === 'en' ? '🇹🇷' : '🇬🇧'}
      </button>
    </div>
  );
}

export default App;
