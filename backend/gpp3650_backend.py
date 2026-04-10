"""
GPP-3650 Power Supply Remote Control Backend
Provides REST API for controlling and monitoring the power supply via RS-232
"""

import serial
import json
import time
import threading
from flask import Flask, request, jsonify
from flask_cors import CORS
from datetime import datetime
from collections import deque

app = Flask(__name__)
CORS(app, resources={r"/api/*": {"origins": "*"}})

# Global variables
ser = None
is_connected = False
monitoring_active = False
monitoring_thread = None
data_buffer = deque(maxlen=1000)  # Keep last 1000 readings

class GPP3650Controller:
    def __init__(self, com_port, baudrate=9600):
        self.com_port = com_port
        self.baudrate = baudrate
        self.serial_conn = None
        self.is_connected = False
        
    def connect(self):
        """Establish serial connection to GPP-3650"""
        try:
            self.serial_conn = serial.Serial(
                port=self.com_port,
                baudrate=115200,  # Maximum baud rate for faster communication
                bytesize=serial.EIGHTBITS,
                parity=serial.PARITY_NONE,
                stopbits=serial.STOPBITS_ONE,
                timeout=2
            )
            time.sleep(0.5)  # Wait for connection to stabilize
            self.is_connected = True
            return True, "Connected successfully"
        except serial.SerialException as e:
            self.is_connected = False
            return False, f"Connection failed: {str(e)}"
    
    def disconnect(self):
        """Close serial connection"""
        if self.serial_conn and self.serial_conn.is_open:
            self.serial_conn.close()
            self.is_connected = False
            return True, "Disconnected"
        return False, "Not connected"
    
    def send_command(self, command):
        """Send command to GPP-3650 and return response"""
        if not self.is_connected or not self.serial_conn:
            return None, "Not connected"
        
        try:
            # Clear input buffer
            self.serial_conn.reset_input_buffer()
            
            # Send command with newline terminator
            cmd_str = command + '\n'
            self.serial_conn.write(cmd_str.encode())
            
            # For query commands (ending with ?), read response
            if command.strip().endswith('?'):
                response = self.serial_conn.readline().decode().strip()
                return response, None
            else:
                # For set commands, just wait briefly
                time.sleep(0.1)
                return None, None
                
        except Exception as e:
            return None, f"Error sending command: {str(e)}"
    
    def set_voltage(self, channel, voltage):
        """Set output voltage for specified channel"""
        command = f":SOURce{channel}:VOLTage {voltage}"
        return self.send_command(command)
    
    def set_current(self, channel, current):
        """Set current limit for specified channel"""
        command = f":SOURce{channel}:CURRent {current}"
        return self.send_command(command)
    
    def set_output(self, channel, state):
        """Turn output ON/OFF for specified channel"""
        state_str = "ON" if state else "OFF"
        command = f":OUTPut{channel}:STATe {state_str}"
        return self.send_command(command)
    
    def get_voltage(self, channel):
        """Read output voltage from specified channel"""
        command = f":MEASure{channel}:VOLTage?"
        response, error = self.send_command(command)
        try:
            return float(response), None
        except:
            return None, error or "Failed to parse voltage"
    
    def get_current(self, channel):
        """Read output current from specified channel"""
        command = f":MEASure{channel}:CURRent?"
        response, error = self.send_command(command)
        try:
            return float(response), None
        except:
            return None, error or "Failed to parse current"
    
    def get_all_measurements(self):
        """Read voltage and current from both channels"""
        measurements = {}
        
        ch1_voltage, _ = self.get_voltage(1)
        ch1_current, _ = self.get_current(1)
        ch2_voltage, _ = self.get_voltage(2)
        ch2_current, _ = self.get_current(2)
        
        # Ensure we have valid numbers
        ch1_v = float(ch1_voltage) if ch1_voltage is not None else 0.0
        ch1_c = float(ch1_current) if ch1_current is not None else 0.0
        ch2_v = float(ch2_voltage) if ch2_voltage is not None else 0.0
        ch2_c = float(ch2_current) if ch2_current is not None else 0.0
        
        measurements = {
            "ch1": {
                "voltage": round(ch1_v, 4),
                "current": round(ch1_c, 4)
            },
            "ch2": {
                "voltage": round(ch2_v, 4),
                "current": round(ch2_c, 4)
            },
            "timestamp": datetime.now().isoformat()
        }
        
        print(f"Measurements: CH1={ch1_v}V/{ch1_c}A, CH2={ch2_v}V/{ch2_c}A")
        return measurements


# Initialize controller (will be created on connect)
controller = None


# REST API Endpoints

@app.route('/api/connect', methods=['POST'])
def api_connect():
    """Connect to GPP-3650"""
    global controller, is_connected
    
    data = request.json
    com_port = data.get('com_port', 'COM3')
    
    controller = GPP3650Controller(com_port, baudrate=115200)  # Use maximum baud rate
    success, message = controller.connect()
    
    if success:
        is_connected = True
        return jsonify({"success": True, "message": message})
    else:
        is_connected = False
        return jsonify({"success": False, "message": message}), 400


