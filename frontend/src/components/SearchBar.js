'use client'

import { useState } from 'react'
import { Search, X, Loader2 } from 'lucide-react'

export default function SearchBar({ onSearch, isLoading, compact = false }) {
  const [query, setQuery] = useState('')

  const handleSubmit = (e) => {
    e.preventDefault()
    if (query.trim() && !isLoading) {
      onSearch(query.trim())
    }
  }

  const handleClear = () => setQuery('')

  if (compact) {
    return (
      <form onSubmit={handleSubmit} className="w-full">
        <div className="relative flex items-center">
          <div className="absolute left-3 inset-y-0 flex items-center pointer-events-none">
            {isLoading
              ? <Loader2 className="h-4 w-4 text-slate-400 animate-spin" />
              : <Search className="h-4 w-4 text-slate-400" />
            }
          </div>
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search documents..."
            disabled={isLoading}
            className="w-full pl-9 pr-24 py-2 text-sm rounded-md bg-slate-700 border border-slate-600 text-white placeholder-slate-400 outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-400 transition-all"
          />
          <div className="absolute right-1.5 inset-y-0 flex items-center gap-1">
            {query && (
              <button
                type="button"
                onClick={handleClear}
                disabled={isLoading}
                className="p-1 rounded text-slate-400 hover:text-white transition-colors"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
            <button
              type="submit"
              disabled={!query.trim() || isLoading}
              className="px-3 py-1 rounded text-xs font-semibold bg-blue-600 hover:bg-blue-500 text-white disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              Search
            </button>
          </div>
        </div>
      </form>
    )
  }

  /* ── Hero (full-size) variant ── */
  return (
    <form onSubmit={handleSubmit} className="w-full">
      <div className="relative flex items-center">
        <div className="absolute left-4 inset-y-0 flex items-center pointer-events-none">
          {isLoading
            ? <Loader2 className="h-5 w-5 text-gray-400 animate-spin" />
            : <Search className="h-5 w-5 text-gray-400" />
          }
        </div>
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder='Search — e.g. "safety checklist", "certificate of registry"'
          disabled={isLoading}
          className="w-full pl-12 pr-32 py-4 text-base rounded-xl bg-white border border-gray-200 text-gray-900 placeholder-gray-400 shadow-lg outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all"
        />
        <div className="absolute right-2 inset-y-0 flex items-center gap-1.5">
          {query && (
            <button
              type="button"
              onClick={handleClear}
              disabled={isLoading}
              className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          )}
          <button
            type="submit"
            disabled={!query.trim() || isLoading}
            className="px-5 py-2.5 rounded-lg text-sm font-semibold bg-blue-600 hover:bg-blue-700 text-white shadow-sm disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            {isLoading ? 'Searching…' : 'Search'}
          </button>
        </div>
      </div>
    </form>
  )
}
