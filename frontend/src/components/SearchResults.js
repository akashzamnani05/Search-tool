'use client'

import DocumentCard from './DocumentCard'
import { SearchX, Clock } from 'lucide-react'

export default function SearchResults({ results, query, isLoading, error }) {
  // Loading state
  if (isLoading) {
    return (
      <div className="text-center py-12">
        <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-gray-200 border-t-primary-600"></div>
        <p className="mt-4 text-gray-600">Searching documents...</p>
      </div>
    )
  }
  
  // Error state
  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
        <div className="inline-flex items-center justify-center w-12 h-12 bg-red-100 rounded-full mb-4">
          <SearchX className="h-6 w-6 text-red-600" />
        </div>
        <h3 className="text-lg font-semibold text-red-900 mb-2">
          Search Failed
        </h3>
        <p className="text-sm text-red-700">
          {error}
        </p>
      </div>
    )
  }
  
  // No results state
  if (results && results.hits && results.hits.length === 0 && query) {
    return (
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-8 text-center">
        <div className="inline-flex items-center justify-center w-16 h-16 bg-gray-100 rounded-full mb-4">
          <SearchX className="h-8 w-8 text-gray-400" />
        </div>
        <h3 className="text-lg font-semibold text-gray-900 mb-2">
          No documents found
        </h3>
        <p className="text-sm text-gray-600 mb-4">
          We couldn't find any documents matching "{query}"
        </p>
        <div className="text-left max-w-md mx-auto bg-white rounded-lg p-4 border border-gray-200">
          <p className="text-sm font-medium text-gray-700 mb-2">
            Search tips:
          </p>
          <ul className="text-sm text-gray-600 space-y-1 list-disc list-inside">
            <li>Try different keywords</li>
            <li>Use more general terms</li>
            <li>Check for typos</li>
            <li>Try searching for file names</li>
          </ul>
        </div>
      </div>
    )
  }
  
  // Initial state (no search yet)
  if (!results || !query) {
    return (
      <div className="text-center py-12">
        <div className="inline-flex items-center justify-center w-16 h-16 bg-primary-50 rounded-full mb-4">
          <SearchX className="h-8 w-8 text-primary-600" />
        </div>
        <h3 className="text-lg font-semibold text-gray-900 mb-2">
          Start searching
        </h3>
        <p className="text-sm text-gray-600">
          Enter a query above to search through your documents
        </p>
      </div>
    )
  }
  
  // Results found
  return (
    <div>
      {/* Results header */}
      <div className="mb-6 pb-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">
              Search Results
            </h2>
            <p className="text-sm text-gray-600 mt-1">
              Found {results.estimatedTotalHits || results.hits.length} document
              {results.hits.length !== 1 ? 's' : ''} for "{query}"
            </p>
          </div>
          
          {results.processingTimeMs && (
            <div className="flex items-center space-x-2 text-sm text-gray-500">
              <Clock className="h-4 w-4" />
              <span>{results.processingTimeMs}ms</span>
            </div>
          )}
        </div>
      </div>
      
      {/* Results grid */}
      <div className="grid gap-4">
        {results.hits.map((document) => (
          <DocumentCard 
            key={document.id} 
            document={document}
            query={query}
          />
        ))}
      </div>
      
      {/* Results footer */}
      {results.hits.length > 0 && (
        <div className="mt-8 text-center">
          <p className="text-sm text-gray-500">
            Showing {results.hits.length} of {results.estimatedTotalHits || results.hits.length} results
          </p>
        </div>
      )}
    </div>
  )
}
