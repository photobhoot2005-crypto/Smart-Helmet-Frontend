/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo } from 'react';
import { 
  auth, db 
} from './firebase';
import { 
  onAuthStateChanged, 
  signInWithPopup, 
  GoogleAuthProvider,
  signOut,
  User
} from 'firebase/auth';
import { 
  doc, 
  onSnapshot, 
  setDoc, 
  collection, 
  query, 
  orderBy, 
  limit,
  addDoc,
  Timestamp,
  getDocFromServer
} from 'firebase/firestore';
import { 
  AlertTriangle, 
  Activity, 
  Battery, 
  Shield, 
  Map as MapIcon, 
  Settings, 
  Phone, 
  Ambulance, 
  History, 
  LogOut,
  User as UserIcon,
  Droplets,
  Zap,
  Signal,
  Navigation,
  Download,
  Play,
  Square,
  Gauge,
  Timer
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from './lib/utils';
import { format } from 'date-fns';
import { MapContainer, TileLayer, Polyline, Marker, Popup } from 'react-leaflet';
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

enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface RiderProfile {
  name: string;
  bloodType: string;
  allergies: string;
  emergencyContacts: string[];
}

interface HelmetStatus {
  battery: number;
  imuStatus: boolean;
  gpsStatus: boolean;
  gsmStatus: boolean;
  heartRate: number;
  spO2: number;
  gpsLock: boolean;
  crashSensitivity: 'City Commute' | 'Off-Road/Potholes';
  isCrashing: boolean;
  speed?: number;
  distance?: number;
}

interface CrashReport {
  id: string;
  timestamp: Date;
  gForce: number;
  latitude: number;
  longitude: number;
}

interface Trip {
  id: string;
  startTime: Date;
  endTime?: Date;
  route: { lat: number; lng: number; timestamp: Date }[];
}

// --- Error Handling ---

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
    },
    operationType,
    path
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  // In a real app, we'd show this in a toast or error boundary
}

// --- Components ---

const LoadingScreen = () => (
  <div className="fixed inset-0 bg-slate-950 flex flex-col items-center justify-center z-50">
    <motion.div
      animate={{ rotate: 360 }}
      transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
      className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full mb-4"
    />
    <p className="text-slate-400 font-mono text-sm tracking-widest uppercase">Initializing SafeRide Systems...</p>
  </div>
);

