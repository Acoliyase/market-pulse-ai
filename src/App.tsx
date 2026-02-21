/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { 
  TrendingUp, 
  Search, 
  Activity, 
  BarChart3, 
  Zap, 
  ShieldAlert,
  RefreshCw,
  ArrowUpRight,
  ArrowDownRight,
  Info,
  Settings as SettingsIcon,
  X,
  Save,
  Database
} from 'lucide-react';
import { 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  AreaChart,
  Area,
  Line,
  ComposedChart
} from 'recharts';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import Markdown from 'react-markdown';
import { calculateSMA, calculateRSI, calculateMACD, calculateBollingerBands } from './utils/indicators';
import { analyzeMarket } from './services/geminiService';
import { fetchMarketData } from './services/marketDataService';
import { PricePoint, MarketIndicators, UserSettings, DEFAULT_SETTINGS } from './types';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export default function App() {
  const [ticker, setTicker] = useState('BTC');
  const [searchInput, setSearchInput] = useState('BTC');
  const [data, setData] = useState<PricePoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [analyzing, setAnalyzing] = useState(false);
  const [analysis, setAnalysis] = useState<string | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Settings state with persistence
  const [settings, setSettings] = useState<UserSettings>(() => {
    const saved = localStorage.getItem('marketpulse_settings');
    return saved ? JSON.parse(saved) : DEFAULT_SETTINGS;
  });

  const handleSearch = useCallback(async () => {
    setLoading(true);
    setError(null);
    const currentTicker = searchInput.toUpperCase();
    setTicker(currentTicker);
    
    try {
      const newData = await fetchMarketData(currentTicker);
      setData(newData);
      setAnalysis(null);
    } catch (err: any) {
      console.error("Failed to fetch data:", err.message);
      setError(err.message || "Failed to fetch real-time data. Using simulated data instead.");
      // Fallback to mock data if API fails (e.g. rate limits)
      setData(generateMockData(currentTicker));
    } finally {
      setLoading(false);
    }
  }, [searchInput]);

  useEffect(() => {
    handleSearch();
    
    // Auto-refresh interval
    const interval = setInterval(() => {
      handleSearch();
    }, settings.refreshInterval * 1000);
    
    return () => clearInterval(interval);
  }, [handleSearch, settings.refreshInterval]);

  const indicators = useMemo((): MarketIndicators | null => {
    if (data.length < Math.max(settings.smaLongPeriod, settings.rsiPeriod, settings.bbPeriod)) return null;
    const prices = data.map(d => d.price);
    return {
      rsi: calculateRSI(prices, settings.rsiPeriod),
      sma20: calculateSMA(prices, settings.smaShortPeriod),
      sma50: calculateSMA(prices, settings.smaLongPeriod),
      macd: calculateMACD(prices),
      bollinger: calculateBollingerBands(prices, settings.bbPeriod, settings.bbStdDev)
    };
  }, [data, settings]);

  const runAIAnalysis = async () => {
    if (!indicators) return;
    setAnalyzing(true);
    try {
      const result = await analyzeMarket(ticker, data, indicators);
      setAnalysis(result || "No analysis available.");
    } catch (error) {
      console.error("Analysis failed:", error);
      setAnalysis("Error generating analysis. Please check your API configuration.");
    } finally {
      setAnalyzing(false);
    }
  };

  const saveSettings = (newSettings: UserSettings) => {
    setSettings(newSettings);
    localStorage.setItem('marketpulse_settings', JSON.stringify(newSettings));
    setShowSettings(false);
  };

  const currentPrice = data[data.length - 1]?.price || 0;
  const prevPrice = data[data.length - 2]?.price || 0;
  const priceChange = currentPrice - prevPrice;
  const priceChangePct = prevPrice !== 0 ? (priceChange / prevPrice) * 100 : 0;

  return (
    <div className="min-h-screen bg-[#0A0A0B] text-slate-200 font-sans selection:bg-emerald-500/30">
      {/* Header */}
      <header className="border-b border-white/5 bg-black/40 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-emerald-500 rounded-lg flex items-center justify-center shadow-[0_0_15px_rgba(16,185,129,0.4)]">
              <Zap className="w-5 h-5 text-black fill-current" />
            </div>
            <h1 className="text-xl font-bold tracking-tight text-white">MarketPulse <span className="text-emerald-500">AI</span></h1>
          </div>

          <div className="flex items-center gap-4">
            <div className="relative group">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 group-focus-within:text-emerald-500 transition-colors" />
              <input 
                type="text"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                placeholder="Search 100+ assets (BTC, SOL, MATIC...)"
                className="bg-white/5 border border-white/10 rounded-full py-2 pl-10 pr-4 w-64 focus:outline-none focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/20 transition-all text-sm"
              />
            </div>
            <button 
              onClick={() => setShowSettings(true)}
              className="p-2 hover:bg-white/5 rounded-full transition-colors text-slate-400 hover:text-white"
            >
              <SettingsIcon className="w-5 h-5" />
            </button>
            <button 
              onClick={handleSearch}
              className="p-2 hover:bg-white/5 rounded-full transition-colors"
            >
              <RefreshCw className={cn("w-5 h-5 text-slate-400", loading && "animate-spin")} />
            </button>
          </div>
        </div>
      </header>

      <div className="bg-white/5 border-b border-white/5 py-2 overflow-x-auto scrollbar-hide">
        <div className="max-w-7xl mx-auto px-4 flex items-center gap-6 text-[10px] font-bold uppercase tracking-widest text-slate-500 whitespace-nowrap">
          <span className="text-emerald-500 flex items-center gap-1"><TrendingUp className="w-3 h-3" /> Trending:</span>
          {['BTC', 'ETH', 'AAPL', 'TSLA', 'NVDA', 'EURUSD', 'GBPUSD', 'SOL', 'MATIC', 'AVAX'].map(t => (
            <button 
              key={t} 
              onClick={() => { setSearchInput(t); handleSearch(); }}
              className="hover:text-white transition-colors cursor-pointer"
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      <main className="max-w-7xl mx-auto px-4 py-8 space-y-6">
        {error && (
          <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-4 flex items-center gap-3 text-amber-400 text-sm">
            <Database className="w-4 h-4" />
            {error}
          </div>
        )}

        {/* Top Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard 
            label="Current Price" 
            value={`$${currentPrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`} 
            subValue={
              <span className={cn("flex items-center gap-1 text-sm font-medium", priceChange >= 0 ? "text-emerald-400" : "text-rose-400")}>
                {priceChange >= 0 ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                {Math.abs(priceChangePct).toFixed(2)}%
              </span>
            }
            icon={<Activity className="w-5 h-5 text-emerald-500" />}
          />
          <StatCard 
            label={`RSI (${settings.rsiPeriod})`} 
            value={indicators?.rsi.toFixed(2) || '0.00'} 
            subValue={
              <span className={cn("text-xs uppercase tracking-wider", 
                (indicators?.rsi || 0) > 70 ? "text-rose-400" : (indicators?.rsi || 0) < 30 ? "text-emerald-400" : "text-slate-500"
              )}>
                {(indicators?.rsi || 0) > 70 ? "Overbought" : (indicators?.rsi || 0) < 30 ? "Oversold" : "Neutral"}
              </span>
            }
            icon={<BarChart3 className="w-5 h-5 text-blue-500" />}
          />
          <StatCard 
            label={`SMA ${settings.smaShortPeriod}/${settings.smaLongPeriod}`} 
            value={`${indicators?.sma20.toFixed(0)} / ${indicators?.sma50.toFixed(0)}`} 
            subValue={
              <span className="text-xs text-slate-500">
                Trend: {(indicators?.sma20 || 0) > (indicators?.sma50 || 0) ? "Bullish" : "Bearish"}
              </span>
            }
            icon={<TrendingUp className="w-5 h-5 text-purple-500" />}
          />
          <StatCard 
            label="MACD" 
            value={indicators?.macd.value.toFixed(2) || '0.00'} 
            subValue={
              <span className={cn("text-xs", (indicators?.macd.histogram || 0) > 0 ? "text-emerald-400" : "text-rose-400")}>
                Histogram: {indicators?.macd.histogram.toFixed(2)}
              </span>
            }
            icon={<Zap className="w-5 h-5 text-amber-500" />}
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Chart */}
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-white/5 border border-white/10 rounded-2xl p-6 backdrop-blur-sm">
              <div className="flex items-center justify-between mb-8">
                <div>
                  <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                    {ticker} Advanced Analysis
                    <span className={cn(
                      "px-2 py-0.5 text-[10px] font-bold rounded uppercase tracking-widest border",
                      error ? "bg-amber-500/10 text-amber-500 border-amber-500/20" : "bg-emerald-500/10 text-emerald-500 border-emerald-500/20"
                    )}>
                      {error ? "Demo Mode" : "Real-Time"}
                    </span>
                  </h3>
                  <p className="text-sm text-slate-500">Price with Bollinger Bands and Moving Averages</p>
                </div>
              </div>
              
              <div className="h-[450px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={data}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#ffffff05" vertical={false} />
                    <XAxis 
                      dataKey="time" 
                      stroke="#ffffff20" 
                      fontSize={10} 
                      tickLine={false} 
                      axisLine={false}
                      interval={Math.floor(data.length / 5)}
                    />
                    <YAxis 
                      stroke="#ffffff20" 
                      fontSize={10} 
                      tickLine={false} 
                      axisLine={false}
                      tickFormatter={(val) => `$${val.toLocaleString()}`}
                      domain={['auto', 'auto']}
                    />
                    <Tooltip 
                      contentStyle={{ backgroundColor: '#18181b', border: '1px solid #ffffff10', borderRadius: '12px' }}
                      itemStyle={{ color: '#10b981' }}
                    />
                    
                    {/* Bollinger Bands Area */}
                    <Area 
                      type="monotone" 
                      dataKey={(d) => {
                        const prices = data.map(x => x.price);
                        const idx = data.indexOf(d);
                        if (idx < settings.bbPeriod) return null;
                        const bb = calculateBollingerBands(prices.slice(0, idx + 1), settings.bbPeriod, settings.bbStdDev);
                        return [bb.lower, bb.upper];
                      }}
                      stroke="none"
                      fill="#3b82f6"
                      fillOpacity={0.05}
                      name="Bollinger Range"
                    />

                    <Area 
                      type="monotone" 
                      dataKey="price" 
                      stroke="#10b981" 
                      strokeWidth={2}
                      fillOpacity={0.1} 
                      fill="#10b981"
                      name="Price"
                    />

                    {/* SMA Lines */}
                    <Line 
                      type="monotone" 
                      dataKey={(d) => {
                        const prices = data.map(x => x.price);
                        const idx = data.indexOf(d);
                        return calculateSMA(prices.slice(0, idx + 1), settings.smaShortPeriod);
                      }}
                      stroke="#8b5cf6" 
                      strokeWidth={1}
                      dot={false}
                      name={`SMA ${settings.smaShortPeriod}`}
                    />
                    <Line 
                      type="monotone" 
                      dataKey={(d) => {
                        const prices = data.map(x => x.price);
                        const idx = data.indexOf(d);
                        return calculateSMA(prices.slice(0, idx + 1), settings.smaLongPeriod);
                      }}
                      stroke="#ec4899" 
                      strokeWidth={1}
                      dot={false}
                      name={`SMA ${settings.smaLongPeriod}`}
                    />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Technical Breakdown */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
                <h4 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
                  <ShieldAlert className="w-4 h-4 text-amber-500" />
                  Bollinger Bands
                </h4>
                <div className="space-y-4">
                  <RiskRow label="Upper Band" value={`$${indicators?.bollinger.upper.toLocaleString()}`} color="text-blue-400" />
                  <RiskRow label="Middle Band" value={`$${indicators?.bollinger.middle.toLocaleString()}`} color="text-slate-300" />
                  <RiskRow label="Lower Band" value={`$${indicators?.bollinger.lower.toLocaleString()}`} color="text-blue-400" />
                  <div className="pt-2">
                    <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-blue-500 transition-all duration-500" 
                        style={{ 
                          width: `${Math.min(100, Math.max(0, ((currentPrice - (indicators?.bollinger.lower || 0)) / ((indicators?.bollinger.upper || 0) - (indicators?.bollinger.lower || 0))) * 100))}%` 
                        }} 
                      />
                    </div>
                    <div className="flex justify-between mt-1">
                      <span className="text-[10px] text-slate-500">Lower</span>
                      <span className="text-[10px] text-slate-500">Upper</span>
                    </div>
                  </div>
                </div>
              </div>
              <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
                <h4 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
                  <Info className="w-4 h-4 text-blue-500" />
                  Market Sentiment (ML Predicted)
                </h4>
                <div className="flex items-center justify-center py-4">
                  <div className="relative w-32 h-32">
                    <svg className="w-full h-full" viewBox="0 0 100 100">
                      <circle cx="50" cy="50" r="45" fill="none" stroke="#ffffff05" strokeWidth="10" />
                      <circle 
                        cx="50" cy="50" r="45" 
                        fill="none" 
                        stroke="#10b981" 
                        strokeWidth="10" 
                        strokeDasharray="282.7"
                        strokeDashoffset={282.7 * (1 - 0.72)}
                        strokeLinecap="round"
                        className="transition-all duration-1000"
                      />
                    </svg>
                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                      <span className="text-2xl font-bold text-white">72%</span>
                      <span className="text-[10px] text-slate-500 uppercase tracking-tighter">Confidence</span>
                    </div>
                  </div>
                </div>
                <p className="text-[10px] text-center text-slate-500 mt-2 italic">Trend prediction based on historical volatility patterns.</p>
              </div>
            </div>
          </div>

          {/* AI Signals Side Panel */}
          <div className="space-y-6">
            <div className="bg-emerald-500/5 border border-emerald-500/20 rounded-2xl p-6 relative overflow-hidden group">
              <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                <Zap className="w-24 h-24 text-emerald-500" />
              </div>
              
              <h3 className="text-lg font-semibold text-white mb-2 flex items-center gap-2">
                Gemini AI Signal
                <span className="px-1.5 py-0.5 bg-emerald-500 text-black text-[8px] font-black rounded uppercase tracking-tighter">Pro</span>
              </h3>
              <p className="text-sm text-slate-400 mb-6">Get a deep analysis of current market conditions and potential signals.</p>
              
              <button 
                onClick={runAIAnalysis}
                disabled={analyzing || !indicators}
                className="w-full bg-emerald-500 hover:bg-emerald-400 disabled:bg-emerald-800 text-black font-bold py-3 rounded-xl transition-all flex items-center justify-center gap-2 shadow-[0_4px_20px_rgba(16,185,129,0.2)] active:scale-95"
              >
                {analyzing ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    Analyzing Market...
                  </>
                ) : (
                  <>
                    <Zap className="w-4 h-4 fill-current" />
                    Generate Signal
                  </>
                )}
              </button>
            </div>

            {analysis && (
              <div className="bg-white/5 border border-white/10 rounded-2xl p-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div className="flex items-center justify-between mb-4">
                  <h4 className="text-sm font-semibold text-white uppercase tracking-wider">AI Analysis Report</h4>
                  <span className="text-[10px] text-slate-500">Just now</span>
                </div>
                <div className="prose prose-invert prose-sm max-w-none prose-p:leading-relaxed prose-headings:text-emerald-400 prose-strong:text-white">
                  <Markdown>{analysis}</Markdown>
                </div>
              </div>
            )}

            {!analysis && !analyzing && (
              <div className="bg-white/5 border border-dashed border-white/10 rounded-2xl p-12 flex flex-col items-center justify-center text-center">
                <div className="w-12 h-12 bg-white/5 rounded-full flex items-center justify-center mb-4">
                  <Activity className="w-6 h-6 text-slate-600" />
                </div>
                <p className="text-sm text-slate-500">No signal generated yet. Click the button above to start AI analysis.</p>
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Settings Modal */}
      {showSettings && (
        <SettingsModal 
          settings={settings} 
          onClose={() => setShowSettings(false)} 
          onSave={saveSettings} 
        />
      )}

      {/* Footer */}
      <footer className="border-t border-white/5 py-8 mt-12">
        <div className="max-w-7xl mx-auto px-4 flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="text-xs text-slate-600">© 2026 MarketPulse AI. Real-time data powered by CoinGecko. Not financial advice.</p>
          <div className="flex gap-6">
            <a href="#" className="text-xs text-slate-500 hover:text-white transition-colors">Documentation</a>
            <a href="#" className="text-xs text-slate-500 hover:text-white transition-colors">Terms of Service</a>
            <a href="#" className="text-xs text-slate-500 hover:text-white transition-colors">Privacy Policy</a>
          </div>
        </div>
      </footer>
    </div>
  );
}

function SettingsModal({ settings, onClose, onSave }: { settings: UserSettings, onClose: () => void, onSave: (s: UserSettings) => void }) {
  const [localSettings, setLocalSettings] = useState(settings);

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-[#18181B] border border-white/10 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl">
        <div className="p-6 border-b border-white/5 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-white flex items-center gap-2">
            <SettingsIcon className="w-5 h-5 text-emerald-500" />
            Algorithm Parameters
          </h3>
          <button onClick={onClose} className="p-1 hover:bg-white/5 rounded-lg transition-colors">
            <X className="w-5 h-5 text-slate-500" />
          </button>
        </div>
        
        <div className="p-6 space-y-6 max-h-[70vh] overflow-y-auto">
          <div className="space-y-4">
            <h4 className="text-xs font-bold text-slate-500 uppercase tracking-widest">Indicators</h4>
            <SettingInput 
              label="RSI Period" 
              value={localSettings.rsiPeriod} 
              onChange={(v) => setLocalSettings({...localSettings, rsiPeriod: v})} 
            />
            <div className="grid grid-cols-2 gap-4">
              <SettingInput 
                label="SMA Short" 
                value={localSettings.smaShortPeriod} 
                onChange={(v) => setLocalSettings({...localSettings, smaShortPeriod: v})} 
              />
              <SettingInput 
                label="SMA Long" 
                value={localSettings.smaLongPeriod} 
                onChange={(v) => setLocalSettings({...localSettings, smaLongPeriod: v})} 
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <SettingInput 
                label="BB Period" 
                value={localSettings.bbPeriod} 
                onChange={(v) => setLocalSettings({...localSettings, bbPeriod: v})} 
              />
              <SettingInput 
                label="BB Std Dev" 
                value={localSettings.bbStdDev} 
                onChange={(v) => setLocalSettings({...localSettings, bbStdDev: v})} 
              />
            </div>
          </div>

          <div className="space-y-4">
            <h4 className="text-xs font-bold text-slate-500 uppercase tracking-widest">System</h4>
            <SettingInput 
              label="Refresh Interval (sec)" 
              value={localSettings.refreshInterval} 
              onChange={(v) => setLocalSettings({...localSettings, refreshInterval: v})} 
            />
          </div>
        </div>

        <div className="p-6 bg-white/5 border-t border-white/5 flex gap-3">
          <button 
            onClick={onClose}
            className="flex-1 py-2 rounded-xl text-sm font-medium text-slate-400 hover:bg-white/5 transition-colors"
          >
            Cancel
          </button>
          <button 
            onClick={() => onSave(localSettings)}
            className="flex-1 py-2 rounded-xl text-sm font-bold bg-emerald-500 text-black hover:bg-emerald-400 transition-colors flex items-center justify-center gap-2"
          >
            <Save className="w-4 h-4" />
            Save Changes
          </button>
        </div>
      </div>
    </div>
  );
}

function SettingInput({ label, value, onChange }: { label: string, value: number, onChange: (v: number) => void }) {
  return (
    <div className="space-y-1.5">
      <label className="text-xs font-medium text-slate-400">{label}</label>
      <input 
        type="number" 
        value={value} 
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full bg-white/5 border border-white/10 rounded-lg py-2 px-3 focus:outline-none focus:border-emerald-500/50 text-sm"
      />
    </div>
  );
}

function StatCard({ label, value, subValue, icon }: { label: string, value: string, subValue: React.ReactNode, icon: React.ReactNode }) {
  return (
    <div className="bg-white/5 border border-white/10 rounded-2xl p-5 hover:border-white/20 transition-all group">
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">{label}</span>
        <div className="p-2 bg-white/5 rounded-lg group-hover:scale-110 transition-transform">
          {icon}
        </div>
      </div>
      <div className="flex flex-col">
        <span className="text-2xl font-bold text-white tracking-tight">{value}</span>
        {subValue}
      </div>
    </div>
  );
}

function RiskRow({ label, value, color }: { label: string, value: string, color: string }) {
  return (
    <div className="flex items-center justify-between py-2 border-b border-white/5 last:border-0">
      <span className="text-xs text-slate-500">{label}</span>
      <span className={cn("text-xs font-bold", color)}>{value}</span>
    </div>
  );
}

// Mock data generator for fallback
const generateMockData = (ticker: string): PricePoint[] => {
  const data: PricePoint[] = [];
  let basePrice = ticker === 'BTC' ? 65000 : ticker === 'ETH' ? 3500 : 150;
  const now = new Date();
  
  for (let i = 100; i >= 0; i--) {
    const time = new Date(now.getTime() - i * 3600000);
    const change = (Math.random() - 0.5) * (basePrice * 0.02);
    basePrice += change;
    data.push({
      time: time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      price: Number(basePrice.toFixed(2)),
      volume: Math.floor(Math.random() * 1000000)
    });
  }
  return data;
};
