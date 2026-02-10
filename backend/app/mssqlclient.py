"""
MSSQL Database integration module.
Handles connection and file operations with Microsoft SQL Server database.
Compatible with macOS using pymssql.
"""
import pymssql
from typing import List, Dict, Optional
from datetime import datetime


class MSSQLClient:
    """Client for interacting with Microsoft SQL Server database"""
    
    def __init__(self, host: str, user: str, password: str, database: str, port: int = 1433, tables: List[str] = None):
        """
        Initialize MSSQL client.
        
        Args:
            host: MSSQL host address
            user: MSSQL username
            password: MSSQL password
            database: Database name
            port: MSSQL port (default: 1433)
            tables: List of tables to query (default: ['FORMS_MASTER'])
        """
        self.host = host
        self.user = user
        self.password = password
        self.database = database
        self.port = port
        self.tables = tables or ['FORMS_MASTER']
        self.connection = None
        self._connect()
        
        # Define table schemas for different tables
        self.table_schemas = {
            'FORMS_MASTER': {
                'id_column': 'FORMS_MASTER_ID',
                'name_column': 'DOCFILE_NAME',
                'type_column': 'DOCFILE_TYPE',
                'title_column': 'TITLE',
                'content_column': 'DOCFILE_CONTENT',
                'update_column': 'UpdateDate',
                'extra_columns': ['FORM_NO', 'FORM_TYPE', 'DEPARTMENT_ID', 'EFFECTIVE_DATE', 
                                  'REVISION_DATE', 'REVISION_NO', 'STATUS']
            },
            'VESSEL_CERTIFICATES': {
                'id_column': 'VESSEL_CERTIFICATES_ID',
                'name_column': 'CERTIFICATE_NAME',
                'type_column': 'CERTIFICATE_TYPE',
                'title_column': 'CERTIFICATE_TITLE',
                'content_column': 'CERTIFICATE_CONTENT',
                'update_column': 'UpdateDate',
                'extra_columns': ['VESSEL_ID', 'CERTIFICATE_NO', 'ISSUE_DATE', 
                                  'EXPIRY_DATE', 'ISSUING_AUTHORITY', 'STATUS']
            },
            'SurveyCertificates': {
                'id_column': 'SURVEY_CERTIFICATE_ID',
                'name_column': 'CERTIFICATE_NAME',
                'type_column': 'CERTIFICATE_TYPE',
                'title_column': 'CERTIFICATE_TITLE',
                'content_column': 'CERTIFICATE_CONTENT',
                'update_column': 'UpdateDate',
                'extra_columns': ['VESSEL_ID', 'SURVEY_TYPE', 'SURVEY_DATE', 
                                  'NEXT_SURVEY_DATE', 'SURVEYOR', 'STATUS']
            }
        }
    
    def _connect(self):
        """Establish connection to MSSQL database"""
        try:
            self.connection = pymssql.connect(
                server=self.host,
                user=self.user,
                password=self.password,
                database=self.database,
                port=self.port,
                autocommit=True,
                timeout=30,
                login_timeout=30
            )
            print(f"Connected to MSSQL database: {self.database}")
        except pymssql.Error as err:
            print(f"Error connecting to MSSQL: {err}")
            raise
    
    def _ensure_connection(self):
        """Ensure database connection is active"""
        try:
            # Test connection with a simple query
            if self.connection:
                cursor = self.connection.cursor()
                cursor.execute("SELECT 1")
                cursor.close()
        except Exception as e:
            print(f"Connection check failed: {e}")
            self._connect()
    
    def _create_composite_id(self, table_name: str, record_id: str) -> str:
        """
        Create composite ID from table name and record ID.
        
        Args:
            table_name: Name of the source table
            record_id: Record ID from the table
            
        Returns:
            Composite ID in format "TABLE_NAME:RECORD_ID"
        """
        return f"{table_name}_{record_id}"
    
    def _parse_composite_id(self, composite_id: str) -> tuple:
        """
        Parse composite ID into table name and record ID.
        
        Args:
            composite_id: Composite ID in format "TABLE_NAME:RECORD_ID"
            
        Returns:
            Tuple of (table_name, record_id)
        """
        if '_' in composite_id:
        # Need to handle tables that might have underscores
        # Known tables: FORMS_MASTER, VESSEL_CERTIFICATES, SurveyCertificates
            for table in ['FORMS_MASTER', 'VESSEL_CERTIFICATES', 'SurveyCertificates']:
                if composite_id.startswith(table + '_'):
                    record_id = composite_id[len(table) + 1:]
                    return table, record_id
        
    def _get_table_schema(self, table_name: str) -> Dict:
        """
        Get schema configuration for a table.
        
        Args:
            table_name: Name of the table
            
        Returns:
            Schema dictionary or default schema if table not found
        """
        return self.table_schemas.get(table_name, self.table_schemas['FORMS_MASTER'])
    
    def get_all_documents(self) -> List[Dict]:
        """
        Get all PDF documents from configured tables.
        Supports FORMS_MASTER, VESSEL_CERTIFICATES, and SurveyCertificates.
        
        Returns:
            List of document metadata dictionaries with composite IDs and source table info
        """
        self._ensure_connection()
        
        all_documents = []
        
        for table_name in self.tables:
            print(f"Fetching documents from table: {table_name}")
            
            if table_name not in self.table_schemas:
                print(f"Warning: Unknown table schema for {table_name}, skipping...")
                continue
            
            schema = self._get_table_schema(table_name)
            documents = self._get_documents_from_table(table_name, schema)
            all_documents.extend(documents)
            print(f"  Found {len(documents)} documents in {table_name}")
        
        print(f"Total documents found across all tables: {len(all_documents)}")
        return all_documents
    
    def _get_documents_from_table(self, table_name: str, schema: Dict) -> List[Dict]:
        """
        Get documents from a specific table.
        
        Args:
            table_name: Name of the table to query
            schema: Table schema configuration
            
        Returns:
            List of document metadata dictionaries
        """
        documents = []
        cursor = None
        
        try:
            cursor = self.connection.cursor(as_dict=True)
            
            # Build query based on table schema
            if table_name == 'FORMS_MASTER':
                query = f"""
                    SELECT 
                        {schema['id_column']} as id,
                        {schema['name_column']} as name,
                        {schema['type_column']} as mimeType,
                        {schema['title_column']} as title,
                        FORM_NO as form_no,
                        FORM_TYPE as form_type,
                        DEPARTMENT_ID as department,
                        EFFECTIVE_DATE as effective_date,
                        REVISION_DATE as revision_date,
                        REVISION_NO as revision_no,
                        STATUS as status,
                        {schema['update_column']} as modifiedTime,
                        DATALENGTH({schema['content_column']}) as size
                    FROM {table_name}
                    WHERE IsActive = 1
                        AND {schema['content_column']} IS NOT NULL
                        AND {schema['name_column']} IS NOT NULL
                    ORDER BY {schema['update_column']} DESC
                """
            
            elif table_name == 'VESSEL_CERTIFICATES':
                query = f"""
                    SELECT 
                        {schema['id_column']} as id,
                        {schema['name_column']} as name,
                        {schema['type_column']} as mimeType,
                        {schema['title_column']} as title,
                        VESSEL_ID as vessel_id,
                        CERTIFICATE_NO as certificate_no,
                        ISSUE_DATE as issue_date,
                        EXPIRY_DATE as expiry_date,
                        ISSUING_AUTHORITY as issuing_authority,
                        STATUS as status,
                        {schema['update_column']} as modifiedTime,
                        DATALENGTH({schema['content_column']}) as size
                    FROM {table_name}
                    WHERE IsActive = 1
                        AND {schema['content_column']} IS NOT NULL
                        AND {schema['name_column']} IS NOT NULL
                    ORDER BY {schema['update_column']} DESC
                """
            
            elif table_name == 'SurveyCertificates':
                query = f"""
                    SELECT 
                        {schema['id_column']} as id,
                        {schema['name_column']} as name,
                        {schema['type_column']} as mimeType,
                        {schema['title_column']} as title,
                        VESSEL_ID as vessel_id,
                        SURVEY_TYPE as survey_type,
                        SURVEY_DATE as survey_date,
                        NEXT_SURVEY_DATE as next_survey_date,
                        SURVEYOR as surveyor,
                        STATUS as status,
                        {schema['update_column']} as modifiedTime,
                        DATALENGTH({schema['content_column']}) as size
                    FROM {table_name}
                    WHERE IsActive = 1
                        AND {schema['content_column']} IS NOT NULL
                        AND {schema['name_column']} IS NOT NULL
                    ORDER BY {schema['update_column']} DESC
                """
            
            else:
                print(f"No query template for table: {table_name}")
                return documents
            
            cursor.execute(query)
            rows = cursor.fetchall()
            
            for row in rows:
                # Create composite ID
                composite_id = self._create_composite_id(table_name, str(row['id']))
                
                # Build document metadata based on table type
                doc_info = {
                    'id': composite_id,
                    'source_table': table_name,  # Track source table
                    'original_id': str(row['id']),
                    'name': row['name'],
                    'title': row['title'] or row['name'],
                    'mimeType': row['mimeType'] or 'application/pdf',
                    'size': str(row['size'] or 0),
                    'modifiedTime': row['modifiedTime'].isoformat() if row['modifiedTime'] else '',
                }
                
                # Add table-specific metadata
                if table_name == 'FORMS_MASTER':
                    doc_info['form_no'] = row['form_no']
                    path = f"{row['form_type']}/{row['department'] or 'General'}/{row['name']}"
                    doc_info['path'] = path
                    doc_info['metadata'] = {
                        'form_type': row['form_type'],
                        'department': row['department'],
                        'effective_date': row['effective_date'].isoformat() if row['effective_date'] else None,
                        'revision_date': row['revision_date'].isoformat() if row['revision_date'] else None,
                        'revision_no': row['revision_no'],
                        'status': row['status']
                    }
                
                elif table_name == 'VESSEL_CERTIFICATES':
                    doc_info['certificate_no'] = row['certificate_no']
                    doc_info['form_no'] = row['certificate_no']  # For consistency
                    path = f"Certificates/Vessel/{row['vessel_id']}/{row['name']}"
                    doc_info['path'] = path
                    doc_info['metadata'] = {
                        'vessel_id': row['vessel_id'],
                        'certificate_no': row['certificate_no'],
                        'issue_date': row['issue_date'].isoformat() if row['issue_date'] else None,
                        'expiry_date': row['expiry_date'].isoformat() if row['expiry_date'] else None,
                        'issuing_authority': row['issuing_authority'],
                        'status': row['status']
                    }
                
                elif table_name == 'SurveyCertificates':
                    doc_info['survey_type'] = row['survey_type']
                    doc_info['form_no'] = row['survey_type']  # For consistency
                    path = f"Certificates/Survey/{row['vessel_id']}/{row['name']}"
                    doc_info['path'] = path
                    doc_info['metadata'] = {
                        'vessel_id': row['vessel_id'],
                        'survey_type': row['survey_type'],
                        'survey_date': row['survey_date'].isoformat() if row['survey_date'] else None,
                        'next_survey_date': row['next_survey_date'].isoformat() if row['next_survey_date'] else None,
                        'surveyor': row['surveyor'],
                        'status': row['status']
                    }
                
                documents.append(doc_info)
        
        except pymssql.Error as err:
            print(f"Database error querying {table_name}: {err}")
        
        finally:
            if cursor:
                cursor.close()
        
        return documents
    
    def download_file(self, file_id: str) -> Optional[bytes]:
        """
        Download file content from MSSQL database.
        Supports composite IDs in format "TABLE_NAME:RECORD_ID"
        
        Args:
            file_id: Composite ID (e.g., "FORMS_MASTER:123") or legacy ID
            
        Returns:
            File content as bytes, or None if download fails
        """
        self._ensure_connection()
        
        cursor = None
        
        try:
            # Parse composite ID
            table_name, record_id = self._parse_composite_id(file_id)
            schema = self._get_table_schema(table_name)
            
            cursor = self.connection.cursor()
            
            query = f"""
                SELECT {schema['content_column']}
                FROM {table_name}
                WHERE {schema['id_column']} = %s
                    AND IsActive = 1
                    AND {schema['content_column']} IS NOT NULL
            """
            
            cursor.execute(query, (record_id,))
            result = cursor.fetchone()
            
            if result and result[0]:
                # The content is stored as binary data (VARBINARY/IMAGE)
                return bytes(result[0])
            
            print(f"No content found for file_id: {file_id} (table: {table_name}, id: {record_id})")
            return None
        
        except pymssql.Error as err:
            print(f"Error downloading file {file_id}: {err}")
            return None
        
        finally:
            if cursor:
                cursor.close()
    
    def get_file_metadata(self, file_id: str) -> Optional[Dict]:
        """
        Get file metadata from MSSQL database.
        Supports composite IDs in format "TABLE_NAME:RECORD_ID"
        
        Args:
            file_id: Composite ID (e.g., "FORMS_MASTER:123") or legacy ID
            
        Returns:
            File metadata dictionary with source_table info, or None if fails
        """
        self._ensure_connection()
        
        cursor = None
        
        try:
            # Parse composite ID
            table_name, record_id = self._parse_composite_id(file_id)
            schema = self._get_table_schema(table_name)
            
            cursor = self.connection.cursor(as_dict=True)
            
            # Base query columns
            base_query = f"""
                SELECT 
                    {schema['id_column']} as id,
                    {schema['name_column']} as name,
                    {schema['type_column']} as mimeType,
                    {schema['title_column']} as title,
                    DATALENGTH({schema['content_column']}) as size,
                    {schema['update_column']} as modifiedTime
            """
            
            # Add table-specific columns
            if table_name == 'FORMS_MASTER':
                query = base_query + """,
                    FORM_NO as form_no
                FROM FORMS_MASTER
                WHERE FORMS_MASTER_ID = %s
                    AND IsActive = 1
                """
            elif table_name == 'VESSEL_CERTIFICATES':
                query = base_query + """,
                    CERTIFICATE_NO as form_no
                FROM VESSEL_CERTIFICATES
                WHERE VESSEL_CERTIFICATES_ID = %s
                    AND IsActive = 1
                """
            elif table_name == 'SurveyCertificates':
                query = base_query + """,
                    SURVEY_TYPE as form_no
                FROM SurveyCertificates
                WHERE SURVEY_CERTIFICATE_ID = %s
                    AND IsActive = 1
                """
            else:
                query = base_query + f"""
                FROM {table_name}
                WHERE {schema['id_column']} = %s
                    AND IsActive = 1
                """
            
            cursor.execute(query, (record_id,))
            result = cursor.fetchone()
            
            if result:
                metadata = {
                    'id': file_id,  # Return composite ID
                    'source_table': table_name,  # Track source table
                    'original_id': str(result['id']),
                    'name': result['name'],
                    'title': result['title'],
                    'mimeType': result['mimeType'] or 'application/pdf',
                    'size': str(result['size'] or 0),
                    'modifiedTime': result['modifiedTime'].isoformat() if result['modifiedTime'] else ''
                }
                
                # Add form_no if available
                if 'form_no' in result:
                    metadata['form_no'] = result['form_no']
                
                return metadata
            
            return None
        
        except pymssql.Error as err:
            print(f"Error getting file metadata {file_id}: {err}")
            return None
        
        finally:
            if cursor:
                cursor.close()
    
    def test_connection(self) -> bool:
        """
        Test database connection.
        
        Returns:
            True if connection successful, False otherwise
        """
        try:
            self._ensure_connection()
            cursor = self.connection.cursor()
            cursor.execute("SELECT @@VERSION")
            version = cursor.fetchone()
            cursor.close()
            print(f"MSSQL Server Version: {version[0]}")
            return True
        except Exception as e:
            print(f"Connection test failed: {e}")
            return False
    
    def close(self):
        """Close database connection"""
        if self.connection:
            self.connection.close()
            print("MSSQL connection closed")


# Singleton instance
_mssql_client = None


def get_mssql_client(host: str = None, user: str = None, password: str = None, 
                     database: str = None, port: int = None, tables: List[str] = None) -> MSSQLClient:
    """
    Get or create MSSQLClient singleton instance.
    
    Uses configuration from Config class (which reads from .env) by default.
    
    Args:
        host: MSSQL host (optional, defaults to config)
        user: MSSQL username (optional, defaults to config)
        password: MSSQL password (optional, defaults to config)
        database: Database name (optional, defaults to config)
        port: MSSQL port (optional, defaults to config)
        tables: List of tables to query (optional, defaults to config)
    
    Returns:
        MSSQLClient instance
    """
    global _mssql_client
    
    if _mssql_client is None:
        from app.config import Config
        config = Config()
        
        # Use provided parameters or fall back to config
        _host = host or config.MSSQL_HOST
        _user = user or config.MSSQL_USER
        _password = password or config.MSSQL_PASSWORD
        _database = database or config.MSSQL_DATABASE
        _port = port or config.MSSQL_PORT
        _tables = tables or config.DATABASE_TABLES
        
        _mssql_client = MSSQLClient(_host, _user, _password, _database, _port, _tables)
    
    return _mssql_client