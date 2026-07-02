# Production WSGI entry point
# Gunicorn: gunicorn -c gunicorn.conf.py wsgi:app
from app import app

if __name__ == "__main__":
    app.run()
