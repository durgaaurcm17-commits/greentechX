
import os
import sys
import time

print("Starting test...")

try:
    import flask
    print("Flask imported")
    import firebase_admin
    print("firebase-admin imported")
    
    # Try to import our code
    sys.path.append(os.path.join(os.getcwd(), 'backend'))
    import utils
    print("Utils imported (Firebase initialized)")
    
    from firebase_admin import db
    start_time = time.time()
    print("Pinging database...")
    ref = db.reference("bins")
    data = ref.get()
    end_time = time.time()
    print(f"Database ping successful in {end_time - start_time:.2f}s")
    
except Exception as e:
    print(f"Error: {e}")
