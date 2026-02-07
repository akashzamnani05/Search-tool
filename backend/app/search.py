"""
Meilisearch integration module.
Handles indexing and searching of documents using Meilisearch.
Supports multiple storage backends: MSSQL
"""
from typing import List, Dict, Optional
import meilisearch
from app.config import Config


class SearchEngine:
    """Search engine using Meilisearch"""
    
    def __init__(self):
        self.config = Config()
        
        # Initialize Meilisearch client
        # If API key is empty, don't pass it (for development mode)
        if self.config.MEILISEARCH_API_KEY:
            self.client = meilisearch.Client(
                self.config.MEILISEARCH_HOST,
                self.config.MEILISEARCH_API_KEY
            )
        else:
            # Connect without API key for development/local usage
            self.client = meilisearch.Client(self.config.MEILISEARCH_HOST)
        
        self.index_name = self.config.MEILISEARCH_INDEX
        self.index = None
        self._initialize_index()
        
        # Initialize storage client based on configuration
        self.storage_client = None
        self._initialize_storage()
    
    def _initialize_storage(self):
        """Initialize storage client (MSSQL)"""
        if self.config.STORAGE_TYPE == 'mssql':
            from app.mssqlclient import get_mssql_client
            
            self.storage_client = get_mssql_client(
                host=self.config.MSSQL_HOST,
                user=self.config.MSSQL_USER,
                password=self.config.MSSQL_PASSWORD,
                database=self.config.MSSQL_DATABASE,
                port=self.config.MSSQL_PORT
            )
            print(f"Initialized MSSQL storage client: {self.config.MSSQL_HOST}/{self.config.MSSQL_DATABASE}")
        
        
        else:
            print(f"Unsupported storage type: {self.config.STORAGE_TYPE}")
            raise ValueError(f"Unsupported storage type: {self.config.STORAGE_TYPE}")
    
    def _initialize_index(self):
        """Initialize or get Meilisearch index"""
        try:
            # Try to get existing index
            self.index = self.client.get_index(self.index_name)
            print(f"Connected to existing Meilisearch index: {self.index_name}")
        except meilisearch.errors.MeilisearchApiError:
            # Create new index if it doesn't exist
            self.client.create_index(self.index_name, {'primaryKey': 'id'})
            self.index = self.client.get_index(self.index_name)
            print(f"Created new Meilisearch index: {self.index_name}")
        
        # Configure searchable attributes and ranking rules
        self.index.update_settings({
            'searchableAttributes': [
                'name',
                'title',
                'form_no',
                'content',
                'path',
                'source_table'
            ],
            'displayedAttributes': [
                'id',
                'source_table',
                'original_id',
                'name',
                'title',
                'form_no',
                'content',
                'path',
                'mimeType',
                'size',
                'modifiedTime',
                'webViewLink',
                'metadata',
                'page_info'
            ],
            'filterableAttributes': [
                'mimeType',
                'modifiedTime',
                'source_table',
                'metadata.form_type',
                'metadata.department',
                'metadata.vessel_id',
                'metadata.survey_type'
            ],
            'sortableAttributes': [
                'modifiedTime',
                'name',
                'source_table'
            ],
            'rankingRules': [
                'words',
                'typo',
                'proximity',
                'attribute',
                'sort',
                'exactness'
            ]
        })
        print("Meilisearch index configured successfully")
    
    def index_documents(self, progress_callback=None) -> Dict:
        """
        Index all documents from storage (MSSQL).
        
        Args:
            progress_callback: Optional callback function for progress updates
            
        Returns:
            Dictionary with indexing statistics
        """
        # Import processor factory
        try:
            from app.processors import get_processor_factory
        except ImportError:
            print("Warning: Could not import processors module")
            print("Text extraction from PDFs will not work")
            # Create a dummy processor factory
            class DummyFactory:
                def process_document(self, content, filename):
                    return f"Content of {filename}"
            
            class DummyProcessorFactory:
                def __init__(self):
                    self.factory = DummyFactory()
            
            def get_processor_factory():
                return DummyProcessorFactory()
        
        processor_factory = get_processor_factory()
        
        # Get all files from storage
        print(f"Fetching files from {self.config.STORAGE_TYPE}...")
        files = self.storage_client.get_all_documents()
        
        total_files = len(files)
        indexed_count = 0
        failed_count = 0
        skipped_count = 0
        
        documents = []
        batch_size = self.config.BATCH_SIZE
        
        print(f"Found {total_files} files to process...")
        
        for i, file_info in enumerate(files):
            try:
                # Progress update
                if progress_callback:
                    progress_callback(i + 1, total_files, file_info['name'])
                else:
                    print(f"Processing {i + 1}/{total_files}: {file_info['name']}")
                
                # Download file content
                file_content = self.storage_client.download_file(file_info['id'])
                
                if not file_content:
                    print(f"  Failed to download: {file_info['name']}")
                    failed_count += 1
                    continue
                
                # Extract text content
                try:
                    text_content, page_info = processor_factory.process_document(
                        file_content, 
                        file_info['name']
                    )
                except Exception as e:
                    print(f"  Error processing document: {e}")
                    text_content = None
                    page_info = []

                if not text_content:
                    print(f"  No text extracted: {file_info['name']}")
                    skipped_count += 1
                    continue

                # Create document for indexing
                document = {
                    'id': file_info['id'],
                    'source_table': file_info.get('source_table', 'FORMS_MASTER'),  # Track source table
                    'original_id': file_info.get('original_id', file_info['id']),
                    'name': file_info['name'],
                    'title': file_info.get('title', file_info['name']),
                    'form_no': file_info.get('form_no', ''),
                    'content': text_content,
                    'path': file_info.get('path', file_info['name']),
                    'mimeType': file_info.get('mimeType', ''),
                    'size': file_info.get('size', '0'),
                    'modifiedTime': file_info.get('modifiedTime', ''),
                    'webViewLink': file_info.get('webViewLink', ''),
                    'metadata': file_info.get('metadata', {}),
                    'page_info': page_info
                }
                
                documents.append(document)
                indexed_count += 1
                
                # Batch indexing
                if len(documents) >= batch_size:
                    print(f"  Indexing batch of {len(documents)} documents...")
                    self.index.add_documents(documents)
                    documents = []
            
            except Exception as e:
                print(f"  Error processing {file_info.get('name', 'unknown')}: {e}")
                failed_count += 1
        
        # Index remaining documents
        if documents:
            print(f"Indexing final batch of {len(documents)} documents...")
            self.index.add_documents(documents)
        
        stats = {
            'total': total_files,
            'indexed': indexed_count,
            'failed': failed_count,
            'skipped': skipped_count
        }
        
        print(f"\nIndexing complete!")
        print(f"  Indexed: {indexed_count}")
        print(f"  Failed: {failed_count}")
        print(f"  Skipped: {skipped_count}")
        
        return stats
    
    def search(
        self, 
        query: str, 
        limit: int = None,
        filters: str = None
    ) -> Dict:
        """
        Search for documents matching the query.
        
        Args:
            query: Search query string
            limit: Maximum number of results (default from config)
            filters: Optional Meilisearch filters
            
        Returns:
            Dictionary with search results
        """
        if limit is None:
            limit = self.config.MAX_SEARCH_RESULTS
        
        try:
            search_params = {
                'limit': limit,
                'attributesToHighlight': ['name', 'title', 'form_no', 'content'],
                'attributesToCrop': ['content'],
                'cropLength': 200,
                'showMatchesPosition': True
            }
            
            if filters:
                search_params['filter'] = filters
            
            results = self.index.search(query, search_params)
            
            return {
                'hits': results['hits'],
                'query': query,
                'processingTimeMs': results.get('processingTimeMs', 0),
                'estimatedTotalHits': results.get('estimatedTotalHits', 0)
            }
        
        except Exception as e:
            print(f"Search error: {e}")
            return {
                'hits': [],
                'query': query,
                'error': str(e)
            }
    
    def get_stats(self) -> Dict:
        """
        Get index statistics.
        
        Returns:
            Dictionary with index statistics
        """
        try:
            stats = self.index.get_stats()
            return {
                'numberOfDocuments': stats.get('numberOfDocuments', 0),
                'isIndexing': stats.get('isIndexing', False),
                'fieldDistribution': stats.get('fieldDistribution', {}),
                'storageType': self.config.STORAGE_TYPE
            }
        except Exception as e:
            print(f"Error getting stats: {e}")
            return {'error': str(e)}
    
    def clear_index(self):
        """Clear all documents from the index"""
        try:
            self.index.delete_all_documents()
            print("Index cleared successfully")
        except Exception as e:
            print(f"Error clearing index: {e}")


# Singleton instance
_search_engine = None


def get_search_engine() -> SearchEngine:
    """Get or create SearchEngine singleton instance"""
    global _search_engine
    if _search_engine is None:
        _search_engine = SearchEngine()
    return _search_engine