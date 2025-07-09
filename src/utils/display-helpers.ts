import { SignalType, TrendDirection, VolumeQuality } from "@/types/stock";

export const getSignalColor = (signal: SignalType): string => {
  switch (signal) {
    case "strong_buy":
      return "text-green-600 bg-green-50";
    case "buy":
      return "text-green-500 bg-green-50";
    case "hold":
      return "text-yellow-600 bg-yellow-50";
    case "neutral":
      return "text-gray-600 bg-gray-50";
    case "sell":
      return "text-red-500 bg-red-50";
    case "strong_sell":
      return "text-red-600 bg-red-50";
    default:
      return "text-gray-600 bg-gray-50";
  }
};

export const getTrendIcon = (trend: TrendDirection): string => {
  switch (trend) {
    case "bullish":
      return "📈";
    case "bearish":
      return "📉";
    case "sideways":
      return "➡️";
    case "transitioning":
      return "🔄";
    default:
      return "❓";
  }
};

export const getVolumeQualityColor = (quality: VolumeQuality): string => {
  switch (quality) {
    case "excellent":
      return "text-green-600 bg-green-50";
    case "good":
      return "text-green-500 bg-green-50";
    case "average":
      return "text-yellow-600 bg-yellow-50";
    case "poor":
      return "text-red-500 bg-red-50";
    default:
      return "text-gray-600 bg-gray-50";
  }
};

export const formatRiskReward = (ratio: string): string => {
  return ratio.startsWith("1:") ? ratio : `1:${ratio}`;
};

export const getSwingScoreColor = (score: number): string => {
  if (score >= 8) return "text-green-600 font-bold";
  if (score >= 6) return "text-green-500";
  if (score >= 4) return "text-yellow-600";
  return "text-red-500";
};
