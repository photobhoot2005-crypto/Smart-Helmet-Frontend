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
  Settings, 
  Phone, 
  Ambulance, 
  History, 
  User as UserIcon,
  Navigation,
  CheckCircle,
  XCircle,
  Lock,
  Mail
} from 'lucide-react';
import { motion } from 'motion/react';
import { cn } from './lib/utils';
import { format } from 'date-fns';
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

// --- Auth View (Login Page) ---
function AuthView({ onLogin }: { onLogin: () => void }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (email === 'suraksha' && password === 'suraksha@123') {
      onLogin();
    } else {
      setError('Invalid credentials. Use suraksha / suraksha@123');
    }
  };

  // Simulates a Google Auth delay for the exhibition demo
  const handleGoogleLogin = () => {
    setIsGoogleLoading(true);
    setTimeout(() => {
      onLogin();
    }, 1500); // 1.5 second fake loading delay
  };

  return (
    <div className="min-h-screen bg-[#0a0f1c] flex flex-col items-center justify-center p-6 font-sans">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md flex flex-col items-center"
      >
        {/* Fixed Overlap: Moved badge into the normal layout flow */}
        <div className="flex items-center gap-2 px-4 py-1.5 rounded-full border border-blue-900/50 bg-blue-950/30 mb-8">
          <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse"></span>
          <span className="text-[10px] font-bold text-blue-400 tracking-widest uppercase">Next-Gen Protection</span>
        </div>

        <div className="w-24 h-24 bg-blue-600 rounded-[28px] flex items-center justify-center mb-8 shadow-[0_0_40px_rgba(37,99,235,0.3)]">
          <Shield className="text-white w-12 h-12" strokeWidth={1.5} />
        </div>
        
        <h1 className="text-5xl font-black text-white mb-6 tracking-tight">SURAKSHA</h1>
        
        <p className="text-slate-400 text-center mb-10 text-sm leading-relaxed px-4">
          Unified intelligence for the modern rider. Real-time telemetry, advanced crash detection, and smart analytics in one interface.
        </p>

        <form onSubmit={handleLogin} className="w-full space-y-4 mb-6">
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
              <Mail className="h-5 w-5 text-slate-500" />
            </div>
            <input
              type="text"
              placeholder="User ID"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-slate-900/50 border border-slate-800 text-white rounded-2xl py-4 pl-12 pr-4 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all placeholder:text-slate-600"
            />
          </div>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
              <Lock className="h-5 w-5 text-slate-500" />
            </div>
            <input
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-slate-900/50 border border-slate-800 text-white rounded-2xl py-4 pl-12 pr-4 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all placeholder:text-slate-600"
            />
          </div>

          {error && <p className="text-red-400 text-xs text-center font-medium">{error}</p>}

          <button 
            type="submit"
            className="w-full bg-blue-600 text-white font-bold py-4 rounded-2xl hover:bg-blue-700 transition-all active:scale-[0.98] shadow-lg shadow-blue-600/20"
          >
            Access Dashboard
          </button>
        </form>

        <div className="w-full flex items-center justify-center gap-4 mb-6">
          <div className="h-px bg-slate-800 flex-1"></div>
          <span className="text-slate-600 text-xs font-medium uppercase">OR</span>
          <div className="h-px bg-slate-800 flex-1"></div>
        </div>

        <button
          type="button"
          onClick={handleGoogleLogin}
          disabled={isGoogleLoading}
          className="w-full bg-slate-200 text-slate-900 font-bold py-4 rounded-2xl flex items-center justify-center gap-3 hover:bg-white transition-all active:scale-[0.98] disabled:opacity-80"
        >
          {isGoogleLoading ? (
            <span className="flex items-center gap-3">
              <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: "linear" }} className="w-5 h-5 border-2 border-slate-900 border-t-transparent rounded-full" />
              Connecting to Google...
            </span>
          ) : (
            <>
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
              </svg>
              Authenticate Securely
            </>
          )}
        </button>
      </motion.div>
    </div>
  );
}

// --- Main App ---

export default function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [telemetry, setTelemetry] = useState<ESP32Telemetry | null>(null);

  useEffect(() => {
    if (!isAuthenticated) return;

    const fetchLatestData = async () => {
      try {
        const response = await fetch(`${BACKEND_URL}/latest`);
        const data = await response.json();
        
        if (data.status !== 'waiting_for_esp32') {
          setTelemetry(data);
        }
      } catch (error) {
        console.error('Error fetching telemetry:', error);
      }
    };

    fetchLatestData();
    const intervalId = setInterval(fetchLatestData, 2000);
    return () => clearInterval(intervalId);
  }, [isAuthenticated]);

  if (!isAuthenticated) {
    return <AuthView onLogin={() => setIsAuthenticated(true)} />;
  }

  if (telemetry?.alertInProgress || telemetry?.accidentConfirmed) {
    return <SOSTriageView telemetry={telemetry} />;
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans">
      <DashboardView telemetry={telemetry} onLogout={() => setIsAuthenticated(false)} />
    </div>
  );
}

// --- SOS Triage View ---

function SOSTriageView({ telemetry }: { telemetry: ESP32Telemetry | null }) {
  const dismissAlert = async () => {
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

function DashboardView({ telemetry, onLogout }: { telemetry: ESP32Telemetry | null, onLogout: () => void }) {
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
        <button 
          onClick={onLogout}
          className="text-sm font-bold text-slate-500 hover:text-slate-900 transition-colors"
        >
          Sign Out
        </button>
      </header>

      <main className="px-6 py-8 space-y-12">
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

        <section className="space-y-6">
          <div className="flex items-center gap-2 mb-2">
            <MapIcon className="w-5 h-5 text-blue-600" />
            <h2 className="text-lg font-bold text-slate-900">GPS Tracker (Coming Soon)</h2>
          </div>
          <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-200">
            <div className="aspect-[16/9] bg-slate-100 rounded-2xl overflow-hidden relative border border-slate-200">
              <MapContainer 
                center={[15.3647, 75.1240]} 
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