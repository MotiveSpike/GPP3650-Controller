import React, { useState, useEffect, useRef } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Download, Play, Square, RotateCcw, AlertCircle, CheckCircle, Wifi, WifiOff } from 'lucide-react';

export default function PowerSupplyController() {
  const [comPort, setComPort] = useState('COM4');
  const [connected, setConnected] = useState(false);
  const [isMonitoring, setIsMonitoring] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');
  const [statusType, setStatusType] = useState('');

  const [ch1Voltage, setCh1Voltage] = useState(12);
  const [ch1Current, setCh1Current] = useState(1);
  const [ch1Output, setCh1Output] = useState(false);

  const [ch2Voltage, setCh2Voltage] = useState(12);
  const [ch2Current, setCh2Current] = useState(1);
  const [ch2Output, setCh2Output] = useState(false);

  const [graphData, setGraphData] = useState([]);
  const [ch1ReadoutV, setCh1ReadoutV] = useState(0);
  const [ch1ReadoutI, setCh1ReadoutI] = useState(0);
  const [ch2ReadoutV, setCh2ReadoutV] = useState(0);
  const [ch2ReadoutI, setCh2ReadoutI] = useState(0);

  const dataRef = useRef([]);
  const monitorIntervalRef = useRef(null);
  const pollIntervalRef = useRef(null);
  const startTimeRef = useRef(0);

  const API_BASE = 'http://localhost:5000/api';
  const GRAPH_WINDOW_SECONDS = 10;
  const POLL_INTERVAL = 100;
  const MONITOR_INTERVAL = 100;

  const showStatus = (message, type) => {
    setStatusMessage(message);
    setStatusType(type);
    setTimeout(() => setStatusMessage(''), 5000);
  };

  const handleConnect = async () => {
    if (connected) {
      try {
        await fetch(`${API_BASE}/disconnect`, { method: 'POST' });
        setConnected(false);
        showStatus('Disconnected from power supply', 'info');
      } catch (error) {
        showStatus('Error disconnecting', 'error');
      }
    } else {
      try {
        const response = await fetch(`${API_BASE}/connect`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ com_port: comPort, baudrate: 115200 }),
        });
        const data = await response.json();

        if (response.ok) {
          setConnected(true);
          showStatus(`Connected to ${comPort}`, 'success');
          startMeasurementPolling();
        } else {
          showStatus(data.message || 'Connection failed', 'error');
        }
      } catch (error) {
        showStatus('Error connecting: ' + error.message, 'error');
      }
    }
  };

  const startMeasurementPolling = () => {
    if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);

    pollIntervalRef.current = setInterval(async () => {
      if (!connected) return;

      try {
        const response = await fetch(`${API_BASE}/read-measurements`);
        const data = await response.json();

        if (data.success && data.data) {
          setCh1ReadoutV(parseFloat(data.data.ch1.voltage).toFixed(3));
          setCh1ReadoutI(parseFloat(data.data.ch1.current).toFixed(4));
          setCh2ReadoutV(parseFloat(data.data.ch2.voltage).toFixed(3));
          setCh2ReadoutI(parseFloat(data.data.ch2.current).toFixed(4));
        }
      } catch (error) {
        console.error('Polling error:', error);
      }
    }, POLL_INTERVAL);
  };

  const applySettings = async () => {
    if (!connected) {
      showStatus('Please connect to the power supply first', 'error');
      return;
    }

    try {
      const requests = [
        fetch(`${API_BASE}/set-voltage`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ channel: 1, voltage: ch1Voltage }),
        }),
        fetch(`${API_BASE}/set-current`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ channel: 1, current: ch1Current }),
        }),
        fetch(`${API_BASE}/set-voltage`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ channel: 2, voltage: ch2Voltage }),
        }),
        fetch(`${API_BASE}/set-current`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ channel: 2, current: ch2Current }),
        }),
      ];

      const responses = await Promise.all(requests);
      const allSuccess = responses.every((r) => r.ok);

      if (allSuccess) {
        showStatus('Settings applied successfully', 'success');
      } else {
        showStatus('Some settings failed to apply', 'error');
      }
    } catch (error) {
      showStatus('Error applying settings: ' + error.message, 'error');
    }
  };

  const toggleOutput = async (channel) => {
    if (!connected) {
      showStatus('Please connect to the power supply first', 'error');
      return;
    }

    try {
      const newState = channel === 1 ? !ch1Output : !ch2Output;

      const response = await fetch(`${API_BASE}/set-output`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ channel, state: newState }),
      });

      if (response.ok) {
        if (channel === 1) {
          setCh1Output(newState);
        } else {
          setCh2Output(newState);
        }
        showStatus(`CH${channel} output ${newState ? 'ON' : 'OFF'}`, 'success');
      } else {
        showStatus('Failed to toggle output', 'error');
      }
    } catch (error) {
      showStatus('Error toggling output: ' + error.message, 'error');
    }
  };

  const startMonitoring = async () => {
    if (!connected) {
      showStatus('Please connect to the power supply first', 'error');
      return;
    }

    try {
      const response = await fetch(`${API_BASE}/start-monitoring`, {
        method: 'POST',
      });

      if (response.ok) {
        setIsMonitoring(true);
        dataRef.current = [];
        setGraphData([]);
        showStatus('Monitoring started', 'success');

        startTimeRef.current = Date.now();
        
        monitorIntervalRef.current = setInterval(async () => {
          try {
            const dataResponse = await fetch(`${API_BASE}/get-data`);
            const dataJson = await dataResponse.json();

            if (dataJson.success && dataJson.data) {
              dataRef.current = dataJson.data.map((point, index) => ({
                time: (index * 0.1).toFixed(2),
                ch1Current: point.ch1.current,
                ch2Current: point.ch2.current,
              }));

              const displayData = dataRef.current.slice(-100);
              setGraphData(displayData);
            }
          } catch (error) {
            console.error('Error fetching data:', error);
          }
        }, MONITOR_INTERVAL);
      } else {
        showStatus('Failed to start monitoring', 'error');
      }
    } catch (error) {
      showStatus('Error starting monitoring: ' + error.message, 'error');
    }
  };

  const stopMonitoring = async () => {
    try {
      await fetch(`${API_BASE}/stop-monitoring`, { method: 'POST' });
      setIsMonitoring(false);
      if (monitorIntervalRef.current) {
        clearInterval(monitorIntervalRef.current);
      }
      showStatus('Monitoring stopped', 'info');
    } catch (error) {
      showStatus('Error stopping monitoring: ' + error.message, 'error');
    }
  };

  const exportData = async () => {
    if (dataRef.current.length === 0) {
      showStatus('No data to export. Start monitoring first.', 'error');
      return;
    }

    try {
      let csvContent = 'Time (s),CH1 Current (A),CH2 Current (A)\n';
      dataRef.current.forEach((point) => {
        csvContent += `${point.time},${point.ch1Current},${point.ch2Current}\n`;
      });

      const element = document.createElement('a');
      element.setAttribute(
        'href',
        'data:text/csv;charset=utf-8,' + encodeURIComponent(csvContent)
      );
      element.setAttribute(
        'download',
        `GPP3650_Data_${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}.csv`
      );
      element.style.display = 'none';
      document.body.appendChild(element);
      element.click();
      document.body.removeChild(element);
      showStatus('Data exported successfully', 'success');
    } catch (error) {
      showStatus('Error exporting data: ' + error.message, 'error');
    }
  };

  const captureGraph = () => {
    const canvas = document.querySelector('canvas');
    if (!canvas) {
      showStatus('No graph to capture', 'error');
      return;
    }

    try {
      const image = canvas.toDataURL('image/png');
      const element = document.createElement('a');
      element.setAttribute('href', image);
      element.setAttribute(
        'download',
        `GPP3650_Graph_${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}.png`
      );
      element.style.display = 'none';
      document.body.appendChild(element);
      element.click();
      document.body.removeChild(element);
      showStatus('Graph captured successfully', 'success');
    } catch (error) {
      showStatus('Error capturing graph: ' + error.message, 'error');
    }
  };

  const resetGraph = async () => {
    await stopMonitoring();
    dataRef.current = [];
    setGraphData([]);
    try {
      await fetch(`${API_BASE}/clear-data`, { method: 'POST' });
    } catch (error) {
      console.error('Error clearing data:', error);
    }
    showStatus('Graph reset', 'info');
  };

  useEffect(() => {
    return () => {
      if (monitorIntervalRef.current) clearInterval(monitorIntervalRef.current);
      if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
    };
  }, []);

  return (
    <div style={{ backgroundColor: '#0f172a', minHeight: '100vh', padding: '24px' }}>
      <div style={{ maxWidth: '1400px', margin: '0 auto' }}>
        {/* Header */}
        <div style={{ marginBottom: '32px' }}>
          <h1 style={{ fontSize: '36px', fontWeight: 'bold', color: '#ffffff', marginBottom: '8px' }}>
            GPP-3650 Power Supply Controller
          </h1>
          <p style={{ color: '#cbd5e1', fontSize: '16px' }}>Remote Control & Real-time Monitoring</p>
        </div>

        {/* Status Message */}
        {statusMessage && (
          <div
            style={{
              marginBottom: '24px',
              padding: '16px',
              borderRadius: '8px',
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              backgroundColor: statusType === 'success' ? '#1e3a1f' : statusType === 'error' ? '#3a1f1f' : '#1f2e3a',
              border: `1px solid ${statusType === 'success' ? '#4ade80' : statusType === 'error' ? '#ef4444' : '#3b82f6'}`,
              color: statusType === 'success' ? '#86efac' : statusType === 'error' ? '#fca5a5' : '#93c5fd',
            }}
          >
            {statusType === 'success' ? <CheckCircle size={20} /> : <AlertCircle size={20} />}
            {statusMessage}
          </div>
        )}

        {/* Connection Panel */}
        <div style={{
          backgroundColor: '#1e293b',
          borderRadius: '12px',
          padding: '24px',
          marginBottom: '24px',
          border: '1px solid #334155',
        }}>
          <div style={{ display: 'flex', gap: '16px', alignItems: 'flex-end' }}>
            <div style={{ flex: 1 }}>
              <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', color: '#cbd5e1', marginBottom: '8px' }}>
                COM Port
              </label>
              <input
                type="text"
                value={comPort}
                onChange={(e) => setComPort(e.target.value.toUpperCase())}
                disabled={connected}
                style={{
                  width: '100%',
                  padding: '10px 16px',
                  backgroundColor: '#0f172a',
                  border: '1px solid #475569',
                  borderRadius: '6px',
                  color: '#ffffff',
                  fontSize: '14px',
                  opacity: connected ? 0.6 : 1,
                }}
                placeholder="e.g., COM4"
              />
            </div>
            <button
              onClick={handleConnect}
              style={{
                padding: '10px 24px',
                borderRadius: '6px',
                fontWeight: '600',
                border: 'none',
                cursor: 'pointer',
                backgroundColor: connected ? '#dc2626' : '#16a34a',
                color: '#ffffff',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
              }}
            >
              {connected ? <WifiOff size={18} /> : <Wifi size={18} />}
              {connected ? 'Disconnect' : 'Connect'}
            </button>
            <div
              style={{
                width: '12px',
                height: '12px',
                borderRadius: '50%',
                backgroundColor: connected ? '#22c55e' : '#ef4444',
                animation: connected ? 'pulse 2s infinite' : 'none',
              }}
            />
          </div>
        </div>

        {/* Channels Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(500px, 1fr))', gap: '24px', marginBottom: '24px' }}>
          {/* Channel 1 */}
          <div style={{
            backgroundColor: '#1e293b',
            borderRadius: '12px',
            padding: '24px',
            border: '2px solid #ca8a04',
          }}>
            <h2 style={{ fontSize: '20px', fontWeight: 'bold', color: '#fbbf24', marginBottom: '24px' }}>
              Channel 1 (Yellow)
            </h2>

            <div style={{ marginBottom: '24px', display: 'grid', gap: '16px' }}>
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <label style={{ fontSize: '14px', fontWeight: '500', color: '#cbd5e1' }}>Voltage</label>
                  <span style={{ fontSize: '14px', color: '#fbbf24', fontWeight: '600' }}>{ch1Voltage.toFixed(2)}V</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="36"
                  step="0.1"
                  value={ch1Voltage}
                  onChange={(e) => setCh1Voltage(parseFloat(e.target.value))}
                  style={{ width: '100%', cursor: 'pointer' }}
                />
              </div>

              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <label style={{ fontSize: '14px', fontWeight: '500', color: '#cbd5e1' }}>Current Limit</label>
                  <span style={{ fontSize: '14px', color: '#fbbf24', fontWeight: '600' }}>{ch1Current.toFixed(2)}A</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="5"
                  step="0.1"
                  value={ch1Current}
                  onChange={(e) => setCh1Current(parseFloat(e.target.value))}
                  style={{ width: '100%', cursor: 'pointer' }}
                />
              </div>
            </div>

            <div style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: '16px',
              marginBottom: '24px',
              padding: '16px',
              backgroundColor: '#0f172a',
              borderRadius: '8px',
            }}>
              <div>
                <p style={{ fontSize: '12px', color: '#64748b', marginBottom: '4px' }}>Output Voltage</p>
                <p style={{ fontSize: '18px', fontWeight: 'bold', color: '#fcd34d' }}>{ch1ReadoutV} V</p>
              </div>
              <div>
                <p style={{ fontSize: '12px', color: '#64748b', marginBottom: '4px' }}>Output Current</p>
                <p style={{ fontSize: '18px', fontWeight: 'bold', color: '#fcd34d' }}>{ch1ReadoutI} A</p>
              </div>
            </div>

            <button
              onClick={() => toggleOutput(1)}
              disabled={!connected}
              style={{
                width: '100%',
                padding: '12px',
                borderRadius: '6px',
                fontWeight: '600',
                border: 'none',
                cursor: connected ? 'pointer' : 'not-allowed',
                backgroundColor: ch1Output ? '#dc2626' : '#16a34a',
                color: '#ffffff',
                opacity: connected ? 1 : 0.5,
              }}
            >
              {ch1Output ? 'Output OFF' : 'Output ON'}
            </button>
          </div>

          {/* Channel 2 */}
          <div style={{
            backgroundColor: '#1e293b',
            borderRadius: '12px',
            padding: '24px',
            border: '2px solid #0284c7',
          }}>
            <h2 style={{ fontSize: '20px', fontWeight: 'bold', color: '#60a5fa', marginBottom: '24px' }}>
              Channel 2 (Blue)
            </h2>

            <div style={{ marginBottom: '24px', display: 'grid', gap: '16px' }}>
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <label style={{ fontSize: '14px', fontWeight: '500', color: '#cbd5e1' }}>Voltage</label>
                  <span style={{ fontSize: '14px', color: '#60a5fa', fontWeight: '600' }}>{ch2Voltage.toFixed(2)}V</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="36"
                  step="0.1"
                  value={ch2Voltage}
                  onChange={(e) => setCh2Voltage(parseFloat(e.target.value))}
                  style={{ width: '100%', cursor: 'pointer' }}
                />
              </div>

              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <label style={{ fontSize: '14px', fontWeight: '500', color: '#cbd5e1' }}>Current Limit</label>
                  <span style={{ fontSize: '14px', color: '#60a5fa', fontWeight: '600' }}>{ch2Current.toFixed(2)}A</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="5"
                  step="0.1"
                  value={ch2Current}
                  onChange={(e) => setCh2Current(parseFloat(e.target.value))}
                  style={{ width: '100%', cursor: 'pointer' }}
                />
              </div>
            </div>

            <div style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: '16px',
              marginBottom: '24px',
              padding: '16px',
              backgroundColor: '#0f172a',
              borderRadius: '8px',
            }}>
              <div>
                <p style={{ fontSize: '12px', color: '#64748b', marginBottom: '4px' }}>Output Voltage</p>
                <p style={{ fontSize: '18px', fontWeight: 'bold', color: '#93c5fd' }}>{ch2ReadoutV} V</p>
              </div>
              <div>
                <p style={{ fontSize: '12px', color: '#64748b', marginBottom: '4px' }}>Output Current</p>
                <p style={{ fontSize: '18px', fontWeight: 'bold', color: '#93c5fd' }}>{ch2ReadoutI} A</p>
              </div>
            </div>

            <button
              onClick={() => toggleOutput(2)}
              disabled={!connected}
              style={{
                width: '100%',
                padding: '12px',
                borderRadius: '6px',
                fontWeight: '600',
                border: 'none',
                cursor: connected ? 'pointer' : 'not-allowed',
                backgroundColor: ch2Output ? '#dc2626' : '#16a34a',
                color: '#ffffff',
                opacity: connected ? 1 : 0.5,
              }}
            >
              {ch2Output ? 'Output OFF' : 'Output ON'}
            </button>
          </div>
        </div>

        {/* Apply Settings Button */}
        <button
          onClick={applySettings}
          disabled={!connected}
          style={{
            width: '100%',
            backgroundColor: '#7c3aed',
            color: '#ffffff',
            fontWeight: 'bold',
            padding: '16px',
            borderRadius: '8px',
            border: 'none',
            marginBottom: '24px',
            cursor: connected ? 'pointer' : 'not-allowed',
            fontSize: '16px',
            opacity: connected ? 1 : 0.5,
          }}
        >
          Apply Settings to Power Supply
        </button>

        {/* Graph Section */}
        <div style={{
          backgroundColor: '#1e293b',
          borderRadius: '12px',
          padding: '24px',
          border: '1px solid #334155',
          marginBottom: '24px',
        }}>
          <h2 style={{ fontSize: '20px', fontWeight: 'bold', color: '#ffffff', marginBottom: '16px' }}>
            Real-time Current Monitoring
          </h2>

          {graphData.length > 0 ? (
            <ResponsiveContainer width="100%" height={400}>
              <LineChart data={graphData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#475569" />
                <XAxis dataKey="time" stroke="#94a3b8" />
                <YAxis stroke="#94a3b8" />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#0f172a',
                    border: '1px solid #475569',
                    borderRadius: '8px',
                    color: '#e2e8f0',
                  }}
                />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="ch1Current"
                  stroke="#fbbf24"
                  name="CH1 Current"
                  dot={false}
                  isAnimationActive={false}
                  strokeWidth={2}
                />
                <Line
                  type="monotone"
                  dataKey="ch2Current"
                  stroke="#60a5fa"
                  name="CH2 Current"
                  dot={false}
                  isAnimationActive={false}
                  strokeWidth={2}
                />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div style={{
              height: '400px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#64748b',
            }}>
              Start monitoring to see real-time current data
            </div>
          )}

          <div style={{ display: 'flex', gap: '12px', marginTop: '24px', flexWrap: 'wrap' }}>
            <button
              onClick={startMonitoring}
              disabled={isMonitoring || !connected}
              style={{
                padding: '10px 16px',
                backgroundColor: '#16a34a',
                color: '#ffffff',
                borderRadius: '6px',
                border: 'none',
                fontWeight: '600',
                cursor: isMonitoring || !connected ? 'not-allowed' : 'pointer',
                opacity: isMonitoring || !connected ? 0.5 : 1,
              }}
            >
              <Play size={18} style={{ display: 'inline', marginRight: '8px' }} />
              Start Monitoring
            </button>
            <button
              onClick={stopMonitoring}
              disabled={!isMonitoring}
              style={{
                padding: '10px 16px',
                backgroundColor: '#dc2626',
                color: '#ffffff',
                borderRadius: '6px',
                border: 'none',
                fontWeight: '600',
                cursor: !isMonitoring ? 'not-allowed' : 'pointer',
                opacity: !isMonitoring ? 0.5 : 1,
              }}
            >
              <Square size={18} style={{ display: 'inline', marginRight: '8px' }} />
              Stop Monitoring
            </button>
            <button
              onClick={resetGraph}
              disabled={!connected}
              style={{
                padding: '10px 16px',
                backgroundColor: '#475569',
                color: '#ffffff',
                borderRadius: '6px',
                border: 'none',
                fontWeight: '600',
                cursor: !connected ? 'not-allowed' : 'pointer',
                opacity: !connected ? 0.5 : 1,
              }}
            >
              <RotateCcw size={18} style={{ display: 'inline', marginRight: '8px' }} />
              Reset
            </button>
          </div>
        </div>

        {/* Export Section */}
        <div style={{
          backgroundColor: '#1e293b',
          borderRadius: '12px',
          padding: '24px',
          border: '1px solid #334155',
        }}>
          <h2 style={{ fontSize: '20px', fontWeight: 'bold', color: '#ffffff', marginBottom: '16px' }}>
            Data Export
          </h2>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <button
              onClick={captureGraph}
              disabled={graphData.length === 0}
              style={{
                padding: '12px',
                backgroundColor: '#0284c7',
                color: '#ffffff',
                borderRadius: '6px',
                border: 'none',
                fontWeight: '600',
                cursor: graphData.length === 0 ? 'not-allowed' : 'pointer',
                opacity: graphData.length === 0 ? 0.5 : 1,
              }}
            >
              <Download size={18} style={{ display: 'inline', marginRight: '8px' }} />
              Capture Graph (PNG)
            </button>
            <button
              onClick={exportData}
              disabled={graphData.length === 0}
              style={{
                padding: '12px',
                backgroundColor: '#16a34a',
                color: '#ffffff',
                borderRadius: '6px',
                border: 'none',
                fontWeight: '600',
                cursor: graphData.length === 0 ? 'not-allowed' : 'pointer',
                opacity: graphData.length === 0 ? 0.5 : 1,
              }}
            >
              <Download size={18} style={{ display: 'inline', marginRight: '8px' }} />
              Export Data (CSV)
            </button>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
      `}</style>
    </div>
  );
}