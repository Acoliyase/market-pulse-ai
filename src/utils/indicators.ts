/**
 * Technical Analysis Utilities
 */

export function calculateSMA(data: number[], period: number): number {
  if (data.length < period) return 0;
  const sum = data.slice(-period).reduce((a, b) => a + b, 0);
  return sum / period;
}

export function calculateStandardDeviation(data: number[], period: number): number {
  if (data.length < period) return 0;
  const subset = data.slice(-period);
  const mean = subset.reduce((a, b) => a + b, 0) / period;
  const variance = subset.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / period;
  return Math.sqrt(variance);
}

export function calculateBollingerBands(prices: number[], period: number = 20, stdDev: number = 2) {
  const sma = calculateSMA(prices, period);
  const sd = calculateStandardDeviation(prices, period);
  return {
    upper: sma + (stdDev * sd),
    middle: sma,
    lower: sma - (stdDev * sd)
  };
}

export function calculateRSI(prices: number[], period: number = 14): number {
  if (prices.length <= period) return 50;

  let gains = 0;
  let losses = 0;

  for (let i = 1; i <= period; i++) {
    const change = prices[prices.length - i] - prices[prices.length - i - 1];
    if (change > 0) gains += change;
    else losses -= change;
  }

  if (losses === 0) return 100;
  const rs = (gains / period) / (losses / period);
  return 100 - (100 / (1 + rs));
}

export function calculateMACD(prices: number[]) {
  const ema12 = calculateSMA(prices, 12);
  const ema26 = calculateSMA(prices, 26);
  const macd = ema12 - ema26;
  const signal = calculateSMA(prices.slice(-9), 9); // Simplified signal line
  
  return {
    value: macd,
    signal: signal,
    histogram: macd - signal
  };
}
