"""
Test MSSQL connection and basic queries.
Run this script to verify your MSSQL configuration is working.
"""
import os
import sys
from dotenv import load_dotenv
from pathlib import Path

# Load environment variables
env_file = Path(__file__).parent / '.env'
if env_file.exists():
    load_dotenv(env_file)
    print(f"✓ Loaded environment variables from {env_file}\n")
else:
    print(f"⚠ No .env file found at {env_file}")
    print("Using environment variables from system\n")

# Try to import pymssql

import pymssql
print("✓ pymssql library is installed\n")


# Get configuration
MSSQL_HOST = os.getenv('MSSQL_HOST')
MSSQL_PORT = int(os.getenv('MSSQL_PORT', '1433'))
MSSQL_USER = os.getenv('MSSQL_USER')
MSSQL_PASSWORD = os.getenv('MSSQL_PASSWORD')
MSSQL_DATABASE = os.getenv('MSSQL_DATABASE')

print("="*60)
print("MSSQL Connection Test")
print("="*60)
print(f"Host:     {MSSQL_HOST}")
print(f"Port:     {MSSQL_PORT}")
print(f"User:     {MSSQL_USER}")
print(f"Database: {MSSQL_DATABASE}")
print(f"Password: {'*' * len(MSSQL_PASSWORD) if MSSQL_PASSWORD else '(not set)'}")
print("="*60 + "\n")

# Check if configuration is complete
if not all([MSSQL_HOST, MSSQL_USER, MSSQL_PASSWORD, MSSQL_DATABASE]):
    print("✗ MSSQL configuration is incomplete!")
    print("\nRequired environment variables:")
    print("  - MSSQL_HOST")
    print("  - MSSQL_PORT (default: 1433)")
    print("  - MSSQL_USER")
    print("  - MSSQL_PASSWORD")
    print("  - MSSQL_DATABASE")
    print("\nPlease update your .env file with the correct values.")
    sys.exit(1)

# Test connection
print("Testing connection...")
try:
    connection = pymssql.connect(
        server=MSSQL_HOST,
        user=MSSQL_USER,
        password=MSSQL_PASSWORD,
        database=MSSQL_DATABASE,
        port=MSSQL_PORT,
        timeout=30,
        login_timeout=30
    )
    print("✓ Connection successful!\n")
    
    # Test basic query
    print("Testing basic query (SELECT @@VERSION)...")
    cursor = connection.cursor()
    cursor.execute("SELECT @@VERSION")
    version = cursor.fetchone()
    print(f"✓ Server Version: {version[0][:100]}...\n")
    cursor.close()
    
    # Test FORMS_MASTER table
    print("Testing FORMS_MASTER table...")
    cursor = connection.cursor(as_dict=True)
    
    # Check if table exists
    cursor.execute("""
        SELECT COUNT(*) as count 
        FROM INFORMATION_SCHEMA.TABLES 
        WHERE TABLE_NAME = 'FORMS_MASTER'
    """)
    result = cursor.fetchone()
    
    if result['count'] == 0:
        print("✗ FORMS_MASTER table does not exist in the database")
        cursor.close()
        connection.close()
        sys.exit(1)
    
    print("✓ FORMS_MASTER table exists")
    
    # Count total documents
    cursor.execute("""
        SELECT COUNT(*) as total
        FROM FORMS_MASTER
        WHERE IsActive = 1
            AND DOCFILE_CONTENT IS NOT NULL
            AND DOCFILE_NAME IS NOT NULL
    """)
    result = cursor.fetchone()
    total_docs = result['total']
    print(f"✓ Found {total_docs} active documents in FORMS_MASTER\n")
    
    # Show sample documents
    if total_docs > 0:
        print("Sample documents (first 5):")
        cursor.execute("""
            SELECT TOP 5
                FORMS_MASTER_ID as id,
                DOCFILE_NAME as name,
                TITLE as title,
                FORM_NO as form_no,
                FORM_TYPE as form_type,
                DATALENGTH(DOCFILE_CONTENT) as size_bytes
            FROM FORMS_MASTER
            WHERE IsActive = 1
                AND DOCFILE_CONTENT IS NOT NULL
                AND DOCFILE_NAME IS NOT NULL
            ORDER BY UpdateDate DESC
        """)
        
        docs = cursor.fetchall()
        for i, doc in enumerate(docs, 1):
            size_mb = doc['size_bytes'] / (1024 * 1024) if doc['size_bytes'] else 0
            print(f"\n  {i}. {doc['name']}")
            print(f"     ID:        {doc['id']}")
            print(f"     Title:     {doc['title'] or 'N/A'}")
            print(f"     Form No:   {doc['form_no'] or 'N/A'}")
            print(f"     Form Type: {doc['form_type'] or 'N/A'}")
            print(f"     Size:      {size_mb:.2f} MB")
    
    cursor.close()
    connection.close()
    
    print("\n" + "="*60)
    print("✓ All tests passed successfully!")
    print("="*60)
    print("\nYou can now run the application with:")
    print("  python run.py --index")
    print("\n")

except pymssql.Error as e:
    print(f"✗ Connection failed: {e}\n")
    print("Troubleshooting:")
    print("1. Check if the server address is correct")
    print("2. Verify your username and password")
    print("3. Ensure the database name is correct")
    print("4. Check if the server allows remote connections")
    print("5. Verify firewall settings (port 1433)")
    print("6. Check if SQL Server authentication is enabled")
    sys.exit(1)

except Exception as e:
    print(f"✗ Unexpected error: {e}")
    import traceback
    traceback.print_exc()
    sys.exit(1)