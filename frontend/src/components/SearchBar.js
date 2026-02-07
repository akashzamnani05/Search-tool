'use client'

import { useState } from 'react'
import { Search, X } from 'lucide-react'

export default function SearchBar({ onSearch, isLoading }) {
  const [query, setQuery] = useState('')
  
  const handleSubmit = (e) => {
    e.preventDefault()
    if (query.trim() && !isLoading) {
      onSearch(query.trim())
    }
  }
  
  const handleClear = () => {
    setQuery('')
  }
  
  return (
    <form onSubmit={handleSubmit} className="w-full">
      <div className="relative">
        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
          <Search className="h-5 w-5 text-gray-400" />
        </div>
        
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search documents... (e.g., 'quarterly report', 'project proposal')"
          className="w-full pl-12 pr-24 py-4 text-lg border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-all duration-200 outline-none"
          disabled={isLoading}
        />
        
        <div className="absolute inset-y-0 right-0 flex items-center space-x-2 pr-2">
          {query && (
            <button
              type="button"
              onClick={handleClear}
              className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
              disabled={isLoading}
            >
              <X className="h-5 w-5" />
            </button>
          )}
          
          <button
            type="submit"
            disabled={!query.trim() || isLoading}
            className="px-6 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors duration-200 font-medium"
          >
            {isLoading ? 'Searching...' : 'Search'}
          </button>
        </div>
      </div>
      
      {query.length > 0 && query.length < 2 && (
        <p className="mt-2 text-sm text-amber-600">
          Please enter at least 2 characters to search
        </p>
      )}
    </form>
  )
}
