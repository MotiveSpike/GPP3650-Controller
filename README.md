# GPP-3650 Power Supply Remote Controller

Professional remote control and real-time monitoring application for Gwinstek GPP-3650 DC Power Supply.

Built with Claude Code AI Assistant.

## Features

- ✅ Remote voltage control (0-36V)
- ✅ Remote current limit control (0-5A)
- ✅ Dual channel independent control
- ✅ Real-time current monitoring with live graphs
- ✅ 100ms ultra-responsive updates
- ✅ Data logging with CSV export
- ✅ Graph capture (PNG export)
- ✅ Professional web-based UI
- ✅ USB/RS-232 communication at 115200 baud

## System Architecture

### Backend
- **Python Flask** REST API server
- Direct serial communication with GPP-3650 via USB/RS-232
- Real-time data buffering and measurement
- CORS enabled for frontend communication
- SCPI command protocol implementation

### Frontend
- **React** web application with modern UI
- Real-time chart visualization (Recharts library)
- Responsive design for all screen sizes
- Live voltage/current readouts
- Data export functionality (CSV + PNG)

## Hardware Requirements

- Gwinstek GPP-3650 Power Supply
- USB to RS-232 converter (or native USB)
- Windows/Mac/Linux PC with Python 3.7+
- Modern web browser (Chrome, Firefox, Edge, Safari)

## Installation

### Prerequisites

- Python 3.7 or higher
- Node.js 14+ and npm
- USB cable connection to GPP-3650

### Backend Setup

1. Navigate to backend directory:
```bash
cd backend
```

2. Install Python dependencies:
```bash
pip install -r requirements.txt
```

3. Run the backend server:
```bash
python gpp3650_backend.py
```

You should see:
```
============================================================
GPP-3650 Power Supply Controller Backend
============================================================
Starting Flask server on http://localhost:5000
```

**Keep this window open while using the application.**

### Frontend Setup

1. Create React app (if not already done):
```bash
npx create-react-app gpp3650-app
cd gpp3650-app
```

2. Install additional dependencies:
```bash
npm install recharts lucide-react
```

3. Copy the provided `App.js` to `src/App.js` (replace the original)

4. Start the development server:
```bash
npm start
```

The frontend will automatically open on `http://localhost:3000`

## For Your Teammates: Quick Start

Your teammates can get started with these 4 simple steps:

```bash
# Step 1: Clone the repository
git clone https://github.com/MotiveSpike/GPP3650-Controller.git
cd GPP3650-Controller

# Step 2: Set up and run backend (Terminal 1)
cd backend
pip install -r requirements.txt
python gpp3650_backend.py

# Step 3: Set up and run frontend (Terminal 2)
cd frontend
npm install
npm start

# Step 4: Connect power supply
# - Enter COM port in browser app at http://localhost:3000
# - Click Connect
# - Use the application!
```

That's it! The application will open automatically in your browser.

---

## Quick Start Guide (For Everyone)

### 1. Connect Power Supply
- Power on your GPP-3650
- Connect USB cable to your laptop
- Note the COM port (check Device Manager)

### 2. Configure Power Supply
- On GPP-3650: Press SYSTEM → F1 (Interface) → F1 (RS-232)
- Set Baud Rate to **115200** (maximum speed)
- Confirm settings

### 3. Start Backend
```bash
cd backend
python gpp3650_backend.py
```

### 4. Start Frontend
```bash
npm start
```

### 5. Use the Application
1. Enter your COM port (e.g., COM4)
2. Click **"Connect"** button
3. Set voltage and current for each channel
4. Click **"Apply Settings to Power Supply"**
5. Click **"Output ON"** to enable a channel
6. Click **"Start Monitoring"** to see real-time data
7. Use **"Capture Graph"** or **"Export Data"** to save results

## Configuration

### Finding Your COM Port

**Windows:**
- Device Manager → Ports (COM & LPT)
- Look for USB Serial Port device

**Mac/Linux:**
```bash
ls /dev/tty.usb*
```

### Adjusting Sampling Rate

To change the monitoring interval, edit in `src/App.js`:
```javascript
const POLL_INTERVAL = 100;      // milliseconds
const MONITOR_INTERVAL = 100;   // milliseconds
```

## API Endpoints

