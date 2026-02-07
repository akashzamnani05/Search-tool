
'use client'

import { useState } from 'react'
import SearchBar from '@/components/SearchBar'
import SearchResults from '@/components/SearchResults'
import IndexingPanel from '@/components/IndexingPanel'
import { searchDocuments } from '@/lib/api'
import { RefreshCw, AlertCircle } from 'lucide-react'

export default function HomePage() {
  const [results, setResults] = useState(null)
  const [query, setQuery] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState(null)
  
  const handleSearch = async (searchQuery) => {
    setIsLoading(true)
    setError(null)
    setQuery(searchQuery)
    
    try {
      const data = await searchDocuments(searchQuery)
      setResults(data)
    } catch (err) {
      setError(err.message || 'Failed to search documents')
      setResults(null)
    } finally {
      setIsLoading(false)
    }
  }
  
  const handleRetry = () => {
    if (query) {
      handleSearch(query)
    }
  }
  
  return (
    <>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <SearchBar 
            onSearch={handleSearch}
            isLoading={isLoading}
          />
        </div>
        
        {error && error.includes('fetch') && (
          <div className="mb-6 bg-amber-50 border border-amber-200 rounded-lg p-4">
            <div className="flex items-start space-x-3">
              <AlertCircle className="h-5 w-5 text-amber-600 mt-0.5 flex-shrink-0" />
              <div className="flex-1">
                <h3 className="text-sm font-medium text-amber-900 mb-1">
                  Cannot connect to API
                </h3>
                <p className="text-sm text-amber-700 mb-2">
                  Make sure the backend server is running at{' '}
                  <code className="bg-amber-100 px-1 py-0.5 rounded">
                    {process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5001/api'}
                  </code>
                </p>
                <button
                  onClick={handleRetry}
                  className="flex items-center space-x-2 text-sm font-medium text-amber-700 hover:text-amber-800"
                >
                  <RefreshCw className="h-4 w-4" />
                  <span>Retry connection</span>
                </button>
              </div>
            </div>
          </div>
        )}
        
        <div>
          <SearchResults 
            results={results}
            query={query}
            isLoading={isLoading}
            error={error}
          />
        </div>
        
        {!query && !isLoading && (
          <div className="mt-12 grid md:grid-cols-3 gap-6">
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mb-4">
                <span className="text-2xl">🔍</span>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Full-Text Search
              </h3>
              <p className="text-sm text-gray-600">
                Search through the complete content of all your documents, not just filenames
              </p>
            </div>
            
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mb-4">
                <span className="text-2xl">⚡</span>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Lightning Fast
              </h3>
              <p className="text-sm text-gray-600">
                Powered by Meilisearch for instant results with relevance ranking
              </p>
            </div>
            
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mb-4">
                <span className="text-2xl">📁</span>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Multiple Formats
              </h3>
              <p className="text-sm text-gray-600">
                Supports PDF, Word, Excel, PowerPoint, and text files from Google Drive
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Admin Panel - Floating Button */}
      <IndexingPanel />
    </>
  )
}
