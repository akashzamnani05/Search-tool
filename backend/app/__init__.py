"""
Flask application factory.
Creates and configures the Flask application.
"""
from flask import Flask
from flask_cors import CORS
from app.config import Config
from app.routes import api


def create_app():
    """
    Create and configure Flask application.
    
    Returns:
        Configured Flask app instance
    """
    app = Flask(__name__)
    
    # Load configuration
    config = Config()
    app.config.from_object(config)
    
    # Validate configuration
    try:
        config.validate()
    except ValueError as e:
        print(f"Configuration error: {e}")
        raise
    
    # Enable CORS
    CORS(app, resources={
        r"/api/*": {
            "origins": config.CORS_ORIGINS,
            "methods": ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
            "allow_headers": ["Content-Type", "Authorization"]
        }
    })
    
    # Register blueprints
    app.register_blueprint(api)
    
    # Add root route
    @app.route('/')
    def index():
        return {
            'message': 'Document Search API',
            'version': '1.0.0',
            'endpoints': {
                'health': '/api/health',
                'search': '/api/search',
                'index': '/api/index',
                'stats': '/api/stats',
                'config': '/api/config'
            }
        }
    
    return app