The backend provides the following REST API endpoints:

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/connect` | Connect to power supply |
| POST | `/api/disconnect` | Disconnect |
| GET | `/api/status` | Get connection status |
| POST | `/api/set-voltage` | Set channel voltage |
| POST | `/api/set-current` | Set current limit |
| POST | `/api/set-output` | Toggle output ON/OFF |
| GET | `/api/read-measurements` | Read instant measurements |
| POST | `/api/start-monitoring` | Start data collection |
| POST | `/api/stop-monitoring` | Stop data collection |
| GET | `/api/get-data` | Get collected data |
| POST | `/api/clear-data` | Clear data buffer |

## Technical Specifications

- **Sampling Rate**: 100ms (10 Hz)
- **Graph Window**: Last 10 seconds
- **Data Points Stored**: Up to 1000 measurements
- **Serial Communication**: 115200 baud, 8 data bits, no parity, 1 stop bit
- **API Response Time**: < 100ms
- **Transient Recovery**: < 100µs (hardware limit)

## File Structure

```
GPP3650-Controller/
├── backend/
│   ├── gpp3650_backend.py    # Flask API server
│   └── requirements.txt       # Python dependencies
│
├── frontend/
│   ├── src/
│   │   ├── App.js            # React main component
│   │   ├── index.js          # React entry point
│   │   └── ... (other React files)
│   ├── package.json          # React dependencies
│   ├── public/               # Static assets
│   └── ... (other React files)
│
├── README.md                 # This file
├── CLAUDE_DEVELOPMENT.md     # Development story
└── .gitignore               # Git ignore rules
```

## Troubleshooting

### "Failed to fetch" Error
- Make sure Python backend is running on `localhost:5000`
- Check browser console for CORS errors
- Verify firewall isn't blocking localhost

### No COM Port Detected
- Check USB cable connection
- Install USB-to-Serial driver from device manufacturer
- Restart computer if driver was just installed

### Power Supply Not Responding
- Verify baud rate is set to 115200 on power supply
- Check RS-232/USB cable connection
- Try a different USB port on your laptop
- Restart power supply

### Graph Not Updating
- Ensure "Start Monitoring" button was clicked
- Check that Python backend is receiving measurements
- Verify output is turned ON for the channel

### High CPU Usage
- Reduce `POLL_INTERVAL` and `MONITOR_INTERVAL` values
- Close other applications
- Use a faster computer for better performance

## Performance Notes

- **100ms sampling** provides smooth real-time visualization
- **115200 baud** enables fast serial communication
- Graph shows **only last 10 seconds** for clarity
- All data is **saved internally** for CSV export
- CSV contains **all measurements** from entire session

## Created With

- **Backend**: Python 3.7+, Flask 2.3+, PySerial 3.5+
- **Frontend**: React 18+, Recharts, Lucide Icons
- **Communication**: SCPI commands via USB/RS-232
- **Development**: Claude Code AI Assistant

## License

MIT License - Feel free to use, modify, and distribute

## Author

Created with Claude Code AI Assistant
Email: [your email]
GitHub: [your github profile]

## Contributing

Contributions are welcome! Please:
1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Push to the branch
5. Create a Pull Request

## Support & Issues

If you encounter issues:
1. Check the Troubleshooting section
2. Review the GPP-3650 manual for hardware setup
3. Create an issue on GitHub with:
   - Python version
   - Operating system
   - Error message/logs
   - Steps to reproduce

## Changelog

### Version 1.0 (Initial Release)
- Full dual-channel control
- Real-time monitoring with 100ms sampling
- Data export (CSV + PNG)
- Professional web UI
- USB communication at 115200 baud
- Graph visualization of last 10 seconds
- Status messages and connection indicators

## Related Resources

- [Gwinstek GPP-3650 Manual](https://www.gwinstek.com/) - Official documentation
- [SCPI Protocol](https://en.wikipedia.org/wiki/Standard_Commands_for_Programmable_Instruments) - Command reference
- [Flask Documentation](https://flask.palletsprojects.com/) - Backend framework
- [React Documentation](https://react.dev/) - Frontend framework
- [Recharts Documentation](https://recharts.org/) - Charting library

## Acknowledgments

- Gwinstek for the excellent GPP-3650 power supply
- Open source community for excellent libraries
- Claude Code AI for rapid development and prototyping