'use client'

import { Suspense, useEffect, useRef, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { getDocumentProxyUrl } from '@/lib/api'
import { Loader2, AlertCircle } from 'lucide-react'

function DocViewer() {
  const searchParams = useSearchParams()
  const id = searchParams.get('id')
  const name = searchParams.get('name')
  const containerRef = useRef(null)
  const [status, setStatus] = useState('loading')
  const [errorMsg, setErrorMsg] = useState('')

  useEffect(() => {
    if (!id) {
      setStatus('error')
      setErrorMsg('No document ID provided.')
      return
    }

    if (name) document.title = name

    const proxyUrl = getDocumentProxyUrl(id)

    ;(async () => {
      try {
        const response = await fetch(proxyUrl)
        if (!response.ok) throw new Error(`Could not fetch document (HTTP ${response.status})`)
        const blob = await response.blob()

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
        console.error('Viewer error:', err)
        setErrorMsg(err.message || 'Unknown error')
        setStatus('error')
      }
    })()
  }, [id, name])

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col">
      {/* Title bar */}
      <div className="bg-white border-b border-gray-200 px-4 py-3 flex items-center gap-3 sticky top-0 z-10">
        <span className="text-sm font-medium text-gray-800 truncate">{name || 'Document Viewer'}</span>
      </div>

      {/* Content */}
      <div className="flex-1 flex flex-col items-center py-6 px-4">
        {status === 'loading' && (
          <div className="flex flex-col items-center justify-center gap-3 mt-24 text-gray-500">
            <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
            <p className="text-sm">Loading document...</p>
          </div>
        )}

        {status === 'error' && (
          <div className="flex flex-col items-center justify-center gap-3 mt-24 text-red-600">
            <AlertCircle className="h-8 w-8" />
            <p className="text-sm font-medium">Could not preview this document</p>
            <p className="text-xs text-gray-500">{errorMsg}</p>
          </div>
        )}

        <div
          ref={containerRef}
          className="w-full max-w-4xl bg-white shadow-sm rounded"
          style={{ display: status === 'done' ? 'block' : 'none' }}
        />
      </div>
    </div>
  )
}

export default function ViewerPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    }>
      <DocViewer />
    </Suspense>
  )
}
