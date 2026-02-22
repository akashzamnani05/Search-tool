'use client'

import { FileText, Download, ExternalLink, Calendar, Hash, FileImage, FileSpreadsheet, AlignLeft } from 'lucide-react'
import { getDocumentViewUrl, getDocumentDownloadUrl, findPageNumber } from '@/lib/api'
import { useState } from 'react'

// ── File type config ──────────────────────────────────────────────────────────
const FILE_TYPES = {
  pdf:  { label: 'PDF',  border: 'border-l-red-500',    badge: 'bg-red-100 text-red-700',    icon: <FileText className="h-5 w-5 text-red-600" /> },
  docx: { label: 'DOCX', border: 'border-l-blue-500',   badge: 'bg-blue-100 text-blue-700',  icon: <FileText className="h-5 w-5 text-blue-600" /> },
  doc:  { label: 'DOC',  border: 'border-l-blue-500',   badge: 'bg-blue-100 text-blue-700',  icon: <FileText className="h-5 w-5 text-blue-600" /> },
  xlsx: { label: 'XLSX', border: 'border-l-green-500',  badge: 'bg-green-100 text-green-700', icon: <FileSpreadsheet className="h-5 w-5 text-green-600" /> },
  xls:  { label: 'XLS',  border: 'border-l-green-500',  badge: 'bg-green-100 text-green-700', icon: <FileSpreadsheet className="h-5 w-5 text-green-600" /> },
  pptx: { label: 'PPTX', border: 'border-l-orange-500', badge: 'bg-orange-100 text-orange-700', icon: <FileText className="h-5 w-5 text-orange-600" /> },
  ppt:  { label: 'PPT',  border: 'border-l-orange-500', badge: 'bg-orange-100 text-orange-700', icon: <FileText className="h-5 w-5 text-orange-600" /> },
  txt:  { label: 'TXT',  border: 'border-l-gray-400',   badge: 'bg-gray-100 text-gray-600',  icon: <AlignLeft className="h-5 w-5 text-gray-500" /> },
  jpg:  { label: 'IMG',  border: 'border-l-purple-500', badge: 'bg-purple-100 text-purple-700', icon: <FileImage className="h-5 w-5 text-purple-600" /> },
  jpeg: { label: 'IMG',  border: 'border-l-purple-500', badge: 'bg-purple-100 text-purple-700', icon: <FileImage className="h-5 w-5 text-purple-600" /> },
  png:  { label: 'IMG',  border: 'border-l-purple-500', badge: 'bg-purple-100 text-purple-700', icon: <FileImage className="h-5 w-5 text-purple-600" /> },
  gif:  { label: 'IMG',  border: 'border-l-purple-500', badge: 'bg-purple-100 text-purple-700', icon: <FileImage className="h-5 w-5 text-purple-600" /> },
  bmp:  { label: 'IMG',  border: 'border-l-purple-500', badge: 'bg-purple-100 text-purple-700', icon: <FileImage className="h-5 w-5 text-purple-600" /> },
}

const DEFAULT_TYPE = {
  label: 'FILE', border: 'border-l-gray-400', badge: 'bg-gray-100 text-gray-600',
  icon: <FileText className="h-5 w-5 text-gray-500" />,
}

// ── Source table config ───────────────────────────────────────────────────────
const getSource = (id = '') => {
  if (id.startsWith('FORMS_MASTER'))       return { label: 'Forms',        cls: 'bg-sky-100 text-sky-700' }
  if (id.startsWith('VESSEL_CERTIFICATES')) return { label: 'Vessel Certs', cls: 'bg-teal-100 text-teal-700' }
  if (id.startsWith('SurveyCertificates')) return { label: 'Survey Certs', cls: 'bg-violet-100 text-violet-700' }
  return null
}

// ── Helpers ───────────────────────────────────────────────────────────────────
const hasEm = (str) => typeof str === 'string' && str.includes('<em>')

