import { useState, useEffect } from 'react'
import './App.css'

function App() {
  const [coins, setCoins] = useState({})  // Use object for data
  const [loading, setLoading] = useState(true)
  
  // NEW: State for the search box
  const [searchTerm, setSearchTerm] = useState('bitcoin,ethereum,solana') 
  const [inputVal, setInputVal] = useState('')

  // The function that actually gets the data
  const fetchPrices = async (ids) => {
    setLoading(true)
    try {
      // We inject the 'ids' variable into the URL dynamically
      const response = await fetch(
        `https://api.coingecko.com/api/v3/simple/price?ids=${ids}&vs_currencies=usd&include_24hr_change=true`
      )
      const data = await response.json()
      setCoins(data)
    } catch (error) {
      console.error("Error fetching data:", error)
    } finally {
      setLoading(false)
    }
  }

  // Run on start
  useEffect(() => {
    fetchPrices(searchTerm)
  }, [searchTerm]) // <--- Dependency! Run this whenever 'searchTerm' changes

  // Handle the Search Button click
  const handleSearch = () => {
    if (inputVal.trim()) {
      // Append the new coin to our list (e.g., "bitcoin,ethereum" + ",dogecoin")
      const newSearch = searchTerm + "," + inputVal.toLowerCase()
      setSearchTerm(newSearch)
      setInputVal('') // Clear the box
    }
  }

  return (
    <div className="container">
      <h1>🚀 Crypto Tracker</h1>

      {/* NEW: Search Section */}
      <div className="search-box">
        <input 
          type="text" 
          placeholder="Add a coin (e.g. dogecoin)..." 
          value={inputVal}
          onChange={(e) => setInputVal(e.target.value)}
        />
        <button onClick={handleSearch}>Add Coin</button>
      </div>
      
      {loading && <p>Loading...</p>}

      <div className="grid">
        {/* We map through the keys of the 'coins' object dynamically */}
        {Object.keys(coins).map((coinId) => (
          <div className="card" key={coinId}>
            {/* Capitalize first letter */}
            <h2>{coinId.charAt(0).toUpperCase() + coinId.slice(1)}</h2>
            
            <p className="price">
              ${coins[coinId].usd}
            </p>
            
            <p className="change" style={{ color: coins[coinId].usd_24h_change > 0 ? 'green' : 'red' }}>
              {coins[coinId].usd_24h_change?.toFixed(2)}%
            </p>
          </div>
        ))}
      </div>
    </div>
  )
}

export default App