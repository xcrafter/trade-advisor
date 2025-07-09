import { BarChart3 } from "lucide-react";

export function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center h-full text-center px-8">
      <div className="relative mb-6">
        <div className="absolute inset-0 bg-blue-100 rounded-full blur-xl opacity-50"></div>
        <div className="relative bg-white rounded-full p-6 shadow-lg">
          <BarChart3 className="h-12 w-12 text-blue-600" />
        </div>
      </div>

      <h2 className="text-2xl font-bold text-gray-900 mb-2">
        Welcome to Swing Trade Advisor
      </h2>

      <p className="text-gray-600 mb-6 max-w-md">
        Get comprehensive technical analysis and AI-powered insights for your
        stock investments. Search for a stock to get started.
      </p>
    </div>
  );
}
