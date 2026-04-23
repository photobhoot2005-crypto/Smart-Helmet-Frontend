/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { 
  AlertTriangle, 
  Activity, 
  Shield, 
  Map as MapIcon, 
  Ambulance, 
  User as UserIcon,
  CheckCircle,
  XCircle
} from 'lucide-react';
import { motion } from 'motion/react';
import { cn } from './lib/utils';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';

// Fix Leaflet icon issue
// @ts-ignore
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

// --- Types ---
// Matches the FastAPI Backend Model
interface ESP32Telemetry {
  helmetOn: boolean;
  sensor1: number;
  sensor2: number;
  ax: number;
  ay: number;
  az: number;
  alertInProgress: boolean;
  accidentConfirmed: boolean;
  timestamp?: string;
  status?: string;
}

const BACKEND_URL = 'https://smart-helmet-backend-sqri.onrender.com';
// --- Components ---

const LoadingScreen = () => (
  <div className="fixed inset-0 bg-slate-950 flex flex-col items-center justify-center z-50">
    <motion.div
      animate={{ rotate: 360 }}
      transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
      className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full mb-4"
    />
    <p className="text-slate-400 font-mono text-sm tracking-widest uppercase">Connecting to SafeRide Backend...</p>
  </div>
);

// --- Main App ---

export default function App() {
  const [telemetry, setTelemetry] = useState<ESP32Telemetry | null>(null);
  const [loading, setLoading] = useState(true);

  // Poll the FastAPI backend every 2 seconds
  useEffect(() => {
    const fetchLatestData = async () => {
      try {
        const response = await fetch(`${BACKEND_URL}/latest`);
        const data = await response.json();
        
        if (data.status !== 'waiting_for_esp32') {
          setTelemetry(data);
        }
      } catch (error) {
        console.error('Error fetching telemetry:', error);
      } finally {
        setLoading(false);
      }
    };

    // Initial fetch
    fetchLatestData();

    // Setup polling
    const intervalId = setInterval(fetchLatestData, 2000);
    return () => clearInterval(intervalId);
  }, []);

  if (loading) return <LoadingScreen />;

  // If a crash is detected, show the SOS Triage View
  if (telemetry?.alertInProgress || telemetry?.accidentConfirmed) {
    return <SOSTriageView telemetry={telemetry} />;
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans">
      <DashboardView telemetry={telemetry} />
    </div>
  );
}

// --- SOS Triage View ---