@app.route('/api/disconnect', methods=['POST'])
def api_disconnect():
    """Disconnect from GPP-3650"""
    global controller, is_connected, monitoring_active
    
    monitoring_active = False
    
    if controller:
        success, message = controller.disconnect()
        is_connected = False
        return jsonify({"success": success, "message": message})
    else:
        return jsonify({"success": False, "message": "Not connected"}), 400


@app.route('/api/status', methods=['GET'])
def api_status():
    """Get connection status"""
    global is_connected
    return jsonify({
        "connected": is_connected,
        "monitoring": monitoring_active
    })


@app.route('/api/set-voltage', methods=['POST'])
def api_set_voltage():
    """Set output voltage"""
    global controller
    
    if not is_connected or not controller:
        return jsonify({"success": False, "message": "Not connected"}), 400
    
    data = request.json
    channel = data.get('channel')
    voltage = data.get('voltage')
    
    response, error = controller.set_voltage(channel, voltage)
    
    if error:
        return jsonify({"success": False, "message": error}), 400
    else:
        return jsonify({"success": True, "message": f"CH{channel} voltage set to {voltage}V"})


@app.route('/api/set-current', methods=['POST'])
def api_set_current():
    """Set current limit"""
    global controller
    
    if not is_connected or not controller:
        return jsonify({"success": False, "message": "Not connected"}), 400
    
    data = request.json
    channel = data.get('channel')
    current = data.get('current')
    
    response, error = controller.set_current(channel, current)
    
    if error:
        return jsonify({"success": False, "message": error}), 400
    else:
        return jsonify({"success": True, "message": f"CH{channel} current set to {current}A"})


@app.route('/api/set-output', methods=['POST'])
def api_set_output():
    """Toggle output ON/OFF"""
    global controller
    
    if not is_connected or not controller:
        return jsonify({"success": False, "message": "Not connected"}), 400
    
    data = request.json
    channel = data.get('channel')
    state = data.get('state')
    
    response, error = controller.set_output(channel, state)
    
    if error:
        return jsonify({"success": False, "message": error}), 400
    else:
        state_str = "ON" if state else "OFF"
        return jsonify({"success": True, "message": f"CH{channel} output {state_str}"})


@app.route('/api/read-measurements', methods=['GET'])
def api_read_measurements():
    """Read current voltage and current from both channels"""
    global controller
    
    if not is_connected or not controller:
        return jsonify({"success": False, "message": "Not connected"}), 400
    
    measurements = controller.get_all_measurements()
    return jsonify({"success": True, "data": measurements})


@app.route('/api/start-monitoring', methods=['POST'])
def api_start_monitoring():
    """Start continuous data monitoring"""
    global monitoring_active, monitoring_thread, controller, data_buffer
    
    if not is_connected or not controller:
        return jsonify({"success": False, "message": "Not connected"}), 400
    
    if monitoring_active:
        return jsonify({"success": False, "message": "Already monitoring"}), 400
    
    monitoring_active = True
    data_buffer.clear()
    
    def monitor():
        global monitoring_active
        while monitoring_active:
            try:
                measurements = controller.get_all_measurements()
                if measurements:
                    data_buffer.append(measurements)
                time.sleep(0.1)  # 100ms interval for faster sampling
            except Exception as e:
                print(f"Monitoring error: {e}")
                time.sleep(0.5)
    
    monitoring_thread = threading.Thread(target=monitor, daemon=True)
    monitoring_thread.start()
    
    return jsonify({"success": True, "message": "Monitoring started"})


@app.route('/api/stop-monitoring', methods=['POST'])
def api_stop_monitoring():
    """Stop continuous data monitoring"""
    global monitoring_active
    
    monitoring_active = False
    return jsonify({"success": True, "message": "Monitoring stopped"})


@app.route('/api/get-data', methods=['GET'])
def api_get_data():
    """Get collected monitoring data"""
    global data_buffer
    
    return jsonify({
        "success": True,
        "data": list(data_buffer)
    })


@app.route('/api/clear-data', methods=['POST'])
def api_clear_data():
    """Clear collected data buffer"""
    global data_buffer
    
    data_buffer.clear()
    return jsonify({"success": True, "message": "Data cleared"})


if __name__ == '__main__':
    print("=" * 60)
    print("GPP-3650 Power Supply Controller Backend")
    print("=" * 60)
    print("Starting Flask server on http://localhost:5000")
    print("API Documentation:")
    print("  POST   /api/connect          - Connect to power supply")
    print("  POST   /api/disconnect       - Disconnect from power supply")
    print("  GET    /api/status           - Get connection status")
    print("  POST   /api/set-voltage      - Set channel voltage")
    print("  POST   /api/set-current      - Set channel current limit")
    print("  POST   /api/set-output       - Toggle output ON/OFF")
    print("  GET    /api/read-measurements - Read instant measurements")
    print("  POST   /api/start-monitoring - Start data monitoring")
    print("  POST   /api/stop-monitoring  - Stop data monitoring")
    print("  GET    /api/get-data         - Get collected data")
    print("  POST   /api/clear-data       - Clear data buffer")
    print("=" * 60)
    print()
    
    app.run(host='localhost', port=5000, debug=False)