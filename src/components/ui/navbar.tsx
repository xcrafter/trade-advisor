import { BarChart3 } from "lucide-react";

export function Navbar() {
  return (
    <nav className="bg-white border-b border-gray-200 px-4 py-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="flex items-center space-x-2">
            <BarChart3 className="h-6 w-6 text-blue-600" />
            <h1 className="text-xl font-bold text-gray-900">Stock Analyzer</h1>
          </div>
          <div className="hidden md:flex items-center space-x-1 text-sm text-gray-500">
            <span>•</span>
            <span>Real-time market analysis</span>
          </div>
        </div>
      </div>
    </nav>
  );
}
