'use client'

import { useState } from 'react'
import { RefreshCw, Database, CheckCircle, XCircle, AlertCircle } from 'lucide-react'
import { triggerIndexing, getStats } from '@/lib/api'

export default function IndexingPanel() {
  const [isIndexing, setIsIndexing] = useState(false)
  const [indexingStatus, setIndexingStatus] = useState(null)
  const [error, setError] = useState(null)
  const [stats, setStats] = useState(null)
  const [showPanel, setShowPanel] = useState(false)

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
      
      // Refresh stats after indexing
      await fetchStats()
    } catch (err) {
      setError(err.message || 'Failed to index documents')
    } finally {
      setIsIndexing(false)
    }
  }

  return (
    <div className="fixed bottom-6 right-6 z-50">
      {/* Floating Action Button */}
      <button
        onClick={() => setShowPanel(!showPanel)}
        className="bg-primary-600 hover:bg-primary-700 text-white rounded-full p-4 shadow-lg transition-all duration-200 flex items-center justify-center"
        title="Admin Panel"
      >
        <Database className="h-6 w-6" />
      </button>

      {/* Admin Panel */}
      {showPanel && (
        <div className="absolute bottom-20 right-0 bg-white rounded-lg shadow-2xl border border-gray-200 w-96 max-h-[600px] overflow-auto">
          {/* Header */}
          <div className="bg-primary-600 text-white px-6 py-4 rounded-t-lg">
            <h3 className="text-lg font-semibold flex items-center">
              <Database className="h-5 w-5 mr-2" />
              Admin Panel
            </h3>
          </div>

          {/* Content */}
          <div className="p-6 space-y-6">
            {/* Index Statistics */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <h4 className="font-semibold text-gray-900">Index Statistics</h4>
                <button
                  onClick={fetchStats}
                  disabled={isIndexing}
                  className="text-primary-600 hover:text-primary-700 text-sm"
                >
                  Refresh
                </button>
              </div>
              
              {stats ? (
                <div className="bg-gray-50 rounded-lg p-4 space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Total Documents:</span>
                    <span className="font-semibold text-gray-900">
                      {stats.numberOfDocuments || 0}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Status:</span>
                    <span className={`font-semibold ${stats.isIndexing ? 'text-amber-600' : 'text-green-600'}`}>
                      {stats.isIndexing ? 'Indexing...' : 'Ready'}
                    </span>
                  </div>
                </div>
              ) : (
                <div className="bg-gray-50 rounded-lg p-4 text-center">
                  <button
                    onClick={fetchStats}
                    className="text-primary-600 hover:text-primary-700 text-sm font-medium"
                  >
                    Load Statistics
                  </button>
                </div>
              )}
            </div>

            {/* Indexing Actions */}
            <div>
              <h4 className="font-semibold text-gray-900 mb-3">Actions</h4>
              
              <div className="space-y-3">
                {/* Update Index Button */}
                <button
                  onClick={() => handleIndexDocuments(false)}
                  disabled={isIndexing}
                  className="w-full flex items-center justify-center space-x-2 px-4 py-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
                >
                  {isIndexing ? (
                    <>
                      <RefreshCw className="h-5 w-5 animate-spin" />
                      <span>Indexing...</span>
                    </>
                  ) : (
                    <>
                      <RefreshCw className="h-5 w-5" />
                      <span>Update Index</span>
                    </>
                  )}
                </button>

                {/* Rebuild Index Button */}
                <button
                  onClick={() => {
                    if (window.confirm('This will clear the existing index and rebuild from scratch. Continue?')) {
                      handleIndexDocuments(true)
                    }
                  }}
                  disabled={isIndexing}
                  className="w-full flex items-center justify-center space-x-2 px-4 py-3 bg-amber-600 text-white rounded-lg hover:bg-amber-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
                >
                  <Database className="h-5 w-5" />
                  <span>Rebuild Index</span>
                </button>
              </div>

              <p className="text-xs text-gray-500 mt-3">
                <strong>Update:</strong> Adds new documents<br/>
                <strong>Rebuild:</strong> Clears & re-indexes all
              </p>
            </div>

            {/* Indexing Status */}
            {isIndexing && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-center space-x-3">
                  <RefreshCw className="h-5 w-5 text-blue-600 animate-spin" />
                  <div>
                    <p className="text-sm font-medium text-blue-900">
                      Indexing in progress...
                    </p>
                    <p className="text-xs text-blue-700 mt-1">
                      This may take a few minutes depending on the number of documents.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Success Message */}
            {indexingStatus && !isIndexing && (
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <div className="flex items-start space-x-3">
                  <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-green-900 mb-2">
                      Indexing completed successfully!
                    </p>
                    <div className="text-xs text-green-700 space-y-1">
                      <div className="flex justify-between">
                        <span>Total files:</span>
                        <span className="font-semibold">{indexingStatus.stats?.total || 0}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Indexed:</span>
                        <span className="font-semibold text-green-600">{indexingStatus.stats?.indexed || 0}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Failed:</span>
                        <span className="font-semibold text-red-600">{indexingStatus.stats?.failed || 0}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Skipped:</span>
                        <span className="font-semibold text-gray-600">{indexingStatus.stats?.skipped || 0}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Error Message */}
            {error && !isIndexing && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <div className="flex items-start space-x-3">
                  <XCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-red-900 mb-1">
                      Indexing failed
                    </p>
                    <p className="text-xs text-red-700">
                      {error}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Info */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-start space-x-3">
                <AlertCircle className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
                <div className="text-xs text-blue-700">
                  <p className="font-medium mb-1">When to re-index:</p>
                  <ul className="list-disc list-inside space-y-1">
                    <li>Added new documents to Drive</li>
                    <li>Modified existing documents</li>
                    <li>Changed Drive folder</li>
                    <li>Search results seem outdated</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