const AuthView = () => {
  const handleLogin = async () => {
    try {
      await signInWithPopup(auth, new GoogleAuthProvider());
    } catch (error) {
      console.error('Login failed', error);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-6 relative overflow-hidden">
      <div className="absolute inset-0 opacity-20">
        <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_50%_50%,#1e293b_0%,transparent_70%)]" />
      </div>
      
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative z-10 text-center max-w-md"
      >
        <div className="w-20 h-20 bg-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-8 shadow-2xl shadow-blue-500/20">
          <Shield className="text-white w-10 h-10" />
        </div>
        <h1 className="text-4xl font-bold text-white mb-4 tracking-tight">SafeRide</h1>
        <p className="text-slate-400 mb-10 leading-relaxed">
          The next generation of rider safety. Connect your smart helmet to access real-time telemetry, crash detection, and trip analytics.
        </p>
        
        <button
          onClick={handleLogin}
          className="w-full bg-white text-slate-950 font-semibold py-4 px-8 rounded-xl flex items-center justify-center gap-3 hover:bg-slate-100 transition-all active:scale-95 shadow-xl"
        >
          <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" className="w-5 h-5" alt="Google" />
          Continue with Google
        </button>
      </motion.div>
    </div>
  );
};

// --- Main App ---

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<RiderProfile | null>(null);
  const [status, setStatus] = useState<HelmetStatus | null>(null);
  const [crashes, setCrashes] = useState<CrashReport[]>([]);
  const [trips, setTrips] = useState<Trip[]>([]);
  const [sensorLogs, setSensorLogs] = useState<any[]>([]);
  const [isAuthReady, setIsAuthReady] = useState(false);

  // Auth Listener
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setIsAuthReady(true);
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  // Connection Test
  useEffect(() => {
    if (isAuthReady && user) {
      const testConnection = async () => {
        try {
          await getDocFromServer(doc(db, 'test', 'connection'));
        } catch (error) {
          if (error instanceof Error && error.message.includes('the client is offline')) {
            console.error("Please check your Firebase configuration.");
          }
        }
      };
      testConnection();
    }
  }, [isAuthReady, user]);

  // Data Listeners
  useEffect(() => {
    if (!isAuthReady || !user) return;

    const profileRef = doc(db, `users/${user.uid}/profile/main`);
    const statusRef = doc(db, `users/${user.uid}/status/live`);
    const crashesRef = collection(db, `users/${user.uid}/crashes`);
    const tripsRef = collection(db, `users/${user.uid}/trips`);
    const sensorDataRef = collection(db, `users/${user.uid}/sensorData`);

    const unsubProfile = onSnapshot(profileRef, (snap) => {
      if (snap.exists()) setProfile(snap.data() as RiderProfile);
    }, (err) => handleFirestoreError(err, OperationType.GET, profileRef.path));

    const unsubStatus = onSnapshot(statusRef, (snap) => {
      if (snap.exists()) setStatus(snap.data() as HelmetStatus);
    }, (err) => handleFirestoreError(err, OperationType.GET, statusRef.path));

    const unsubCrashes = onSnapshot(query(crashesRef, orderBy('timestamp', 'desc'), limit(3)), (snap) => {
      const data = snap.docs.map(d => ({ 
        id: d.id, 
        ...d.data(), 
        timestamp: (d.data().timestamp as Timestamp).toDate() 
      } as CrashReport));
      setCrashes(data);
    }, (err) => handleFirestoreError(err, OperationType.LIST, crashesRef.path));

    const unsubTrips = onSnapshot(query(tripsRef, orderBy('startTime', 'desc'), limit(5)), (snap) => {
      const data = snap.docs.map(d => ({ 
        id: d.id, 
        ...d.data(), 
        startTime: (d.data().startTime as Timestamp).toDate(),
        endTime: d.data().endTime ? (d.data().endTime as Timestamp).toDate() : undefined,
        route: d.data().route?.map((r: any) => ({ ...r, timestamp: (r.timestamp as Timestamp).toDate() }))
      } as Trip));
      setTrips(data);
    }, (err) => handleFirestoreError(err, OperationType.LIST, tripsRef.path));

    const unsubSensorLogs = onSnapshot(query(sensorDataRef, orderBy('timestamp', 'desc'), limit(10)), (snap) => {
      const data = snap.docs.map(d => ({ 
        id: d.id, 
        ...d.data(), 
        timestamp: (d.data().timestamp as Timestamp).toDate() 
      }));
      setSensorLogs(data);
    }, (err) => handleFirestoreError(err, OperationType.LIST, sensorDataRef.path));

    return () => {
      unsubProfile();
      unsubStatus();
      unsubCrashes();
      unsubTrips();
      unsubSensorLogs();
    };
  }, [isAuthReady, user]);

  if (loading) return <LoadingScreen />;
  if (!user) return <AuthView />;

  // If a crash is detected, show the SOS Triage View
  if (status?.isCrashing) {
    return <SOSTriageView profile={profile} status={status} />;
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans">
      <DashboardView 
        user={user} 
        profile={profile} 
        status={status} 
        crashes={crashes} 
        trips={trips} 
        sensorLogs={sensorLogs}
      />
    </div>
  );
}

// --- SOS Triage View ---