function SOSTriageView({ telemetry }: { telemetry: ESP32Telemetry | null }) {
  const dismissAlert = async () => {
    // Send a mock clear signal to the backend to reset the UI
    await fetch(`${BACKEND_URL}/telemetry`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...telemetry,
        alertInProgress: false,
        accidentConfirmed: false
      })
    });
  };

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="fixed inset-0 bg-red-600 z-[100] flex flex-col p-6 overflow-y-auto"
    >
      <motion.div 
        animate={{ opacity: [1, 0.5, 1] }}
        transition={{ duration: 1, repeat: Infinity }}
        className="bg-white text-red-600 p-4 rounded-xl text-center font-bold text-xl mb-8 shadow-2xl"
      >
        {telemetry?.accidentConfirmed ? "CRASH CONFIRMED: DO NOT REMOVE HELMET" : "IMPACT DETECTED: AWAITING RIDER CANCEL..."}
      </motion.div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl mx-auto w-full">
        <div className="bg-red-700/50 backdrop-blur-md rounded-2xl p-6 border border-white/20">
          <h2 className="text-white/70 uppercase text-xs font-bold tracking-widest mb-4 flex items-center gap-2">
            <Activity className="w-4 h-4" /> Live Impact Metrics
          </h2>
          <div className="grid grid-cols-3 gap-4">
            <div className="bg-white/10 rounded-xl p-4">
              <p className="text-white/60 text-xs mb-1">Accel X</p>
              <p className="text-white text-xl font-bold">{telemetry?.ax || '--'}</p>
            </div>
            <div className="bg-white/10 rounded-xl p-4">
              <p className="text-white/60 text-xs mb-1">Accel Y</p>
              <p className="text-white text-xl font-bold">{telemetry?.ay || '--'}</p>
            </div>
            <div className="bg-white/10 rounded-xl p-4">
              <p className="text-white/60 text-xs mb-1">Accel Z</p>
              <p className="text-white text-xl font-bold">{telemetry?.az || '--'}</p>
            </div>
          </div>
        </div>

        <div className="bg-red-700/50 backdrop-blur-md rounded-2xl p-6 border border-white/20">
          <h2 className="text-white/70 uppercase text-xs font-bold tracking-widest mb-4 flex items-center gap-2">
            <UserIcon className="w-4 h-4" /> Rider Profile (Local)
          </h2>
          <div className="space-y-4">
            <div>
              <p className="text-white/60 text-xs">Rider Name</p>
              <p className="text-white text-xl font-semibold">ESP32 Test Rider</p>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-auto pt-12 space-y-4 max-w-md mx-auto w-full">
        <button 
          onClick={() => window.location.href = `tel:108`}
          className="w-full bg-red-950 text-white h-20 rounded-2xl font-bold text-xl flex items-center justify-center gap-4 shadow-2xl active:scale-95 transition-transform border border-white/10"
        >
          <Ambulance className="w-8 h-8" /> Call Local Ambulance
        </button>
        <button 
          onClick={dismissAlert}
          className="w-full text-white/50 text-sm font-bold py-4 hover:text-white transition-colors"
        >
          I'm Safe - Dismiss Alert (Test)
        </button>
      </div>
    </motion.div>
  );
}

// --- Dashboard View ---

