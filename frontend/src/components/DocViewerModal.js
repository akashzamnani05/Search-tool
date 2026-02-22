'use client'

import { useEffect, useRef, useState } from 'react'
import { X, Loader2, AlertCircle } from 'lucide-react'
import { getDocumentProxyUrl } from '@/lib/api'

export default function DocViewerModal({ isOpen, onClose, documentId, documentName }) {
  const containerRef = useRef(null)
  const [status, setStatus] = useState('idle') // idle | loading | done | error
  const [errorMsg, setErrorMsg] = useState('')

  useEffect(() => {
    if (!isOpen || !documentId) return

    setStatus('loading')
    setErrorMsg('')

    // Clear any previous render
    if (containerRef.current) {
      containerRef.current.innerHTML = ''
    }

    const proxyUrl = getDocumentProxyUrl(documentId)

    ;(async () => {
      try {
        // Fetch the file as a blob
        const response = await fetch(proxyUrl)
        if (!response.ok) throw new Error(`Failed to fetch document (${response.status})`)
        const blob = await response.blob()

        // Dynamically import docx-preview (client-side only, avoids SSR issues)
        const { renderAsync } = await import('docx-preview')

        if (!containerRef.current) return

        await renderAsync(blob, containerRef.current, null, {
          className: 'docx-render',
          inWrapper: true,
          ignoreWidth: false,
          ignoreHeight: false,
          breakPages: true,
          trimXmlDeclaration: true,
        })

        setStatus('done')
      } catch (err) {
        console.error('DocViewer error:', err)
        setErrorMsg(err.message || 'Could not render document')
        setStatus('error')
      }
    })()

    // Cleanup on close
    return () => {
      if (containerRef.current) {
        containerRef.current.innerHTML = ''
      }
    }
  }, [isOpen, documentId])

  // Close on Escape key
  useEffect(() => {
    if (!isOpen) return
    const onKey = (e) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [isOpen, onClose])

  if (!isOpen) return null

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col"
      style={{ background: 'rgba(0,0,0,0.6)' }}
    >
      {/* Header bar */}
      <div className="flex items-center justify-between bg-white border-b border-gray-200 px-4 py-3 flex-shrink-0">
        <span className="text-sm font-medium text-gray-800 truncate max-w-lg">
          {documentName}
        </span>
        <button
          onClick={onClose}
          className="ml-4 flex-shrink-0 p-1.5 rounded-md text-gray-500 hover:bg-gray-100 transition-colors"
          aria-label="Close"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      {/* Content area */}
      <div className="flex-1 overflow-auto bg-gray-100">
        {/* Loading state */}
        {status === 'loading' && (
          <div className="flex flex-col items-center justify-center h-full gap-3 text-gray-500">
            <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
            <p className="text-sm">Loading document...</p>
          </div>
        )}

        {/* Error state */}
        {status === 'error' && (
          <div className="flex flex-col items-center justify-center h-full gap-3 text-red-600">
            <AlertCircle className="h-8 w-8" />
            <p className="text-sm font-medium">Could not preview this document</p>
            <p className="text-xs text-gray-500">{errorMsg}</p>
          </div>
        )}

        {/* docx-preview renders here */}
        <div
          ref={containerRef}
          className="docx-container mx-auto"
          style={{ display: status === 'done' ? 'block' : 'none' }}
        />
      </div>
    </div>
  )
}
