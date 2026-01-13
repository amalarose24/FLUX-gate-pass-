from flask import Flask, request, jsonify
from flask_cors import CORS
from datetime import datetime

app = Flask(__name__)
CORS(app) # Allow React to talk to Python

# --- MOCK DATABASE (In-Memory for now, can be SQLite) ---
# This makes it easier to run without installing SQL tools
users_db = {
    "student": {"pass": "123", "role": "student", "name": "Arjun K", "dept": "CS"},
    "guard":   {"pass": "123", "role": "guard",   "name": "Security"},
    "warden":  {"pass": "123", "role": "warden",  "name": "Hostel Warden"},
    "advisor": {"pass": "123", "role": "advisor", "name": "Class Advisor"}
}

# Store Passes and Logs in memory
active_passes = [] 
access_logs = []

@app.route('/login', methods=['POST'])
def login():
    data = request.json
    user = users_db.get(data['username'])
    if user and user['pass'] == data['password']:
        return jsonify({"success": True, "user": user})
    return jsonify({"success": False}), 401

@app.route('/create_pass', methods=['POST'])
def create_pass():
    # Frontend sends pass data here
    data = request.json
    new_pass = {
        "id": len(active_passes) + 1,
        "name": data['user'],
        "type": data['reason'],
        "status": "Approved", # Auto-approve for demo
        "timestamp": datetime.now().strftime("%I:%M %p")
    }
    active_passes.append(new_pass)
    return jsonify({"success": True, "pass": new_pass})

@app.route('/scan', methods=['POST'])
def scan():
    data = request.json
    qr_text = data.get('qr_text', '')
    
    # Logic: QR Format is "PASS:Name:Reason:Type"
    try:
        parts = qr_text.split(':')
        name = parts[1]
        reason = parts[2]
        
        # Log the scan
        log_entry = {
            "name": name,
            "type": reason,
            "time": datetime.now().strftime("%I:%M %p"),
            "status": "EXIT"
        }
        access_logs.append(log_entry)
        
        return jsonify({"success": True, "data": log_entry})
    except:
        return jsonify({"success": False, "message": "Invalid QR Format"})

if __name__ == '__main__':
    # Runs on port 5000
    app.run(host='0.0.0.0', port=5000, debug=True)