function SOSTriageView({ profile, status }: { profile: RiderProfile | null, status: HelmetStatus | null }) {
  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="fixed inset-0 bg-red-600 z-[100] flex flex-col p-6 overflow-y-auto"
    >
      {/* Flashing Alert Banner */}
      <motion.div 
        animate={{ opacity: [1, 0.5, 1] }}
        transition={{ duration: 1, repeat: Infinity }}
        className="bg-white text-red-600 p-4 rounded-xl text-center font-bold text-xl mb-8 shadow-2xl"
      >
        CRASH DETECTED: DO NOT REMOVE HELMET UNLESS NECESSARY
      </motion.div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl mx-auto w-full">
        {/* Live Clinical Vitals */}
        <div className="bg-red-700/50 backdrop-blur-md rounded-2xl p-6 border border-white/20">
          <h2 className="text-white/70 uppercase text-xs font-bold tracking-widest mb-4 flex items-center gap-2">
            <Activity className="w-4 h-4" /> Live Clinical Vitals
          </h2>
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-white/10 rounded-xl p-4">
              <p className="text-white/60 text-xs mb-1">Heart Rate</p>
              <p className="text-white text-3xl font-bold">{status?.heartRate || '--'} <span className="text-sm font-normal">BPM</span></p>
            </div>
            <div className="bg-white/10 rounded-xl p-4">
              <p className="text-white/60 text-xs mb-1">SpO2</p>
              <p className="text-white text-3xl font-bold">{status?.spO2 || '--'} <span className="text-sm font-normal">%</span></p>
            </div>
          </div>
        </div>

        {/* Critical Rider Profile */}
        <div className="bg-red-700/50 backdrop-blur-md rounded-2xl p-6 border border-white/20">
          <h2 className="text-white/70 uppercase text-xs font-bold tracking-widest mb-4 flex items-center gap-2">
            <UserIcon className="w-4 h-4" /> Critical Rider Profile
          </h2>
          <div className="space-y-4">
            <div>
              <p className="text-white/60 text-xs">Rider Name</p>
              <p className="text-white text-xl font-semibold">{profile?.name || 'Unknown Rider'}</p>
            </div>
            <div className="flex gap-8">
              <div>
                <p className="text-white/60 text-xs">Blood Type</p>
                <p className="text-white text-xl font-bold">{profile?.bloodType || '--'}</p>
              </div>
              <div>
                <p className="text-white/60 text-xs">Allergies/Conditions</p>
                <p className="text-white text-sm">{profile?.allergies || 'None reported'}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Instant Action Buttons */}
      <div className="mt-auto pt-12 space-y-4 max-w-md mx-auto w-full">
        <button 
          onClick={() => window.location.href = `tel:${profile?.emergencyContacts[0]}`}
          className="w-full bg-white text-red-600 h-20 rounded-2xl font-bold text-xl flex items-center justify-center gap-4 shadow-2xl active:scale-95 transition-transform"
        >
          <Phone className="w-8 h-8" /> Call Emergency Contact
        </button>
        <button 
          onClick={() => window.location.href = `tel:108`}
          className="w-full bg-red-950 text-white h-20 rounded-2xl font-bold text-xl flex items-center justify-center gap-4 shadow-2xl active:scale-95 transition-transform border border-white/10"
        >
          <Ambulance className="w-8 h-8" /> Call Local Ambulance
        </button>
        <button 
          onClick={async () => {
            if (!auth.currentUser) return;
            const statusRef = doc(db, `users/${auth.currentUser.uid}/status/live`);
            await setDoc(statusRef, { isCrashing: false }, { merge: true });
          }}
          className="w-full text-white/50 text-sm font-bold py-4 hover:text-white transition-colors"
        >
          I'm Safe - Dismiss Alert
        </button>
      </div>
    </motion.div>
  );
}

// --- Dashboard View ---

