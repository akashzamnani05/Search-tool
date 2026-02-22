
'use client'

import { useState } from 'react'
import SearchBar from '@/components/SearchBar'
import SearchResults from '@/components/SearchResults'
import IndexingPanel from '@/components/IndexingPanel'
import { searchDocuments } from '@/lib/api'
import { FileSearch, Zap, Layers } from 'lucide-react'

const PER_PAGE = 10

export default function HomePage() {
  const [results, setResults] = useState(null)
  const [query, setQuery] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState(null)
  const [currentPage, setCurrentPage] = useState(1)

  const fetchPage = async (searchQuery, page) => {
    setIsLoading(true)
    setError(null)
    const offset = (page - 1) * PER_PAGE
    try {
      const data = await searchDocuments(searchQuery, PER_PAGE, offset)
      setResults(data)
    } catch (err) {
      setError(err.message || 'Failed to search documents')
      setResults(null)
    } finally {
      setIsLoading(false)
    }
  }

  const handleSearch = async (searchQuery) => {
    setQuery(searchQuery)
    setCurrentPage(1)
    await fetchPage(searchQuery, 1)
  }

  const handlePageChange = async (page) => {
    setCurrentPage(page)
    await fetchPage(query, page)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const hasQuery = !!query

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">

      {/* ── Header ──────────────────────────────────────────────────────── */}
      <header className="bg-slate-900 sticky top-0 z-40 shadow-lg">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          {hasQuery ? (
            /* Compact header: logo + inline search bar */
            <div className="flex items-center gap-4 py-2.5">
              <div className="flex-shrink-0 flex items-center gap-2">
                <FileSearch className="h-6 w-6 text-blue-400" />
                <span className="text-white font-bold text-base hidden sm:block tracking-tight">
                  DocSearch
                </span>
              </div>
              <div className="flex-1 max-w-2xl">
                <SearchBar onSearch={handleSearch} isLoading={isLoading} compact />
              </div>
            </div>
          ) : (
            /* Full header: just logo */
            <div className="flex items-center gap-2 py-4">
              <FileSearch className="h-7 w-7 text-blue-400" />
              <span className="text-white font-bold text-xl tracking-tight">DocSearch</span>
            </div>
          )}
        </div>
      </header>

      {/* ── Hero (shown only when no query) ─────────────────────────────── */}
      {!hasQuery && (
        <section className="bg-gradient-to-b from-slate-800 to-slate-700 py-20 px-4">
          <div className="max-w-2xl mx-auto text-center">
            <h1 className="text-3xl sm:text-4xl font-extrabold text-white mb-3 leading-tight">
              Find Any Document, Instantly
            </h1>
            <p className="text-slate-400 mb-10 text-base">
              Full-text search across all your files — PDFs, Word docs, spreadsheets, and more.
            </p>
            <SearchBar onSearch={handleSearch} isLoading={isLoading} />
          </div>
        </section>
      )}

      {/* ── Main content ─────────────────────────────────────────────────── */}
      <main className="flex-1">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

          {/* Connection error banner */}
          {error && error.toLowerCase().includes('fetch') && (
            <div className="mb-6 bg-amber-50 border border-amber-200 rounded-lg p-4 flex items-start gap-3">
              <span className="text-amber-600 text-base mt-0.5">⚠</span>
              <p className="text-sm text-amber-800">
                Cannot connect to the API at{' '}
                <code className="bg-amber-100 px-1 py-0.5 rounded text-xs">
                  {process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5001/api'}
                </code>.{' '}
                Make sure the backend server is running.
              </p>
            </div>
          )}

          {/* Results */}
          <SearchResults
            results={results}
            query={query}
            isLoading={isLoading}
            error={error}
            currentPage={currentPage}
            perPage={PER_PAGE}
            onPageChange={handlePageChange}
          />

          {/* Feature cards (no-query state) */}
          {!hasQuery && !isLoading && (
            <div className="mt-10 grid sm:grid-cols-3 gap-5">
              {[
                {
                  icon: <FileSearch className="h-5 w-5 text-blue-600" />,
                  bg: 'bg-blue-50',
                  title: 'Full-Text Search',
                  desc: 'Search through the complete content of all your documents, not just filenames.',
                },
                {
                  icon: <Zap className="h-5 w-5 text-emerald-600" />,
                  bg: 'bg-emerald-50',
                  title: 'Lightning Fast',
                  desc: 'Powered by Meilisearch for instant results with built-in relevance ranking.',
                },
                {
                  icon: <Layers className="h-5 w-5 text-violet-600" />,
                  bg: 'bg-violet-50',
                  title: 'Multiple Formats',
                  desc: 'Supports PDF, Word, Excel, PowerPoint, images, and plain text files.',
                },
              ].map(({ icon, bg, title, desc }) => (
                <div key={title} className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
                  <div className={`w-10 h-10 ${bg} rounded-lg flex items-center justify-center mb-4`}>
                    {icon}
                  </div>
                  <h3 className="text-sm font-semibold text-gray-900 mb-1.5">{title}</h3>
                  <p className="text-xs text-gray-500 leading-relaxed">{desc}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>

      {/* Floating admin panel */}
      <IndexingPanel />

      {/* Footer */}
      <footer className="border-t border-gray-200 bg-white">
        <div className="max-w-7xl mx-auto px-4 py-4 text-center text-xs text-gray-400">
          Powered by Meilisearch · Flask · Next.js
        </div>
      </footer>
    </div>
  )
}