export default function DocumentCard({ document, query }) {
  const [isOpening, setIsOpening] = useState(false)

  const ext        = (document.name || '').split('.').pop().toLowerCase()
  const fileType   = FILE_TYPES[ext] || DEFAULT_TYPE
  const source     = getSource(document.id || '')
  const isPDF      = ext === 'pdf'
  const isDocx     = ext === 'docx' || ext === 'doc'
  const foundOnPage = isPDF ? findPageNumber(document, query) : null

  // Show title row only if it's meaningfully different from the filename
  const titleDiffers = document.title &&
    document.title.trim().toLowerCase() !== (document.name || '').trim().toLowerCase()

  // Which fields had a match?
  const matchIn = []
  if (hasEm(document._formatted?.name))    matchIn.push('Filename')
  if (hasEm(document._formatted?.title))   matchIn.push('Title')
  if (hasEm(document._formatted?.form_no)) matchIn.push('Form No')
  if (hasEm(document._formatted?.content)) matchIn.push(foundOnPage ? `Content · Page ${foundOnPage}` : 'Content')

  const handleView = () => {
    if (isDocx) {
      const params = new URLSearchParams({ id: document.id, name: document.name })
      window.open(`/viewer?${params.toString()}`, '_blank')
      return
    }
    setIsOpening(true)
    if (isPDF) {
      const pageNumber = findPageNumber(document, query)
      const url = getDocumentViewUrl(document.id, query, pageNumber, document.name, 'pdfjs')
      window.open(url, '_blank')
    } else {
      window.open(getDocumentViewUrl(document.id, null, null, document.name), '_blank')
    }
    setTimeout(() => setIsOpening(false), 1000)
  }

  const handleDownload = (e) => {
    e.stopPropagation()
    const link = window.document.createElement('a')
    link.href = getDocumentDownloadUrl(document.id)
    link.download = document.name
    window.document.body.appendChild(link)
    link.click()
    window.document.body.removeChild(link)
  }

  const formatSize = (bytes) => {
    if (!bytes || isNaN(bytes)) return ''
    const kb = bytes / 1024, mb = kb / 1024
    if (mb >= 1) return `${mb.toFixed(1)} MB`
    if (kb >= 1) return `${kb.toFixed(0)} KB`
    return `${bytes} B`
  }

  const formatDate = (ds) => {
    if (!ds) return ''
    return new Date(ds).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
  }

  return (
    <div
      onClick={handleView}
      className={`bg-white rounded-lg border border-gray-200 border-l-4 ${fileType.border} shadow-sm hover:shadow-md transition-all cursor-pointer`}
    >
      {/* ── Top row: icon + name + badges ──────────────────────────────────── */}
      <div className="flex items-start gap-3 px-4 pt-4 pb-2">
        {/* File icon */}
        <div className="flex-shrink-0 mt-0.5">
          {fileType.icon}
        </div>

        {/* Filename — no truncation so similar names are distinguishable */}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-gray-900 break-words leading-snug">
            {document._formatted?.name
              ? <span className="search-snippet" dangerouslySetInnerHTML={{ __html: document._formatted.name }} />
              : document.name}
          </p>

          {/* Title — only if different from filename */}
          {titleDiffers && (
            <p className="text-xs text-gray-500 mt-0.5 break-words">
              {document._formatted?.title
                ? <span className="search-snippet" dangerouslySetInnerHTML={{ __html: document._formatted.title }} />
                : document.title}
            </p>
          )}
        </div>

        {/* Badges: file type + source table */}
        <div className="flex-shrink-0 flex items-center gap-1.5 ml-2">
          <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${fileType.badge}`}>
            {fileType.label}
          </span>
          {source && (
            <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded ${source.cls}`}>
              {source.label}
            </span>
          )}
        </div>
      </div>

      {/* ── Metadata row ───────────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 px-4 pb-2 text-xs text-gray-500">
        {document.form_no && (
          <span className="flex items-center gap-1">
            <Hash className="h-3 w-3" />
            <span className="search-snippet font-medium text-gray-700"
              dangerouslySetInnerHTML={{ __html: document._formatted?.form_no || document.form_no }} />
          </span>
        )}
        {document.metadata?.department && (
          <span className="px-1.5 py-0.5 bg-gray-100 rounded text-gray-600">
            {document.metadata.department}
          </span>
        )}
        {document.metadata?.form_type && (
          <span className="px-1.5 py-0.5 bg-gray-100 rounded text-gray-600">
            {document.metadata.form_type}
          </span>
        )}
        {document.modifiedTime && (
          <span className="flex items-center gap-1">
            <Calendar className="h-3 w-3" />
            {formatDate(document.modifiedTime)}
          </span>
        )}
      </div>

      {/* ── Content snippet ─────────────────────────────────────────────────── */}
      {document._formatted?.content && (
        <div className="mx-4 mb-2 px-3 py-2 bg-gray-50 border border-gray-100 rounded text-xs text-gray-700 leading-relaxed search-snippet"
          dangerouslySetInnerHTML={{ __html: document._formatted.content }}
        />
      )}

      {/* ── Match locations ──────────────────────────────────────────────────── */}
      {matchIn.length > 0 && (
        <div className="flex flex-wrap items-center gap-1.5 px-4 pb-2">
          <span className="text-[10px] text-gray-400 font-medium">Match in:</span>
          {matchIn.map((loc) => (
            <span key={loc} className="text-[10px] px-2 py-0.5 bg-amber-50 text-amber-700 border border-amber-200 rounded-full font-medium">
              {loc}
            </span>
          ))}
        </div>
      )}

      {/* ── Footer: size + actions ───────────────────────────────────────────── */}
      <div className="flex items-center justify-between px-4 py-2.5 border-t border-gray-100">
        <span className="text-xs text-gray-400">
          {formatSize(parseInt(document.size))}
        </span>

        <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
          <button
            onClick={handleView}
            disabled={isOpening}
            className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-white bg-blue-600 hover:bg-blue-700 rounded transition-colors disabled:opacity-50"
          >
            <ExternalLink className="h-3.5 w-3.5" />
            {isOpening ? 'Opening…' : 'View'}
          </button>
          <button
            onClick={handleDownload}
            className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-100 border border-gray-200 rounded transition-colors"
          >
            <Download className="h-3.5 w-3.5" />
            Download
          </button>
        </div>
      </div>
    </div>
  )
}
