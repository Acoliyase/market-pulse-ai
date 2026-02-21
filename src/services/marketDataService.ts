import axios from 'axios';
import { PricePoint } from '../types';

const ALPHA_VANTAGE_API_KEY = process.env.VITE_ALPHA_VANTAGE_API_KEY;
const ALPHA_VANTAGE_BASE_URL = 'https://www.alphavantage.co/query';
const COINGECKO_BASE_URL = 'https://api.coingecko.com/api/v3';

// Map common symbols to CoinGecko IDs (for fallback)
const SYMBOL_MAP: Record<string, string> = {
  'BTC': 'bitcoin',
  'ETH': 'ethereum',
  'SOL': 'solana',
  'ADA': 'cardano',
  'DOT': 'polkadot',
  'DOGE': 'dogecoin',
  'XRP': 'ripple',
  'LINK': 'chainlink',
  'MATIC': 'polygon',
  'AVAX': 'avalanche-2',
  'LTC': 'litecoin',
  'BCH': 'bitcoin-cash',
  'SHIB': 'shiba-inu',
  'UNI': 'uniswap',
  'ATOM': 'cosmos',
  'ALGO': 'algorand',
  'NEAR': 'near',
  'FTM': 'fantom',
  'SAND': 'the-sandbox',
  'MANA': 'decentraland',
  'AXS': 'axie-infinity',
  'EGLD': 'elrond-erd-2',
  'THETA': 'theta-token',
  'FIL': 'filecoin',
  'TRX': 'tron',
  'ETC': 'ethereum-classic',
  'XMR': 'monero',
  'VET': 'vechain',
  'ICP': 'internet-computer',
  'HBAR': 'hedera-hashgraph',
  'GRT': 'the-graph',
  'AAVE': 'aave',
  'MKR': 'maker',
  'STX': 'blockstack',
  'QNT': 'quant-network',
  'EOS': 'eos',
  'FLOW': 'flow',
  'KCS': 'kucoin-shares',
  'BSV': 'bitcoin-cash-sv',
  'ZEC': 'zcash',
  'NEO': 'neo',
  'IOTA': 'iota',
  'KLAY': 'klay-token',
  'HT': 'huobi-token',
  'XEC': 'ethereum-pow-iou',
  'BIT': 'bitdao',
  'CHZ': 'chiliz',
  'CRV': 'curve-dao-token',
  'MINA': 'mina-protocol',
  'TFUEL': 'theta-fuel',
  'CELO': 'celo',
  'BAT': 'basic-attention-token',
  'ENJ': 'enjincoin',
  'DASH': 'dash',
  'WAVES': 'waves',
  'KAVA': 'kava',
  'LRC': 'loopring',
  'ANKR': 'ankr',
  'GALA': 'gala',
  'HOT': 'holotoken',
  'RVN': 'ravencoin',
  'KDA': 'kadena',
  'ROSE': 'oasis-network',
  'SCRT': 'secret',
  'GLMR': 'moonbeam',
  'ASTR': 'astar',
  'METIS': 'metis-token',
};

async function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function fetchWithRetry(url: string, params: any, retries = 2, delay = 1000): Promise<any> {
  try {
    return await axios.get(url, { params });
  } catch (error: any) {
    if (retries > 0 && (error.response?.status === 429 || !error.response)) {
      await sleep(delay);
      return fetchWithRetry(url, params, retries - 1, delay * 2);
    }
    throw error;
  }
}

/**
 * Alpha Vantage Implementation
 * Switched to DAILY endpoints as INTRADAY is premium-only for many assets.
 */
