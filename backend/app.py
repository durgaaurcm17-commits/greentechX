from flask import Flask, render_template, jsonify, request, redirect, url_for, session
import os
import requests
import uuid
from werkzeug.utils import secure_filename
from dotenv import load_dotenv
from firebase_admin import db
from utils import database, get_bucket
from optimizer import RouteOptimizer
from traffic_engine import TrafficEngine

load_dotenv()

app = Flask(__name__)
app.secret_key = "supersecretkey123"   # change in production

# Upload Configuration
UPLOAD_FOLDER = os.path.join(app.root_path, 'static', 'uploads')
app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER
os.makedirs(UPLOAD_FOLDER, exist_ok=True)

# Initialize Engines
bucket = get_bucket()
optimizer = RouteOptimizer()
TOMTOM_API_KEY = os.getenv("TOMTOM_API_KEY")

# =========================
# HOME
# =========================
@app.route("/")
def home():
    return render_template("home.html")

# =========================
# PUBLIC PORTAL
# =========================
@app.route("/public")
def public():
    return render_template("index.html")

# =========================
# WORKER LOGIN & DASHBOARD
# =========================
@app.route("/worker-login", methods=["GET", "POST"])
def worker_login():
    if request.method == "POST":
        worker_id = request.form["worker_id"]
        password = request.form["password"]

        if worker_id == "worker" and password == "1234":
            session["worker_logged_in"] = True
            return redirect(url_for("worker_dashboard"))
        else:
            return render_template("worker_login.html", error="Invalid credentials")

    return render_template("worker_login.html")

@app.route("/worker")
def worker_dashboard():
    if not session.get("worker_logged_in"):
        return redirect(url_for("worker_login"))
    return render_template("worker.html")

# =========================
# ADMIN LOGIN & DASHBOARD
# =========================
@app.route("/admin-login", methods=["GET", "POST"])
def admin_login():
    if request.method == "POST":
        admin_id = request.form["admin_id"]
        password = request.form["password"]

        if admin_id == "admin" and password == "admin123":
            session["admin_logged_in"] = True
            return redirect(url_for("admin_dashboard"))
        else:
            return render_template("admin_login.html", error="Invalid credentials")

    return render_template("admin_login.html")

@app.route("/admin")
def admin_dashboard():
    if not session.get("admin_logged_in"):
        return redirect(url_for("admin_login"))
    return render_template("admin.html")

# =========================
# LOGOUT
# =========================
@app.route("/logout")
def logout():
    session.clear()
    return redirect(url_for("home"))

# =========================
# API ROUTES (Preserved & Enhanced)
# =========================
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
    data = request.json
    db_ref.child(f'bins/{bin_id}').update(data)
    return jsonify({"success": True})

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
            filename = str(uuid.uuid4()) + "_" + secure_filename(file.filename)
            file_path = os.path.join(app.config['UPLOAD_FOLDER'], filename)
            file.save(file_path)
            
            # Return the relative path for the frontend to use
            image_url = f"/static/uploads/{filename}"
            return jsonify({"success": True, "image_url": image_url})
            
    except Exception as e:
        print("Upload Error:", e)
        return jsonify({"success": False, "error": str(e)}), 500

@app.route("/api/optimize-route", methods=["POST"])
def optimize_route():
    try:
        data = request.json
        bins = data.get("bins", [])

        if not bins:
            return jsonify({"error": "No bins provided"}), 400

        # Format locations as lng,lat:lng,lat
        locations = ":".join(
            [f"{b['lng']},{b['lat']}" for b in bins]
        )

        url = f"https://api.tomtom.com/routing/1/calculateRoute/{locations}/json"

        params = {
            "key": TOMTOM_API_KEY,
            "routeType": "fastest",
            "traffic": "true"
        }

        response = requests.get(url, params=params)
        return jsonify(response.json())

    except Exception as e:
        print("Optimization Error:", e)
        return jsonify({"error": str(e)}), 500

if __name__ == "__main__":
    port = int(os.environ.get('PORT', 5000))
    app.run(host='0.0.0.0', port=port, debug=True)
