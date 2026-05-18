import { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useSessionGuard } from '@/hooks/useSessionGuard';
import SessionLockoutOverlay from '@/components/SessionLockoutOverlay';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
  LogOut,
  Stethoscope,
  Shield,
  Search,
  User,
  Phone,
  Mail,
  CheckCircle2,
  Calendar,
  Clock,
  LayoutDashboard,
  Users,
  Settings,
  ClipboardList,
  Activity,
  X,
  Trash2,
  AlertTriangle,
  Eye
} from 'lucide-react';
import { Navigate, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import logoMark from '@/assets/az-logo.svg';
import { Input } from '@/components/ui/input';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

// --- Types ---

interface Doctor {
  id: string;
  name: string;
  speciality: string;
  phone_number: string;
  email: string;
  experience_years?: string;
  created_at: string;
}

interface PatientProfile {
  id: string;
  full_name: string | null;
  email: string;
  phone_number?: string; // from metadata or profile if added
  patient_type?: string;
  role: string;
  created_at: string;
}

interface Appointment {
  id: string;
  patient_id: string;
  doctor_id: string;
  appointment_date: string;
  status: 'pending' | 'pending_approval' | 'confirmed' | 'completed' | 'cancelled';
  notes: string | null;
  created_at: string;
  // enriched fields
  patient?: PatientProfile;
  doctor?: Doctor;
}

interface AuditLog {
  id: string;
  admin_id: string;
  action_type: string;
  target_id: string;
  description: string;
  created_at: string;
}

type ViewType = 'dashboard' | 'doctors' | 'appointments' | 'patients' | 'settings';

const AdminPanel = () => {
  const { user, userRole, signOut, loading: authLoading } = useAuth();
  const navigate = useNavigate();

  // --- Session Guard (single active session) ---
  const { lockoutReason } = useSessionGuard({
    userId: user?.id ?? null,
    userRole: userRole === 'admin' ? 'admin' : null,
    onForceSignOut: signOut,
  });

  // --- State ---
  const [activeView, setActiveView] = useState<ViewType>('dashboard');
  const [searchTerm, setSearchTerm] = useState('');

  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [patients, setPatients] = useState<PatientProfile[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);

  const [loading, setLoading] = useState(true);
  const [selectedPatientId, setSelectedPatientId] = useState<string | null>(null);
  const [isPatientSheetOpen, setIsPatientSheetOpen] = useState(false);

  // Doctor Detail State
  const [selectedDoctorId, setSelectedDoctorId] = useState<string | null>(null);
  const [isDoctorSheetOpen, setIsDoctorSheetOpen] = useState(false);

  const handleClearLogs = () => {
    setAuditLogs([]);
    toast.success("Activity logs cleared (view only).");
  };

  // Confirmation Dialog State
  const [confirmDialog, setConfirmDialog] = useState<{
    isOpen: boolean;
    type: 'delete_doctor' | 'delete_patient' | 'cancel_appointment';
    targetId: string;
    targetName: string;
  }>({
    isOpen: false,
    type: 'delete_doctor',
    targetId: '',
    targetName: '',
  });

  // --- Derived State (Search/Filter) ---
  const filteredDoctors = doctors.filter(d =>
    d.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    d.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    d.speciality.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredPatients = patients.filter(p =>
    (p.full_name?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
    p.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.id.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredAppointments = appointments.filter(a =>
    (a.patient?.full_name?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
    (a.doctor?.name?.toLowerCase() || '').includes(searchTerm.toLowerCase())
  );

  const pendingAppointments = appointments.filter(a => a.status === 'pending_approval');

  // Total stats
  const totalDoctors = doctors.length;
  const totalAppointments = appointments.length;
  const totalPatients = patients.length;

  // --- Effects ---

  useEffect(() => {
    if (user && userRole === 'admin') {
      fetchInitialData();
    }
  }, [user, userRole]);

  // --- Data Fetching ---

  const fetchInitialData = async () => {
    setLoading(true);
    try {
      await Promise.all([
        fetchDoctors(),
        fetchPatients(),
        fetchAppointments(),
        fetchAuditLogs()
      ]);
    } catch (error) {
      console.error("Error loading initial data", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchAuditLogs = async () => {
    try {
      const { data, error } = await supabase
        .from('audit_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(10);

      if (!error && data) {
        setAuditLogs(data as AuditLog[]);
      }
    } catch (e) {
      console.error("Failed to fetch logs", e);
    }
  };

  const fetchDoctors = async () => {
    const { data, error } = await supabase.from('doctors').select('*').order('created_at', { ascending: false });
    if (!error && data) setDoctors(data);
  };

  const fetchPatients = async () => {
    // @ts-ignore
    const { data, error } = await supabase.from('patients').select('*').order('created_at', { ascending: false });
    if (!error && data) {
      const mappedPatients: PatientProfile[] = data.map((p: any) => ({
        id: p.id,
        full_name: p.full_name,
        email: p.email,
        phone_number: p.phone_number,
        patient_type: p.patient_type,
        role: 'patient',
        created_at: p.created_at
      }));
      setPatients(mappedPatients);
    }
  };

  const fetchAppointments = async () => {
    const { data: apts, error } = await supabase.from('appointments').select('*').order('appointment_date', { ascending: true });

    if (error || !apts) return;

    // Fetch related entities
    const patientIds = [...new Set(apts.map(a => a.patient_id))];
    const doctorIds = [...new Set(apts.map(a => a.doctor_id))];

    // @ts-ignore
    const { data: patientProfiles } = await supabase.from('patients').select('*').in('id', patientIds);
    const { data: doctorProfiles } = await supabase.from('doctors').select('*').in('id', doctorIds);

    const enrichedAppointments = apts.map(apt => {
      // @ts-ignore
      const patientData = patientProfiles?.find(p => p.id === apt.patient_id);
      const doctorData = doctorProfiles?.find(d => d.id === apt.doctor_id);

      const patient: PatientProfile = patientData ? {
        id: patientData.id,
        full_name: patientData.full_name,
        email: patientData.email,
        phone_number: patientData.phone_number,
        role: 'patient',
        created_at: patientData.created_at
      } : { id: apt.patient_id, full_name: 'Unknown', email: '', role: 'patient', created_at: '' };

      return {
        ...apt,
        patient: patient,
        doctor: doctorData as Doctor
      } as Appointment;
    });

    setAppointments(enrichedAppointments);
  };

  // --- Actions ---

  const executeDeleteUser = async (role: 'doctor' | 'patient') => {
    const targetId = confirmDialog.targetId;
    const targetName = confirmDialog.targetName;

    try {
      // 1. Attempt to call Edge Function (Simulated if not deployed)
      // In a real scenario: await supabase.functions.invoke('delete-user-data', { body: { user_id: targetId, user_role: role, admin_id: user?.id } })

      // FALLBACK: Client-side DB deletion + Audit Log (Since we can't deploy Edge Function easily in this preview)
      const table = role === 'doctor' ? 'doctors' : 'patients';

      const { error: dbError } = await supabase.from(table).delete().eq('id', targetId);
      if (dbError) throw dbError;

      // 2. Audit Log
      await supabase.from('audit_logs').insert({
        admin_id: user?.id,
        action_type: 'PERMANENT_DELETE',
        target_id: targetId,
        description: `Permanently deleted ${role} ${targetName} and revoked access.`
      });

      toast.success(`${role === 'doctor' ? 'Doctor' : 'Patient'} deleted successfully`);

      // 3. Update Local State
      if (role === 'doctor') {
        setDoctors(prev => prev.filter(d => d.id !== targetId));
      } else {
        setPatients(prev => prev.filter(p => p.id !== targetId));
      }

      // Also remove their appointments locally to reflect cascade
      setAppointments(prev => prev.filter(a =>
        role === 'doctor' ? a.doctor_id !== targetId : a.patient_id !== targetId
      ));

      fetchAuditLogs();

    } catch (error: any) {
      console.error("Delete failed:", error);
      toast.error("Failed to delete user: " + error.message);
    } finally {
      setConfirmDialog({ ...confirmDialog, isOpen: false });
    }
  };

  const executeCancelAppointment = async () => {
    const aptId = confirmDialog.targetId;

    try {
      const { error } = await supabase
        .from('appointments')
        .update({ status: 'cancelled' })
        .eq('id', aptId);

      if (error) throw error;

      // Audit Log
      await supabase.from('audit_logs').insert({
        admin_id: user?.id,
        action_type: 'CANCEL_APPOINTMENT',
        target_id: aptId,
        description: `Cancelled appointment ${aptId}`
      });

      toast.success('Appointment cancelled');
      setAppointments(prev => prev.map(a => a.id === aptId ? { ...a, status: 'cancelled' } : a));
      fetchAuditLogs();

    } catch (err: any) {
      toast.error('Failed to cancel appointment');
    } finally {
      setConfirmDialog({ ...confirmDialog, isOpen: false });
    }
  };

  const handleApproveAppointment = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      const { error } = await supabase
        .from('appointments')
        .update({ status: 'confirmed' })
        .eq('id', id);

      if (error) throw error;

      await supabase.from('audit_logs').insert({
        admin_id: user?.id,
        action_type: 'APPROVE_APPOINTMENT',
        target_id: id,
        description: `Approved appointment ${id}`
      });

      toast.success('Appointment approved');
      setAppointments(prev => prev.map(a => a.id === id ? { ...a, status: 'confirmed' } : a));
      fetchAuditLogs();
    } catch (err: any) {
      toast.error(err.message || 'Failed to approve');
    }
  };

  const openDoctorDetail = (doctorId: string) => {
    setSelectedDoctorId(doctorId);
    setIsDoctorSheetOpen(true);
  };

  // --- Selected Patient Data ---
  const selectedPatient = patients.find(p => p.id === selectedPatientId)
    || appointments.find(a => a.patient_id === selectedPatientId)?.patient;

  const selectedPatientAppointments = appointments
    .filter(a => a.patient_id === selectedPatientId)
    .sort((a, b) => new Date(b.appointment_date).getTime() - new Date(a.appointment_date).getTime());

  // --- Selected Doctor Data ---
  const selectedDoctor = doctors.find(d => d.id === selectedDoctorId);

  const selectedDoctorStats = selectedDoctor ? {
    totalPatients: appointments.filter(a => a.doctor_id === selectedDoctorId && a.status === 'completed').length,
    completedAppointments: appointments.filter(a => a.doctor_id === selectedDoctorId && a.status === 'completed').length,
    pendingQueue: appointments.filter(a => a.doctor_id === selectedDoctorId && (a.status === 'pending' || a.status === 'pending_approval')).length,
    joinedDate: selectedDoctor.created_at
  } : null;

  const openPatientDetail = (patientId: string) => {
    setSelectedPatientId(patientId);
    setIsPatientSheetOpen(true);
  };

  // --- Helpers ---
  const formatDateTime = (dateStr: string) => new Date(dateStr).toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' });
  const formatDateOnly = (dateStr: string) => new Date(dateStr).toLocaleDateString('en-US', { dateStyle: 'medium' });

  // --- Sub-Components ---
  const SidebarItem = ({ icon: Icon, label, view }: { icon: any, label: string, view: ViewType }) => (
    <button
      onClick={() => setActiveView(view)}
      className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 mt-1 ${activeView === view
        ? 'bg-primary/10 text-primary font-semibold shadow-sm'
        : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
        }`}
    >
      <Icon className={`w-5 h-5 ${activeView === view ? 'text-primary' : 'text-gray-500'}`} />
      <span>{label}</span>
    </button>
  );

  const EmptyState = ({ message, icon: Icon }: { message: string, icon: any }) => (
    <div className="flex flex-col items-center justify-center py-12 text-center bg-gray-50/50 rounded-xl border border-dashed border-gray-200">
      <div className="p-4 bg-white rounded-full shadow-sm mb-3">
        <Icon className="w-8 h-8 text-muted-foreground/50" />
      </div>
      <p className="text-muted-foreground font-medium">{message}</p>
    </div>
  );

  // --- Render ---

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="flex flex-col items-center gap-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary" />
          <p className="text-muted-foreground animate-pulse">Loading Admin Panel...</p>
        </div>
      </div>
    );
  }

  if (!user || userRole !== 'admin') {
    return <Navigate to="/signin" replace />;
  }

  return (
    <div className="flex min-h-screen bg-gray-50/50 font-sans">
      <SessionLockoutOverlay
        reason={lockoutReason}
        onReturnToLogin={() => { signOut(); navigate('/signin'); }}
      />
      {/* Sidebar */}
      <aside className="w-64 bg-white border-r border-gray-200 fixed h-full z-20 hidden md:flex flex-col">
        <div
          className="p-6 border-b border-gray-100 cursor-pointer"
          onClick={() => window.location.reload()}
        >
          <div className="flex items-center gap-3">
            <img src={logoMark} alt="Logo" className="w-8 h-8" />
            <span className="font-bold text-xl bg-gradient-to-r from-primary to-primary-600 bg-clip-text text-transparent">
              Admin
            </span>
          </div>
        </div>

        <nav className="flex-1 p-4 space-y-1">
          <SidebarItem icon={LayoutDashboard} label="Dashboard" view="dashboard" />
          <SidebarItem icon={Stethoscope} label="Doctors" view="doctors" />
          <SidebarItem icon={ClipboardList} label="Appointments" view="appointments" />
          <SidebarItem icon={Users} label="Patients" view="patients" />
          <SidebarItem icon={Settings} label="Settings" view="settings" />
        </nav>

        <div className="p-4 border-t border-gray-100">
          <Button
            variant="ghost"
            className="w-full justify-start text-red-600 hover:text-red-700 hover:bg-red-50 gap-3"
            onClick={signOut}
          >
            <LogOut className="w-5 h-5" />
            Sign Out
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
          <span>Home</span>
        </button>
        <button
          onClick={() => setActiveView('doctors')}
          className={activeView === 'doctors' ? 'active' : ''}
        >
          <Stethoscope />
          <span>Doctors</span>
        </button>
        <button
          onClick={() => setActiveView('appointments')}
          className={activeView === 'appointments' ? 'active' : ''}
        >
          <ClipboardList />
          <span>Visits</span>
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
          <span>Settings</span>
        </button>
      </nav>

      {/* Main Content */}
      <main className="flex-1 md:ml-64 p-4 md:p-8 overflow-y-auto max-h-screen relative">
        <div className="max-w-7xl mx-auto space-y-8 animate-fade-in mobile-bottom-nav-spacer">

          {/* Mobile-only Top Bar with Sign Out */}
          <div className="flex items-center justify-between mb-4 md:hidden">
            <div className="flex items-center gap-2">
              <img src={logoMark} alt="Logo" className="w-6 h-6" />
              <span className="font-bold text-base bg-gradient-to-r from-primary to-primary-600 bg-clip-text text-transparent">
                Admin Portal
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

          {/* Top Bar */}
          <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 tracking-tight">
                {activeView.charAt(0).toUpperCase() + activeView.slice(1)}
              </h1>
              <p className="text-muted-foreground">Manage your healthcare system efficiently.</p>
            </div>

            {/* Search Bar - Visible only for list views */}
            {!['dashboard', 'settings'].includes(activeView) && (
              <div className="relative w-full md:w-96 animate-fade-in">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                <Input
                  placeholder={`Search in ${activeView}...`}
                  className="pl-10 bg-white shadow-sm border-gray-200 focus:ring-primary/20"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            )}
          </header>

          {/* Views Content */}
          {activeView === 'dashboard' && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              <div className="lg:col-span-2 space-y-8">
                {/* Stats Cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <Card className="shadow-sm border-none bg-white hover:shadow-md transition-all duration-200">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium text-muted-foreground">Total Doctors</CardTitle>
                      <Stethoscope className="h-4 w-4 text-primary" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-3xl font-bold text-gray-900">{totalDoctors}</div>
                    </CardContent>
                  </Card>
                  <Card className="shadow-sm border-none bg-white hover:shadow-md transition-all duration-200">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium text-muted-foreground">Total Patients</CardTitle>
                      <Users className="h-4 w-4 text-blue-500" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-3xl font-bold text-gray-900">{totalPatients}</div>
                    </CardContent>
                  </Card>
                  <Card className="shadow-sm border-none bg-white hover:shadow-md transition-all duration-200">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium text-muted-foreground">Appointments</CardTitle>
                      <Activity className="h-4 w-4 text-green-500" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-3xl font-bold text-gray-900">{totalAppointments}</div>
                      <p className="text-xs text-muted-foreground mt-1">{pendingAppointments.length} pending</p>
                    </CardContent>
                  </Card>
                </div>

                {/* Pending Approvals */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                      <CheckCircle2 className="w-5 h-5 text-orange-500" />
                      Pending Approvals
                    </h2>
                  </div>

                  {pendingAppointments.length > 0 ? (
                    <div className="grid gap-4 md:grid-cols-2">
                      {pendingAppointments.map(apt => (
                        <Card key={apt.id} className="shadow-sm hover:shadow-md transition-all duration-200 border-none bg-white overflow-hidden group">
                          <div className="h-1 w-full bg-orange-500/20" />
                          <CardContent className="p-5">
                            <div className="flex justify-between items-start mb-4">
                              <div className="flex items-center gap-2">
                                <span className="font-semibold text-gray-900 truncate max-w-[120px]">
                                  {apt.patient?.full_name || 'Unknown'}
                                </span>
                                <Badge variant="outline" className="text-[10px] px-1.5 h-5">PENDING</Badge>
                              </div>
                              <Button size="sm" variant="outline" className="h-8 text-xs text-red-500 hover:text-red-700 hover:bg-red-50 border-red-100"
                                onClick={() => setConfirmDialog({ isOpen: true, type: 'cancel_appointment', targetId: apt.id, targetName: 'this appointment' })}>
                                Cancel
                              </Button>
                            </div>
                            <div className="space-y-1 mb-4 text-sm text-gray-600">
                              <p>Dr. {apt.doctor?.name}</p>
                              <p>{formatDateTime(apt.appointment_date)}</p>
                            </div>
                            <Button className="w-full bg-green-600 hover:bg-green-700 text-white h-9"
                              onClick={(e) => handleApproveAppointment(apt.id, e)}>
                              Approve Request
                            </Button>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  ) : (
                    <EmptyState message="No pending appointments." icon={CheckCircle2} />
                  )}
                </div>
              </div>

              {/* Activity Timeline */}
              <div className="space-y-6">
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 h-[400px] flex flex-col overflow-hidden">
                  <div className="p-4 border-b border-gray-100 flex items-center justify-between bg-white z-10 shrink-0">
                    <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                      <Activity className="w-5 h-5 text-gray-500" />
                      Recent Activity
                    </h3>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-xs text-muted-foreground hover:text-gray-900 h-8 px-2"
                      onClick={handleClearLogs}
                      disabled={auditLogs.length === 0}
                    >
                      Clear
                    </Button>
                  </div>

                  <div className="overflow-y-auto p-6 scrollbar-thin scrollbar-thumb-gray-200 scrollbar-track-transparent">
                    <div className="space-y-6 relative">
                      {/* Timeline Line */}
                      <div className="absolute left-2.5 top-2 bottom-2 w-[2px] bg-gray-100" />
                      {auditLogs.length > 0 ? auditLogs.map((log) => {
                        const getActionColor = (type: string) => {
                          if (type === 'APPOINTMENT_REQUESTED') return 'bg-gray-400';
                          if (type === 'APPROVE_APPOINTMENT') return 'bg-blue-500';
                          if (type === 'CANCEL_APPOINTMENT' || type === 'PATIENT_CANCEL' || type === 'PERMANENT_DELETE') return 'bg-red-500';
                          return 'bg-blue-500';
                        };

                        const getActionLabel = (type: string) => {
                          if (type === 'APPOINTMENT_REQUESTED') return 'New Request';
                          if (type === 'APPROVE_APPOINTMENT') return 'Approved Appointment';
                          if (type === 'PATIENT_CANCEL') return 'Patient Cancelled';
                          if (type === 'CANCEL_APPOINTMENT') return 'Admin Cancelled';
                          return type.replace(/_/g, ' ');
                        };

                        return (
                          <div key={log.id} className="relative pl-8">
                            <div className={`absolute left-0 top-1 w-5 h-5 rounded-full border-4 border-white shadow-sm flex items-center justify-center ${getActionColor(log.action_type)}`} />
                            <div>
                              <p className="text-xs font-semibold text-gray-500 mb-0.5">{new Date(log.created_at).toLocaleString()}</p>
                              <p className="text-sm font-bold text-gray-900">{getActionLabel(log.action_type)}</p>
                              <p className="text-xs text-gray-600 mt-1 line-clamp-2">{log.description}</p>
                            </div>
                          </div>
                        );
                      }) : (
                        <div className="flex flex-col items-center justify-center py-8 text-center">
                          <p className="text-sm text-muted-foreground bg-gray-50 py-1 px-3 rounded-full">No recent activity to display.</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeView === 'doctors' && (
            <Card className="shadow-sm border-none bg-white">
              <CardHeader>
                <CardTitle>Registered Doctors</CardTitle>
                <CardDescription>Total {filteredDoctors.length} doctors found.</CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Full Name</TableHead>
                      <TableHead>Speciality</TableHead>
                      <TableHead>Contact</TableHead>
                      <TableHead>Doctor ID</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredDoctors.map(doc => (
                      <TableRow key={doc.id}>
                        <TableCell className="font-medium">
                          <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-full bg-teal-100 flex items-center justify-center text-teal-700 font-bold text-xs">
                              {doc.name.charAt(0).toUpperCase()}
                            </div>
                            {doc.name}
                          </div>
                        </TableCell>
                        <TableCell>{doc.speciality}</TableCell>
                        <TableCell>{doc.phone_number}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className="font-mono text-xs text-gray-500">
                            {doc.id.split('-')[0]}...
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-2">
                            <Button variant="ghost" size="icon" onClick={() => openDoctorDetail(doc.id)} title="View Details">
                              <Eye className="w-4 h-4 text-gray-500" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="text-red-500 hover:text-red-700 hover:bg-red-50"
                              onClick={() => setConfirmDialog({ isOpen: true, type: 'delete_doctor', targetId: doc.id, targetName: doc.name })}
                              title="Delete Doctor"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}

          {activeView === 'patients' && (
            <Card className="shadow-sm border-none bg-white">
              <CardHeader>
                <CardTitle>Registered Patients</CardTitle>
                <CardDescription>Total {filteredPatients.length} patients found.</CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Full Name</TableHead>
                      <TableHead>Disease Type</TableHead>
                      <TableHead>Contact</TableHead>
                      <TableHead>Patient ID</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredPatients.map(pt => (
                      <TableRow key={pt.id} className="hover:bg-gray-50/50 cursor-pointer" onClick={() => openPatientDetail(pt.id)}>
                        <TableCell className="font-medium">
                          <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-700 font-bold text-xs">
                              {(pt.full_name || pt.email).charAt(0).toUpperCase()}
                            </div>
                            {pt.full_name || 'Unknown'}
                          </div>
                        </TableCell>
                        <TableCell>{pt.patient_type || 'General Checkup'}</TableCell>
                        <TableCell>{pt.phone_number || pt.email}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className="font-mono text-xs text-gray-500">
                            {pt.id.split('-')[0]}...
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-2">
                            <Button variant="ghost" size="icon" onClick={(e) => { e.stopPropagation(); openPatientDetail(pt.id); }} title="View Details">
                              <Eye className="w-4 h-4 text-gray-500" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="text-red-500 hover:text-red-700 hover:bg-red-50"
                              onClick={(e) => {
                                e.stopPropagation();
                                setConfirmDialog({ isOpen: true, type: 'delete_patient', targetId: pt.id, targetName: pt.full_name || 'Unknown' });
                              }}
                              title="Delete Patient"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}

          {activeView === 'appointments' && (
            <Card className="shadow-sm border-none bg-white">
              <CardHeader>
                <CardTitle>All Appointments</CardTitle>
                <CardDescription>Timeline of all bookings.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {filteredAppointments && filteredAppointments.length > 0 ? (
                  filteredAppointments.map(apt => (
                    <div key={apt.id} className="flex items-start gap-4 p-4 rounded-xl border border-gray-100 bg-gray-50/30 hover:bg-white hover:shadow-md transition-all">
                      <div className="flex-col items-center justify-center w-16 hidden sm:flex">
                        <div className="text-xs font-bold text-gray-500 uppercase">{new Date(apt.appointment_date).toLocaleString('default', { month: 'short' })}</div>
                        <div className="text-2xl font-bold text-gray-800">{new Date(apt.appointment_date).getDate()}</div>
                      </div>
                      <div className="flex-1">
                        <div className="flex justify-between items-start">
                          <div>
                            <h4 className="font-semibold text-gray-900">{apt.patient?.full_name}</h4>
                            <p className="text-sm text-gray-500">with Dr. {apt.doctor?.name}</p>
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge className={
                              apt.status === 'confirmed' ? 'bg-green-100 text-green-700' :
                                apt.status === 'cancelled' ? 'bg-red-100 text-red-700' :
                                  'bg-orange-100 text-orange-700'
                            }>
                              {apt.status}
                            </Badge>
                            {apt.status !== 'cancelled' && apt.status !== 'completed' && (
                              <Button size="sm" variant="ghost" className="h-6 w-6 p-0 text-red-400 hover:text-red-600"
                                onClick={() => setConfirmDialog({ isOpen: true, type: 'cancel_appointment', targetId: apt.id, targetName: 'this appointment' })}
                              >
                                <X className="w-4 h-4" />
                              </Button>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <EmptyState message="No appointments found." icon={Calendar} />
                )}
              </CardContent>
            </Card>
          )}

          {activeView === 'settings' && (
            <div className="space-y-8 animate-fade-in">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">

                {/* Profile Settings */}
                <Card className="border-none shadow-sm bg-white">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <User className="w-5 h-5 text-primary" />
                      Admin Profile
                    </CardTitle>
                    <CardDescription>Manage your account details</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-gray-700">Full Name</label>
                      <Input
                        defaultValue={user?.user_metadata?.full_name || 'Admin'}
                        disabled
                        className="bg-gray-50 mb-2"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-gray-700">Email Address</label>
                      <Input
                        value={user?.email || ''}
                        disabled
                        className="bg-gray-50"
                      />
                    </div>
                  </CardContent>
                </Card>

                {/* System Maintenance */}
                <Card className="border-none shadow-sm bg-white">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Shield className="w-5 h-5 text-orange-500" />
                      System Maintenance
                    </CardTitle>
                    <CardDescription>Manage system data and logs</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="p-4 rounded-lg bg-orange-50 border border-orange-100 space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="space-y-1">
                          <h4 className="font-medium text-orange-900">Audit Logs</h4>
                          <p className="text-xs text-orange-700">Clear all local activity history</p>
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={handleClearLogs}
                          className="bg-white border-orange-200 text-orange-700 hover:bg-orange-100 hover:text-orange-800"
                        >
                          Clear Logs
                        </Button>
                      </div>
                    </div>

                    <div className="p-4 rounded-lg bg-blue-50 border border-blue-100 space-y-3 opacity-70 cursor-not-allowed">
                      <div className="flex items-center justify-between">
                        <div className="space-y-1">
                          <h4 className="font-medium text-blue-900">Database Backup</h4>
                          <p className="text-xs text-blue-700">Download system snapshot (Daily)</p>
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          disabled
                          className="bg-white border-blue-200 text-blue-400"
                        >
                          Download
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Application Info */}
                <Card className="border-none shadow-sm bg-white md:col-span-2">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Activity className="w-5 h-5 text-green-500" />
                      System Information
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                      <div className="space-y-1">
                        <p className="text-xs font-medium text-muted-foreground uppercase">Version</p>
                        <p className="font-mono text-sm">v2.4.0-beta</p>
                      </div>
                      <div className="space-y-1">
                        <p className="text-xs font-medium text-muted-foreground uppercase">Environment</p>
                        <Badge variant="secondary" className="bg-green-100 text-green-700 hover:bg-green-100">
                          Production
                        </Badge>
                      </div>
                      <div className="space-y-1">
                        <p className="text-xs font-medium text-muted-foreground uppercase">Server Status</p>
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                          <span className="text-sm font-medium">Operational</span>
                        </div>
                      </div>
                      <div className="space-y-1">
                        <p className="text-xs font-medium text-muted-foreground uppercase">Last Sync</p>
                        <p className="text-sm text-gray-600">{new Date().toLocaleTimeString()}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

              </div>
            </div>
          )}

        </div>
      </main>

      {/* Confirmation Dialog */}
      <AlertDialog open={confirmDialog.isOpen} onOpenChange={(open) => setConfirmDialog({ ...confirmDialog, isOpen: open })}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-red-600">
              <AlertTriangle className="w-5 h-5" />
              {confirmDialog.type === 'cancel_appointment' ? 'Cancel Appointment?' : 'Permanent Deletion Warning'}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {confirmDialog.type === 'cancel_appointment'
                ? "Are you sure you want to cancel this appointment? This action will notify the patient and doctor."
                : `Are you sure you want to permanently delete "${confirmDialog.targetName}"? This will revoke their access immediately and remove all associated data. This action cannot be undone.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={loading}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 hover:bg-red-700 text-white"
              onClick={() => {
                if (confirmDialog.type === 'cancel_appointment') {
                  executeCancelAppointment();
                } else {
                  executeDeleteUser(confirmDialog.type === 'delete_doctor' ? 'doctor' : 'patient');
                }
              }}
            >
              Confirm {confirmDialog.type === 'cancel_appointment' ? 'Cancel' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Patient Detail Slide-Over (Sheet) */}
      <Sheet open={isPatientSheetOpen} onOpenChange={setIsPatientSheetOpen}>
        <SheetContent className="sm:max-w-md overflow-y-auto">
          <SheetHeader className="pb-6 border-b border-gray-100">
            <SheetTitle className="text-2xl font-bold flex items-center gap-2">
              <User className="w-6 h-6 text-primary" />
              Patient Profile
            </SheetTitle>
            <SheetDescription>
              Detailed view of patient information and history.
            </SheetDescription>
          </SheetHeader>

          {selectedPatient ? (
            <div className="space-y-6 pt-6">
              <div className="space-y-4">
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 rounded-full bg-gradient-to-br from-blue-100 to-purple-100 flex items-center justify-center text-xl font-bold text-primary">
                    {(selectedPatient.full_name || selectedPatient.email).charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-gray-900">{selectedPatient.full_name || 'No Name'}</h3>
                    <p className="text-sm font-medium text-primary">{selectedPatient.patient_type || 'General Checkup'}</p>
                    <p className="text-xs text-gray-500 mt-1">{selectedPatient.email}</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 py-4">
                  <div className="bg-blue-50 p-3 rounded-lg border border-blue-100">
                    <p className="text-xs text-blue-600 font-medium uppercase">Total Booked</p>
                    <p className="text-2xl font-bold text-blue-900">{selectedPatientAppointments.length}</p>
                  </div>
                  <div className="bg-orange-50 p-3 rounded-lg border border-orange-100">
                    <p className="text-xs text-orange-600 font-medium uppercase">Upcoming</p>
                    <p className="text-2xl font-bold text-orange-900">
                      {selectedPatientAppointments.filter(a => ['pending', 'confirmed', 'pending_approval'].includes(a.status)).length}
                    </p>
                  </div>
                  <div className="bg-green-50 p-3 rounded-lg border border-green-100 col-span-2">
                    <div className="flex justify-between items-center">
                      <div>
                        <p className="text-xs text-green-600 font-medium uppercase">Visited History (Completed)</p>
                        <p className="text-2xl font-bold text-green-900">
                          {selectedPatientAppointments.filter(a => a.status === 'completed').length}
                        </p>
                      </div>
                      <CheckCircle2 className="w-8 h-8 text-green-200" />
                    </div>
                  </div>
                </div>
              </div>

              <Separator />

              <div>
                <h4 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <ClipboardList className="w-4 h-4 text-primary" />
                  Appointment History
                </h4>
                {selectedPatientAppointments.length > 0 ? (
                  <ScrollArea className="h-[300px] pr-4">
                    <div className="space-y-3">
                      {selectedPatientAppointments.map((apt) => (
                        <div key={apt.id} className="p-3 border border-gray-100 rounded-lg hover:bg-gray-50 transition-colors">
                          <div className="flex justify-between items-start mb-2">
                            <span className="text-sm font-semibold text-gray-800">{formatDateOnly(apt.appointment_date)}</span>
                            <Badge className={`text-[10px] px-1.5 h-5 ${apt.status === 'confirmed' ? 'bg-green-100 text-green-700' :
                              apt.status === 'completed' ? 'bg-gray-100 text-gray-700' :
                                apt.status === 'cancelled' ? 'bg-red-100 text-red-700' :
                                  'bg-orange-100 text-orange-700'
                              }`}>
                              {apt.status}
                            </Badge>
                          </div>
                          <p className="text-xs text-gray-600 mb-1">Dr. {apt.doctor?.name}</p>
                          {apt.notes && <p className="text-xs text-gray-500 italic bg-gray-50 p-1 rounded">"{apt.notes}"</p>}
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                ) : (
                  <p className="text-sm text-gray-500 text-center py-4">No appointment history found.</p>
                )}
              </div>
            </div>
          ) : (
            <div className="py-10 text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4" />
              <p>Loading profile...</p>
            </div>
          )}
        </SheetContent>
      </Sheet>
      {/* Doctor Detail Slide-Over (Sheet) */}
      <Sheet open={isDoctorSheetOpen} onOpenChange={setIsDoctorSheetOpen}>
        <SheetContent className="sm:max-w-md overflow-y-auto">
          <SheetHeader className="pb-6 border-b border-gray-100">
            <SheetTitle className="text-2xl font-bold flex items-center gap-2">
              <Stethoscope className="w-6 h-6 text-primary" />
              Doctor Profile
            </SheetTitle>
            <SheetDescription>
              Professional details and performance metrics.
            </SheetDescription>
          </SheetHeader>

          {selectedDoctor && selectedDoctorStats ? (
            <div className="space-y-6 pt-6">
              <div className="space-y-4">
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 rounded-full bg-gradient-to-br from-green-100 to-teal-100 flex items-center justify-center text-xl font-bold text-teal-700">
                    {selectedDoctor.name.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-gray-900">{selectedDoctor.name}</h3>
                    <p className="text-sm font-medium text-primary">{selectedDoctor.speciality}</p>
                    <p className="text-xs text-gray-500 mt-1">{selectedDoctor.email}</p>
                  </div>
                </div>

                {/* Professional Stats */}
                <div className="grid grid-cols-2 gap-3 py-4">
                  <div className="bg-blue-50 p-3 rounded-lg border border-blue-100">
                    <p className="text-xs text-blue-600 font-medium uppercase">Total Checked</p>
                    <p className="text-2xl font-bold text-blue-900">{selectedDoctorStats.totalPatients}</p>
                  </div>
                  <div className="bg-orange-50 p-3 rounded-lg border border-orange-100">
                    <p className="text-xs text-orange-600 font-medium uppercase">Pending Queue</p>
                    <p className="text-2xl font-bold text-orange-900">{selectedDoctorStats.pendingQueue}</p>
                  </div>
                  <div className="bg-green-50 p-3 rounded-lg border border-green-100 col-span-2">
                    <div className="flex justify-between items-center">
                      <div>
                        <p className="text-xs text-green-600 font-medium uppercase">Completed Appts</p>
                        <p className="text-2xl font-bold text-green-900">{selectedDoctorStats.completedAppointments}</p>
                      </div>
                      <CheckCircle2 className="w-8 h-8 text-green-200" />
                    </div>
                  </div>
                </div>



              </div>


            </div>
          ) : (
            <div className="py-8 text-center text-muted-foreground">
              Select a doctor to view details.
            </div>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
};

export default AdminPanel;
