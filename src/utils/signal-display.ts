import { SignalType, TrendDirection, VolumeQuality } from "@/types/signal";

export const getSignalColor = (signal: SignalType): string => {
  switch (signal) {
    case "strong_buy":
      return "bg-green-600";
    case "buy":
      return "bg-green-400";
    case "hold":
      return "bg-yellow-400";
    case "sell":
      return "bg-red-400";
    case "strong_sell":
      return "bg-red-600";
    default:
      return "bg-gray-400";
  }
};

export const getTrendIcon = (trend: TrendDirection): string => {
  switch (trend) {
    case "bullish":
      return "↗️";
    case "bearish":
      return "↘️";
    case "sideways":
      return "↔️";
    case "transitioning":
      return "↝";
    default:
      return "❓";
  }
};

export const getVolumeQualityColor = (quality: VolumeQuality): string => {
  switch (quality) {
    case "excellent":
      return "bg-green-600";
    case "good":
      return "bg-green-400";
    case "average":
      return "bg-yellow-400";
    case "poor":
      return "bg-red-400";
    default:
      return "bg-gray-400";
  }
};

export const formatRiskReward = (ratio: string): string => {
  return ratio.replace(":", " : ");
};

export const getSwingScoreColor = (score: number): string => {
  if (score >= 8) return "bg-green-600";
  if (score >= 6) return "bg-green-400";
  if (score >= 4) return "bg-yellow-400";
  if (score >= 2) return "bg-red-400";
  return "bg-red-600";
};