function DashboardView({ telemetry }: { telemetry: ESP32Telemetry | null }) {
  
  // Test function to simulate hardware POST from the browser
  const simulateEspData = async () => {
    await fetch(`${BACKEND_URL}/telemetry`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        helmetOn: true,
        sensor1: 0,
        sensor2: 0,
        ax: Math.floor(Math.random() * 5000),
        ay: Math.floor(Math.random() * 5000),
        az: 15000 + Math.floor(Math.random() * 2000),
        alertInProgress: false,
        accidentConfirmed: false
      })
    });
  };

  const simulateCrash = async () => {
    await fetch(`${BACKEND_URL}/telemetry`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...telemetry,
        ax: 35000,
        alertInProgress: true,
        accidentConfirmed: false
      })
    });
  };

  return (
    <div className="max-w-5xl mx-auto pb-24">
      {/* Header */}
      <header className="p-6 flex items-center justify-between sticky top-0 bg-slate-50/80 backdrop-blur-md z-[1100] border-b border-slate-200/50">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center">
            <Shield className="text-white w-6 h-6" />
          </div>
          <div>
            <h1 className="font-bold text-xl tracking-tight">SafeRide Helmet</h1>
            <p className="text-slate-500 text-xs font-medium uppercase tracking-wider">
              {telemetry ? 'Connected to ESP32' : 'Waiting for Hardware'}
            </p>
          </div>
        </div>
      </header>

      <main className="px-6 py-8 space-y-12">
        {/* Section 1: Live Telemetry */}
        <section className="space-y-6">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <Activity className="w-5 h-5 text-blue-600" />
              <h2 className="text-lg font-bold text-slate-900">Live Hardware Telemetry</h2>
            </div>
            <button 
              onClick={simulateEspData}
              className="bg-blue-100 text-blue-700 px-4 py-2 rounded-lg text-sm font-bold hover:bg-blue-200"
            >
              Send Test Data
            </button>
          </div>
          
          <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-200">
            <div className="flex items-center justify-between mb-6">
              <h3 className="font-bold text-slate-900">ESP32 Sensor Feed</h3>
              <div className="flex items-center gap-2 px-3 py-1 bg-green-50 text-green-600 rounded-full text-[10px] font-bold uppercase tracking-wider">
                <span className={cn("w-1.5 h-1.5 rounded-full", telemetry ? "bg-green-500 animate-pulse" : "bg-red-500")} />
                {telemetry ? 'Receiving Data' : 'Offline'}
              </div>
            </div>
            
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-6">
              <div className="space-y-1">
                <div className="flex items-center gap-1.5 text-slate-400">
                  <Shield className="w-3.5 h-3.5" />
                  <span className="text-[10px] font-bold uppercase tracking-wider">Helmet Status</span>
                </div>
                <p className={cn("text-xl font-black", telemetry?.helmetOn ? "text-green-600" : "text-slate-400")}>
                  {telemetry?.helmetOn ? 'WORN' : 'REMOVED'}
                </p>
              </div>

              <div className="space-y-1">
                <div className="flex items-center gap-1.5 text-slate-400">
                  {telemetry?.sensor1 === 0 ? <CheckCircle className="w-3.5 h-3.5 text-green-500"/> : <XCircle className="w-3.5 h-3.5 text-red-500"/>}
                  <span className="text-[10px] font-bold uppercase tracking-wider">IR Sensor 1</span>
                </div>
                <p className="text-xl font-black text-slate-900">{telemetry?.sensor1 === 0 ? 'Clear' : 'Blocked'}</p>
              </div>

              <div className="space-y-1">
                <div className="flex items-center gap-1.5 text-slate-400">
                  {telemetry?.sensor2 === 0 ? <CheckCircle className="w-3.5 h-3.5 text-green-500"/> : <XCircle className="w-3.5 h-3.5 text-red-500"/>}
                  <span className="text-[10px] font-bold uppercase tracking-wider">IR Sensor 2</span>
                </div>
                <p className="text-xl font-black text-slate-900">{telemetry?.sensor2 === 0 ? 'Clear' : 'Blocked'}</p>
              </div>

              <div className="space-y-1">
                <div className="flex items-center gap-1.5 text-slate-400">
                  <Activity className="w-3.5 h-3.5" />
                  <span className="text-[10px] font-bold uppercase tracking-wider">MPU6050 Accel</span>
                </div>
                <p className="text-sm font-black text-slate-900">X: {telemetry?.ax || 0}</p>
                <p className="text-sm font-black text-slate-900">Y: {telemetry?.ay || 0}</p>
                <p className="text-sm font-black text-slate-900">Z: {telemetry?.az || 0}</p>
              </div>
            </div>

            <div className="mt-6 pt-6 border-t border-slate-100 flex justify-end">
              <button 
                onClick={simulateCrash}
                className="text-red-500 text-xs font-bold uppercase tracking-widest flex items-center gap-2 hover:bg-red-50 px-3 py-1.5 rounded-lg transition-colors"
              >
                <AlertTriangle className="w-3 h-3" /> Simulate Impact Event
              </button>
            </div>
          </div>
        </section>

        {/* Section 2: Last Known Location */}
        <section className="space-y-6">
          <div className="flex items-center gap-2 mb-2">
            <MapIcon className="w-5 h-5 text-blue-600" />
            <h2 className="text-lg font-bold text-slate-900">GPS Tracker (Coming Soon)</h2>
          </div>
          <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-200">
            <div className="aspect-[16/9] bg-slate-100 rounded-2xl overflow-hidden relative border border-slate-200">
              <MapContainer 
                center={[15.3647, 75.1240]} // Default to Hubballi 
                zoom={13} 
                className="h-full w-full z-0"
              >
                <TileLayer
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                  attribution='&copy; OpenStreetMap contributors'
                />
                <Marker position={[15.3647, 75.1240]}>
                  <Popup>Pending ESP32 GPS Integration</Popup>
                </Marker>
              </MapContainer>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}