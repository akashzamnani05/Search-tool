'use client'

import { useState } from 'react'
import { RefreshCw, Database, CheckCircle, XCircle, AlertCircle, X } from 'lucide-react'
import { triggerIndexing, getStats } from '@/lib/api'

export default function IndexingPanel() {
  const [isIndexing, setIsIndexing]       = useState(false)
  const [indexingStatus, setIndexingStatus] = useState(null)
  const [error, setError]                 = useState(null)
  const [stats, setStats]                 = useState(null)
  const [showPanel, setShowPanel]         = useState(false)

  const fetchStats = async () => {
    try {
      const data = await getStats()
      setStats(data)
    } catch (err) {
      console.error('Failed to fetch stats:', err)
    }
  }

  const handleIndexDocuments = async (clearExisting = false) => {
    if (isIndexing) return
    setIsIndexing(true)
    setError(null)
    setIndexingStatus(null)
    try {
      const result = await triggerIndexing(clearExisting)
      setIndexingStatus(result)
      await fetchStats()
    } catch (err) {
      setError(err.message || 'Failed to index documents')
    } finally {
      setIsIndexing(false)
    }
  }

  return (
    <div className="fixed bottom-6 right-6 z-50">

      {/* ── Floating button ────────────────────────────────────────────── */}
      <button
        onClick={() => setShowPanel(!showPanel)}
        title="Admin Panel"
        className="bg-slate-800 hover:bg-slate-700 text-white rounded-full p-3.5 shadow-xl border border-slate-600 transition-colors flex items-center justify-center"
      >
        <Database className="h-5 w-5" />
      </button>

      {/* ── Panel ─────────────────────────────────────────────────────── */}
      {showPanel && (
        <div className="absolute bottom-16 right-0 bg-white rounded-xl shadow-2xl border border-gray-200 w-88 max-h-[600px] overflow-auto"
          style={{ width: '360px' }}>

          {/* Header */}
          <div className="flex items-center justify-between bg-slate-800 text-white px-5 py-3.5 rounded-t-xl">
            <h3 className="text-sm font-semibold flex items-center gap-2">
              <Database className="h-4 w-4 text-blue-400" />
              Admin Panel
            </h3>
            <button
              onClick={() => setShowPanel(false)}
              className="p-1 rounded hover:bg-slate-700 transition-colors"
            >
              <X className="h-4 w-4 text-slate-400" />
            </button>
          </div>

          <div className="p-5 space-y-5">

            {/* ── Stats ─────────────────────────────────────────────── */}
            <div>
              <div className="flex items-center justify-between mb-2.5">
                <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Index Statistics
                </h4>
                <button
                  onClick={fetchStats}
                  disabled={isIndexing}
                  className="text-xs text-blue-600 hover:text-blue-700 font-medium disabled:opacity-50"
                >
                  Refresh
                </button>
              </div>

              {stats ? (
                <div className="bg-gray-50 rounded-lg px-4 py-3 space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Documents indexed</span>
                    <span className="font-semibold text-gray-900">{stats.numberOfDocuments || 0}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Status</span>
                    <span className={`font-semibold ${stats.isIndexing ? 'text-amber-600' : 'text-emerald-600'}`}>
                      {stats.isIndexing ? 'Indexing…' : 'Ready'}
                    </span>
                  </div>
                </div>
              ) : (
                <div className="bg-gray-50 rounded-lg px-4 py-3 text-center">
                  <button
                    onClick={fetchStats}
                    className="text-xs text-blue-600 hover:text-blue-700 font-medium"
                  >
                    Load statistics
                  </button>
                </div>
              )}
            </div>

            {/* ── Actions ───────────────────────────────────────────── */}
            <div>
              <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2.5">
                Actions
              </h4>

              <div className="space-y-2">
                <button
                  onClick={() => handleIndexDocuments(false)}
                  disabled={isIndexing}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  <RefreshCw className={`h-4 w-4 ${isIndexing ? 'animate-spin' : ''}`} />
                  {isIndexing ? 'Indexing…' : 'Update Index'}
                </button>

                <button
                  onClick={() => {
                    if (window.confirm('This will clear the existing index and rebuild from scratch. Continue?')) {
                      handleIndexDocuments(true)
                    }
                  }}
                  disabled={isIndexing}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-amber-500 hover:bg-amber-600 text-white text-sm font-medium rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  <Database className="h-4 w-4" />
                  Rebuild Index
                </button>
              </div>

              <p className="text-xs text-gray-400 mt-2.5">
                <strong className="text-gray-500">Update:</strong> adds new documents ·{' '}
                <strong className="text-gray-500">Rebuild:</strong> clears & re-indexes all
              </p>
            </div>

            {/* ── Indexing in-progress ──────────────────────────────── */}
            {isIndexing && (
              <div className="bg-blue-50 border border-blue-100 rounded-lg px-4 py-3 flex items-start gap-3">
                <RefreshCw className="h-4 w-4 text-blue-600 animate-spin flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-blue-900">Indexing in progress…</p>
                  <p className="text-xs text-blue-600 mt-0.5">
                    This may take a few minutes depending on the number of documents.
                  </p>
                </div>
              </div>
            )}

            {/* ── Success ───────────────────────────────────────────── */}
            {indexingStatus && !isIndexing && (
              <div className="bg-emerald-50 border border-emerald-100 rounded-lg px-4 py-3">
                <div className="flex items-start gap-3">
                  <CheckCircle className="h-4 w-4 text-emerald-600 flex-shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-emerald-900 mb-2">
                      Indexing completed
                    </p>
                    <div className="text-xs text-emerald-700 space-y-1">
                      {[
                        ['Total files', indexingStatus.stats?.total || 0, ''],
                        ['Indexed',     indexingStatus.stats?.indexed || 0, 'text-emerald-600'],
                        ['Failed',      indexingStatus.stats?.failed || 0, 'text-red-600'],
                        ['Skipped',     indexingStatus.stats?.skipped || 0, 'text-gray-500'],
                      ].map(([label, val, cls]) => (
                        <div key={label} className="flex justify-between">
                          <span>{label}</span>
                          <span className={`font-semibold ${cls}`}>{val}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* ── Error ─────────────────────────────────────────────── */}
            {error && !isIndexing && (
              <div className="bg-red-50 border border-red-100 rounded-lg px-4 py-3 flex items-start gap-3">
                <XCircle className="h-4 w-4 text-red-500 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-red-800">Indexing failed</p>
                  <p className="text-xs text-red-600 mt-0.5">{error}</p>
                </div>
              </div>
            )}

            {/* ── Info ──────────────────────────────────────────────── */}
            <div className="bg-slate-50 border border-slate-100 rounded-lg px-4 py-3 flex items-start gap-3">
              <AlertCircle className="h-4 w-4 text-slate-400 flex-shrink-0 mt-0.5" />
              <div className="text-xs text-slate-500">
                <p className="font-medium text-slate-600 mb-1">When to re-index:</p>
                <ul className="list-disc list-inside space-y-0.5">
                  <li>Added new documents</li>
                  <li>Modified existing documents</li>
                  <li>Search results seem outdated</li>
                </ul>
              </div>
            </div>

          </div>
        </div>
      )}
    </div>
  )
}
