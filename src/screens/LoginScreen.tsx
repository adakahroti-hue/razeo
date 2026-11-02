import React from 'react';
import { motion } from 'motion/react';
import { AlertCircle, BarChart3, ChevronRight, Globe, RefreshCw, Search, Target, X } from 'lucide-react';
import { cn } from '../lib/utils';

type Props = {
  error: string | null;
  setError: (v: string | null) => void;
  user: any;
  handleLogin: () => void;
  isLoggingIn: boolean;
  handleConnect: () => void;
  isConnecting: boolean;
};

export default function LoginScreen({ error, setError, user, handleLogin, isLoggingIn, handleConnect, isConnecting }: Props) {
  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 flex flex-col items-center justify-center p-6">
      {error && (
        <div className="max-w-md w-full mb-6 p-4 bg-red-50 border border-red-200 rounded-2xl flex items-start gap-3 text-red-600 text-sm shadow-sm">
          <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="font-semibold">Error</p>
            <p className="opacity-90">{error}</p>
          </div>
          <button onClick={() => setError(null)} className="p-1 hover:bg-red-100 rounded-lg transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-2xl w-full text-center space-y-8"
      >
        <div className="inline-flex items-center justify-center w-20 h-20 rounded-3xl bg-emerald-600/10 border border-emerald-600/20 mb-4">
          <Search className="w-10 h-10 text-emerald-600" />
        </div>
        <h1 className="text-5xl md:text-7xl font-bold tracking-tighter bg-gradient-to-b from-gray-900 to-gray-700 bg-clip-text text-transparent">
          SEO Content Audit Ultimate
        </h1>
        <p className="text-xl text-gray-600 max-w-lg mx-auto leading-relaxed">
          Connect your Google Search Console to unlock deep insights, visualize performance, and audit your content like a pro.
        </p>
        
        <div className="pt-8">
          {!user ? (
            <button 
              onClick={handleLogin}
              disabled={isLoggingIn}
              className="group relative px-8 py-4 bg-emerald-600 text-white font-semibold rounded-full overflow-hidden transition-all hover:scale-105 active:scale-95 shadow-xl shadow-emerald-600/20 disabled:opacity-50 disabled:scale-100"
            >
              <span className="relative z-10 flex items-center gap-2">
                {isLoggingIn ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    Logging in...
                  </>
                ) : (
                  <>
                    Login with Google
                    <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                  </>
                )}
              </span>
            </button>
          ) : (
            <button 
              onClick={handleConnect}
              disabled={isConnecting}
              className="group relative px-8 py-4 bg-emerald-600 text-white font-semibold rounded-full overflow-hidden transition-all hover:scale-105 active:scale-95 shadow-xl shadow-emerald-600/20 disabled:opacity-50 disabled:scale-100"
            >
              <span className="relative z-10 flex items-center gap-2">
                {isConnecting ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    Connecting...
                  </>
                ) : (
                  <>
                    Connect Google Search Console
                    <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                  </>
                )}
              </span>
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-16 text-left">
          {[
            { icon: BarChart3, title: "Visual Analytics", desc: "Interactive charts for clicks, impressions, and CTR.", color: "text-blue-500", bg: "bg-blue-50" },
            { icon: Target, title: "Opportunity Finder", desc: "Identify high-impression, low-CTR pages to optimize.", color: "text-rose-500", bg: "bg-rose-50" },
            { icon: Globe, title: "Global Reach", desc: "Analyze performance by country and device type.", color: "text-emerald-500", bg: "bg-emerald-50" }
          ].map((feature, i) => (
            <div key={i} className="p-6 rounded-2xl bg-white border border-gray-200 shadow-sm">
              <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center mb-4", feature.bg)}>
                <feature.icon className={cn("w-6 h-6", feature.color)} />
              </div>
              <h3 className="font-semibold mb-2 text-gray-900">{feature.title}</h3>
              <p className="text-sm text-gray-500">{feature.desc}</p>
            </div>
          ))}
        </div>
      </motion.div>
    </div>
  );
}
