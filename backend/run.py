"""
Main application entry point.
Run this file to start the Flask development server.
"""
import sys
import os
import argparse
from pathlib import Path
import logging
from flask_cors import CORS

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Load environment variables from .env file
try:
    from dotenv import load_dotenv
    env_file = Path(__file__).parent / '.env'
    if env_file.exists():
        load_dotenv(env_file)
        logger.info(f"Loaded environment variables from {env_file}")
    else:
        logger.warning(f"No .env file found at {env_file}")
        logger.warning("Please copy .env.example to .env and update the values")
except ImportError:
    logger.warning("python-dotenv not installed. Environment variables must be set manually.")

try:
    from app import create_app
    from app.search import get_search_engine
except ImportError:
    # Try without app package structure
    print("Warning: Could not import from 'app' package, trying direct imports...")
    try:
        # Assuming files are in current directory
        sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
        from app.search import get_search_engine
        
        # Create a simple Flask app if create_app doesn't exist
        from flask import Flask
        from flask_cors import CORS
        
        def create_app():
            app = Flask(__name__)
            CORS(app)
            app.config['DEBUG'] = True
            
            # Import and register blueprint
            
            from app.routes import api
            
            
            app.register_blueprint(api)
            return app
    except ImportError as e:
        print(f"Error: Could not import required modules: {e}")
        print("\nPlease ensure:")
        print("1. All files are in the correct directory")
        print("2. Dependencies are installed: pip install -r requirements.txt")
        print("3. Run 'python test_imports.py' to diagnose import issues")
        sys.exit(1)


def run_indexing():
    """Run document indexing"""
    print("\n" + "="*60)
    print("Starting Document Indexing")
    print("="*60)
    print("This may take a while depending on the number of documents.\n")
    
    try:
        search_engine = get_search_engine()
        stats = search_engine.index_documents()
        
        print("\n" + "="*60)
        print("Indexing Summary")
        print("="*60)
        print(f"  Total files:          {stats['total']}")
        print(f"  Successfully indexed: {stats['indexed']}")
        print(f"  Failed:               {stats['failed']}")
        print(f"  Skipped:              {stats['skipped']}")
        print("="*60)
        
        return 0
    
    except Exception as e:
        print(f"\nIndexing failed: {e}")
        print("\nTroubleshooting:")
        print("1. Check Meilisearch is running: curl http://127.0.0.1:7700/health")
        print("2. Check MSSQL connection: python test_mssql.py")
        print("3. Run diagnostics: python check_meilisearch.py")
        return 1


def check_prerequisites():
    """Check if prerequisites are met"""
    print("Checking prerequisites...")
    
    errors = []
    
    # Check Meilisearch
    try:
        import requests
        response = requests.get('http://127.0.0.1:7700/health', timeout=2)
        if response.status_code == 200:
            print("  ✓ Meilisearch is running")
        else:
            errors.append("Meilisearch responded with unexpected status")
    except Exception as e:
        errors.append(f"Cannot connect to Meilisearch: {e}")
        print("  ✗ Meilisearch not running")
        print("    Start it with: ./meilisearch --no-analytics")
    
    
    
    if errors:
        print("\n❌ Prerequisites check failed:")
        for error in errors:
            print(f"   - {error}")
        return False
    
    print("✓ All prerequisites met\n")
    return True


def main():
    """Main entry point"""
    parser = argparse.ArgumentParser(description='Document Search System - MSSQL Backend')
    parser.add_argument(
        '--index',
        action='store_true',
        help='Run document indexing before starting server'
    )
    parser.add_argument(
        '--index-only',
        action='store_true',
        help='Run document indexing and exit (don\'t start server)'
    )
    parser.add_argument(
        '--port',
        type=int,
        default=5001,
        help='Port to run the server on (default: 5001)'
    )
    parser.add_argument(
        '--host',
        type=str,
        default='0.0.0.0',
        help='Host to run the server on (default: 0.0.0.0)'
    )
    parser.add_argument(
        '--skip-checks',
        action='store_true',
        help='Skip prerequisite checks'
    )
    
    args = parser.parse_args()
    
    print("\n" + "="*60)
    print(" Document Search System - MSSQL Backend")
    print("="*60)
    print(f"Storage: {os.getenv('STORAGE_TYPE')}")
    print(f"MSSQL: {os.getenv('MSSQL_HOST')}/{os.getenv('MSSQL_DATABASE')}")
    print("="*60 + "\n")
    
    # Check prerequisites
    if not args.skip_checks and not args.index_only:
        if not check_prerequisites():
            print("\nFix the issues above before starting the server.")
            print("Or run with --skip-checks to bypass these checks.\n")
            sys.exit(1)
    
    # Handle index-only mode
    if args.index_only:
        sys.exit(run_indexing())
    
    # Run indexing if requested
    if args.index:
        result = run_indexing()
        if result != 0:
            print("\n⚠ Warning: Indexing had errors, but starting server anyway...")
            print("You can re-index later using: curl -X POST http://localhost:{args.port}/api/index\n")
        else:
            print()
    
    # Create and run Flask app
    try:
        app = create_app()
        CORS(app)
    except Exception as e:
        print(f"Failed to create Flask app: {e}")
        sys.exit(1)
    
    print("="*60)
    print("Document Search API - Server Starting")
    print("="*60)
    print(f"Server URL:     http://{args.host}:{args.port}")
    print(f"\nAPI Endpoints:")
    print(f"  Health:       http://localhost:{args.port}/api/health")
    print(f"  Search:       http://localhost:{args.port}/api/search")
    print(f"  Index:        http://localhost:{args.port}/api/index")
    print(f"  Clear Index:  http://localhost:{args.port}/api/index/clear")
    print(f"  Stats:        http://localhost:{args.port}/api/stats")
    print(f"  Documents:    http://localhost:{args.port}/api/documents")
    print(f"\nPress CTRL+C to stop the server")
    print("="*60 + "\n")
    
    try:
        app.run(
            host=args.host,
            port=args.port,
            debug=True
        )
    except KeyboardInterrupt:
        print("\n\nServer stopped by user.")
        sys.exit(0)
    except Exception as e:
        print(f"\n\nServer error: {e}")
        sys.exit(1)


if __name__ == '__main__':
    main()