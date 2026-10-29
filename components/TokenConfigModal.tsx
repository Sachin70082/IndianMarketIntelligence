"use client";

import React, { useState } from "react";
import { ApiConnectionStatus } from "@/lib/types/market";
import { Shield, Key, CheckCircle2, AlertCircle, RefreshCw, X, ExternalLink } from "lucide-react";

interface TokenConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  connectionStatus: ApiConnectionStatus | null;
  onRefreshStatus: () => Promise<void>;
}

export function TokenConfigModal({
  isOpen,
  onClose,
  connectionStatus,
  onRefreshStatus,
}: TokenConfigModalProps) {
  const [isTesting, setIsTesting] = useState(false);

  if (!isOpen) return null;

  const handleTest = async () => {
    setIsTesting(true);
    try {
      await onRefreshStatus();
    } finally {
      setIsTesting(false);
    }
  };

  const isConfigured = connectionStatus?.is_configured;
  const isConnected = connectionStatus?.status === "CONNECTED";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
      <div className="relative w-full max-w-xl bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden p-6 text-slate-200">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Modal Header */}
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2.5 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-400">
            <Shield className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-white">Upstox Analytics Token Security & Config</h3>
            <p className="text-xs text-slate-400">Strict read-only authentication architecture</p>
          </div>
        </div>

        {/* Live Token Status Box */}
        <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800/80 mb-6 space-y-3">
          <div className="flex items-center justify-between text-sm">
            <span className="text-slate-400 flex items-center gap-2">
              <Key className="w-4 h-4 text-slate-500" />
              Token Presence in Server Environment:
            </span>
            {isConfigured ? (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold bg-emerald-950 text-emerald-400 border border-emerald-800">
                <CheckCircle2 className="w-3.5 h-3.5" />
                DETECTED ({connectionStatus?.masked_token || "Configured"})
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold bg-rose-950 text-rose-400 border border-rose-800">
                <AlertCircle className="w-3.5 h-3.5" />
                NOT DETECTED
              </span>
            )}
          </div>

          <div className="flex items-center justify-between text-sm">
            <span className="text-slate-400">API Connection Status:</span>
            <span
              className={`text-xs font-semibold px-2 py-0.5 rounded ${
                isConnected
                  ? "text-emerald-400 bg-emerald-950/60 border border-emerald-800/40"
                  : "text-amber-400 bg-amber-950/60 border border-amber-800/40"
              }`}
            >
              {connectionStatus?.status || "UNKNOWN"}
            </span>
          </div>

          <div className="text-xs text-slate-400 bg-slate-900/80 p-2.5 rounded-lg border border-slate-800">
            <div className="font-medium text-slate-300 mb-0.5">Diagnostic Report:</div>
            <div>{connectionStatus?.message || "Click 'Test Connection' below to verify token."}</div>
            {connectionStatus?.last_tested && (
              <div className="text-[11px] text-slate-500 mt-1">
                Last checked: {connectionStatus.last_tested}
              </div>
            )}
          </div>
        </div>

        {/* How to configure guide */}
        <div className="space-y-3 text-xs text-slate-300 mb-6 bg-slate-800/30 p-4 rounded-xl border border-slate-800">
          <div className="font-semibold text-white flex items-center gap-1.5">
            <span>How to setup your Upstox Analytics Token:</span>
          </div>
          <ol className="list-decimal pl-4 space-y-1.5 text-slate-300">
            <li>
              Log in to{" "}
              <a
                href="https://account.upstox.com/developer/apps#analytics"
                target="_blank"
                rel="noreferrer"
                className="text-blue-400 hover:underline inline-flex items-center gap-0.5"
              >
                Upstox Developer Apps (Analytics tab)
                <ExternalLink className="w-3 h-3" />
              </a>
            </li>
            <li>Click <strong>Generate Token</strong> (Valid for 1 year, read-only, free).</li>
            <li>Copy the full token string to your clipboard.</li>
            <li>
              Open your local project root file: <code className="text-amber-300 bg-slate-900 px-1 py-0.5 rounded">.env.local</code>
            </li>
            <li>
              Set: <code className="text-emerald-300 bg-slate-900 px-1 py-0.5 rounded">UPSTOX_ANALYTICS_TOKEN=your_token_here</code>
            </li>
            <li>Save the file and click <strong>Test Connection</strong> below.</li>
          </ol>
        </div>

        {/* Security Disclaimers */}
        <div className="text-[11px] text-slate-500 bg-slate-950/40 p-3 rounded-lg border border-slate-800/50 mb-6 space-y-1">
          <p>
            🛡️ <strong>Absolute Security Guarantee:</strong> This application executes strictly server-side read-only requests. Tokens and authorization headers are never logged, never returned to browser components, and never stored in client bundles.
          </p>
          <p>🚫 No trading, order placement, or portfolio modification endpoints exist.</p>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-3">
          <button
            onClick={handleTest}
            disabled={isTesting}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white rounded-xl text-sm font-semibold transition"
          >
            <RefreshCw className={`w-4 h-4 ${isTesting ? "animate-spin" : ""}`} />
            {isTesting ? "Verifying Token..." : "Test Connection"}
          </button>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-sm font-medium transition"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