async function fetchAlphaVantageData(ticker: string): Promise<PricePoint[]> {
  // Check if key is actually set (not just empty string or placeholder)
  if (!ALPHA_VANTAGE_API_KEY || ALPHA_VANTAGE_API_KEY === '""' || ALPHA_VANTAGE_API_KEY.length < 5) {
    throw new Error('Alpha Vantage API Key missing or invalid');
  }

  const isForex = ticker.length === 6 && !SYMBOL_MAP[ticker.toUpperCase()];
  
  try {
    let params: any = {
      apikey: ALPHA_VANTAGE_API_KEY,
      outputsize: 'compact'
    };

    if (isForex) {
      params.function = 'FX_DAILY';
      params.from_symbol = ticker.substring(0, 3);
      params.to_symbol = ticker.substring(3, 6);
    } else {
      params.function = 'TIME_SERIES_DAILY';
      params.symbol = ticker;
    }

    const response = await axios.get(ALPHA_VANTAGE_BASE_URL, { params });

    // Handle Alpha Vantage "200 OK" errors
    const data = response.data;
    if (data['Error Message'] || data['Note'] || data['Information']) {
      const msg = data['Error Message'] || data['Note'] || data['Information'];
      if (msg.toLowerCase().includes('api key')) throw { response: { status: 401 } };
      if (msg.toLowerCase().includes('call frequency')) throw { response: { status: 429 } };
      throw new Error(msg);
    }

    const timeSeriesKey = isForex ? 'Time Series FX (Daily)' : 'Time Series (Daily)';
    const timeSeries = data[timeSeriesKey];
    
    if (!timeSeries) {
      // If not stock/forex, try crypto daily
      return fetchAlphaVantageCryptoDaily(ticker);
    }

    return Object.entries(timeSeries).map(([time, values]: [string, any]) => ({
      time: time,
      price: parseFloat(values['4. close']),
      volume: parseFloat(values['5. volume'] || values['6. volume'] || 0)
    })).reverse();
  } catch (error: any) {
    if (error.response?.status === 401) throw error;
    console.error('Alpha Vantage Stock/FX Error:', error.message || error);
    return fetchAlphaVantageCryptoDaily(ticker);
  }
}

async function fetchAlphaVantageCryptoDaily(ticker: string): Promise<PricePoint[]> {
  try {
    const response = await axios.get(ALPHA_VANTAGE_BASE_URL, {
      params: {
        function: 'DIGITAL_CURRENCY_DAILY',
        symbol: ticker,
        market: 'USD',
        apikey: ALPHA_VANTAGE_API_KEY
      }
    });

    const data = response.data;
    if (data['Error Message'] || data['Note'] || data['Information']) {
      const msg = data['Error Message'] || data['Note'] || data['Information'];
      if (msg.toLowerCase().includes('api key')) throw { response: { status: 401 } };
      throw new Error(msg);
    }

    const timeSeries = data['Time Series (Digital Currency Daily)'];
    if (!timeSeries) throw new Error('No data found');

    return Object.entries(timeSeries).map(([time, values]: [string, any]) => ({
      time: time,
      price: parseFloat(values['4a. close (USD)']),
      volume: parseFloat(values['5. volume'])
    })).reverse();
  } catch (error: any) {
    throw error;
  }
}

/**
 * Main Fetcher with Fallback
 */
export async function fetchMarketData(ticker: string): Promise<PricePoint[]> {
  // 1. Try Alpha Vantage if key is present
  const hasKey = ALPHA_VANTAGE_API_KEY && ALPHA_VANTAGE_API_KEY !== '""' && ALPHA_VANTAGE_API_KEY.length > 5;
  
  if (hasKey) {
    try {
      return await fetchAlphaVantageData(ticker);
    } catch (error: any) {
      console.warn('Alpha Vantage failed, falling back to CoinGecko:', error.response?.status || error.message);
      if (error.response?.status === 401) {
        // If 401, we know the key is bad, so we should probably stop trying it for this session
        // but for now just log and fallback
      }
    }
  }

  // 2. Fallback to CoinGecko for Crypto
  const id = SYMBOL_MAP[ticker.toUpperCase()] || ticker.toLowerCase();
  try {
    const response = await fetchWithRetry(`${COINGECKO_BASE_URL}/coins/${id}/market_chart`, {
      vs_currency: 'usd',
      days: '7',
      interval: 'hourly'
    });

    const prices = response.data.prices;
    const volumes = response.data.total_volumes;

    return prices.map((p: [number, number], index: number) => {
      const date = new Date(p[0]);
      return {
        time: date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        price: p[1],
        volume: volumes[index][1]
      };
    });
  } catch (error: any) {
    console.error('Error fetching market data:', error.message);
    if (error.response?.status === 429) {
      throw new Error('API Rate Limit Reached (429). Switching to Demo Mode.');
    } else if (error.response?.status === 401) {
      throw new Error('API Unauthorized (401). Switching to Demo Mode.');
    } else if (!error.response) {
      throw new Error('Network Error. Switching to Demo Mode.');
    }
    throw error;
  }
}
