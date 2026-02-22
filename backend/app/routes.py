"""
Flask API routes.
Defines all API endpoints for the application.
"""
from flask import Blueprint, request, jsonify
from .search import get_search_engine
from app.config import Config
from flask import send_file
import io
from flask import make_response

# Create blueprint
api = Blueprint('api', __name__, url_prefix='/api')

# Global search engine instance
search_engine = None


def get_or_create_search_engine():
    """Get or create search engine instance"""
    global search_engine
    if search_engine is None:
        search_engine = get_search_engine()
    return search_engine


def get_storage_client():
    """Get storage client based on configuration"""
    config = Config()
    
    if config.STORAGE_TYPE == 'mssql':
        from app.mssqlclient import get_mssql_client  # ← FIXED
        return get_mssql_client()
   


@api.route('/health', methods=['GET'])
def health_check():
    """Health check endpoint"""
    config = Config()
    return jsonify({
        'status': 'healthy',
        'storage': config.STORAGE_TYPE,
        'message': 'Document Search API is running'
    }), 200


@api.route('/search', methods=['POST'])
def search():
    """
    Search documents endpoint.
    
    Request body:
    {
        "query": "search term",
        "limit": 10,  # optional
        "filters": ""  # optional Meilisearch filters
    }
    """
    try:
        data = request.get_json()
        query = data.get('query', '')
        limit = data.get('limit')
        offset = data.get('offset', 0)
        filters = data.get('filters')

        if not query:
            return jsonify({'error': 'Query parameter is required'}), 400

        engine = get_or_create_search_engine()
        results = engine.search(query, limit=limit, offset=offset, filters=filters)
        
        return jsonify(results)
    
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@api.route('/index', methods=['POST'])
def index_documents():
    """
    Index all documents from database.
    
    This will process all PDFs in FORMS_MASTER table and add them to the search index.
    """
    try:
        engine = get_or_create_search_engine()
        stats = engine.index_documents()
        
        return jsonify({
            'success': True,
            'stats': stats
        })
    
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500


@api.route('/index/clear', methods=['POST'])
def clear_index():
    """Clear all documents from the search index"""
    try:
        engine = get_or_create_search_engine()
        engine.clear_index()
        
        return jsonify({
            'success': True,
            'message': 'Index cleared successfully'
        })
    
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500


@api.route('/stats', methods=['GET'])
def get_stats():
    """Get search index statistics"""
    try:
        engine = get_or_create_search_engine()
        stats = engine.get_stats()
        
        return jsonify(stats)
    
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@api.route('/document/<document_id>', methods=['GET'])
def get_document(document_id):
    """
    Get document metadata.
    
    Args:
        document_id: FORMS_MASTER_ID
    """
    try:
        client = get_storage_client()
        metadata = client.get_file_metadata(document_id)
        
        if metadata:
            return jsonify(metadata)
        else:
            return jsonify({'error': 'Document not found'}), 404
    
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@api.route('/documents', methods=['GET'])
def list_documents():
    """
    List all available documents.
    
    Query parameters:
    - limit: Maximum number of documents to return (default: 100)
    - offset: Number of documents to skip (default: 0)
    """
    try:
        limit = request.args.get('limit', 100, type=int)
        offset = request.args.get('offset', 0, type=int)
        
        client = get_storage_client()
        documents = client.get_all_documents()
        
        # Apply pagination
        total = len(documents)
        paginated = documents[offset:offset + limit]
        
        return jsonify({
            'documents': paginated,
            'total': total,
            'limit': limit,
            'offset': offset
        })
    
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@api.route('/test-connection', methods=['GET'])
def test_connection():
    """Test database connection"""
    try:
        config = Config()
        client = get_storage_client()
        
        # Test connection if method exists
        if hasattr(client, 'test_connection'):
            success = client.test_connection()
            return jsonify({
                'success': success,
                'storage': config.STORAGE_TYPE,
                'message': 'Connection successful' if success else 'Connection failed'
            })
        else:
            return jsonify({
                'success': True,
                'storage': config.STORAGE_TYPE,
                'message': 'Connection test not available for this storage type'
            })
    
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500
    


