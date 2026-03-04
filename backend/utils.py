import os
import firebase_admin
from firebase_admin import credentials, db, storage
from dotenv import load_dotenv

load_dotenv()

if not firebase_admin._apps:
    BASE_DIR = os.path.dirname(os.path.abspath(__file__))
    cred_path = os.path.join(BASE_DIR, "serviceAccountKey.json")
    cred = credentials.Certificate(cred_path)
    firebase_admin.initialize_app(cred, {
        'databaseURL': os.getenv('DATABASE_URL'),
        'storageBucket': os.getenv('STORAGE_BUCKET', 'smartwaste-26682.firebasestorage.app')
    })

# Reference to database root
database = db.reference()

def init_firebase():
    """No-op for backward compatibility, initialization is now on module import."""
    pass

def get_db():
    return db.reference()

def get_bucket():
    return storage.bucket()
