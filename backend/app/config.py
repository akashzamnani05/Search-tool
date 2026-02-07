"""
Configuration module for document search system.
"""
import os
from pathlib import Path


class Config:
    def __init__(self):
        # Storage configuration
        self.STORAGE_TYPE = os.getenv('STORAGE_TYPE', 'mssql')
        
        # MSSQL Configuration
        self.MSSQL_HOST = os.getenv('MSSQL_HOST', 'localhost')
        self.MSSQL_PORT = int(os.getenv('MSSQL_PORT', '1433'))
        self.MSSQL_USER = os.getenv('MSSQL_USER', '')
        self.MSSQL_PASSWORD = os.getenv('MSSQL_PASSWORD', '')
        self.MSSQL_DATABASE = os.getenv('MSSQL_DATABASE', '')
        self.MSSQL_DRIVER = os.getenv('MSSQL_DRIVER', 'ODBC Driver 17 for SQL Server')
        
        # Database tables to index (comma-separated)
        # Default: FORMS_MASTER,VESSEL_CERTIFICATES,SurveyCertificates
        self.DATABASE_TABLES = os.getenv('DATABASE_TABLES', 'FORMS_MASTER,VESSEL_CERTIFICATES,SurveyCertificates').split(',')
        
        # Meilisearch Configuration
        self.MEILISEARCH_HOST = os.getenv('MEILISEARCH_HOST', 'http://127.0.0.1:7700')
        self.MEILISEARCH_API_KEY = os.getenv('MEILISEARCH_API_KEY', '')
        self.MEILISEARCH_INDEX = os.getenv('MEILISEARCH_INDEX', 'documents')
        
        # Processing Configuration
        self.BATCH_SIZE = int(os.getenv('BATCH_SIZE', '10'))
        self.MAX_SEARCH_RESULTS = int(os.getenv('MAX_SEARCH_RESULTS', '20'))
        self.CACHE_DIR = Path(os.getenv('CACHE_DIR', './cache'))
        
        # Flask Configuration
        self.DEBUG = os.getenv('DEBUG', 'True').lower() == 'true'
        self.SECRET_KEY = os.getenv('SECRET_KEY', 'dev-secret-key-change-in-production')
        self.MAX_TEXT_LENGTH = int(os.getenv('MAX_TEXT_LENGTH', '50000'))
        self.CORS_ORIGINS = os.getenv('CORS_ORIGINS', '*').split(',')
        
        # Validate critical configuration
        self.validate()
    
    # Supported file extensions
    SUPPORTED_EXTENSIONS = [
        '.pdf', '.doc', '.docx', '.txt', 
        '.xlsx', '.xls', '.pptx', '.ppt'
    ]
    
    def is_supported_file(self, filename: str) -> bool:
        """
        Check if file type is supported.
        
        Args:
            filename: Name of the file
            
        Returns:
            True if file type is supported
        """
        if not filename:
            return False
        
        extension = os.path.splitext(filename.lower())[1]
        return extension in self.SUPPORTED_EXTENSIONS
    
    def validate(self):
        """Validate critical configuration values"""
        if self.STORAGE_TYPE == 'mssql':
            if not all([self.MSSQL_HOST, self.MSSQL_USER, self.MSSQL_PASSWORD, self.MSSQL_DATABASE]):
                print("WARNING: MSSQL configuration is incomplete!")
                print("Required: MSSQL_HOST, MSSQL_USER, MSSQL_PASSWORD, MSSQL_DATABASE")
        