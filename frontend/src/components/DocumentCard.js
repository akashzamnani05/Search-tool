'use client'

import { FileText, Download, ExternalLink, Calendar, Hash, MapPin } from 'lucide-react'
import { getDocumentViewUrl, getDocumentDownloadUrl, findPageNumber } from '@/lib/api'
import { useState } from 'react'

export default function DocumentCard({ document, query }) {
  const [isOpening, setIsOpening] = useState(false)
  
  const handleView = (viewerType = 'pdfjs') => {
    setIsOpening(true)
    
    const fileName = document.name.toLowerCase()
    const isPDF = fileName.endsWith('.pdf')
    
    // For PDFs, open with selected viewer
    if (isPDF) {
      const pageNumber = findPageNumber(document, query)
      const url = getDocumentViewUrl(document.id, query, pageNumber, document.name, viewerType)
      window.open(url, '_blank')
    } else {
      // For DOCX/DOC and other files
      const url = getDocumentViewUrl(document.id, null, null, document.name)
      window.open(url, '_blank')
    }
    
    setTimeout(() => setIsOpening(false), 1000)
  }
  
  const handleDownload = (e) => {
    e.stopPropagation()
    const link = window.document.createElement('a')
    link.href = getDocumentDownloadUrl(document.id)
    link.download = document.name
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }
  
  // Format file size
  const formatSize = (bytes) => {
    if (!bytes) return 'Unknown size'
    const kb = bytes / 1024
    const mb = kb / 1024
    if (mb >= 1) return `${mb.toFixed(2)} MB`
    if (kb >= 1) return `${kb.toFixed(2)} KB`
    return `${bytes} bytes`
  }
  
  // Format date
  const formatDate = (dateString) => {
    if (!dateString) return 'Unknown'
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric' 
    })
  }
  
  // Get page number where query was found (PDFs only)
  const foundOnPage = query && document.name.toLowerCase().endsWith('.pdf') 
    ? findPageNumber(document, query) 
    : null
  
  // Check if document is PDF
  const isPDF = document.name.toLowerCase().endsWith('.pdf')
  
  return (
    <div 
      onClick={() => handleView()}
      className="bg-white rounded-lg border border-gray-200 shadow-sm hover:shadow-md transition-shadow cursor-pointer p-6"
    >
      <div className="flex items-start space-x-4">
        {/* Icon */}
        <div className="flex-shrink-0">
          <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
            <FileText className="h-6 w-6 text-blue-600" />
          </div>
        </div>
        
        {/* Content */}
        <div className="flex-1 min-w-0">
          {/* Title */}
          <h3 className="text-lg font-semibold text-gray-900 mb-1 truncate">
            {document.name || document.title}
          </h3>
          
          {/* Metadata */}
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-gray-600 mb-3">
            {document.form_no && (
              <div className="flex items-center space-x-1">
                <Hash className="h-4 w-4" />
                <span>{document.form_no}</span>
              </div>
            )}
            
            {document.metadata?.form_type && (
              <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded-md text-xs font-medium">
                {document.metadata.form_type}
              </span>
            )}
            
            {document.metadata?.department && (
              <span className="px-2 py-1 bg-green-100 text-green-700 rounded-md text-xs font-medium">
                {document.metadata.department}
              </span>
            )}
            
            {/* Page number indicator */}
            {foundOnPage && (
              <div className="flex items-center space-x-1 px-2 py-1 bg-amber-100 text-amber-700 rounded-md text-xs font-medium">
                <MapPin className="h-3 w-3" />
                <span>Page {foundOnPage}</span>
              </div>
            )}
            
            {document.modifiedTime && (
              <div className="flex items-center space-x-1">
                <Calendar className="h-4 w-4" />
                <span>{formatDate(document.modifiedTime)}</span>
              </div>
            )}
          </div>
          
          {/* Content preview */}
          {document._formatted?.content && (
            <div className="text-sm text-gray-700 mb-3">
              <p className="line-clamp-2" dangerouslySetInnerHTML={{ 
                __html: document._formatted.content 
              }} />
            </div>
          )}
          
          {/* Footer */}
          <div className="flex items-center justify-between">
            <div className="text-xs text-gray-500">
              {formatSize(parseInt(document.size))}
            </div>
            
            <div className="flex items-center space-x-2">
              {/* View with PDF.js */}
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  handleView('pdfjs')
                }}
                disabled={isOpening}
                className="flex items-center space-x-1 px-3 py-1.5 text-sm font-medium text-blue-600 hover:bg-blue-50 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ExternalLink className="h-4 w-4" />
                <span>{isOpening ? 'Opening...' : 'View'}</span>
              </button>
              
              {/* View with Google Docs (for PDFs) */}
              {isPDF && (
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    handleView('google')
                  }}
                  disabled={isOpening}
                  className="flex items-center space-x-1 px-3 py-1.5 text-sm font-medium text-purple-600 hover:bg-purple-50 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <ExternalLink className="h-4 w-4" />
                  <span>Google</span>
                </button>
              )}
              
              <button
                onClick={handleDownload}
                className="flex items-center space-x-1 px-3 py-1.5 text-sm font-medium text-gray-600 hover:bg-gray-50 rounded-md transition-colors"
              >
                <Download className="h-4 w-4" />
                <span>Download</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}