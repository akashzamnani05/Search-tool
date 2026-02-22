'use client'

import DocumentCard from './DocumentCard'
import { SearchX, Clock, ChevronLeft, ChevronRight, Loader2 } from 'lucide-react'

// ── Pagination helpers ────────────────────────────────────────────────────────
function getPageNumbers(currentPage, totalPages) {
  const delta = 2
  const pages = []

  for (let i = 1; i <= totalPages; i++) {
    if (i === 1 || i === totalPages || (i >= currentPage - delta && i <= currentPage + delta)) {
      pages.push(i)
    }
  }

  const result = []
  let prev = 0
  for (const page of pages) {
    if (page - prev > 1) result.push('...')
    result.push(page)
    prev = page
  }
  return result
}

function Pagination({ currentPage, totalPages, onPageChange }) {
  if (totalPages <= 1) return null

  const pageNumbers = getPageNumbers(currentPage, totalPages)

  return (
    <div className="mt-8 flex items-center justify-center gap-1">
      <button
        onClick={() => onPageChange(currentPage - 1)}
        disabled={currentPage === 1}
        className="flex items-center gap-1 px-3 py-2 rounded-md text-sm font-medium text-gray-600 hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
      >
        <ChevronLeft className="h-4 w-4" />
        Prev
      </button>

      {pageNumbers.map((item, idx) =>
        item === '...' ? (
          <span key={`e-${idx}`} className="px-3 py-2 text-sm text-gray-400">
            …
          </span>
        ) : (
          <button
            key={item}
            onClick={() => onPageChange(item)}
            className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
              item === currentPage
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            {item}
          </button>
        )
      )}

      <button
        onClick={() => onPageChange(currentPage + 1)}
        disabled={currentPage === totalPages}
        className="flex items-center gap-1 px-3 py-2 rounded-md text-sm font-medium text-gray-600 hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
      >
        Next
        <ChevronRight className="h-4 w-4" />
      </button>
    </div>
  )
}

// ── Main component ────────────────────────────────────────────────────────────
export default function SearchResults({ results, query, isLoading, error, currentPage, perPage, onPageChange }) {

  /* Loading */
  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-3 text-gray-500">
        <Loader2 className="h-9 w-9 animate-spin text-blue-600" />
        <p className="text-sm">Searching documents…</p>
      </div>
    )
  }

  /* Error */
  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-3 text-center">
        <SearchX className="h-10 w-10 text-red-300" />
        <p className="text-sm font-semibold text-red-700">Search failed</p>
        <p className="text-xs text-gray-400">{error}</p>
      </div>
    )
  }

  /* No results */
  if (results && results.hits && results.hits.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-3 text-center">
        <SearchX className="h-12 w-12 text-gray-200" />
        <p className="text-base font-semibold text-gray-700">No documents found</p>
        <p className="text-sm text-gray-400">
          No results for <span className="font-medium text-gray-600">"{query}"</span>.
          Try different keywords or check for typos.
        </p>
      </div>
    )
  }

  /* No query yet */
  if (!results || !query) return null

  const totalHits   = results.estimatedTotalHits || results.hits.length
  const totalPages  = perPage ? Math.ceil(totalHits / perPage) : 1
  const showingFrom = perPage ? (currentPage - 1) * perPage + 1 : 1
  const showingTo   = perPage ? Math.min(currentPage * perPage, totalHits) : results.hits.length

  return (
    <div>
      {/* Results header */}
      <div className="flex items-center justify-between mb-5">
        <p className="text-sm text-gray-500">
          Showing{' '}
          <span className="font-semibold text-gray-800">{showingFrom}–{showingTo}</span>
          {' '}of{' '}
          <span className="font-semibold text-gray-800">{totalHits}</span>
          {' '}results for{' '}
          <span className="font-semibold text-gray-900">"{query}"</span>
        </p>

        <div className="flex items-center gap-3 text-xs text-gray-400">
          {results.processingTimeMs !== undefined && (
            <span className="flex items-center gap-1">
              <Clock className="h-3.5 w-3.5" />
              {results.processingTimeMs} ms
            </span>
          )}
          {totalPages > 1 && (
            <span>Page {currentPage} of {totalPages}</span>
          )}
        </div>
      </div>

      {/* Document cards */}
      <div className="grid gap-3">
        {results.hits.map((document) => (
          <DocumentCard key={document.id} document={document} query={query} />
        ))}
      </div>

      {/* Pagination */}
      <Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={onPageChange} />
    </div>
  )
}