function DashboardView({ user, profile, status, crashes, trips, sensorLogs }: { 
  user: User, 
  profile: RiderProfile | null, 
  status: HelmetStatus | null, 
  crashes: CrashReport[], 
  trips: Trip[],
  sensorLogs: any[]
}) {
  const [isRecording, setIsRecording] = useState(false);
  const [selectedTripId, setSelectedTripId] = useState<string | null>(null);
  
  const selectedTrip = useMemo(() => trips.find(t => t.id === selectedTripId), [trips, selectedTripId]);
  
  // Form State
  const [formData, setFormData] = useState({
    name: profile?.name || user.displayName || '',
    bloodType: profile?.bloodType || '',
    allergies: profile?.allergies || '',
    emergencyContacts: profile?.emergencyContacts || ['', '', ''],
    crashSensitivity: status?.crashSensitivity || 'City Commute'
  });

  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (profile) {
      setFormData(prev => ({
        ...prev,
        name: profile.name,
        bloodType: profile.bloodType,
        allergies: profile.allergies,
        emergencyContacts: profile.emergencyContacts.length ? profile.emergencyContacts : ['', '', '']
      }));
    }
  }, [profile]);

  useEffect(() => {
    if (status) {
      setFormData(prev => ({
        ...prev,
        crashSensitivity: status.crashSensitivity
      }));
    }
  }, [status]);

  const handleSignOut = () => signOut(auth);

  const handleSaveProfile = async () => {
    setIsSaving(true);
    try {
      const profileRef = doc(db, `users/${user.uid}/profile/main`);
      const statusRef = doc(db, `users/${user.uid}/status/live`);
      
      await setDoc(profileRef, {
        name: formData.name,
        bloodType: formData.bloodType,
        allergies: formData.allergies,
        emergencyContacts: formData.emergencyContacts.filter(c => c.trim() !== '')
      }, { merge: true });

      await setDoc(statusRef, {
        crashSensitivity: formData.crashSensitivity
      }, { merge: true });

      // In a real app, we'd show a success toast
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `users/${user.uid}/profile/main`);
    } finally {
      setIsSaving(false);
    }
  };

  const handleToggleRide = async () => {
    if (!isRecording) {
      setIsRecording(true);
      if (user) {
        const statusRef = doc(db, `users/${user.uid}/status/live`);
        await setDoc(statusRef, { speed: 45, distance: 0.1 }, { merge: true });
      }
    } else {
      setIsRecording(false);
      if (user) {
        const statusRef = doc(db, `users/${user.uid}/status/live`);
        await setDoc(statusRef, { speed: 0 }, { merge: true });
      }
    }
  };

  // Simulate movement during recording
  useEffect(() => {
    let interval: any;
    if (isRecording && user) {
      interval = setInterval(async () => {
        const statusRef = doc(db, `users/${user.uid}/status/live`);
        const newSpeed = Math.floor(Math.random() * 20) + 40; // 40-60 km/h
        const currentDistance = status?.distance ?? 0;
        await setDoc(statusRef, { 
          speed: newSpeed, 
          distance: Number((currentDistance + 0.01).toFixed(2)) 
        }, { merge: true });
      }, 3000);
    }
    return () => clearInterval(interval);
  }, [isRecording, user, status?.distance]);

  // Real-time raw sensor logging
  useEffect(() => {
    let interval: any;
    if (isRecording && user) {
      interval = setInterval(async () => {
        try {
          const sensorDataRef = collection(db, `users/${user.uid}/sensorData`);
          await addDoc(sensorDataRef, {
            timestamp: Timestamp.now(),
            imu: {
              ax: Number((Math.random() * 2 - 1).toFixed(3)),
              ay: Number((Math.random() * 2 - 1).toFixed(3)),
              az: Number((9.8 + Math.random() * 0.5).toFixed(3))
            },
            gps: {
              lat: 12.9716 + (Math.random() * 0.01),
              lng: 77.5946 + (Math.random() * 0.01)
            },
            heartRate: Math.floor(Math.random() * 20) + 70,
            spO2: Math.floor(Math.random() * 3) + 97
          });
        } catch (error) {
          console.error("Error logging sensor data:", error);
        }
      }, 5000); // Log every 5 seconds
    }
    return () => clearInterval(interval);
  }, [isRecording, user]);

  return (
    <div className="max-w-5xl mx-auto pb-24">
      {/* Header */}
      <header className="p-6 flex items-center justify-between sticky top-0 bg-slate-50/80 backdrop-blur-md z-[1100] border-b border-slate-200/50">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center">
            <Shield className="text-white w-6 h-6" />
          </div>
          <div>
            <h1 className="font-bold text-xl tracking-tight">SafeRide</h1>
            <p className="text-slate-500 text-xs font-medium uppercase tracking-wider">Unified Safety Control</p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-right hidden sm:block">
            <p className="text-sm font-semibold">{user.displayName}</p>
            <p className="text-xs text-slate-500">{user.email}</p>
          </div>
          <button onClick={handleSignOut} className="p-2 text-slate-400 hover:text-red-500 transition-colors">
            <LogOut className="w-5 h-5" />
          </button>
        </div>
      </header>

      <main className="px-6 py-8 space-y-12">
        {/* Zero Insights State (Dynamic Prompt) */}
        {(!profile || !status) && (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="p-8 bg-blue-600 text-white rounded-3xl shadow-xl shadow-blue-500/20 flex flex-col md:flex-row items-center gap-8"
          >
            <div className="w-20 h-20 bg-white/20 rounded-2xl flex items-center justify-center shrink-0">
              <Shield className="w-10 h-10" />
            </div>
            <div className="text-center md:text-left">
              <h3 className="text-2xl font-bold mb-2">Welcome to SafeRide, {user.displayName?.split(' ')[0]}!</h3>
              <p className="text-blue-100 mb-6 max-w-xl">
                Your helmet profile is currently empty. To enable full safety features and live telemetry, please complete your rider profile and emergency contacts below.
              </p>
              <div className="flex flex-col sm:flex-row gap-4">
                <button 
                  onClick={async () => {
                    if (!user) return;
                    const profileRef = doc(db, `users/${user.uid}/profile/main`);
                    const statusRef = doc(db, `users/${user.uid}/status/live`);
                    await setDoc(profileRef, {
                      name: user.displayName || 'Demo Rider',
                      bloodType: 'O+',
                      allergies: 'None',
                      emergencyContacts: ['+91 98765 43210']
                    });
                    await setDoc(statusRef, {
                      battery: 85,
                      imuStatus: true,
                      gpsStatus: true,
                      gsmStatus: true,
                      heartRate: 72,
                      spO2: 98,
                      gpsLock: true,
                      crashSensitivity: 'City Commute',
                      isCrashing: false,
                      speed: 0,
                      distance: 0
                    });
                  }}
                  className="bg-white text-blue-600 font-bold py-3 px-8 rounded-xl hover:bg-blue-50 transition-colors"
                >
                  Quick Setup (Simulate Data)
                </button>
              </div>
            </div>
          </motion.div>
        )}

        {/* Section 1: Live Telemetry */}
        <section className="space-y-6">
          <div className="flex items-center gap-2 mb-2">
            <Activity className="w-5 h-5 text-blue-600" />
            <h2 className="text-lg font-bold text-slate-900">Live Telemetry</h2>
          </div>
          <div className="grid grid-cols-1 gap-6">
            {/* Live Telemetry */}
            <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-200">
              <div className="flex items-center justify-between mb-6">
                <h3 className="font-bold text-slate-900">Live Feed</h3>
                <div className="flex items-center gap-2 px-3 py-1 bg-green-50 text-green-600 rounded-full text-[10px] font-bold uppercase tracking-wider">
                  <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" />
                  Streaming
                </div>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-6">
                <TelemetryCard icon={Zap} label="Heart Rate" value={status?.heartRate} unit="BPM" />
                <TelemetryCard icon={Droplets} label="SpO2" value={status?.spO2} unit="%" />
                <TelemetryCard icon={Signal} label="GPS Lock" value={status?.gpsLock ? 'Locked' : 'Searching'} unit="" />
                <TelemetryCard icon={Navigation} label="Heading" value="342" unit="°" />
              </div>
              <div className="mt-6 pt-6 border-t border-slate-100 flex justify-end">
                <button 
                  onClick={async () => {
                    if (!user) return;
                    const statusRef = doc(db, `users/${user.uid}/status/live`);
                    await setDoc(statusRef, { isCrashing: true }, { merge: true });
                    
                    const crashesRef = collection(db, `users/${user.uid}/crashes`);
                    await addDoc(crashesRef, {
                      timestamp: Timestamp.now(),
                      gForce: 12.4,
                      latitude: 12.9716,
                      longitude: 77.5946
                    });
                  }}
                  className="text-red-500 text-xs font-bold uppercase tracking-widest flex items-center gap-2 hover:bg-red-50 px-3 py-1.5 rounded-lg transition-colors"
                >
                  <AlertTriangle className="w-3 h-3" /> Simulate Crash Event
                </button>
              </div>
            </div>
          </div>
        </section>

        {/* Section 2: Trip Tracker */}
        <section className="space-y-6">
          <div className="flex items-center gap-2 mb-2">
            <MapIcon className="w-5 h-5 text-blue-600" />
            <h2 className="text-lg font-bold text-slate-900">Trip Tracker</h2>
          </div>
          <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-200">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
              <div>
                <h3 className="font-bold text-slate-900">Active Ride</h3>
                <p className="text-xs text-slate-500">Real-time route visualization</p>
              </div>
              <div className="flex flex-wrap items-center gap-3">
                {isRecording && (
                  <div className="flex items-center gap-4 px-4 py-2 bg-slate-50 rounded-xl border border-slate-100">
                    <div className="flex items-center gap-2">
                      <Activity className="w-4 h-4 text-green-500 animate-pulse" />
                      <span className="text-[10px] font-black text-green-600">LOGGING</span>
                    </div>
                    <div className="w-px h-6 bg-slate-200" />
                    <div className="flex items-center gap-2">
                      <Gauge className="w-4 h-4 text-blue-600" />
                      <span className="text-sm font-black">{status?.speed ?? 0} <span className="text-[10px] font-bold text-slate-400">km/h</span></span>
                    </div>
                  </div>
                )}
                <button 
                  onClick={handleToggleRide}
                  className={cn(
                    "flex items-center gap-2 px-6 py-2.5 rounded-xl font-bold transition-all",
                    isRecording 
                      ? "bg-red-100 text-red-600 hover:bg-red-200" 
                      : "bg-blue-600 text-white hover:bg-blue-700 shadow-lg shadow-blue-500/20"
                  )}
                >
                  {isRecording ? <><Square className="w-4 h-4 fill-current" /> Stop Ride</> : <><Play className="w-4 h-4 fill-current" /> Start Ride</>}
                </button>
              </div>
            </div>
            
            <div className="aspect-[16/9] bg-slate-100 rounded-2xl overflow-hidden relative border border-slate-200">
              {trips.length > 0 || isRecording || selectedTrip ? (
                <MapContainer 
                  center={selectedTrip?.route[0] || trips[0]?.route[0] || [20.5937, 78.9629]} 
                  zoom={selectedTrip ? 15 : 13} 
                  className="h-full w-full z-0"
                >
                  <TileLayer
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                  />
                  {selectedTrip ? (
                    <>
                      <Polyline 
                        positions={selectedTrip.route.map(r => [r.lat, r.lng] as [number, number])} 
                        color="#2563eb" 
                        weight={6}
                      />
                      {selectedTrip.route.map((point, idx) => (
                        <Marker key={idx} position={[point.lat, point.lng]}>
                          <Popup>
                            <div className="text-xs font-sans">
                              <p className="font-bold">Point {idx + 1}</p>
                              <p className="text-slate-500">{format(point.timestamp, 'HH:mm:ss')}</p>
                              <p className="text-slate-400 font-mono">{point.lat.toFixed(4)}, {point.lng.toFixed(4)}</p>
                            </div>
                          </Popup>
                        </Marker>
                      ))}
                    </>
                  ) : (
                    trips.map(trip => (
                      <Polyline 
                        key={trip.id} 
                        positions={trip.route.map(r => [r.lat, r.lng] as [number, number])} 
                        color="#2563eb" 
                        weight={4}
                        opacity={0.6}
                      />
                    ))
                  )}
                </MapContainer>
              ) : (
                <div className="h-full w-full flex items-center justify-center">
                  <div className="text-center p-8">
                    <MapIcon className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                    <p className="text-slate-500 font-medium">No Trip Data Available</p>
                  </div>
                </div>
              )}
              {isRecording && (
                <div className="absolute top-4 left-4 bg-white/90 backdrop-blur px-3 py-1.5 rounded-lg border border-slate-200 flex items-center gap-2 z-[1000]">
                  <span className="w-2 h-2 bg-red-500 rounded-full animate-ping" />
                  <span className="text-xs font-bold uppercase tracking-wider">Recording...</span>
                </div>
              )}
              {selectedTrip && (
                <div className="absolute top-4 right-4 z-[1000]">
                  <button 
                    onClick={() => setSelectedTripId(null)}
                    className="bg-white/90 backdrop-blur px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-bold text-blue-600 hover:bg-white transition-all shadow-sm"
                  >
                    Clear Selection
                  </button>
                </div>
              )}
            </div>
          </div>
        </section>

        {/* Section 3: Black Box & History */}
        <section className="space-y-6">
          <div className="flex items-center gap-2 mb-2">
            <Shield className="w-5 h-5 text-slate-900" />
            <h2 className="text-lg font-bold text-slate-900">Black Box Data</h2>
          </div>
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Crash Reports */}
            <div className="bg-slate-900 text-white p-8 rounded-3xl shadow-xl relative overflow-hidden">
              <div className="absolute top-0 right-0 p-8 opacity-10">
                <Shield className="w-32 h-32" />
              </div>
              <div className="relative z-10">
                <h3 className="text-lg font-bold mb-6 flex items-center gap-3">
                  <AlertTriangle className="text-red-400 w-5 h-5" /> Incident Log
                </h3>
                {crashes.length > 0 ? (
                  <div className="space-y-4">
                    {crashes.map((crash) => (
                      <div key={crash.id} className="flex items-center justify-between p-4 bg-white/5 rounded-2xl border border-white/10">
                        <div>
                          <p className="text-sm font-bold">{format(crash.timestamp, 'MMM d, HH:mm')}</p>
                          <p className="text-[10px] text-white/40 font-mono">{crash.gForce}G Impact</p>
                        </div>
                        <div className="px-2 py-1 bg-red-500/20 text-red-400 rounded text-[10px] font-bold uppercase">SOS Triggered</div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12 border-2 border-dashed border-white/10 rounded-3xl">
                    <p className="text-white/50 text-sm italic">No crash incidents recorded.</p>
                  </div>
                )}
              </div>
            </div>

            {/* Trip History */}
            <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-200">
              <h3 className="font-bold text-slate-900 mb-6 flex items-center gap-2">
                <History className="w-5 h-5 text-blue-600" /> Recent Trips
              </h3>
              {trips.length > 0 ? (
                <div className="space-y-3 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
                  {trips.map((trip) => (
                    <button
                      key={trip.id}
                      onClick={() => {
                        setSelectedTripId(trip.id);
                        window.scrollTo({ top: 0, behavior: 'smooth' });
                      }}
                      className={cn(
                        "w-full flex items-center justify-between p-4 rounded-2xl border transition-all text-left",
                        selectedTripId === trip.id 
                          ? "bg-blue-50 border-blue-200 ring-1 ring-blue-200" 
                          : "bg-slate-50 border-slate-100 hover:border-slate-200"
                      )}
                    >
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center border border-slate-200 shadow-sm">
                          <Navigation className="w-5 h-5 text-blue-600" />
                        </div>
                        <div>
                          <p className="font-bold text-slate-900 text-sm">{format(trip.startTime, 'MMM d, p')}</p>
                          <p className="text-[10px] text-slate-500">{trip.route.length} points</p>
                        </div>
                      </div>
                      <Navigation className="w-4 h-4 text-blue-600 opacity-50" />
                    </button>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <p className="text-slate-400 text-sm italic">No recorded trips yet.</p>
                </div>
              )}
            </div>
          </div>

          {/* Raw Sensor Stream */}
          <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-200">
            <h3 className="font-bold text-slate-900 mb-6 flex items-center gap-2">
              <Activity className="w-5 h-5 text-green-600" /> Raw Sensor Stream
            </h3>
            <div className="space-y-2 max-h-[200px] overflow-y-auto pr-2 custom-scrollbar">
              {sensorLogs.length > 0 ? (
                sensorLogs.map((log) => (
                  <div key={log.id} className="p-3 bg-slate-50 rounded-xl border border-slate-100 font-mono text-[10px] flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className="text-slate-400">{format(log.timestamp, 'HH:mm:ss')}</span>
                      <span className="text-blue-600">IMU: {log.imu.ax}, {log.imu.ay}</span>
                      <span className="text-green-600">GPS: {log.gps.lat.toFixed(4)}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-red-500">HR: {log.heartRate}</span>
                      <span className="text-orange-500">{log.spO2}%</span>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-slate-400 text-xs italic text-center py-4">Waiting for sensor data...</p>
              )}
            </div>
          </div>
        </section>

        {/* Section 4: Emergency Resources */}
        <section className="space-y-6">
          <div className="flex items-center gap-2 mb-2">
            <Phone className="w-5 h-5 text-red-600" />
            <h2 className="text-lg font-bold text-slate-900">Emergency Resources</h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <HelplineCard label="National Emergency" number="112" />
            <HelplineCard label="Ambulance" number="108" />
            <HelplineCard label="Police" number="100" />
            <HelplineCard label="Roadside" number="1800-123-4567" />
          </div>
        </section>

        {/* Section 5: Configuration & Profile */}
        <section className="space-y-6">
          <div className="flex items-center gap-2 mb-2">
            <Settings className="w-5 h-5 text-slate-600" />
            <h2 className="text-lg font-bold text-slate-900">Configuration</h2>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Profile */}
            <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-200">
              <h3 className="font-bold text-slate-900 mb-6 flex items-center gap-2">
                <UserIcon className="w-5 h-5 text-blue-600" /> Rider Profile
              </h3>
              <div className="space-y-4">
                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1 block">Full Name</label>
                  <input 
                    type="text" 
                    value={formData.name}
                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1 block">Blood Type</label>
                    <select 
                      value={formData.bloodType}
                      onChange={(e) => setFormData({...formData, bloodType: e.target.value})}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                    >
                      <option value="">Select</option>
                      {['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'].map(t => (
                        <option key={t} value={t}>{t}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1 block">Allergies</label>
                    <input 
                      type="text" 
                      value={formData.allergies}
                      onChange={(e) => setFormData({...formData, allergies: e.target.value})}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Emergency Contacts */}
            <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-200">
              <h3 className="font-bold text-slate-900 mb-6 flex items-center gap-2">
                <Phone className="w-5 h-5 text-blue-600" /> Emergency Contacts
              </h3>
              <div className="space-y-4">
                {[0, 1, 2].map((i) => (
                  <div key={i}>
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1 block">Contact {i + 1}</label>
                    <input 
                      type="tel" 
                      value={formData.emergencyContacts[i] || ''}
                      onChange={(e) => {
                        const newContacts = [...formData.emergencyContacts];
                        newContacts[i] = e.target.value;
                        setFormData({...formData, emergencyContacts: newContacts});
                      }}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                    />
                  </div>
                ))}
              </div>
            </div>

            {/* Sensitivity */}
            <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-200">
              <h3 className="font-bold text-slate-900 mb-6 flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-orange-500" /> Crash Sensitivity
              </h3>
              <div className="space-y-6">
                <div className="flex justify-between mb-2">
                  <span className={cn("text-xs font-bold", formData.crashSensitivity === 'City Commute' ? "text-blue-600" : "text-slate-400")}>City</span>
                  <span className={cn("text-xs font-bold", formData.crashSensitivity === 'Off-Road/Potholes' ? "text-blue-600" : "text-slate-400")}>Off-Road</span>
                </div>
                <input 
                  type="range" 
                  min="0" 
                  max="1" 
                  step="1"
                  value={formData.crashSensitivity === 'Off-Road/Potholes' ? 1 : 0}
                  onChange={(e) => setFormData({...formData, crashSensitivity: e.target.value === '1' ? 'Off-Road/Potholes' : 'City Commute'})}
                  className="w-full h-2 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-blue-600"
                />
              </div>
            </div>

            {/* Save */}
            <div className="bg-blue-600 p-6 rounded-3xl shadow-xl shadow-blue-500/20 flex flex-col justify-center items-center text-center text-white">
              <Shield className="w-10 h-10 mb-4 opacity-50" />
              <button 
                onClick={handleSaveProfile}
                disabled={isSaving}
                className="w-full bg-white text-blue-600 font-bold py-4 rounded-2xl hover:bg-blue-50 transition-all active:scale-95 disabled:opacity-50"
              >
                {isSaving ? 'Saving...' : 'Update SafeRide Profile'}
              </button>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}

// --- Helper Components ---

function SensorIndicator({ label, active }: { label: string, active?: boolean }) {
  return (
    <div className="flex flex-col items-center gap-1.5">
      <div className={cn("w-2 h-2 rounded-full", active ? "bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.5)]" : "bg-red-500")} />
      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">{label}</span>
    </div>
  );
}

function TelemetryCard({ icon: Icon, label, value, unit }: { icon: any, label: string, value: any, unit: string }) {
  return (
    <div className="space-y-1">
      <div className="flex items-center gap-1.5 text-slate-400">
        <Icon className="w-3.5 h-3.5" />
        <span className="text-[10px] font-bold uppercase tracking-wider">{label}</span>
      </div>
      <p className="text-xl font-black text-slate-900">
        {value ?? '--'} <span className="text-xs font-bold text-slate-400">{unit}</span>
      </p>
    </div>
  );
}

function HelplineCard({ label, number }: { label: string, number: string }) {
  return (
    <div className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100">
      <div>
        <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">{label}</p>
        <p className="text-lg font-bold text-slate-900">{number}</p>
      </div>
      <button 
        onClick={() => window.location.href = `tel:${number}`}
        className="w-10 h-10 bg-white rounded-xl flex items-center justify-center border border-slate-200 text-slate-400 hover:text-blue-600 hover:border-blue-200 transition-all shadow-sm"
      >
        <Phone className="w-5 h-5" />
      </button>
    </div>
  );
}
