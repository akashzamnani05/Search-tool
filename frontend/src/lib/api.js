const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5001/api';

async function fetchAPI(endpoint, options = {}) {
  const url = `${API_URL}${endpoint}`;
  
  const defaultOptions = {
    headers: {
      'Content-Type': 'application/json',
    },
  };
  
  const config = { ...defaultOptions, ...options };
  
  try {
    const response = await fetch(url, config);
    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.error || `API error: ${response.status}`);
    }
    
    return data;
  } catch (error) {
    console.error('API request failed:', error);
    throw error;
  }
}

export async function searchDocuments(query, limit = 10, offset = 0) {
  return fetchAPI('/search', {
    method: 'POST',
    body: JSON.stringify({ query, limit, offset }),
  });
}

export async function triggerIndexing(clearExisting = false) {
  return fetchAPI('/index', {
    method: 'POST',
    body: JSON.stringify({ clear_existing: clearExisting }),
  });
}

export async function getStats() {
  return fetchAPI('/stats');
}

export async function healthCheck() {
  return fetchAPI('/health');
}

export async function getConfig() {
  return fetchAPI('/config');
}

/**
 * Get document view URL
 * NOTE: documentId is composite ID like "VESSEL_CERTIFICATES:456" 
 * The table name is already included in the ID from search results
 */
export const IMAGE_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.tiff', '.tif', '.webp'];

export function getDocumentViewUrl(documentId, query = null, pageNumber = null, documentName = null, viewerType = 'pdfjs') {
  // For images — open proxy URL directly; browsers render images natively
  if (documentName && IMAGE_EXTENSIONS.some(ext => documentName.toLowerCase().endsWith(ext))) {
    return `${API_URL}/document/${encodeURIComponent(documentId)}/proxy`;
  }

  // For Word documents - use Google Docs viewer
  if (documentName && (documentName.toLowerCase().endsWith('.docx') || documentName.toLowerCase().endsWith('.doc'))) {
    // URL encode the composite document ID
    const fileUrl = `${API_URL}/document/${encodeURIComponent(documentId)}/proxy`;
    return `https://docs.google.com/viewer?url=${encodeURIComponent(fileUrl)}&embedded=true`;
  }
  
  // For PDFs - choose viewer type
  if (viewerType === 'google') {
    // Google Docs Viewer
    const fileUrl = `${API_URL}/document/${encodeURIComponent(documentId)}/proxy`;
    return `https://docs.google.com/viewer?url=${encodeURIComponent(fileUrl)}&embedded=true`;
  }
  
  // Default: self-hosted PDF.js viewer (served from /public/pdfjs/)
  const pdfProxyUrl = `${API_URL}/document/${encodeURIComponent(documentId)}/proxy`;
  const encodedPdfUrl = encodeURIComponent(pdfProxyUrl);

  let viewerUrl = `/pdfjs/web/viewer.html?file=${encodedPdfUrl}`;
  
  // Add fragment for search and page
  let fragment = '';
  
  if (pageNumber) {
    fragment += `page=${pageNumber}`;
  }
  
  if (query) {
    fragment += (fragment ? '&' : '') + `search=${encodeURIComponent(query)}`;
  }
  
  if (fragment) {
    viewerUrl += `#${fragment}`;
  }
  
  return viewerUrl;
}

// Helper to find page number from search results
export function findPageNumber(document, query) {
  if (!document.page_info || !query) return null;
  
  const queryLower = query.toLowerCase();
  
  for (const pageData of document.page_info) {
    if (pageData.text && pageData.text.toLowerCase().includes(queryLower)) {
      return pageData.page;
    }
  }
  
  return null;
}

/**
 * Get the raw proxy URL for a document (used for in-browser rendering)
 */
export function getDocumentProxyUrl(documentId) {
  return `${API_URL}/document/${encodeURIComponent(documentId)}/proxy`;
}

/**
 * Fetch document metadata
 * NOTE: documentId is composite ID like "VESSEL_CERTIFICATES:456"
 */
export async function getDocumentMetadata(documentId) {
  return fetchAPI(`/document/${encodeURIComponent(documentId)}`);
}

/**
 * List all documents from all tables
 */
export async function listDocuments(limit = 100, offset = 0) {
  return fetchAPI(`/documents?limit=${limit}&offset=${offset}`);
}