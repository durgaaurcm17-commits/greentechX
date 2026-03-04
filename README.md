# GreenTechX - Smart Waste Management System

GreenTechX is an intelligent waste management and route optimization platform designed to improve urban cleanliness and operational efficiency.

## 🚀 Features

- **Citizen Reporting**: Public portal for reporting waste overflow or issues with GPS location and photo uploads.
- **Admin Dashboard**: Comprehensive overview of all reports with status tracking (Pending/Resolved).
- **Worker Dashboard**: Real-time route optimization for waste collection based on bin fill levels and reported issues.
- **Strategic Optimization**: Advanced routing engine that considers traffic, capacity, and priority.
- **Image Inspection**: Integrated image modal for admins to inspect reported issues in detail.

## 🛠️ Technology Stack

- **Backend**: Python (Flask)
- **Database**: Firebase Realtime Database
- **Storage**: Firebase Storage (for images)
- **Frontend**: Vanilla JS, CSS3, HTML5
- **Maps**: TomTom Maps SDK
- **Optimization**: Custom Strategic Routing Engine

## 🚦 Getting Started

1. **Clone the repository**:
   ```bash
   git clone https://github.com/durgaaurcm17-commits/greentechX.git
   ```

2. **Install dependencies**:
   ```bash
   pip install -r backend/requirements.txt
   ```

3. **Configure Environment**:
   - Create a `.env` file with your Firebase and TomTom API credentials.
   - Place your `serviceAccountKey.json` in the `backend/` directory.

4. **Run the application**:
   ```bash
   python backend/app.py
   ```

---
Built with ❤️ for a cleaner environment.
