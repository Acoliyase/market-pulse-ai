export interface PricePoint {
  time: string;
  price: number;
  volume: number;
}

export interface BollingerBands {
  upper: number;
  middle: number;
  lower: number;
}

export interface MarketIndicators {
  rsi: number;
  sma20: number;
  sma50: number;
  macd: {
    value: number;
    signal: number;
    histogram: number;
  };
  bollinger: BollingerBands;
}

export interface UserSettings {
  rsiPeriod: number;
  smaShortPeriod: number;
  smaLongPeriod: number;
  bbPeriod: number;
  bbStdDev: number;
  refreshInterval: number;
}

export const DEFAULT_SETTINGS: UserSettings = {
  rsiPeriod: 14,
  smaShortPeriod: 20,
  smaLongPeriod: 50,
  bbPeriod: 20,
  bbStdDev: 2,
  refreshInterval: 30, // seconds
};

export interface SignalResponse {
  recommendation: 'BUY' | 'SELL' | 'HOLD';
  confidence: number;
  analysis: string;
}
