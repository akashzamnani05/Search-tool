# Document Search System - Architecture & Function Explanation

## 📋 Table of Contents
1. [System Overview](#system-overview)
2. [Architecture Diagram](#architecture-diagram)
3. [Component Breakdown](#component-breakdown)
4. [Data Flow](#data-flow)
5. [Function Reference](#function-reference)
6. [Search Flow](#search-flow)
7. [Indexing Flow](#indexing-flow)
8. [API Endpoints](#api-endpoints)

---

## 🎯 System Overview

This is a **Document Search and Indexing System** that allows you to:
- Store documents (PDFs, Word, Excel, PowerPoint files) in a MySQL database
- Extract text from those documents automatically
- Index the text content in Meilisearch (a fast search engine)
- Search through all documents quickly and efficiently
- Get results with highlighting and context

### Key Technologies
- **MySQL**: Stores document files and metadata
- **Meilisearch**: Fast, full-text search engine
- **Flask**: Web API framework
- **Python**: Document text extraction

---

## 🏗️ Architecture Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                     Frontend (Next.js)                      │
│              (Not covered in this explanation)               │
└─────────────────────────────────────────────────────────────┘
                            ↕
        ┌───────────────────────────────────────┐
        │         Flask API (backend)            │
        │  (/api/search, /api/index, etc.)       │
        └───────────────────────────────────────┘
                            ↕
        ┌──────────────────┬──────────────────┐
        │                  │                  │
        ▼                  ▼                  ▼
    ┌────────────┐   ┌──────────────┐   ┌─────────────┐
    │  MySQL DB  │   │ Meilisearch  │   │Config (.env)│
    │(Documents) │   │(Search Index)│   │             │
    └────────────┘   └──────────────┘   └─────────────┘
        ▲
        │ (stores file content & metadata)
        │
```

---

## 🔧 Component Breakdown

### 1. **Config Module** (`app/config.py`)
**Purpose**: Centralized configuration management

**Key Variables**:
- `MYSQL_HOST`, `MYSQL_USER`, `MYSQL_PASSWORD`, `MYSQL_DATABASE` - Database connection
- `STORAGE_TYPE` - Where documents are stored ('mysql' or 'drive')
- `MEILISEARCH_HOST`, `MEILISEARCH_API_KEY` - Search engine configuration
- `MAX_TEXT_LENGTH`, `BATCH_SIZE` - Processing parameters

**Main Function**:
```python
class Config:
    # Reads all configuration from .env file
    # Provides sensible defaults for optional values
```

---

### 2. **MySQL Client** (`app/mysql_client.py`)
**Purpose**: Handles all database operations

#### Main Functions:

**`MySQLClient.__init__(host, user, password, database)`**
- Initializes database connection
- Called once to create a persistent connection

**`_connect()`**
- Establishes actual connection to MySQL
- Handles connection failures

**`get_all_documents()` → List[Dict]**
- Fetches all active PDF documents from `FORMS_MASTER` table
- Returns list of document metadata dictionaries
- Each document has: id, name, title, form_no, size, modifiedTime, path, metadata

**`download_file(file_id) → bytes`**
- Downloads the actual file content from database
- Returns binary file data
- Used during indexing to extract text

**`get_file_metadata(file_id) → Dict`**
- Gets detailed metadata for a single document
- Returns: id, name, title, form_no, size, modifiedTime, path, metadata

**Singleton Pattern**:
```python
def get_mysql_client() → MySQLClient:
    # Returns same instance every time
    # Reuses single database connection
```

---

### 3. **Processor Factory** (`app/processors/`)
**Purpose**: Extract text from different file formats

#### Architecture:
```
BaseProcessor (abstract)
    ↓
    ├─ PDFProcessor (handles .pdf files)
    ├─ DOCXProcessor (handles .docx, .doc files)
    ├─ TextProcessor (handles .txt files)
    ├─ ExcelProcessor (handles .xlsx, .xls files)
    └─ PowerPointProcessor (handles .pptx, .ppt files)
```

#### Key Functions:

**`ProcessorFactory.get_processor(filename) → BaseProcessor`**
- Takes a filename
- Returns appropriate processor based on file extension
- Returns None if file type not supported

**`ProcessorFactory.process_document(file_content, filename) → str`**
- Main method for text extraction
- Takes file bytes and filename
- Returns extracted text string
- Handles errors gracefully

**`BaseProcessor.extract_text(file_content, filename) → str`** (implemented by each processor)
- Specific extraction logic for each file type
- Example: PDFProcessor uses PyPDF2 to extract text from PDFs

**`BaseProcessor.clean_text(text) → str`**
- Removes special characters, normalizes whitespace
- Called after extraction

**`BaseProcessor.truncate_text(text, max_length) → str`**
- Limits text length to prevent huge documents
- Default: 50,000 characters

---

### 4. **Search Engine** (`app/search.py`)
**Purpose**: Handles Meilisearch indexing and searching

#### Main Class: `SearchEngine`

**`__init__()`**
- Initializes Meilisearch client
- Sets up index with searchable/filterable attributes
- Initializes storage client (MySQL)

**`_initialize_index()`**
- Creates or gets existing Meilisearch index
- Configures search settings:
  - **searchableAttributes**: Fields that can be searched (name, title, content, etc.)
  - **filterableAttributes**: Fields that can be filtered (mimeType, department, etc.)
  - **sortableAttributes**: Fields that can be sorted by (modifiedTime, name)
  - **rankingRules**: How results are ranked (words, typo, proximity, attribute, sort, exactness)

#### Key Methods:

**`index_documents(progress_callback=None) → Dict`**
1. Gets all documents from MySQL
2. For each document:
   - Downloads file content from database
   - Extracts text using appropriate processor
   - Creates searchable document object
3. Batches documents (50 at a time by default)
4. Adds batch to Meilisearch index
5. Returns statistics: total, indexed, failed, skipped

**Example flow**:
```
MySQL → [Doc1, Doc2, Doc3] → Download content → Extract text → Create index doc → Add to Meilisearch
```

**`search(query, limit=None, filters=None) → Dict`**
- Searches Meilisearch for documents matching query
- Parameters:
  - `query`: Search terms (e.g., "invoice 2024")
  - `limit`: Max results to return (default: 20)
  - `filters`: Meilisearch filter string (optional)
- Returns: hits, query, processingTimeMs, estimatedTotalHits
- Features:
  - Highlights matching terms
  - Shows context around matches (200 chars)
  - Shows position of matches in text

**`get_stats() → Dict`**
- Returns index statistics
- Info: number of documents, isIndexing status, field distribution

**`clear_index()`**
- Deletes all documents from search index
- Used to reset before re-indexing

**Singleton Pattern**:
```python
def get_search_engine() → SearchEngine:
    # Returns same instance every time
```

---

### 5. **Flask Routes** (`app/routes.py`)
**Purpose**: Define API endpoints

#### Available Endpoints:

**`GET /api/health`**
- Health check endpoint
- Returns: status, storage type, message
- Use: Check if API is running

**`POST /api/search`**
- Search for documents
- Request body:
  ```json
  {
    "query": "search term",
    "limit": 10,
    "filters": "mimeType = 'application/pdf'"
  }
  ```
- Response: hits, query, processingTimeMs, estimatedTotalHits

**`POST /api/index`**
- Index all documents from database
- No request body needed
- Response: success, stats (total, indexed, failed, skipped)
- ⚠️ Takes time! (processes all documents)

**`POST /api/index/clear`**
- Clear all documents from search index
- No request body
- Response: success, message
- ⚠️ Deletes all indexed data!

**`GET /api/stats`**
- Get search index statistics
- Response: numberOfDocuments, isIndexing, fieldDistribution

**`GET /api/document/<document_id>`**
- Get metadata for a specific document
- Response: Document metadata object or error

**`GET /api/documents`**
- List all documents with pagination
- Query parameters:
  - `limit`: Results per page (default: 100)
  - `offset`: How many to skip (default: 0)
- Response: documents array, total, limit, offset

---

## 📊 Data Flow

### Complete Flow from Document to Search Result:

```
1. STORAGE PHASE
   ├─ User uploads document file
   └─ File stored in MySQL FORMS_MASTER table with metadata

2. INDEXING PHASE (when /api/index is called)
   ├─ MySQLClient.get_all_documents()
   │  └─ Query FORMS_MASTER for all documents
   │
   ├─ For each document:
   │  ├─ MySQLClient.download_file(id)
   │  │  └─ Get file bytes from database BLOB
   │  │
   │  ├─ ProcessorFactory.process_document(bytes, filename)
   │  │  ├─ Determine file type from extension
   │  │  ├─ Get appropriate processor
   │  │  └─ Extract text content
   │  │
   │  └─ Create searchable document object with:
   │     ├─ id (document ID)
   │     ├─ name (filename)
   │     ├─ title (document title)
   │     ├─ form_no (form number)
   │     ├─ content (extracted text)
   │     ├─ path (category/department/name)
   │     ├─ metadata (form_type, department, dates, etc.)
   │
   ├─ Batch documents (50 at a time)
   └─ SearchEngine.add_documents_to_meilisearch()
      └─ Meilisearch indexes for fast searching

3. SEARCH PHASE (when /api/search is called)
   ├─ User sends: {"query": "invoice"}
   │
   ├─ SearchEngine.search(query)
   │  ├─ Meilisearch finds all matching documents
   │  ├─ Highlights matching terms in results
   │  ├─ Shows context around matches
   │  └─ Ranks by relevance
   │
   └─ Return results to frontend
      ├─ List of matching documents
      ├─ Search took X milliseconds
      └─ Each result shows:
         ├─ Document name and title
         ├─ Form number
         ├─ Highlighted matching text
         ├─ Metadata (department, date, etc.)
```

---

## 🔍 Search Flow (Detailed)

### When user searches for "invoice 2024":

```
Frontend sends POST /api/search:
{
  "query": "invoice 2024",
  "limit": 20
}
      ↓
app/routes.py search() endpoint receives request
      ↓
get_or_create_search_engine() gets SearchEngine instance
      ↓
SearchEngine.search("invoice 2024", limit=20)
      ↓
Meilisearch processes query:
  - Looks for "invoice" AND "2024" in searchable fields
  - Matches against indexed documents
  - Highlights matches in content
  - Crops content to 200 chars around match
  - Ranks results by relevance
      ↓
Returns results:
{
  "hits": [
    {
      "id": "123",
      "name": "invoice_2024.pdf",
      "title": "Invoice Jan 2024",
      "form_no": "INV-2024-001",
      "content": "...invoice 2024...contextual text...",
      "_formatted": {  // Highlighted version
        "content": "...invoice <em>2024</em>...
      },
      "metadata": {
        "form_type": "Invoice",
        "department": "Finance"
      }
    },
    ... more results ...
  ],
  "query": "invoice 2024",
  "processingTimeMs": 5,
  "estimatedTotalHits": 47
}
      ↓
Frontend displays search results with highlighting
```

---

## 📑 Indexing Flow (Detailed)

### When `/api/index` is called:

```
User calls POST /api/index
      ↓
app/routes.py index_documents() endpoint receives request
      ↓
get_or_create_search_engine() gets SearchEngine instance
      ↓
SearchEngine.index_documents() starts:
      ↓
1. Get all documents from MySQL
   MySQLClient.get_all_documents()
   └─ Returns ~N documents with metadata
   
2. Initialize empty documents list and counters
   - documents = []
   - indexed_count = 0
   - failed_count = 0
   - skipped_count = 0
   
3. For each document in the list (loop):
   
   a) Download file content from database
      MySQLClient.download_file(document_id)
      └─ Returns binary file bytes
      └─ If fails → failed_count++, skip to next
   
   b) Extract text from file
      ProcessorFactory.process_document(file_bytes, filename)
      ├─ Determine file type: .pdf, .docx, .xlsx, etc.
      ├─ Get appropriate processor
      ├─ Extract text content
      ├─ Clean whitespace and special chars
      ├─ Truncate to MAX_TEXT_LENGTH (100,000 chars)
      └─ Return extracted text
      └─ If fails → skipped_count++, skip to next
   
   c) Create searchable document object
      document = {
        'id': '123',
        'name': 'invoice.pdf',
        'title': 'Invoice January 2024',
        'form_no': 'INV-2024-001',
        'content': 'extracted text content...',
        'path': 'Finance/Invoices/invoice.pdf',
        'mimeType': 'application/pdf',
        'size': '245500',
        'modifiedTime': '2024-02-04T10:30:00',
        'metadata': {
          'form_type': 'Invoice',
          'department': 'Finance',
          'effective_date': '2024-01-01',
          'revision_no': '1',
          'status': 'Active'
        }
      }
      └─ Add to documents list
      └─ indexed_count++
   
   d) If documents list reaches BATCH_SIZE (50):
      SearchEngine.index.add_documents(documents)
      └─ Send batch to Meilisearch
      └─ Meilisearch indexes these documents for searching
      └─ Reset documents list to []

4. After all documents processed:
   - If documents list not empty:
     SearchEngine.index.add_documents(documents)
     └─ Index final batch

5. Return statistics:
   {
     "total": 1000,
     "indexed": 950,
     "failed": 30,
     "skipped": 20
   }
```

### Example of what gets indexed:
```
Document 1:
  ID: doc_001, Name: form_A.pdf, Title: Form A, Content: "This is form A content..."

Document 2:
  ID: doc_002, Name: contract.docx, Title: Contract 2024, Content: "This contract states..."

... (950 more documents)
```

---

## 🔗 Function Reference

### By Module

#### `app/config.py`
```python
class Config:
    MYSQL_HOST              # Database host from .env
    MYSQL_USER              # Database user from .env
    MYSQL_PASSWORD          # Database password from .env
    MYSQL_DATABASE          # Database name from .env
    STORAGE_TYPE            # "mysql" or "drive"
    MEILISEARCH_HOST        # Search engine URL
    MAX_TEXT_LENGTH         # Max chars to extract (100,000)
    BATCH_SIZE              # Documents per batch (50)
    MAX_SEARCH_RESULTS      # Results limit (20)
    
    def validate()          # Check config is valid
```

#### `app/mysql_client.py`
```python
class MySQLClient:
    def __init__(host, user, password, database)    # Initialize connection
    def _connect()                                    # Establish DB connection
    def _ensure_connection()                          # Check connection is alive
    def get_all_documents() → List[Dict]             # Get all docs metadata
    def download_file(file_id) → bytes               # Get file content bytes
    def get_file_metadata(file_id) → Dict            # Get one doc's metadata

def get_mysql_client() → MySQLClient                 # Singleton instance
```

#### `app/processors/__init__.py`
```python
class ProcessorFactory:
    def get_processor(filename) → BaseProcessor      # Get right processor for file type
    def process_document(file_content, filename) → str   # Extract text from file

def get_processor_factory() → ProcessorFactory       # Singleton instance
```

#### `app/processors/base.py`
```python
class BaseProcessor (abstract):
    def extract_text(file_content, filename) → str   # Must implement (specific to each format)
    def clean_text(text) → str                       # Remove special chars
    def truncate_text(text, max_length) → str        # Limit text length
```

#### Specific Processors:
```python
class PDFProcessor(BaseProcessor)              # Extracts text from PDFs
class DOCXProcessor(BaseProcessor)             # Extracts text from Word docs
class TextProcessor(BaseProcessor)             # Reads plain text files
class ExcelProcessor(BaseProcessor)            # Extracts text from Excel
class PowerPointProcessor(BaseProcessor)       # Extracts text from PowerPoint
```

#### `app/search.py`
```python
class SearchEngine:
    def __init__()                                    # Initialize Meilisearch connection
    def _initialize_storage()                        # Set up MySQL client
    def _initialize_index()                          # Create/configure search index
    def index_documents(progress_callback) → Dict    # Index all docs from MySQL
    def search(query, limit, filters) → Dict         # Search for documents
    def get_stats() → Dict                           # Get index statistics
    def clear_index()                                # Delete all indexed documents

def get_search_engine() → SearchEngine               # Singleton instance
```

#### `app/routes.py`
```python
@api.route('/health', methods=['GET'])
def health_check() → Dict                    # API health status

@api.route('/search', methods=['POST'])
def search() → Dict                          # Search documents
# Request: {"query": "...", "limit": 10}
# Response: {"hits": [...], "query": "..."}

@api.route('/index', methods=['POST'])
def index_documents() → Dict                 # Index all documents
# Response: {"success": True, "stats": {...}}

@api.route('/index/clear', methods=['POST'])
def clear_index() → Dict                     # Clear search index
# Response: {"success": True, "message": "..."}

@api.route('/stats', methods=['GET'])
def get_stats() → Dict                       # Get index statistics

@api.route('/document/<document_id>', methods=['GET'])
def get_document(document_id) → Dict         # Get specific document metadata

@api.route('/documents', methods=['GET'])
def list_documents() → Dict                  # List all documents with pagination
# Query: ?limit=100&offset=0
```

---

## 📡 API Endpoints

### 1. Health Check
```
GET /api/health

Response:
{
  "status": "healthy",
  "storage": "mysql",
  "message": "Document Search API is running"
}
```

### 2. Search
```
POST /api/search

Request:
{
  "query": "invoice 2024",
  "limit": 20,
  "filters": "mimeType = 'application/pdf'"
}

Response:
{
  "hits": [
    {
      "id": "doc_001",
      "name": "invoice_jan.pdf",
      "title": "January Invoice",
      "form_no": "INV-2024-001",
      "content": "extracted content...",
      "metadata": {...}
    }
  ],
  "query": "invoice 2024",
  "processingTimeMs": 5,
  "estimatedTotalHits": 47
}
```

### 3. Index Documents
```
POST /api/index

Response:
{
  "success": true,
  "stats": {
    "total": 1000,
    "indexed": 950,
    "failed": 30,
    "skipped": 20
  }
}
```

### 4. Clear Index
```
POST /api/index/clear

Response:
{
  "success": true,
  "message": "Index cleared successfully"
}
```

### 5. Get Statistics
```
GET /api/stats

Response:
{
  "numberOfDocuments": 950,
  "isIndexing": false,
  "fieldDistribution": {
    "id": 950,
    "name": 950,
    "content": 950,
    ...
  }
}
```

### 6. Get Document
```
GET /api/document/doc_001

Response:
{
  "id": "doc_001",
  "name": "invoice_jan.pdf",
  "title": "January Invoice",
  "form_no": "INV-2024-001",
  "mimeType": "application/pdf",
  "size": "245500",
  "modifiedTime": "2024-02-04T10:30:00",
  "metadata": {...}
}
```

### 7. List Documents
```
GET /api/documents?limit=100&offset=0

Response:
{
  "documents": [
    {
      "id": "doc_001",
      "name": "invoice_jan.pdf",
      ...
    },
    ...
  ],
  "total": 1000,
  "limit": 100,
  "offset": 0
}
```

---

## 🔄 Complete Example: Upload, Index, and Search

### Step 1: Document is stored in MySQL
```
User uploads: invoice_2024.pdf
↓
File saved in FORMS_MASTER table:
  - FORMS_MASTER_ID = 123
  - DOCFILE_NAME = "invoice_2024.pdf"
  - DOCFILE_CONTENT = [binary file data]
  - TITLE = "Invoice 2024"
  - FORM_NO = "INV-2024-001"
```

### Step 2: Admin calls /api/index
```
POST /api/index

Backend:
1. Queries MySQL for all documents
2. Downloads invoice_2024.pdf bytes
3. Uses PDFProcessor to extract text:
   - Text: "Invoice 2024, Date: Feb 4, Amount: $5,000..."
4. Creates searchable document:
   {
     "id": "123",
     "name": "invoice_2024.pdf",
     "title": "Invoice 2024",
     "content": "Invoice 2024, Date: Feb 4, Amount: $5,000...",
     ...
   }
5. Sends to Meilisearch for indexing

Response:
{
  "success": true,
  "stats": {
    "indexed": 1,
    ...
  }
}
```

### Step 3: User searches via frontend
```
Frontend sends: POST /api/search
{
  "query": "invoice amount 5000"
}

Backend:
1. SearchEngine receives query
2. Meilisearch searches indexed documents
3. Finds match: "Invoice 2024" document
4. Highlights: "invoice amount 5000"
5. Returns result

Response:
{
  "hits": [
    {
      "id": "123",
      "name": "invoice_2024.pdf",
      "title": "Invoice 2024",
      "content": "Invoice 2024, Date: Feb 4, Amount: $5,000...",
      "_formatted": {
        "content": "<em>invoice</em> ... <em>amount</em> $<em>5000</em>..."
      },
      "metadata": {...}
    }
  ],
  "query": "invoice amount 5000",
  "processingTimeMs": 2,
  "estimatedTotalHits": 1
}

Frontend displays:
- Document title: "Invoice 2024"
- Highlighted matching terms
- Quick preview of content
- Link to open full document
```

---

## 🎓 Key Concepts

### Singleton Pattern
Functions like `get_mysql_client()` and `get_search_engine()` return the same instance every time they're called. This:
- Reuses database connections
- Reduces memory usage
- Ensures consistency

### Processor Factory Pattern
ProcessorFactory determines which processor to use based on file extension. This allows:
- Easy addition of new file types
- Each processor handles one format
- Reusable text extraction logic

### Batch Processing
Documents are indexed in batches (50 at a time) because:
- Faster than sending one by one
- More efficient network usage
- Meilisearch handles large batches better

### Full-Text Search
Meilisearch searches:
- All searchable fields (name, title, content, form_no)
- Finds partial matches (typo tolerance)
- Ranks by relevance
- Returns with highlighting and context

---

## 🚀 Typical Workflow

```
1. User logs in to frontend
   └─ Frontend loads list of documents
   └─ Calls GET /api/documents to fetch list

2. User enters search query: "invoice"
   └─ Frontend calls POST /api/search with query
   └─ Backend searches Meilisearch
   └─ Returns matching documents with highlighting
   └─ Frontend displays results

3. Admin wants to update documents
   └─ Documents added to MySQL database
   └─ Admin calls POST /api/index
   └─ Backend extracts text from all documents
   └─ Sends to Meilisearch for indexing
   └─ Next search will include new documents

4. User clicks on search result
   └─ Frontend shows document details
   └─ Calls GET /api/document/<id> for full metadata
   └─ Backend returns from MySQL
   └─ Frontend displays metadata
```

---

## 📝 Summary Table

| Component | Purpose | Input | Output |
|-----------|---------|-------|--------|
| Config | Configuration management | Environment variables | Settings object |
| MySQLClient | Database operations | Document ID | File bytes/metadata |
| ProcessorFactory | Text extraction | File bytes + filename | Extracted text |
| SearchEngine | Search indexing | Documents from MySQL | Indexed in Meilisearch |
| Routes | API endpoints | HTTP requests | JSON responses |

---

Generated: 2026-02-04
Document Type: System Architecture & Function Explanation
Status: Complete ✅
