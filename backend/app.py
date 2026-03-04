from flask import Flask, render_template, jsonify, request, redirect, url_for, session, send_from_directory
import os
import requests
import uuid
from werkzeug.utils import secure_filename
from flask_cors import CORS
from dotenv import load_dotenv
from firebase_admin import db
from utils import database, get_bucket
from optimizer import RouteOptimizer
from traffic_engine import TrafficEngine

load_dotenv()

# Initialize Flask with frontend as template and static folders
frontend_path = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "frontend"))
app = Flask(__name__, 
            template_folder=frontend_path,
            static_folder=frontend_path,
            static_url_path='')
app.secret_key = "supersecretkey123"   # change in production
CORS(app) # Allow cross-origin requests

# Upload Configuration
UPLOAD_FOLDER = os.path.join(app.root_path, 'static', 'uploads')
app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER
os.makedirs(UPLOAD_FOLDER, exist_ok=True)

# Initialize Engines
bucket = get_bucket()
optimizer = RouteOptimizer()
TOMTOM_API_KEY = os.getenv("TOMTOM_API_KEY")

@app.route("/favicon.ico")
def favicon():
    return send_from_directory(app.static_folder, "assets/favicon.ico") if os.path.exists(os.path.join(app.static_folder, "assets/favicon.ico")) else ("", 204)

# =========================
# STATIC FRONTEND ROUTES
# =========================
@app.route("/")
def home():
    return render_template("home.html")

@app.route("/report")
def report_page():
    return render_template("index.html")

@app.route("/admin")
def admin_page():
    return render_template("admin.html")

@app.route("/worker")
def worker_page():
    return render_template("worker.html")

@app.route("/admin-login")
def admin_login_page():
    return render_template("admin_login.html")

@app.route("/worker-login")
def worker_login_page():
    return render_template("worker_login.html")

# Combined static file server (for js, css, assets)
@app.route("/<path:filename>")
def serve_static(filename):
    return send_from_directory(app.static_folder, filename)

# =========================
# API ROUTES (Preserved & Enhanced)
# =========================
@app.route("/", methods=["GET"])
def health_check():
    return jsonify({"status": "healthy", "message": "Smart Waste API is running"}), 200

@app.route("/api/admin-login", methods=["POST"])
def api_admin_login():
    data = request.json
    admin_id = data.get("admin_id")
    password = data.get("password")

    if admin_id == "admin" and password == "admin123":
        return jsonify({"success": True, "redirect": "/admin"})
    return jsonify({"success": False, "error": "Invalid admin credentials"}), 401

@app.route("/api/worker-login", methods=["POST"])
def api_worker_login():
    data = request.json
    worker_id = data.get("worker_id")
    password = data.get("password")

    if worker_id == "worker" and password == "1234":
        return jsonify({"success": True, "redirect": "/worker"})
    return jsonify({"success": False, "error": "Invalid worker credentials"}), 401
@app.route("/api/bins", methods=["GET"])
def get_bins():
    try:
        bins_ref = db.reference("bins")
        data = bins_ref.get()

        if not data:
            return jsonify({})

        return jsonify(data)

    except Exception as e:
        print("ERROR loading bins:", e)
        return jsonify({"error": str(e)}), 500

@app.route('/api/bins/update/<bin_id>', methods=['POST'])
def update_bin(bin_id):
    try:
        data = request.json
        db.reference("bins").child(bin_id).update(data)
        return jsonify({"success": True})
    except Exception as e:
        print("UPDATE ERROR:", e)
        return jsonify({"success": False, "error": str(e)}), 500

@app.route("/api/reports", methods=["GET"])
def get_reports():
    try:
        reports_ref = db.reference("reports")
        data = reports_ref.get()

        if not data:
            return jsonify({})

        return jsonify(data)

    except Exception as e:
        print("ERROR:", e)
        return jsonify({"error": str(e)}), 500

@app.route("/api/reports/update/<report_id>", methods=["POST"])
def update_report(report_id):
    try:
        # Use the standard reference method to ensure reliability
        db.reference("reports").child(report_id).update({
            "status": "resolved"
        })

        return jsonify({"success": True})

    except Exception as e:
        print("UPDATE ERROR:", e)
        return jsonify({"success": False, "error": str(e)}), 500

@app.route("/api/reports", methods=["POST"])
def add_report():
    try:
        data = request.json

        report_data = {
            "reporterName": data.get("reporterName"),
            "reportType": data.get("reportType"),
            "description": data.get("description"),
            "lat": data.get("lat"),
            "lng": data.get("lng"),
            "image_url": data.get("image_url"),
            "status": "pending",
            "timestamp": data.get("timestamp")
        }

        # Push to Firebase under "reports"
        reports_ref = db.reference("reports")
        reports_ref.push(report_data)

        return jsonify({"success": True})

    except Exception as e:
        print("ERROR:", e)
        return jsonify({"success": False, "error": str(e)}), 500

@app.route("/api/upload", methods=["POST"])
def upload_file():
    try:
        if 'file' not in request.files:
            return jsonify({"error": "No file part"}), 400
        
        file = request.files['file']
        if file.filename == '':
            return jsonify({"error": "No selected file"}), 400
        
        if file:
            # 1. Generate unique filename
            filename = str(uuid.uuid4()) + "_" + secure_filename(file.filename)
            
            # 2. Upload to Firebase Storage
            blob = bucket.blob(f"reports/{filename}")
            blob.upload_from_file(file, content_type=file.content_type)
            
            # 3. Make it publicly accessible
            blob.make_public()
            
            # 4. Return the public URL
            image_url = blob.public_url
            return jsonify({"success": True, "image_url": image_url})
            
    except Exception as e:
        print("Upload Error:", e)
        return jsonify({"success": False, "error": str(e)}), 500

@app.route("/api/optimize-route", methods=["POST"])
def optimize_route():
    try:
        data = request.json
        bins = data.get("bins", [])
        start_coords = data.get("start", [9.9252, 78.1198]) # Default to Madurai center

        if not bins:
            return jsonify({"error": "No bins provided"}), 400

        # 1. Use strategic optimizer to get the best order
        optimized_bin_sequence = optimizer.optimize_route(start_coords, bins)

        # 2. Format locations for TomTom API (lat,long) - EXACT TomTom order
        # Sequence: Start -> Bin1 -> Bin2 -> ...
        locations_list = [f"{start_coords[0]},{start_coords[1]}"] # lat,lng
        for b in optimized_bin_sequence:
            locations_list.append(f"{b['lat']},{b['lng']}") # lat,lng
            
        locations = ":".join(locations_list)

        url = f"https://api.tomtom.com/routing/1/calculateRoute/{locations}/json"
        
        params = {
            "key": TOMTOM_API_KEY,
            "routeType": "fastest",
            "traffic": "true"
        }

        print(f"DEBUG: Routing request for {len(locations_list)} locations")
        response = requests.get(url, params=params)
        route_data = response.json()
        
        if response.status_code != 200:
            print("TOMTOM ERROR:", route_data)
            error_msg = route_data.get("errorText") or route_data.get("detailedError", {}).get("message") or "TomTom API Error"
            return jsonify({"success": False, "error": error_msg}), response.status_code

        return jsonify({
            "success": True,
            "optimized_bins": optimized_bin_sequence,
            "route": route_data
        })

    except Exception as e:
        print("Optimization Error:", e)
        return jsonify({"success": False, "error": str(e)}), 500

if __name__ == "__main__":
    port = int(os.environ.get('PORT', 5000))
    app.run(host='0.0.0.0', port=port, debug=True)
