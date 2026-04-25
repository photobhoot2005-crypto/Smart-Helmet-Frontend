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
  Mail,
  Cpu,
  Sun,
  Moon
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
  lat?: number; // Added GPS Latitude
  lng?: number; // Added GPS Longitude
}

interface RiderProfile {
  name: string;
  bloodType: string;
  sensitivity: number;
  medicalConditions: string;
  primary1: string;
  primary2: string;
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

  const handleGoogleLogin = () => {
    setIsGoogleLoading(true);
    setTimeout(() => {
      onLogin();
    }, 1500);
  };

  return (
    <div className="min-h-screen bg-[#0a0f1c] flex flex-col items-center justify-center p-6 font-sans">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md flex flex-col items-center"
      >
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

// --- Rider Profile Settings Component ---
function RiderProfileSettings({ profile, setProfile }: { profile: RiderProfile, setProfile: React.Dispatch<React.SetStateAction<RiderProfile>> }) {
  const [isEditing, setIsEditing] = useState(false);

  const toggleEdit = () => {
    setIsEditing(!isEditing);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setProfile(prev => ({ ...prev, [name]: value }));
  };

  return (
    <section className="space-y-6 mt-8">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Settings className="w-5 h-5 text-blue-600" />
          <h2 className="text-xl font-bold">System Settings</h2>
        </div>
        <button 
          onClick={toggleEdit}
          className="bg-[#1a56db] text-white px-6 py-2.5 rounded-full text-sm font-bold flex items-center gap-2 hover:bg-blue-700 transition-colors shadow-md active:scale-95"
        >
          <Shield className="w-4 h-4" />
          {isEditing ? 'Save Mission Profile' : 'Update Mission Profile'}
        </button>
      </div>

      <div className="bg-[#e2e6eb] dark:bg-slate-800/80 p-8 rounded-[32px] space-y-8 transition-colors">
        
        {/* RIDER IDENTIFICATION */}
        <div>
          <h3 className="text-slate-500 dark:text-slate-400 text-xs font-bold uppercase tracking-widest mb-4">Rider Identification</h3>
          <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
            <div className="md:col-span-6 space-y-1">
              <label className="text-slate-500 dark:text-slate-400 text-[10px] font-bold uppercase tracking-widest pl-1">Full Legal Name</label>
              {isEditing ? (
                <input 
                  type="text" name="name" value={profile.name} onChange={handleInputChange}
                  className="w-full bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white rounded-2xl py-3 px-4 font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              ) : (
                <div className="w-full bg-[#d6dbe2] dark:bg-slate-900/50 border border-transparent text-slate-900 dark:text-white rounded-2xl py-3 px-4 font-semibold">{profile.name}</div>
              )}
            </div>
            <div className="md:col-span-3 space-y-1">
              <label className="text-slate-500 dark:text-slate-400 text-[10px] font-bold uppercase tracking-widest pl-1">Blood Type</label>
              {isEditing ? (
                <input 
                  type="text" name="bloodType" value={profile.bloodType} onChange={handleInputChange}
                  className="w-full bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white rounded-2xl py-3 px-4 font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              ) : (
                <div className="w-full bg-[#d6dbe2] dark:bg-slate-900/50 border border-transparent text-slate-900 dark:text-white rounded-2xl py-3 px-4 font-semibold">{profile.bloodType}</div>
              )}
            </div>
            <div className="md:col-span-3 space-y-1 flex flex-col justify-center pt-2">
               <label className="text-slate-500 dark:text-slate-400 text-[10px] font-bold uppercase tracking-widest pl-1 mb-2">Sensitivity</label>
               <input 
                 type="range" name="sensitivity" 
                 min="0" max="100" 
                 disabled={!isEditing}
                 value={profile.sensitivity} 
                 onChange={handleInputChange}
                 className="w-full h-2 bg-slate-300 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-blue-600"
               />
            </div>
          </div>

          <div className="mt-4 space-y-1">
            <label className="text-slate-500 dark:text-slate-400 text-[10px] font-bold uppercase tracking-widest pl-1">Medical Conditions & Allergies</label>
            {isEditing ? (
              <textarea 
                name="medicalConditions" value={profile.medicalConditions} onChange={handleInputChange} rows={2}
                className="w-full bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white rounded-2xl py-3 px-4 font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
              />
            ) : (
              <div className="w-full bg-[#d6dbe2] dark:bg-slate-900/50 border border-transparent text-slate-900 dark:text-white rounded-2xl py-3 px-4 font-semibold min-h-[60px]">{profile.medicalConditions}</div>
            )}
          </div>
        </div>

        {/* EMERGENCY CHAIN */}
        <div>
          <h3 className="text-slate-500 dark:text-slate-400 text-xs font-bold uppercase tracking-widest mb-4">Emergency Chain</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-xl">
            <div className="space-y-1">
              <label className="text-slate-500 dark:text-slate-400 text-[10px] font-bold uppercase tracking-widest pl-1">Primary #1 (Main Contact)</label>
              {isEditing ? (
                <input 
                  type="text" name="primary1" value={profile.primary1} onChange={handleInputChange}
                  className="w-full bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white rounded-2xl py-3 px-4 font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              ) : (
                <div className="w-full bg-[#d6dbe2] dark:bg-slate-900/50 border border-transparent text-slate-900 dark:text-white rounded-2xl py-3 px-4 font-semibold">{profile.primary1}</div>
              )}
            </div>
            <div className="space-y-1">
              <label className="text-slate-500 dark:text-slate-400 text-[10px] font-bold uppercase tracking-widest pl-1">Primary #2</label>
              {isEditing ? (
                <input 
                  type="text" name="primary2" value={profile.primary2} onChange={handleInputChange}
                  className="w-full bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white rounded-2xl py-3 px-4 font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              ) : (
                <div className="w-full bg-[#d6dbe2] dark:bg-slate-900/50 border border-transparent text-slate-900 dark:text-white rounded-2xl py-3 px-4 font-semibold">{profile.primary2}</div>
              )}
            </div>
          </div>
        </div>

      </div>

      {/* RESCUE NETWORK */}
      <div className="mt-8">
        <div className="flex items-center gap-2 mb-4">
          <Phone className="w-5 h-5 text-red-500" />
          <h2 className="text-xl font-bold">Rescue Network</h2>
        </div>
        <div className="flex flex-wrap gap-4">
          <div className="bg-[#e2e6eb] dark:bg-slate-800/80 rounded-2xl p-4 flex items-center justify-between min-w-[180px] transition-colors">
            <div>
              <p className="text-slate-500 dark:text-slate-400 text-[10px] font-bold uppercase tracking-widest">Emergency</p>
              <p className="text-2xl font-black text-slate-900 dark:text-white">112</p>
            </div>
            <div className="w-10 h-10 border-2 border-slate-300 dark:border-slate-600 rounded-xl flex items-center justify-center">
              <Phone className="w-4 h-4 text-slate-500 dark:text-slate-400" />
            </div>
          </div>
          <div className="bg-[#e2e6eb] dark:bg-slate-800/80 rounded-2xl p-4 flex items-center justify-between min-w-[180px] transition-colors">
            <div>
              <p className="text-slate-500 dark:text-slate-400 text-[10px] font-bold uppercase tracking-widest">Ambulance</p>
              <p className="text-2xl font-black text-slate-900 dark:text-white">108</p>
            </div>
            <div className="w-10 h-10 border-2 border-slate-300 dark:border-slate-600 rounded-xl flex items-center justify-center">
              <Phone className="w-4 h-4 text-slate-500 dark:text-slate-400" />
            </div>
          </div>
          <div className="bg-[#e2e6eb] dark:bg-slate-800/80 rounded-2xl p-4 flex items-center justify-between min-w-[180px] transition-colors">
            <div>
              <p className="text-slate-500 dark:text-slate-400 text-[10px] font-bold uppercase tracking-widest">Police</p>
              <p className="text-2xl font-black text-slate-900 dark:text-white">100</p>
            </div>
            <div className="w-10 h-10 border-2 border-slate-300 dark:border-slate-600 rounded-xl flex items-center justify-center">
              <Phone className="w-4 h-4 text-slate-500 dark:text-slate-400" />
            </div>
          </div>
          <div className="bg-[#e2e6eb] dark:bg-slate-800/80 rounded-2xl p-4 flex items-center justify-between min-w-[180px] transition-colors">
            <div>
              <p className="text-slate-500 dark:text-slate-400 text-[10px] font-bold uppercase tracking-widest">Roadside</p>
              <p className="text-2xl font-black text-slate-900 dark:text-white">1800-456</p>
            </div>
            <div className="w-10 h-10 border-2 border-slate-300 dark:border-slate-600 rounded-xl flex items-center justify-center">
              <Phone className="w-4 h-4 text-slate-500 dark:text-slate-400" />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

// --- Main App ---

export default function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [telemetry, setTelemetry] = useState<ESP32Telemetry | null>(null);
  
  // Dark mode loaded from LocalStorage
  const [isDarkMode, setIsDarkMode] = useState(() => {
    return localStorage.getItem('suraksha_theme') === 'dark';
  });

  // Profile data loaded from LocalStorage
  const [profile, setProfile] = useState<RiderProfile>(() => {
    const saved = localStorage.getItem('suraksha_profile');
    return saved ? JSON.parse(saved) : {
      name: 'Chinmay Yalawatti',
      bloodType: 'A-',
      sensitivity: 80,
      medicalConditions: 'None',
      primary1: '+91 78997 95100',
      primary2: '7353348918'
    };
  });

  // Save profile to LocalStorage automatically whenever it changes
  useEffect(() => {
    localStorage.setItem('suraksha_profile', JSON.stringify(profile));
  }, [profile]);

  // Save dark mode preference automatically
  useEffect(() => {
    localStorage.setItem('suraksha_theme', isDarkMode ? 'dark' : 'light');
  }, [isDarkMode]);

  const toggleDarkMode = () => {
    setIsDarkMode(!isDarkMode);
  };

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
    return <SOSTriageView telemetry={telemetry} profile={profile} />; 
  }

  return (
    <div className={cn("min-h-screen font-sans transition-colors duration-300", isDarkMode ? "dark bg-[#0a0f1c] text-slate-100" : "bg-slate-50 text-slate-900")}>
      <DashboardView 
        telemetry={telemetry} 
        setTelemetry={setTelemetry}
        onLogout={() => setIsAuthenticated(false)} 
        profile={profile} 
        setProfile={setProfile}
        isDarkMode={isDarkMode}
        toggleDarkMode={toggleDarkMode}
      />
    </div>
  );
}

// --- SOS Triage View ---

function SOSTriageView({ telemetry, profile }: { telemetry: ESP32Telemetry | null, profile: RiderProfile }) {
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
              <p className="text-white text-xl font-semibold">{profile.name}</p>
            </div>
            <div className="flex gap-4">
              <div>
                <p className="text-white/60 text-xs">Blood Type</p>
                <p className="text-white font-semibold">{profile.bloodType}</p>
              </div>
              <div>
                <p className="text-white/60 text-xs">Medical</p>
                <p className="text-white font-semibold truncate max-w-[150px]">{profile.medicalConditions}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-auto pt-12 space-y-4 max-w-md mx-auto w-full">
        <button 
          onClick={() => window.location.href = `tel:${profile.primary1}`}
          className="w-full bg-red-950 text-white h-20 rounded-2xl font-bold text-xl flex items-center justify-center gap-4 shadow-2xl active:scale-95 transition-transform border border-white/10"
        >
          <Ambulance className="w-8 h-8" /> Alert Primary Contact
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

function DashboardView({ telemetry, setTelemetry, onLogout, profile, setProfile, isDarkMode, toggleDarkMode }: { telemetry: ESP32Telemetry | null, setTelemetry: React.Dispatch<React.SetStateAction<ESP32Telemetry | null>>, onLogout: () => void, profile: RiderProfile, setProfile: React.Dispatch<React.SetStateAction<RiderProfile>>, isDarkMode: boolean, toggleDarkMode: () => void }) {
  
  // Check if we have valid GPS telemetry data right now
  const hasValidGPS = telemetry?.lat && telemetry?.lng && telemetry.lat !== 0 && telemetry.lng !== 0;
  
  // Decide what the Google Maps button should open
  const googleMapsUrl = hasValidGPS 
    ? `https://www.google.com/maps/search/?api=1&query=${telemetry.lat},${telemetry.lng}`
    : `https://www.google.com/maps`; // Fallback to search if no GPS lock
    
  // Decide where the visual map should center
  const mapCenter: [number, number] = hasValidGPS ? [telemetry.lat!, telemetry.lng!] : [15.3647, 75.1240];

  const simulateCrash = async () => {
    // Creating the fake crash data package
    const payload = telemetry ? {
      ...telemetry,
      ax: 35000,
      alertInProgress: true,
      accidentConfirmed: false
    } : {
      helmetOn: true,
      sensor1: 0,
      sensor2: 0,
      ax: 35000,
      ay: 0,
      az: 9800,
      alertInProgress: true,
      accidentConfirmed: false
    };

    // INSTANTLY update the local screen so you don't wait for the backend!
    setTelemetry(payload);

    // Send it to Render in the background anyway
    try {
      await fetch(`${BACKEND_URL}/telemetry`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
    } catch (e) {
      console.log("Demo mode triggered offline");
    }
  };

  return (
    <div className="max-w-5xl mx-auto pb-24">
      {/* Header */}
      <header className="p-6 flex items-center justify-between sticky top-0 bg-slate-50/80 dark:bg-[#0a0f1c]/80 backdrop-blur-md z-[1100] border-b border-slate-200/50 dark:border-slate-800 transition-colors">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center">
            <Shield className="text-white w-6 h-6" />
          </div>
          <div>
            <h1 className="font-bold text-xl tracking-tight dark:text-white">SURAKSHA SMART HELMET</h1>
            <p className="text-slate-500 dark:text-slate-400 text-xs font-medium uppercase tracking-wider">
              {telemetry ? 'Connected to ESP32' : 'Waiting for Hardware'}
            </p>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <button 
            onClick={toggleDarkMode}
            className="p-2 rounded-full hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors"
            title="Toggle Theme"
          >
            {isDarkMode ? <Sun className="w-5 h-5 text-yellow-500" /> : <Moon className="w-5 h-5 text-slate-600" />}
          </button>
          <div className="w-px h-6 bg-slate-300 dark:bg-slate-700 mx-1"></div>
          <button 
            onClick={onLogout}
            className="text-sm font-bold text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors px-2"
          >
            Sign Out
          </button>
        </div>
      </header>

      <main className="px-6 py-8 space-y-12">
        
        {/* --- SYSTEM SENSOR DIAGNOSTICS --- */}
        <section className="bg-slate-900 rounded-3xl p-6 text-white shadow-lg">
          <h2 className="text-sm font-bold uppercase tracking-widest text-slate-400 mb-4 flex items-center gap-2">
            <Cpu className="w-4 h-4" /> System Diagnostics
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="flex items-center gap-3 bg-slate-800 px-4 py-3 rounded-2xl">
              <div className={cn("w-3 h-3 rounded-full", telemetry ? "bg-green-500 shadow-[0_0_10px_rgba(34,197,94,0.5)]" : "bg-red-500")} />
              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase">MPU6050 (Motion)</p>
                <p className="text-sm font-black">{telemetry ? 'ONLINE' : 'OFFLINE'}</p>
              </div>
            </div>
            <div className="flex items-center gap-3 bg-slate-800 px-4 py-3 rounded-2xl">
              <div className={cn("w-3 h-3 rounded-full", telemetry ? "bg-green-500 shadow-[0_0_10px_rgba(34,197,94,0.5)]" : "bg-red-500")} />
              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase">IR Sensor 1 (Left)</p>
                <p className="text-sm font-black">{telemetry ? 'ONLINE' : 'OFFLINE'}</p>
              </div>
            </div>
            <div className="flex items-center gap-3 bg-slate-800 px-4 py-3 rounded-2xl">
              <div className={cn("w-3 h-3 rounded-full", telemetry ? "bg-green-500 shadow-[0_0_10px_rgba(34,197,94,0.5)]" : "bg-red-500")} />
              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase">IR Sensor 2 (Right)</p>
                <p className="text-sm font-black">{telemetry ? 'ONLINE' : 'OFFLINE'}</p>
              </div>
            </div>
            <div className="flex items-center gap-3 bg-slate-800 px-4 py-3 rounded-2xl">
              <div className={cn("w-3 h-3 rounded-full", hasValidGPS ? "bg-green-500 shadow-[0_0_10px_rgba(34,197,94,0.5)]" : "bg-yellow-500 shadow-[0_0_10px_rgba(234,179,8,0.5)]")} />
              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase">NEO-6M (GPS)</p>
                <p className="text-sm font-black">{hasValidGPS ? 'LOCK ACQUIRED' : 'PENDING'}</p>
              </div>
            </div>
          </div>
        </section>

        <section className="space-y-6">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <Activity className="w-5 h-5 text-blue-600" />
              <h2 className="text-lg font-bold">Live Hardware Telemetry</h2>
            </div>
            
            <a 
              href={`tel:${profile.primary1}`}
              className="bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 px-5 py-2.5 rounded-lg text-sm font-bold hover:bg-red-200 dark:hover:bg-red-900/50 flex items-center gap-2 transition-transform active:scale-95 shadow-sm"
            >
              <Phone className="w-4 h-4" /> Emergency Call
            </a>
          </div>
          
          <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl shadow-sm border border-slate-200 dark:border-slate-800 transition-colors">
            <div className="flex items-center justify-between mb-6">
              <h3 className="font-bold text-slate-900 dark:text-white">ESP32 Sensor Feed</h3>
              <div className="flex items-center gap-2 px-3 py-1 bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400 rounded-full text-[10px] font-bold uppercase tracking-wider">
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
                <p className={cn("text-xl font-black", telemetry?.helmetOn ? "text-green-600 dark:text-green-400" : "text-slate-400")}>
                  {telemetry?.helmetOn ? 'WORN' : 'REMOVED'}
                </p>
              </div>

              <div className="space-y-1">
                <div className="flex items-center gap-1.5 text-slate-400">
                  {telemetry?.sensor1 === 0 ? <CheckCircle className="w-3.5 h-3.5 text-green-500"/> : <XCircle className="w-3.5 h-3.5 text-red-500"/>}
                  <span className="text-[10px] font-bold uppercase tracking-wider">IR Sensor 1</span>
                </div>
                <p className="text-xl font-black text-slate-900 dark:text-white">{telemetry?.sensor1 === 0 ? 'Clear' : 'Blocked'}</p>
              </div>

              <div className="space-y-1">
                <div className="flex items-center gap-1.5 text-slate-400">
                  {telemetry?.sensor2 === 0 ? <CheckCircle className="w-3.5 h-3.5 text-green-500"/> : <XCircle className="w-3.5 h-3.5 text-red-500"/>}
                  <span className="text-[10px] font-bold uppercase tracking-wider">IR Sensor 2</span>
                </div>
                <p className="text-xl font-black text-slate-900 dark:text-white">{telemetry?.sensor2 === 0 ? 'Clear' : 'Blocked'}</p>
              </div>

              <div className="space-y-1">
                <div className="flex items-center gap-1.5 text-slate-400">
                  <Activity className="w-3.5 h-3.5" />
                  <span className="text-[10px] font-bold uppercase tracking-wider">MPU6050 Accel</span>
                </div>
                <p className="text-sm font-black text-slate-900 dark:text-white">X: {telemetry?.ax || 0}</p>
                <p className="text-sm font-black text-slate-900 dark:text-white">Y: {telemetry?.ay || 0}</p>
                <p className="text-sm font-black text-slate-900 dark:text-white">Z: {telemetry?.az || 0}</p>
              </div>
            </div>

            
          </div>
        </section>

        <section className="space-y-6">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <MapIcon className="w-5 h-5 text-blue-600" />
              <h2 className="text-lg font-bold">GPS Tracker (Coming Soon)</h2>
            </div>
            
            {/* DYNAMIC GOOGLE MAPS LINK */}
            <a 
              href={googleMapsUrl} 
              target="_blank" 
              rel="noopener noreferrer"
              className="bg-blue-600 text-white dark:bg-blue-600 dark:text-white px-5 py-2.5 rounded-lg text-sm font-bold hover:bg-blue-700 dark:hover:bg-blue-700 flex items-center gap-2 transition-all active:scale-95 shadow-md"
            >
              <Navigation className="w-4 h-4" /> Open in Google Maps
            </a>
          </div>

          <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl shadow-sm border border-slate-200 dark:border-slate-800 transition-colors">
            <div className="aspect-[16/9] bg-slate-100 dark:bg-slate-800 rounded-2xl overflow-hidden relative border border-slate-200 dark:border-slate-700">
              <MapContainer 
                key={`${mapCenter[0]}-${mapCenter[1]}`} 
                center={mapCenter} 
                zoom={13} 
                className="h-full w-full z-0"
              >
                <TileLayer
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                  attribution='© OpenStreetMap contributors'
                />
                <Marker position={mapCenter}>
                  <Popup>{hasValidGPS ? "Live Rider Location" : "Pending ESP32 GPS Integration"}</Popup>
                </Marker>
              </MapContainer>
            </div>
          </div>
        </section>

        <RiderProfileSettings profile={profile} setProfile={setProfile} />

      </main>
    </div>
  );
}