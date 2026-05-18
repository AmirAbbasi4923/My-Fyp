import { useEffect, useState, useRef } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useSessionGuard } from '@/hooks/useSessionGuard';
import SessionLockoutOverlay from '@/components/SessionLockoutOverlay';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  LogOut,
  User,
  Stethoscope,
  Phone,
  Mail,
  Calendar,
  Clock,
  Users,
  CheckCircle2,
  ArrowRight,
  LayoutDashboard,
  ClipboardList,
  FileText,
  Settings,
  Search,
  Activity,
  ChevronRight,
  MessageSquare,
  FileUp,
  History,
  AlertCircle,
  Download
} from 'lucide-react';
import { Navigate, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import logoMark from '@/assets/az-logo.svg';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';

// --- Types ---

interface DoctorProfile {
  id: string;
  name: string;
  speciality: string;
  phone_number: string;
  email: string;
  is_online: boolean;
}

interface Appointment {
  id: string;
  patient_id: string;
  doctor_id: string;
  appointment_date: string;
  status: 'pending' | 'pending_approval' | 'confirmed' | 'in_consultation' | 'completed' | 'cancelled';
  notes: string | null;
  doctor_remarks: string | null;
  queue_position: number | null;
  consultation_started_at: string | null;
  patient?: {
    full_name: string;
    email: string;
    phone_number?: string;
    dob?: string;
    blood_group?: string;
    gender?: string;
  };
}

interface MedicalRecord {
  id: string;
  patient_id: string;
  file_name: string;
  file_url: string;
  file_type: string;
  created_at: string;
}

type ViewType = 'dashboard' | 'history' | 'patients' | 'settings';

const DoctorDashboard = () => {
  const { user, userRole, userName, signOut, loading: authLoading } = useAuth();
  const navigate = useNavigate();

  // --- Session Guard (single active session) ---
  const { lockoutReason } = useSessionGuard({
    userId: user?.id ?? null,
    userRole: userRole === 'doctor' ? 'doctor' : null,
    onForceSignOut: signOut,
  });

  // --- UI State ---
  const [activeView, setActiveView] = useState<ViewType>('dashboard');
  const [isPatientDrawerOpen, setIsPatientDrawerOpen] = useState(false);
  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null);
  const [patientRecords, setPatientRecords] = useState<MedicalRecord[]>([]);
  const [doctorRemarks, setDoctorRemarks] = useState('');
  const [isSubmittingRemarks, setIsSubmittingRemarks] = useState(false);
  const [isOnline, setIsOnline] = useState(true);
  const [elapsedTick, setElapsedTick] = useState(0);

  // --- Data State ---
  const [doctorProfile, setDoctorProfile] = useState<DoctorProfile | null>(null);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [recordsLoading, setRecordsLoading] = useState(false);

  // --- Elapsed timer tick (1 s interval) ---
  useEffect(() => {
    const id = setInterval(() => setElapsedTick(t => t + 1), 1000);
    return () => clearInterval(id);
  }, []);

  // --- Effects ---

  useEffect(() => {
    if (user && userRole === 'doctor') {
      fetchInitialData();
      subscribeToChanges();
    }
  }, [user, userRole]);

  const fetchInitialData = async () => {
    setLoading(true);
    try {
      await Promise.all([
        fetchDoctorProfile(),
        fetchAppointments()
      ]);
    } catch (error) {
      console.error("Error loading doctor data", error);
    } finally {
      setLoading(false);
    }
  };

  const subscribeToChanges = () => {
    const channel = supabase
      .channel('doctor_realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'appointments',
          filter: `doctor_id=eq.${user?.id}`,
        },
        () => {
          fetchAppointments();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  };

  const fetchDoctorProfile = async () => {
    if (!user) return;
    try {
      const { data, error } = await supabase
        .from('doctors')
        .select('*')
        .eq('id', user.id)
        .single();

      if (!error && data) {
        setDoctorProfile(data);
        // Explicitly check for boolean to avoid null issues
        setIsOnline(!!data.is_online);
      }
    } catch (e) {
      console.error("Profile fetch error", e);
    }
  };

  const fetchAppointments = async () => {
    if (!user) return;
    const { data: apts, error } = await supabase
      .from('appointments')
      .select('*, patient:patients(*)')
      .eq('doctor_id', user.id)
      .order('appointment_date', { ascending: true });

    if (!error && apts) {
      setAppointments(apts as any);
    }
  };

  const fetchPatientRecords = async (patientId: string) => {
    setRecordsLoading(true);
    try {
      const { data, error } = await supabase
        .from('medical_documents')
        .select('*')
        .eq('patient_id', patientId)
        .order('created_at', { ascending: false });

      if (!error && data) {
        setPatientRecords(data as any);
      }
    } catch (e) {
      console.error("Error fetching records", e);
    } finally {
      setRecordsLoading(false);
    }
  };

  const handleUpdateAvailability = async (checked: boolean) => {
    if (!user) return;

    // Optimistic Update
    const previousState = isOnline;
    setIsOnline(checked);

    try {
      const { error } = await supabase
        .from('doctors')
        .update({ is_online: checked })
        .eq('id', user.id);

      if (error) throw error;

      // Update local profile state too
      if (doctorProfile) {
        setDoctorProfile({ ...doctorProfile, is_online: checked });
      }

      toast.success(checked ? "You are now ONLINE" : "You are now OFFLINE");
    } catch (e: any) {
      console.error("Availability update error:", e);
      toast.error(`Update Failed: ${e.message || 'Please ensure "is_online" column exists'}`);
      setIsOnline(previousState);
    }
  };

  const handleStartConsultation = async (apt: Appointment) => {
    if (!user) return;
    try {
      const { error } = await supabase
        .from('appointments')
        .update({
          status: 'in_consultation',
          consultation_started_at: new Date().toISOString(),
        } as any)
        .eq('id', apt.id);

      if (error) throw error;

      // Open drawer for the in-progress patient
      setSelectedAppointment({ ...apt, status: 'in_consultation', consultation_started_at: new Date().toISOString() });
      fetchPatientRecords(apt.patient_id);
      setIsPatientDrawerOpen(true);
      toast.success(`Consultation started with ${apt.patient?.full_name}`);
    } catch (err: any) {
      toast.error(err.message || 'Failed to start consultation');
    }
  };

  const handleCompleteConsultation = async () => {
    if (!selectedAppointment || !user) return;

    setIsSubmittingRemarks(true);
    try {
      // 1. Update appointment
      const { error: updateError } = await supabase
        .from('appointments')
        .update({
          status: 'completed',
          doctor_remarks: doctorRemarks,
          updated_at: new Date().toISOString()
        } as any)
        .eq('id', selectedAppointment.id);

      if (updateError) throw updateError;

      // 2. Log activity
      await (supabase.from('audit_logs') as any).insert({
        admin_id: user.id || null,
        action_type: 'DOCTOR_COMPLETE_SESSION',
        target_id: selectedAppointment.id,
        description: `Dr. ${doctorProfile?.name} completed session with patient ${selectedAppointment.patient?.full_name}`
      });

      toast.success("Consultation completed successfully");
      setIsPatientDrawerOpen(false);
      setSelectedAppointment(null);
      setDoctorRemarks('');
      fetchAppointments();
    } catch (error: any) {
      toast.error(error.message || "Operation failed");
    } finally {
      setIsSubmittingRemarks(false);
    }
  };

  const handleDownload = async (url: string, fileName: string) => {
    try {
      const response = await fetch(url);
      const blob = await response.blob();
      const link = document.createElement('a');
      link.href = window.URL.createObjectURL(blob);
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (e) {
      window.open(url, '_blank');
    }
  };

  // --- Sub-components ---

  const SidebarItem = ({ icon: Icon, label, view }: { icon: any, label: string, view: ViewType }) => (
    <button
      onClick={() => setActiveView(view)}
      className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition-all duration-300 ${activeView === view
        ? 'bg-primary text-white shadow-lg shadow-primary/20 scale-102'
        : 'text-gray-500 hover:bg-gray-100 hover:text-gray-900'
        }`}
    >
      <Icon className={`w-5 h-5 ${activeView === view ? 'animate-pulse' : ''}`} />
      {label}
    </button>
  );

  const StatusBadge = ({ status }: { status: string }) => {
    const styles: Record<string, string> = {
      pending: "bg-blue-50 text-blue-600 border-blue-100",
      pending_approval: "bg-orange-50 text-orange-600 border-orange-100",
      confirmed: "bg-green-50 text-green-600 border-green-100",
      in_consultation: "bg-purple-50 text-purple-700 border-purple-200",
      completed: "bg-gray-50 text-gray-600 border-gray-100",
      cancelled: "bg-red-50 text-red-600 border-red-100",
    };
    return (
      <Badge variant="outline" className={`${styles[status] || styles.pending} capitalize text-[10px] font-bold px-2 py-0.5`}>
        {status.replace(/_/g, ' ')}
      </Badge>
    );
  };

  /** Format ms as MM:SS elapsed */
  const formatElapsed = (startedAt: string) => {
    const diffMs = Date.now() - new Date(startedAt).getTime();
    const totalSec = Math.max(0, Math.floor(diffMs / 1000));
    const m = Math.floor(totalSec / 60);
    const s = totalSec % 60;
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

  const AvatarLetter = ({ name, className = "w-10 h-10" }: { name: string, className?: string }) => (
    <div className={`${className} rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold shadow-sm border border-primary/20`}>
      {name.charAt(0).toUpperCase()}
    </div>
  );

  // --- Filters ---
  const todayQueue = appointments
    .filter(a => a.status === 'confirmed' || a.status === 'in_consultation')
    .sort((a, b) => {
      // in_consultation always first
      if (a.status === 'in_consultation') return -1;
      if (b.status === 'in_consultation') return 1;
      return (a.queue_position ?? 999) - (b.queue_position ?? 999);
    });
  const finishedToday = appointments.filter(a => a.status === 'completed');
  const allPatients = Array.from(new Set(appointments.map(a => a.patient?.email)))
    .map(email => appointments.find(a => a.patient?.email === email)?.patient)
    .filter(Boolean);

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="flex flex-col items-center gap-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary" />
          <p className="text-muted-foreground animate-pulse font-medium">Initializing Doctor Portal...</p>
        </div>
      </div>
    );
  }

  if (!user || userRole !== 'doctor') {
    return <Navigate to="/signin" replace />;
  }

  return (
    <div className="flex min-h-screen bg-gray-50/50 font-sans">
      <SessionLockoutOverlay
        reason={lockoutReason}
        onReturnToLogin={() => { signOut(); navigate('/signin'); }}
      />
      {/* Sidebar */}
      <aside className="w-64 bg-white border-r border-gray-200 fixed h-screen z-20 hidden md:flex flex-col overflow-hidden select-none">
        <div
          className="p-6 border-b border-gray-100 cursor-pointer"
          onClick={() => window.location.reload()}
        >
          <div className="flex items-center gap-3">
            <img src={logoMark} alt="Logo" className="w-8 h-8" />
            <span className="font-bold text-xl bg-gradient-to-r from-primary to-primary-600 bg-clip-text text-transparent">
              Doctor Portal
            </span>
          </div>
        </div>

        <nav className="flex-1 p-4 space-y-1">
          <SidebarItem icon={LayoutDashboard} label="Live Queue" view="dashboard" />
          <SidebarItem icon={History} label="My Schedule" view="history" />
          <SidebarItem icon={Users} label="Patient Records" view="patients" />
          <SidebarItem icon={Settings} label="Profile Settings" view="settings" />
        </nav>

        <div className="p-4 border-t border-gray-100">
          {/* Availability Toggle */}
          <div className="flex items-center justify-between mb-6 p-3 bg-gray-50 border border-gray-100 rounded-xl">
            <div className="flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full ${isOnline ? 'bg-green-500 animate-pulse' : 'bg-gray-400'}`} />
              <span className="text-[10px] font-bold uppercase tracking-wider text-gray-500">
                {isOnline ? 'Active Online' : 'Offline'}
              </span>
            </div>
            <Switch
              checked={isOnline}
              onCheckedChange={handleUpdateAvailability}
              className="data-[state=checked]:bg-green-500 scale-90"
            />
          </div>

          <div className="flex items-center gap-3 px-4 py-3 mb-4 rounded-lg bg-gray-50 border border-gray-100">
            <AvatarLetter name={doctorProfile?.name || 'Dr'} className="w-8 h-8" />
            <div className="overflow-hidden">
              <p className="text-sm font-semibold text-gray-900 truncate">Dr. {doctorProfile?.name}</p>
              <p className="text-[10px] text-gray-500 truncate">{user.email}</p>
            </div>
          </div>
          <Button
            variant="ghost"
            className="w-full justify-start text-red-500 hover:text-red-600 hover:bg-red-50 rounded-xl font-semibold"
            onClick={signOut}
          >
            <LogOut className="w-4 h-4 mr-3" />
            Log Out
          </Button>
        </div>
      </aside>

      {/* Mobile Bottom Navigation Bar */}
      <nav className="mobile-bottom-nav">
        <button
          onClick={() => setActiveView('dashboard')}
          className={activeView === 'dashboard' ? 'active' : ''}
        >
          <LayoutDashboard />
          <span>Queue</span>
        </button>
        <button
          onClick={() => setActiveView('history')}
          className={activeView === 'history' ? 'active' : ''}
        >
          <History />
          <span>Schedule</span>
        </button>
        <button
          onClick={() => setActiveView('patients')}
          className={activeView === 'patients' ? 'active' : ''}
        >
          <Users />
          <span>Patients</span>
        </button>
        <button
          onClick={() => setActiveView('settings')}
          className={activeView === 'settings' ? 'active' : ''}
        >
          <Settings />
          <span>Profile</span>
        </button>
      </nav>

      {/* Main Content */}
      <main className="flex-1 md:ml-64 p-4 md:p-8 min-h-screen">
        <ScrollArea className="h-full">
          <div className="max-w-6xl mx-auto space-y-8 pb-10 mobile-bottom-nav-spacer">

            {/* Mobile-only Top Bar with Sign Out */}
            <div className="flex items-center justify-between mb-4 md:hidden">
              <div className="flex items-center gap-2">
                <img src={logoMark} alt="Logo" className="w-6 h-6" />
                <span className="font-bold text-base bg-gradient-to-r from-primary to-primary-600 bg-clip-text text-transparent">
                  Doctor Portal
                </span>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={signOut}
                className="text-red-600 hover:text-red-700 hover:bg-red-50 gap-1.5 text-xs px-2 py-1 h-auto"
              >
                <LogOut className="w-3.5 h-3.5" />
                Sign Out
              </Button>
            </div>

            {/* View Transitions */}
            {activeView === 'dashboard' && (
              <div className="animate-in fade-in duration-500 space-y-6">
                {/* Stats */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                  <Card className="border-none shadow-sm bg-primary text-white overflow-hidden relative">
                    <Activity className="absolute -right-4 -bottom-4 w-24 h-24 opacity-10" />
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium opacity-80 uppercase tracking-wider">Confirmed Today</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-4xl font-black">{todayQueue.length}</div>
                      <p className="text-xs mt-1 opacity-70">Waiting for consultation</p>
                    </CardContent>
                  </Card>

                  <Card className="border-none shadow-sm bg-white overflow-hidden">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Completed Sessions</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-4xl font-black text-gray-900">{finishedToday.length}</div>
                      <p className="text-xs text-green-600 mt-1 font-semibold flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3" /> Targets met
                      </p>
                    </CardContent>
                  </Card>

                  <Card className="border-none shadow-sm bg-white md:col-span-1 lg:col-span-1 border-l-4 border-l-orange-500">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Next Patient</CardTitle>
                    </CardHeader>
                    <CardContent>
                      {todayQueue.length > 0 ? (
                        <div className="flex items-center gap-3">
                          <AvatarLetter name={todayQueue[0].patient?.full_name || 'P'} className="w-10 h-10" />
                          <div className="overflow-hidden">
                            <p className="font-bold text-gray-900 truncate">{todayQueue[0].patient?.full_name}</p>
                            <p className="text-xs text-muted-foreground">Queue #{todayQueue[0].queue_position || '1'}</p>
                          </div>
                        </div>
                      ) : (
                        <p className="text-sm text-gray-400">No pending queue</p>
                      )}
                    </CardContent>
                  </Card>
                </div>

                {/* Queue Table */}
                <div className="space-y-4 pt-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-2xl font-black text-gray-900 tracking-tight">Today's Appointment Queue</h3>
                      <p className="text-sm text-muted-foreground">Manage and check-in confirmed patients.</p>
                    </div>
                  </div>

                  {todayQueue.length > 0 ? (
                    <div className="grid grid-cols-1 gap-4">
                      {todayQueue.map((apt, idx) => {
                        const isActive = apt.status === 'in_consultation';
                        const ringClass = idx === 0
                          ? isActive
                            ? 'ring-2 ring-purple-500 ring-offset-2'
                            : 'ring-2 ring-primary ring-offset-2'
                          : '';
                        return (
                          <Card key={apt.id} className={`border-none shadow-sm hvr-card bg-white overflow-hidden ${ringClass}`}>
                            <CardContent className="p-4 flex flex-col md:flex-row items-center justify-between gap-4">
                              <div className="flex items-center gap-4 flex-1 w-full">
                                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center font-black transition-all
                                  ${isActive ? 'bg-purple-600 text-white scale-110 animate-pulse' : idx === 0 ? 'bg-primary text-white scale-110' : 'bg-gray-100 text-gray-400'}`}>
                                  {isActive ? '🩺' : `#${apt.queue_position || idx + 1}`}
                                </div>
                                <AvatarLetter name={apt.patient?.full_name || 'P'} className="w-12 h-12" />
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2">
                                    <h4 className="font-bold text-gray-900 truncate">{apt.patient?.full_name}</h4>
                                    {isActive && (
                                      <Badge className="bg-purple-600 text-white text-[9px] uppercase tracking-wide animate-pulse">
                                        In Consultation
                                      </Badge>
                                    )}
                                    {!isActive && idx === 0 && (
                                      <Badge className="bg-primary text-white text-[9px] uppercase tracking-wide">Next Up</Badge>
                                    )}
                                  </div>
                                  <div className="flex items-center gap-3 mt-0.5 text-[11px] font-semibold text-gray-400">
                                    {isActive && apt.consultation_started_at ? (
                                      <span className="flex items-center gap-1 text-purple-600 font-mono font-black">
                                        <Clock className="w-3 h-3" /> {formatElapsed(apt.consultation_started_at)}
                                        <span className="text-[9px] text-purple-400 font-semibold ml-0.5">elapsed</span>
                                      </span>
                                    ) : (
                                      <span className="flex items-center gap-1">
                                        <Clock className="w-3 h-3" /> {new Date(apt.appointment_date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                      </span>
                                    )}
                                    <span>•</span>
                                    <span className="flex items-center gap-1"><Activity className="w-3 h-3" /> {apt.patient?.blood_group || 'N/A'}</span>
                                  </div>
                                </div>
                              </div>

                              <div className="flex items-center gap-2 w-full md:w-auto">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="flex-1 md:flex-none h-10 font-bold text-xs gap-2"
                                  onClick={() => {
                                    setSelectedAppointment(apt);
                                    fetchPatientRecords(apt.patient_id);
                                    setIsPatientDrawerOpen(true);
                                  }}
                                >
                                  <FileText className="w-4 h-4" /> View Case
                                </Button>
                                {idx === 0 && !isActive && (
                                  <Button
                                    className="flex-1 md:flex-none h-10 bg-primary hover:bg-primary-600 text-white font-black text-xs px-6"
                                    onClick={() => handleStartConsultation(apt)}
                                  >
                                    Start Consultation
                                  </Button>
                                )}
                                {isActive && (
                                  <Button
                                    className="flex-1 md:flex-none h-10 bg-purple-600 hover:bg-purple-700 text-white font-black text-xs px-6"
                                    onClick={() => {
                                      setSelectedAppointment(apt);
                                      fetchPatientRecords(apt.patient_id);
                                      setIsPatientDrawerOpen(true);
                                    }}
                                  >
                                    Finalize & Complete
                                  </Button>
                                )}
                              </div>
                            </CardContent>
                          </Card>
                        );
                      })}
                    </div>
                  ) : (
                    <Card className="border-dashed border-2 py-20 bg-gray-50 flex flex-col items-center justify-center text-center rounded-2xl">
                      <CheckCircle2 className="w-16 h-16 text-gray-200 mb-4" />
                      <h4 className="text-lg font-bold text-gray-900">All caught up!</h4>
                      <p className="text-sm text-gray-500 max-w-xs mx-auto">No confirmed appointments in the queue right now. Relax or check your history.</p>
                    </Card>
                  )}
                </div>
              </div>
            )}

            {activeView === 'history' && (
              <div className="animate-in fade-in duration-500 space-y-6">
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 italic">
                  <h3 className="text-lg font-bold not-italic">Full Schedule History</h3>
                  <p className="text-sm text-gray-500 not-italic">Overview of all appointments including pending and past records.</p>
                </div>

                <div className="space-y-4">
                  {appointments.length > 0 ? appointments.map(apt => (
                    <Card key={apt.id} className="border-none shadow-sm bg-white">
                      <CardContent className="p-4 flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <AvatarLetter name={apt.patient?.full_name || 'P'} className="w-10 h-10" />
                          <div>
                            <p className="font-bold text-gray-900">{apt.patient?.full_name}</p>
                            <p className="text-[10px] text-gray-400 font-bold uppercase">{new Date(apt.appointment_date).toLocaleDateString()} at {new Date(apt.appointment_date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          {apt.doctor_remarks && <Badge variant="secondary" className="text-[9px]">Notes Added</Badge>}
                          <StatusBadge status={apt.status} />
                        </div>
                      </CardContent>
                    </Card>
                  )) : (
                    <div className="text-center py-20 bg-white rounded-2xl border-2 border-dashed">
                      <Calendar className="w-12 h-12 text-gray-200 mx-auto mb-2" />
                      <p className="text-muted-foreground font-medium">No schedule found.</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {activeView === 'patients' && (
              <div className="animate-in fade-in duration-500 space-y-6">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                  <h3 className="text-2xl font-black text-gray-900 tracking-tight">My Patients</h3>
                  <div className="relative w-full md:w-64">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <Input placeholder="Search patients..." className="pl-10 h-10 bg-white" />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                  {allPatients.map((p: any) => (
                    <Card key={p.id} className="border-none shadow-sm bg-white hover:shadow-md transition-all cursor-pointer group">
                      <CardHeader className="pb-4">
                        <div className="flex items-center gap-4">
                          <AvatarLetter name={p.full_name} className="w-12 h-12" />
                          <div>
                            <CardTitle className="text-base group-hover:text-primary transition-colors">{p.full_name}</CardTitle>
                            <CardDescription className="text-[10px] font-bold uppercase">{p.blood_group || 'O+'} • {p.gender || 'Male'}</CardDescription>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-2 mb-4">
                          <div className="flex items-center gap-2 text-xs text-gray-500">
                            <Mail className="w-3.5 h-3.5" /> {p.email}
                          </div>
                          <div className="flex items-center gap-2 text-xs text-gray-500">
                            <Phone className="w-3.5 h-3.5" /> {p.phone_number || 'No Phone'}
                          </div>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="w-full text-[10px] font-bold uppercase tracking-wider group-hover:bg-primary/5 group-hover:text-primary"
                          onClick={() => {
                            const apt = appointments.find(a => a.patient_id === p.id);
                            if (apt) {
                              setSelectedAppointment(apt as any);
                              fetchPatientRecords(p.id);
                              setIsPatientDrawerOpen(true);
                            }
                          }}
                        >
                          View Full Profile <ChevronRight className="w-3 h-3 ml-1" />
                        </Button>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            )}

            {activeView === 'settings' && (
              <div className="animate-in fade-in duration-500 space-y-8 max-w-2xl mx-auto">
                <div className="text-center">
                  <AvatarLetter name={doctorProfile?.name || 'Dr'} className="w-24 h-24 mx-auto mb-4 text-3xl" />
                  <h3 className="text-2xl font-black text-gray-900">Dr. {doctorProfile?.name}</h3>
                  <p className="text-primary font-bold uppercase tracking-widest text-xs mt-1">{doctorProfile?.speciality}</p>
                </div>

                <div className="grid grid-cols-1 gap-6">
                  <Card className="border-none shadow-sm bg-white">
                    <CardHeader>
                      <CardTitle className="text-sm font-bold uppercase text-gray-400">Account Details</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="flex items-center justify-between py-3 border-b border-gray-50">
                        <span className="text-sm font-semibold text-gray-500">Email Address</span>
                        <span className="text-sm font-bold text-gray-900">{doctorProfile?.email}</span>
                      </div>
                      <div className="flex items-center justify-between py-3 border-b border-gray-50">
                        <span className="text-sm font-semibold text-gray-500">Phone Number</span>
                        <span className="text-sm font-bold text-gray-900">{doctorProfile?.phone_number}</span>
                      </div>
                      <div className="flex items-center justify-between py-3">
                        <span className="text-sm font-semibold text-gray-500">Speciality</span>
                        <span className="text-sm font-bold text-primary px-3 py-1 bg-primary/10 rounded-full">{doctorProfile?.speciality}</span>
                      </div>
                    </CardContent>
                  </Card>

                  <div className="p-6 bg-red-50 border border-red-100 rounded-2xl">
                    <div className="flex items-center gap-3 text-red-600 mb-2">
                      <AlertCircle className="w-5 h-5" />
                      <h4 className="font-bold">Security Note</h4>
                    </div>
                    <p className="text-xs text-red-500 leading-relaxed font-medium">
                      Patient records accessed through this dashboard are confidential. Unauthorized sharing or disclosure of medical data is strictly prohibited and subject to professional conduct regulations.
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </ScrollArea>
      </main>

      {/* Patient Detail / Consultation Drawer */}
      <Sheet open={isPatientDrawerOpen} onOpenChange={setIsPatientDrawerOpen}>
        <SheetContent className="sm:max-w-xl overflow-y-auto w-full md:w-[600px] border-l-0">
          {selectedAppointment && (
            <div className="space-y-8 h-full flex flex-col">
              <SheetHeader className="text-left">
                <div className="flex items-center gap-4 mb-4">
                  <AvatarLetter name={selectedAppointment.patient?.full_name || 'P'} className="w-16 h-16 text-xl shadow-lg ring-4 ring-primary/5" />
                  <div>
                    <SheetTitle className="text-2xl font-black text-gray-900">{selectedAppointment.patient?.full_name}</SheetTitle>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge variant="outline" className="text-[10px] font-bold border-primary/20 bg-primary/5 text-primary">Patient ID: {selectedAppointment.patient_id.substring(0, 8)}</Badge>
                      <Badge variant="outline" className="text-[10px] font-bold bg-gray-100 border-gray-200">Session #{selectedAppointment.id.substring(0, 5)}</Badge>
                    </div>
                  </div>
                </div>
              </SheetHeader>

              <Tabs defaultValue="vitals" className="flex-1">
                <TabsList className="grid w-full grid-cols-3 bg-gray-100/50 p-1 rounded-xl">
                  <TabsTrigger value="vitals" className="rounded-lg font-bold text-xs uppercase">Patient Info</TabsTrigger>
                  <TabsTrigger value="records" className="rounded-lg font-bold text-xs uppercase">Medical Files</TabsTrigger>
                  <TabsTrigger value="consultation" className="rounded-lg font-bold text-xs uppercase">Consultation</TabsTrigger>
                </TabsList>

                <TabsContent value="vitals" className="mt-6 space-y-6">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-3 bg-gray-50 border border-gray-100 rounded-xl">
                      <p className="text-[10px] text-gray-400 font-bold uppercase">Date of Birth</p>
                      <p className="text-sm font-black text-gray-900">{selectedAppointment.patient?.dob || 'Not Provided'}</p>
                    </div>
                    <div className="p-3 bg-gray-50 border border-gray-100 rounded-xl">
                      <p className="text-[10px] text-gray-400 font-bold uppercase">Blood Group</p>
                      <p className="text-sm font-black text-red-600">{selectedAppointment.patient?.blood_group || 'O+'}</p>
                    </div>
                    <div className="p-3 bg-gray-50 border border-gray-100 rounded-xl">
                      <p className="text-[10px] text-gray-400 font-bold uppercase">Gender</p>
                      <p className="text-sm font-black text-gray-900">{selectedAppointment.patient?.gender || 'Male'}</p>
                    </div>
                    <div className="p-3 bg-gray-50 border border-gray-100 rounded-xl">
                      <p className="text-[10px] text-gray-400 font-bold uppercase">Phone</p>
                      <p className="text-sm font-black text-gray-900">{selectedAppointment.patient?.phone_number || 'N/A'}</p>
                    </div>
                  </div>

                  <div className="p-4 bg-blue-50/50 border border-blue-100 rounded-2xl">
                    <div className="flex items-center gap-2 mb-2 text-blue-600">
                      <MessageSquare className="w-4 h-4" />
                      <span className="text-xs font-black uppercase">Patient's Booking Notes</span>
                    </div>
                    <p className="text-sm text-blue-900 italic leading-relaxed">
                      "{selectedAppointment.notes || 'No specific notes mentioned in this booking.'}"
                    </p>
                  </div>
                </TabsContent>

                <TabsContent value="records" className="mt-6">
                  {recordsLoading ? (
                    <div className="text-center py-10">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2" />
                      <p className="text-xs text-gray-500 font-medium tracking-tighter uppercase">Decrypting patient vault...</p>
                    </div>
                  ) : patientRecords.length > 0 ? (
                    <div className="space-y-4">
                      {patientRecords.map(record => (
                        <div key={record.id} className="group p-4 bg-white border border-gray-100 rounded-2xl flex items-center justify-between hover:border-primary/30 transition-all hover:bg-gray-50/50 shadow-sm hover:shadow-md cursor-pointer">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-gray-100 rounded-xl flex items-center justify-center text-gray-400 group-hover:bg-primary/10 group-hover:text-primary transition-colors">
                              {record.file_type.includes('image') ? <FileUp className="w-5 h-5" /> : <FileText className="w-5 h-5" />}
                            </div>
                            <div className="overflow-hidden">
                              <p className="text-sm font-bold text-gray-900 truncate max-w-[200px]">{record.file_name}</p>
                              <p className="text-[10px] text-gray-400 font-bold uppercase mt-0.5">{new Date(record.created_at).toLocaleDateString()}</p>
                            </div>
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="bg-primary/5 text-primary hover:bg-primary hover:text-white rounded-lg h-9 w-9 p-0"
                            onClick={() => handleDownload(record.file_url, record.file_name)}
                          >
                            <Download className="w-4 h-4" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-20 bg-gray-50/50 rounded-2xl border-2 border-dashed border-gray-200">
                      <FileText className="w-12 h-12 text-gray-200 mx-auto mb-2" />
                      <p className="text-xs text-gray-400 font-bold uppercase">No medical records uploaded by patient</p>
                    </div>
                  )}
                </TabsContent>

                <TabsContent value="consultation" className="mt-6 flex flex-col h-full space-y-4">
                  <div className="space-y-2">
                    <Label className="text-[11px] font-black uppercase text-gray-400 tracking-wider">Clinical Remarks & Recommendations</Label>
                    <Textarea
                      placeholder="Enter diagnosis, prescription, or follow-up instructions here..."
                      className="min-h-[250px] bg-gray-50 border-gray-100 rounded-2xl resize-none focus:ring-primary/20 text-sm leading-relaxed p-4"
                      value={doctorRemarks}
                      onChange={(e) => setDoctorRemarks(e.target.value)}
                      disabled={selectedAppointment.status === 'completed'}
                    />
                    {selectedAppointment.status === 'completed' && (
                      <p className="text-[10px] text-orange-600 font-bold flex items-center gap-1.5 mt-1">
                        <AlertCircle className="w-3 h-3" /> Consultation finalized. Remarks are now Read-Only.
                      </p>
                    )}
                  </div>

                  {selectedAppointment.status !== 'completed' && (
                    <div className="pt-4 mt-auto">
                      <Button
                        className="w-full h-14 bg-gradient-to-r from-primary to-primary-glow text-white font-black text-base uppercase tracking-widest shadow-xl shadow-primary/20 rounded-2xl hover:scale-102 transition-transform active:scale-95 group"
                        disabled={isSubmittingRemarks || !doctorRemarks}
                        onClick={handleCompleteConsultation}
                      >
                        {isSubmittingRemarks ? (
                          <span className="flex items-center gap-2 animate-pulse">Finalizing...</span>
                        ) : (
                          <span className="flex items-center gap-2">
                            Mark as Completed <CheckCircle2 className="w-5 h-5 group-hover:animate-bounce" />
                          </span>
                        )}
                      </Button>
                      <p className="text-[9px] text-center text-gray-400 mt-4 font-bold tracking-tight px-6 uppercase">
                        Warning: Marking as completed will freeze these medical remarks and notify the patient.
                      </p>
                    </div>
                  )}
                </TabsContent>
              </Tabs>
            </div>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
};

export default DoctorDashboard;
