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

            if (JSON.stringify(rawList) !== JSON.stringify(cleanList)) {
              await setDoc(docRef, { watchedCoins: cleanList }, { merge: true });
            }
          } else {
            await setDoc(docRef, { holdings: {}, watchedCoins: DEFAULT_COINS });
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

  useEffect(() => {
    if (!user) return;
    const saveToDb = setTimeout(async () => {
      try {
        const userRef = doc(db, "users", user.uid);
        await setDoc(userRef, { holdings, watchedCoins }, { merge: true });
      } catch (err) {
        console.error("Error saving data:", err);
      }
    }, 2000);

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

  useEffect(() => {
    fetchCoins();
    const interval = setInterval(fetchCoins, 60000);
    return () => clearInterval(interval);
  }, [watched]()