@api.route('/document/<document_id>/download', methods=['GET'])
def download_document(document_id):
    """
    Download document file from database.
    
    Query parameters:
        - inline: Set to 'true' to view in browser
        - query: Search term to highlight and jump to
    """
    try:
        client = get_storage_client()
        
        # Get file metadata
        metadata = client.get_file_metadata(document_id)
        if not metadata:
            return jsonify({'error': 'Document not found'}), 404
        
        # Download file content
        file_content = client.download_file(document_id)
        if not file_content:
            return jsonify({'error': 'File content not found'}), 404
        
        # Determine if inline viewing
        inline = request.args.get('inline', 'false').lower() == 'true'
        
        # Create file-like object
        file_obj = io.BytesIO(file_content)
        
        # Determine content type
        mime_type = metadata.get('mimeType', 'application/octet-stream')
        
        # Send file with appropriate headers
        response = send_file(
            file_obj,
            mimetype=mime_type,
            as_attachment=not inline,
            download_name=metadata['name']
        )
        
        # Add CORS headers for PDF.js - THIS IS CRITICAL
        response.headers['Access-Control-Allow-Origin'] = '*'
        response.headers['Access-Control-Allow-Methods'] = 'GET, OPTIONS'
        response.headers['Access-Control-Allow-Headers'] = 'Content-Type, Range'
        response.headers['Access-Control-Expose-Headers'] = 'Content-Length, Content-Range, Accept-Ranges'
        response.headers['Accept-Ranges'] = 'bytes'
        
        return response
    
    except Exception as e:
        return jsonify({'error': str(e)}), 500
    

def find_page_for_query(page_info, query):
    """
    Find the first page containing the search query.
    
    Args:
        page_info: List of page dictionaries
        query: Search query string
        
    Returns:
        Page number (1-indexed) or 1 if not found
    """
    if not page_info or not query:
        return 1
    
    query_lower = query.lower()
    
    for page_data in page_info:
        if query_lower in page_data.get('text', '').lower():
            return page_data.get('page', 1)
    
    return 1

@api.route('/document/<document_id>/proxy', methods=['GET', 'OPTIONS'])
def proxy_document(document_id):
    """
    Proxy endpoint for serving PDFs with permissive CORS headers.
    This allows external viewers (like Mozilla PDF.js CDN and Google Docs) to access PDFs.
    """
    if request.method == 'OPTIONS':
        # Handle CORS preflight
        response = jsonify({'status': 'ok'})
        response.headers['Access-Control-Allow-Origin'] = '*'
        response.headers['Access-Control-Allow-Methods'] = 'GET, OPTIONS'
        response.headers['Access-Control-Allow-Headers'] = 'Range, Content-Type, Authorization'
        response.headers['Access-Control-Expose-Headers'] = 'Content-Length, Content-Range, Accept-Ranges'
        return response
    
    try:
        client = get_storage_client()
        
        # Get file metadata
        metadata = client.get_file_metadata(document_id)
        if not metadata:
            return jsonify({'error': 'Document not found'}), 404
        
        # Download file content
        file_content = client.download_file(document_id)
        if not file_content:
            return jsonify({'error': 'File content not found'}), 404
        
        # Handle Range requests for PDF streaming
        file_size = len(file_content)
        range_header = request.headers.get('Range')
        
        if range_header:
            # Parse range header
            byte_range = range_header.replace('bytes=', '').split('-')
            start = int(byte_range[0]) if byte_range[0] else 0
            end = int(byte_range[1]) if len(byte_range) > 1 and byte_range[1] else file_size - 1
            
            # Create partial response
            content = file_content[start:end + 1]
            response = make_response(content)
            response.headers['Content-Type'] = metadata.get('mimeType', 'application/pdf')
            response.headers['Content-Range'] = f'bytes {start}-{end}/{file_size}'
            response.headers['Accept-Ranges'] = 'bytes'
            response.headers['Content-Length'] = len(content)
            response.status_code = 206  # Partial Content
        else:
            # Full file response
            response = make_response(file_content)
            response.headers['Content-Type'] = metadata.get('mimeType', 'application/pdf')
            response.headers['Content-Length'] = file_size
            response.headers['Content-Disposition'] = f'inline; filename="{metadata["name"]}"'
        
        # Add permissive CORS headers
        response.headers['Access-Control-Allow-Origin'] = '*'
        response.headers['Access-Control-Allow-Methods'] = 'GET, OPTIONS'
        response.headers['Access-Control-Allow-Headers'] = 'Range, Content-Type, Authorization'
        response.headers['Access-Control-Expose-Headers'] = 'Content-Length, Content-Range, Accept-Ranges'
        response.headers['Accept-Ranges'] = 'bytes'
        
        # Cache control
        response.headers['Cache-Control'] = 'public, max-age=3600'
        
        return response
    
    except Exception as e:
        return jsonify({'error': str(e)}), 500