import { GoogleGenAI, ThinkingLevel } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export async function analyzeMarket(ticker: string, priceData: any[], indicators: any) {
  const prompt = `
    Analyze the following market data for ${ticker}:
    Current Price Data: ${JSON.stringify(priceData.slice(-5))}
    Technical Indicators:
    - RSI: ${indicators.rsi}
    - SMA (Short/Long): ${indicators.sma20} / ${indicators.sma50}
    - MACD: ${JSON.stringify(indicators.macd)}
    - Bollinger Bands: ${JSON.stringify(indicators.bollinger)}
    
    Provide a detailed trading signal (BUY, SELL, or HOLD) with:
    1. A clear recommendation.
    2. Confidence level (0-100%).
    3. Key reasons based on the indicators, specifically mentioning Bollinger Band positioning and RSI divergence if any.
    4. Potential entry and exit points.
    5. Risk assessment.
    
    Format the response as a structured analysis.
  `;

  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: prompt,
    config: {
      thinkingConfig: { thinkingLevel: ThinkingLevel.LOW }
    }
  });

  return response.text;
}
