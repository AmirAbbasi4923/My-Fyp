import { useEffect, useState, useRef } from 'react';
import html2canvas from 'html2canvas';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  LogOut,
  Stethoscope,
  Phone,
  Mail,
  Calendar,
  Search,
  CheckCircle2,
  LayoutDashboard,
  Settings,
  Clock,
  ClipboardList,
  Activity,
  X,
  UserCircle,
  HelpCircle,
  Download,
  Upload,
  FileText,
  File,
  Trash2,
  Ticket,
  Printer,
  MessageSquare
} from 'lucide-react';
import { Navigate, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import logoMark from '@/assets/az-logo.svg';
import logoMarkWhite from '@/assets/az-logo-white.svg';
import logoMarkBlack from '@/assets/az-logo-black.svg';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import NotificationBell from '@/components/NotificationBell';
import QueueStatusCard from '@/components/QueueStatusCard';
import { useSessionGuard } from '@/hooks/useSessionGuard';
import SessionLockoutOverlay from '@/components/SessionLockoutOverlay';

// --- Types ---

interface Doctor {
  id: string;
  name: string;
  speciality: string;
  phone_number: string;
  email: string;
  is_online: boolean;
  experience_years?: string;
}

interface Appointment {
  id: string;
  patient_id: string;
  doctor_id: string;
  appointment_date: string;
  status: 'pending' | 'pending_approval' | 'confirmed' | 'in_consultation' | 'completed' | 'cancelled';
  notes: string | null;
  doctor_remarks?: string | null;
  consultation_started_at?: string | null;
  created_at: string;
  doctor?: Doctor;
}

interface MedicalRecord {
  id: string;
  patient_id: string;
  file_name: string;
  file_url: string;
  file_type: string;
  is_pinned?: boolean;
  created_at: string;
}

type ViewType = 'dashboard' | 'browse' | 'appointments' | 'records' | 'settings';

const PatientPortal = () => {
  const { user, userRole, userName, signOut, loading: authLoading } = useAuth();
  const navigate = useNavigate();

  // --- Session Guard (single active session) ---
  const { lockoutReason } = useSessionGuard({
    userId: user?.id ?? null,
    userRole: userRole === 'patient' ? 'patient' : null,
    onForceSignOut: signOut,
  });

  // --- UI State ---
  const [activeView, setActiveView] = useState<ViewType>('dashboard');
  const [searchTerm, setSearchTerm] = useState('');
  const [isRecordsModalOpen, setIsRecordsModalOpen] = useState(false);
  const [isTicketModalOpen, setIsTicketModalOpen] = useState(false);
  const [selectedAptForTicket, setSelectedAptForTicket] = useState<Appointment | null>(null);
  const [isCancelModalOpen, setIsCancelModalOpen] = useState(false);
  const [selectedAptForCancel, setSelectedAptForCancel] = useState<Appointment | null>(null);
  const [cancellationReason, setCancellationReason] = useState('');
  const [isCancelling, setIsCancelling] = useState(false);
  const ticketRef = useRef<HTMLDivElement>(null);

  const cancellationReasons = [
    "Schedule conflict",
    "Feeling better",
    "Found another doctor",
    "Personal emergency",
    "Transportation issues",
    "Incorrect booking",
    "Other"
  ];

  // --- Data State ---
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [medicalRecords, setMedicalRecords] = useState<MedicalRecord[]>([]);
  const [patientData, setPatientData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // --- Form State ---
  const [editName, setEditName] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editDob, setEditDob] = useState('');
  const [editBloodGroup, setEditBloodGroup] = useState('');
  const [editGender, setEditGender] = useState('');
  const [isUpdatingProfile, setIsUpdatingProfile] = useState(false);

  // --- Booking State ---
  const [selectedDoctor, setSelectedDoctor] = useState<Doctor | null>(null);
  const [isBookingDialogOpen, setIsBookingDialogOpen] = useState(false);
  const [appointmentDate, setAppointmentDate] = useState('');
  const [selectedSlot, setSelectedSlot] = useState<string>('');
  const [notes, setNotes] = useState('');
  const [bookingLoading, setBookingLoading] = useState(false);
  const [availableSlots, setAvailableSlots] = useState<string[]>([]);
  const [unavailableSlots, setUnavailableSlots] = useState<string[]>([]);
  const [loadingSlots, setLoadingSlots] = useState(false);

  // --- File Upload State ---
  const [isUploading, setIsUploading] = useState(false);

  // --- Effects ---

  useEffect(() => {
    if (user && userRole === 'patient') {
      fetchInitialData();
    }
  }, [user, userRole]);

  useEffect(() => {
    if (!user || userRole !== 'patient') return;

    const channel = supabase
      .channel(`patient_appointments_${user.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'appointments',
          filter: `patient_id=eq.${user.id}`,
        },
        () => {
          fetchAppointments();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, userRole]);

  // --- Data Fetching ---

  const fetchInitialData = async () => {
    setLoading(true);
    try {
      await Promise.all([
        fetchProfile(),
        fetchDoctors(),
        fetchAppointments(),
        fetchMedicalRecords()
      ]);
    } catch (error) {
      console.error("Error loading patient data", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchProfile = async () => {
    if (!user) return;
    const { data, error } = await supabase
      .from('patients')
      .select('*')
      .eq('id', user.id)
      .single();

    if (!error && data) {
      setPatientData(data);
      setEditName(data.full_name || '');
      setEditPhone(data.phone_number || '');
      setEditDob(data.dob || '');
      setEditBloodGroup(data.blood_group || '');
      setEditGender(data.gender || '');
    }
  };

  const fetchDoctors = async () => {
    const { data, error } = await supabase
      .from('doctors')
      .select('*')
      .order('name', { ascending: true });
    if (!error && data) setDoctors(data);
  };

  const fetchAppointments = async () => {
    if (!user) return;
    const { data: apts, error } = await supabase
      .from('appointments')
      .select('*, doctor:doctors(*)')
      .eq('patient_id', user.id)
      .order('appointment_date', { ascending: false });

    if (!error && apts) {
      setAppointments(apts as any);
    }
  };

  const fetchMedicalRecords = async () => {
    if (!user) return;
    // We try to fetch from medical_documents table. 
    // If it doesn't exist, this will fail gracefully.
    try {
      const { data, error } = await supabase
        .from('medical_documents')
        .select('*')
        .eq('patient_id', user.id)
        .order('created_at', { ascending: false });

      if (!error && data) {
        setMedicalRecords(data);
      }
    } catch (e) {
      console.log("medical_documents table might not exist yet");
    }
  };

  // --- Profile / Settings Logic ---

  const handleUpdateProfile = async () => {
    if (!user) return;
    setIsUpdatingProfile(true);
    try {
      const { error } = await supabase
        .from('patients')
        .update({
          full_name: editName,
          phone_number: editPhone,
          dob: editDob,
          blood_group: editBloodGroup,
          gender: editGender,
          updated_at: new Date().toISOString()
        })
        .eq('id', user.id);

      if (error) throw error;
      toast.success("Settings updated successfully");
      fetchProfile();
    } catch (error: any) {
      toast.error(error.message || "Update failed");
    } finally {
      setIsUpdatingProfile(false);
    }
  };

  // --- File Upload Logic ---

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !user) return;

    setIsUploading(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${Math.random()}.${fileExt}`;
      const filePath = `${user.id}/${fileName}`;

      // 1. Upload to Supabase Storage
      const { error: uploadError } = await supabase.storage
        .from('medical-records')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from('medical-records')
        .getPublicUrl(filePath);

      // 2. Save record to Database
      const { error: dbError } = await supabase
        .from('medical_documents')
        .insert({
          patient_id: user.id,
          file_name: file.name,
          file_url: urlData.publicUrl,
          file_type: file.type,
        });

      if (dbError) throw dbError;

      toast.success("Document uploaded successfully");
      fetchMedicalRecords();
    } catch (error: any) {
      toast.error(error.message || "Upload failed");
    } finally {
      setIsUploading(false);
    }
  };

  const handlePinRecord = async (recordId: string, currentStatus: boolean) => {
    if (!user) return;
    try {
      // 1. Unpin all records first (to ensure only one is pinned)
      if (!currentStatus) {
        await supabase
          .from('medical_documents')
          .update({ is_pinned: false })
          .eq('patient_id', user.id);
      }

      // 2. Toggle the selected record
      const { error } = await supabase
        .from('medical_documents')
        .update({ is_pinned: !currentStatus })
        .eq('id', recordId);

      if (error) throw error;
      toast.success(!currentStatus ? "Record pinned to Emergency Summary" : "Record unpinned");
      fetchMedicalRecords();
    } catch (error: any) {
      toast.error("Failed to update pin status");
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
      // Fallback
      window.open(url, '_blank');
    }
  };

  const handleDeleteRecord = async (record: MedicalRecord) => {
    if (!user) return;

    try {
      // 1. Extract path from public URL
      const urlParts = record.file_url.split('medical-records/');
      const filePath = urlParts[1];

      if (filePath) {
        await supabase.storage.from('medical-records').remove([filePath]);
      }

      // 2. Delete from DB
      const { error } = await supabase
        .from('medical_documents')
        .delete()
        .eq('id', record.id);

      if (error) throw error;

      toast.success("Document removed");
      fetchMedicalRecords();
    } catch (error: any) {
      toast.error("Delete failed");
    }
  };

  // --- Booking Logic ---

  const handleBookAppointment = (doctor: Doctor) => {
    setSelectedDoctor(doctor);
    setAppointmentDate('');
    setSelectedSlot('');
    setNotes('');
    setIsBookingDialogOpen(true);
  };

  const fetchAvailableSlots = async () => {
    if (!selectedDoctor || !appointmentDate) {
      setAvailableSlots([]);
      return;
    }

    setLoadingSlots(true);
    try {
      // 1. Fetch from time_slots
      const { data: existingSlots } = await supabase
        .from('time_slots')
        .select('slot_time, is_available')
        .eq('doctor_id', selectedDoctor.id)
        .eq('slot_date', appointmentDate);

      // 2. Also fetch from appointments to catch slots not in time_slots yet
      const { data: bookedAppointments } = await supabase
        .from('appointments')
        .select('appointment_date')
        .eq('doctor_id', selectedDoctor.id)
        .not('status', 'eq', 'cancelled');

      const bookedTimes = bookedAppointments
        ? bookedAppointments
          .filter(a => a.appointment_date.startsWith(appointmentDate))
          .map(a => new Date(a.appointment_date).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }))
        : [];

      // Build absolute schedule from 9 AM to 5 PM
      const absoluteSchedule: string[] = [];
      for (let h = 9; h < 17; h++) {
        for (let m = 0; m < 60; m += 15) {
          absoluteSchedule.push(`${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`);
        }
      }

      // If existingSlots (from time_slots table) exists, it might define limited availability
      // But we should prioritize showing the full schedule if possible, or at least the booked ones.

      const bookedTimesSet = new Set(bookedTimes);
      const blockedTimesSet = new Set(
        existingSlots ? existingSlots.filter(s => !s.is_available).map(s => s.slot_time.substring(0, 5)) : []
      );

      // If existingSlots is used to define available hours, we should respect that.
      // However, the user wants to see "other slots as well".
      // We'll use absoluteSchedule as the base if existingSlots is empty or if it defines a subset.

      const available: string[] = [];
      const unavailable: string[] = [];

      absoluteSchedule.forEach(slot => {
        if (bookedTimesSet.has(slot) || blockedTimesSet.has(slot)) {
          unavailable.push(slot);
        } else {
          // If existingSlots exists, only permit slots explicitly marked as available?
          // No, usually it's used for overrides. If it exists, respect it.
          if (existingSlots && existingSlots.length > 0) {
            const isInTable = existingSlots.some(s => s.slot_time.substring(0, 5) === slot);
            const isMarkedAvailable = existingSlots.find(s => s.slot_time.substring(0, 5) === slot)?.is_available;

            if (isInTable) {
              if (isMarkedAvailable) available.push(slot);
              else unavailable.push(slot);
            } else {
              // If not in table, is it available? Let's assume yes if we want to show "others"
              available.push(slot);
            }
          } else {
            available.push(slot);
          }
        }
      });

      setAvailableSlots(available);
      setUnavailableSlots(unavailable);
    } catch (e) {
      toast.error("Failed to load time slots");
    } finally {
      setLoadingSlots(false);
    }
  };

  useEffect(() => {
    if (appointmentDate) fetchAvailableSlots();
  }, [appointmentDate, selectedDoctor]);

  const handleSubmitBooking = async () => {
    if (!selectedDoctor || !user || !appointmentDate || !selectedSlot) return;

    setBookingLoading(true);
    try {
      const appointmentDateTime = new Date(`${appointmentDate}T${selectedSlot}:00`);

      const { data, error } = await supabase
        .from('appointments')
        .insert({
          patient_id: user.id,
          doctor_id: selectedDoctor.id,
          appointment_date: appointmentDateTime.toISOString(),
          status: 'pending_approval',
          notes: notes || null,
        })
        .select()
        .single();

      if (error) throw error;

      // Log activity for admin panel
      await supabase.from('audit_logs').insert({
        action_type: 'APPOINTMENT_REQUESTED',
        target_id: data.id,
        description: `Patient ${userName} requested an appointment with Dr. ${selectedDoctor.name} for ${appointmentDateTime.toLocaleString()}`
      });

      toast.success("Request sent to Admin!");
      setIsBookingDialogOpen(false);
      fetchAppointments();
      setActiveView('appointments');
    } catch (error: any) {
      toast.error(error.message || "Booking failed");
    } finally {
      setBookingLoading(false);
    }
  };

  const handleDownloadTicket = async () => {
    if (!ticketRef.current) return;

    try {
      const originalStyle = ticketRef.current.style.cssText;
      // Force smaller width for the "receipt" look
      ticketRef.current.style.width = '280px';
      ticketRef.current.style.height = 'auto';
      ticketRef.current.style.transform = 'none';
      ticketRef.current.style.position = 'relative';

      const actions = ticketRef.current.querySelector('.ticket-actions') as HTMLElement;
      if (actions) actions.style.display = 'none';

      const images = ticketRef.current.getElementsByTagName('img');
      await Promise.all(Array.from(images).map(img => {
        if (img.complete) return Promise.resolve();
        return new Promise(resolve => { img.onload = resolve; img.onerror = resolve; });
      }));

      const canvas = await html2canvas(ticketRef.current, {
        scale: 3,
        backgroundColor: '#ffffff',
        useCORS: true,
        logging: false,
        allowTaint: true,
        scrollX: 0,
        scrollY: 0,
        windowWidth: 280,
        onclone: (clonedDoc) => {
          const ticket = clonedDoc.querySelector('.ticket-content') as HTMLElement;
          if (ticket) {
            ticket.style.width = '280px';
            ticket.style.margin = '0';
            ticket.style.padding = '0';
          }
        }
      });

      if (actions) actions.style.display = 'flex';
      ticketRef.current.style.cssText = originalStyle;

      const image = canvas.toDataURL('image/png', 1.0);
      const link = document.createElement('a');
      link.download = `AZ-TOKEN-${selectedAptForTicket?.id.split('-')[0]}.png`;
      link.href = image;
      link.click();
    } catch (error) {
      toast.error("Failed to download ticket");
    }
  };

  const handlePrintTicket = () => {
    const printContent = ticketRef.current;
    if (!printContent) return;

    // Create a hidden iframe for printing
    const iframe = document.createElement('iframe');
    iframe.style.position = 'fixed';
    iframe.style.right = '0';
    iframe.style.bottom = '0';
    iframe.style.width = '0';
    iframe.style.height = '0';
    iframe.style.border = '0';
    document.body.appendChild(iframe);

    const doc = iframe.contentWindow?.document;
    if (!doc) return;

    // Clone the ticket without the action buttons
    const clone = printContent.cloneNode(true) as HTMLElement;
    const actions = clone.querySelector('.ticket-actions');
    if (actions) actions.remove();

    doc.write(`
      <html>
        <head>
          <title>Medical Token - Asaan Zindagi</title>
          <script src="https://cdn.tailwindcss.com"></script>
          <style>
            @page { size: 80mm auto; margin: 0; }
            body { margin: 0; padding: 10px; font-family: sans-serif; }
            .receipt-font { font-family: 'Courier New', Courier, monospace; }
          </style>
        </head>
        <body onload="setTimeout(() => { window.print(); window.close(); }, 500)">
          <div style="width: 280px; margin: 0 auto;">
            ${clone.innerHTML}
          </div>
        </body>
      </html>
    `);

    doc.close();
    setTimeout(() => {
      document.body.removeChild(iframe);
    }, 2000);
  };

  const handleCancelAppointment = async () => {
    if (!selectedAptForCancel || !cancellationReason) {
      toast.error("Please select a reason for cancellation");
      return;
    }

    setIsCancelling(true);
    try {
      // 1. Update appointment status and reason
      const { error: updateError } = await supabase
        .from('appointments')
        .update({
          status: 'cancelled',
          cancellation_reason: cancellationReason,
          updated_at: new Date().toISOString()
        })
        .eq('id', selectedAptForCancel.id);

      if (updateError) throw updateError;

      // 2. Log activity for admin panel
      await supabase.from('audit_logs').insert({
        admin_id: user?.id, // Though it's a patient action, we still record it locally
        action_type: 'PATIENT_CANCEL',
        target_id: selectedAptForCancel.id,
        description: `Patient ${userName} cancelled appointment with Dr. ${selectedAptForCancel.doctor?.name}. Reason: ${cancellationReason}`
      });

      toast.success("Appointment cancelled successfully");
      setIsCancelModalOpen(false);
      setSelectedAptForCancel(null);
      setCancellationReason('');
      fetchAppointments();
    } catch (error: any) {
      toast.error(error.message || "Cancellation failed");
    } finally {
      setIsCancelling(false);
    }
  };

  const isWithin4Hours = (dateString: string) => {
    const apptDate = new Date(dateString);
    const now = new Date();
    const diffInMs = apptDate.getTime() - now.getTime();
    const diffInHours = diffInMs / (1000 * 60 * 60);
    return diffInHours < 4;
  };

  // --- Helpers ---

  const filteredDoctors = doctors.filter(d =>
    d.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    d.speciality.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'confirmed': return <Badge className="bg-green-100 text-green-700 hover:bg-green-100">Confirmed</Badge>;
      case 'pending_approval': return <Badge className="bg-blue-100 text-blue-700 hover:bg-blue-100">Pending Admin</Badge>;
      case 'pending': return <Badge className="bg-orange-100 text-orange-700 hover:bg-orange-100">Pending</Badge>;
      case 'completed': return <Badge className="bg-gray-100 text-gray-700 hover:bg-gray-100">Completed</Badge>;
      case 'cancelled': return <Badge variant="destructive">Cancelled</Badge>;
      default: return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getActiveAppointments = () => {
    const now = new Date();
    return appointments.filter(a =>
      ['pending', 'pending_approval', 'confirmed'].includes(a.status) &&
      new Date(a.appointment_date) > now
    );
  };

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

  const AvatarLetter = ({ name, className = "w-10 h-10" }: { name: string, className?: string }) => (
    <div className={`${className} rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold shadow-sm border border-primary/20`}>
      {name.charAt(0).toUpperCase()}
    </div>
  );

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="flex flex-col items-center gap-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary" />
          <p className="text-muted-foreground animate-pulse">Initializing Portal...</p>
        </div>
      </div>
    );
  }

  if (!user || userRole !== 'patient') {
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
              Patient Portal
            </span>
          </div>
        </div>

        <nav className="flex-1 p-4 space-y-1">
          <SidebarItem icon={LayoutDashboard} label="Dashboard" view="dashboard" />
          <SidebarItem icon={Search} label="Find a Doctor" view="browse" />
          <SidebarItem icon={ClipboardList} label="My Appointments" view="appointments" />
          <SidebarItem icon={FileText} label="Medical Records" view="records" />
          <SidebarItem icon={Settings} label="Settings" view="settings" />
        </nav>

        <div className="p-4 border-t border-gray-100">
          <div className="flex items-center gap-3 px-4 py-3 mb-4 rounded-lg bg-gray-50 border border-gray-100">
            <AvatarLetter name={editName || 'User'} className="w-8 h-8" />
            <div className="overflow-hidden">
              <p className="text-sm font-semibold text-gray-900 truncate">{editName}</p>
              <p className="text-[10px] text-gray-500 truncate">{user.email}</p>
            </div>
          </div>
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
          onClick={() => setActiveView('browse')}
          className={activeView === 'browse' ? 'active' : ''}
        >
          <Search />
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
          onClick={() => setActiveView('records')}
          className={activeView === 'records' ? 'active' : ''}
        >
          <FileText />
          <span>Records</span>
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
      <main className="flex-1 md:ml-64 h-screen overflow-hidden flex flex-col">
        <div className="flex-1 overflow-y-auto p-4 md:p-8">
          <div className="max-w-7xl mx-auto space-y-8 animate-fade-in mobile-bottom-nav-spacer">

            <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
              <div className="flex items-center gap-4">
                <div>
                  <h1 className="text-2xl font-bold text-gray-900 tracking-tight">
                    {activeView === 'dashboard' ? `Hello, ${editName}!` :
                      activeView === 'browse' ? 'Find a Specialist' :
                        activeView === 'records' ? 'Medical Documentation' :
                          activeView.charAt(0).toUpperCase() + activeView.slice(1)}
                  </h1>
                  <p className="text-muted-foreground text-sm">
                    Asaan Zindagi Healthcare Management System
                  </p>
                </div>
                <div className="ml-2">
                  <NotificationBell />
                </div>
              </div>
            </header>

            {/* Views */}

            {activeView === 'dashboard' && (
              <div className="space-y-8 animate-in fade-in duration-500">

                {/* Emergency Summary Section (PINNED RECORD) */}
                {medicalRecords.find(r => r.is_pinned) && (
                  <div className="animate-in slide-in-from-top-4 duration-700">
                    <Card className="border-2 border-red-200 bg-red-50/50 shadow-lg group overflow-hidden">
                      <div className="bg-red-500 h-1 w-full" />
                      <CardHeader className="pb-3 flex flex-row items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="p-2 bg-red-500 rounded-lg animate-pulse">
                            <Activity className="w-5 h-5 text-white" />
                          </div>
                          <div>
                            <CardTitle className="text-lg font-black text-red-900 flex items-center gap-2 uppercase tracking-tighter">
                              Emergency Summary Record
                            </CardTitle>
                            <CardDescription className="text-red-700 font-bold text-xs uppercase">Important data pinned for instant medical review</CardDescription>
                          </div>
                        </div>
                        <Badge variant="outline" className="bg-white border-red-300 text-red-700 animate-bounce">PINNED</Badge>
                      </CardHeader>
                      <CardContent className="flex items-center justify-between p-6 pt-0">
                        <div className="flex items-center gap-4 bg-white p-4 rounded-xl border border-red-100 shadow-sm flex-1">
                          <FileText className="w-8 h-8 text-red-500" />
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-black text-gray-900 truncate">{medicalRecords.find(r => r.is_pinned)?.file_name}</p>
                            <p className="text-[10px] text-gray-500 font-bold uppercase">{new Date(medicalRecords.find(r => r.is_pinned)?.created_at || '').toLocaleDateString('en-US', { dateStyle: 'long' })}</p>
                          </div>
                          <button
                            onClick={() => {
                              const pinnedRec = medicalRecords.find(r => r.is_pinned);
                              if (pinnedRec) handleDownload(pinnedRec.file_url, pinnedRec.file_name);
                            }}
                            className="flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg text-xs font-black shadow-md transition-all scale-100 hover:scale-105"
                          >
                            <Download className="w-4 h-4" /> DOWNLOAD ZIP
                          </button>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                )}

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

                  {/* Stats / Quick Actions */}
                  <div className="lg:col-span-2 grid grid-cols-1 sm:grid-cols-1 gap-4">
                    <Card
                      className="border-none shadow-sm bg-green-50 border-l-4 border-l-green-500 cursor-pointer hover:bg-green-100/50 transition-colors group"
                      onClick={() => setIsRecordsModalOpen(true)}
                    >
                      <CardHeader className="pb-2">
                        <FileText className="w-6 h-6 text-green-600 mb-2 group-hover:scale-110 transition-transform" />
                        <CardTitle className="text-base font-bold">Medical Records & Documents</CardTitle>
                        <CardDescription className="text-xs">Tap here to import new laboratory reports or prescriptions.</CardDescription>
                      </CardHeader>
                      <CardContent>
                        <Badge variant="outline" className="bg-white border-green-200 text-green-700">{medicalRecords.length} Files Safely Stored</Badge>
                      </CardContent>
                    </Card>
                  </div>

                  {/* Booking Help */}
                  <Card className="border-none shadow-sm bg-blue-50 border-l-4 border-l-blue-500 h-fit">
                    <CardHeader className="pb-2">
                      <div className="flex items-center gap-2">
                        <HelpCircle className="w-5 h-5 text-blue-600" />
                        <CardTitle className="text-xs font-bold uppercase tracking-wider">Booking Status</CardTitle>
                      </div>
                    </CardHeader>
                    <CardContent className="text-[11px] text-blue-700 leading-relaxed font-semibold">
                      "Your request has been sent to our Admin team. You will be notified here as soon as it is confirmed!"
                    </CardContent>
                  </Card>
                </div>

                {/* Upcoming Appointments (Auto-Expiry Logic) */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold flex items-center gap-2">
                    <Clock className="w-5 h-5 text-primary" />
                    Upcoming Visits
                  </h3>
                  {getActiveAppointments().length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                      {getActiveAppointments().slice(0, 6).map(apt => {
                        const cantCancel = isWithin4Hours(apt.appointment_date);
                        return (
                          <Card key={apt.id} className="border-none shadow-sm bg-white overflow-hidden hover:shadow-md transition-shadow relative group">
                            <div className={`h-1 w-full ${apt.status === 'confirmed' ? 'bg-green-500' : 'bg-primary'}`} />
                            <CardContent className="p-5 space-y-4">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                  <AvatarLetter name={apt.doctor?.name || 'D'} className="w-10 h-10" />
                                  <div>
                                    <p className="font-bold text-gray-900 leading-tight">Dr. {apt.doctor?.name}</p>
                                    <p className="text-[10px] text-muted-foreground uppercase font-bold">{apt.doctor?.speciality}</p>
                                  </div>
                                </div>
                                {getStatusBadge(apt.status)}
                              </div>
                              <Separator className="bg-gray-50" />
                              <div className="flex items-center justify-between text-xs font-semibold text-gray-600">
                                <div className="flex items-center gap-1.5">
                                  <Calendar className="w-3.5 h-3.5" />
                                  {new Date(apt.appointment_date).toLocaleDateString()}
                                </div>
                                <div className="flex items-center gap-1.5">
                                  <Clock className="w-3.5 h-3.5" />
                                  {new Date(apt.appointment_date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </div>
                              </div>

                              <div className="pt-2">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  disabled={cantCancel}
                                  className={`w-full text-[10px] font-bold uppercase transition-all ${cantCancel
                                    ? 'text-muted-foreground cursor-not-allowed bg-gray-50'
                                    : 'text-red-500 hover:text-red-700 hover:bg-red-50'
                                    }`}
                                  onClick={() => {
                                    setSelectedAptForCancel(apt);
                                    setIsCancelModalOpen(true);
                                  }}
                                >
                                  {cantCancel ? (
                                    <span className="flex items-center gap-1">
                                      <Phone className="w-3 h-3" /> Call clinic to cancel
                                    </span>
                                  ) : (
                                    <span className="flex items-center gap-1">
                                      <X className="w-3 h-3" /> Cancel Appointment
                                    </span>
                                  )}
                                </Button>
                                {cantCancel && (
                                  <p className="text-[8px] text-center text-muted-foreground mt-1 font-bold">Cancellations must be made 4+ hours in advance.</p>
                                )}
                              </div>
                            </CardContent>
                          </Card>
                        );
                      })}
                    </div>
                  ) : (
                    <Card className="border-dashed border-2 py-10 bg-gray-50 flex flex-col items-center justify-center text-center rounded-xl">
                      <Calendar className="w-12 h-12 text-gray-300 mb-3" />
                      <p className="text-sm font-medium text-muted-foreground">No upcoming visits scheduled.</p>
                      <Button variant="link" size="sm" onClick={() => setActiveView('browse')} className="mt-1">Find a Specialist</Button>
                    </Card>
                  )}
                </div>
              {/* Queue Status Cards (one per confirmed/in_consultation appointment) */}
              {(() => {
                const queueApts = appointments.filter(
                  a => a.status === 'confirmed' || a.status === 'in_consultation'
                );
                if (queueApts.length === 0) return null;
                return (
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold flex items-center gap-2">
                      <Activity className="w-5 h-5 text-primary animate-pulse" />
                      Live Queue Tracker
                    </h3>
                    <div className="space-y-3">
                      {queueApts.map(apt => (
                        <QueueStatusCard
                          key={apt.id}
                          patientId={user.id}
                          doctorId={apt.doctor_id}
                          doctorName={apt.doctor?.name || 'Your Doctor'}
                        />
                      ))}
                    </div>
                  </div>
                );
              })()}

              </div>
            )}

            {activeView === 'browse' && (
              <div className="animate-in fade-in duration-500 space-y-6">
                {/* Search and Discovery UI */}
                <div className="flex flex-col md:flex-row gap-4">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                    <Input
                      placeholder="Search doctors by name or medical category (e.g. Surgeon, Dentist)..."
                      className="pl-10 h-11"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {filteredDoctors.map(doctor => (
                    <Card key={doctor.id} className="border-none shadow-sm bg-white hover:shadow-md transition-all group">
                      <CardHeader className="flex flex-row items-center gap-3 pb-4">
                        <AvatarLetter name={doctor.name} className="w-12 h-12 text-lg" />
                        <div className="flex-1 min-w-0">
                          <CardTitle className="text-base truncate group-hover:text-primary transition-colors">Dr. {doctor.name}</CardTitle>
                          <CardDescription className="text-[11px] text-primary font-bold uppercase">{doctor.speciality}</CardDescription>
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div className="grid grid-cols-2 gap-4 py-3 border-y border-gray-50">
                          <div className="space-y-1 text-center border-r border-gray-50">
                            <p className="text-[9px] uppercase text-muted-foreground font-bold">Experience</p>
                            <p className="text-sm font-black text-gray-900">{doctor.experience_years || '5+'}Y</p>
                          </div>
                          <div className="space-y-1 text-center">
                            <p className="text-[9px] uppercase text-muted-foreground font-bold">Availability</p>
                            <p className={`text-sm font-black ${doctor.is_online ? 'text-green-600' : 'text-red-500'}`}>
                              {doctor.is_online ? 'Online' : 'Offline'}
                            </p>
                          </div>
                        </div>
                        <Button
                          onClick={() => handleBookAppointment(doctor)}
                          disabled={!doctor.is_online}
                          className={`w-full shadow-sm font-bold text-xs ${doctor.is_online
                            ? 'bg-primary hover:bg-primary/90 text-white'
                            : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                            }`}
                        >
                          {doctor.is_online ? 'Schedule Appointment' : 'Currently Unavailable'}
                        </Button>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            )}

            {activeView === 'appointments' && (
              <div className="space-y-6 animate-in fade-in duration-500">
                <Card className="border-none shadow-sm bg-white overflow-hidden">
                  <CardHeader className="bg-gray-50/50 border-b border-gray-100">
                    <CardTitle className="text-lg">My Appointments</CardTitle>
                    <CardDescription>Comprehensive record of all your bookings and tokens.</CardDescription>
                  </CardHeader>
                  <CardContent className="p-0">
                    {appointments.length > 0 ? (
                      <div className="divide-y divide-gray-50">
                        {appointments.map(apt => (
                          <div key={apt.id}>
                            <div className="flex items-center justify-between p-4 hover:bg-gray-50/50 transition-colors">
                              <div className="flex items-center gap-4">
                                <AvatarLetter name={apt.doctor?.name || 'D'} className="w-10 h-10" />
                                <div>
                                  <h4 className="font-bold text-gray-900 text-sm">Dr. {apt.doctor?.name}</h4>
                                  <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-tight">{apt.doctor?.speciality}</p>
                                  <div className="flex items-center gap-2 mt-1 text-[10px] font-semibold text-gray-500">
                                    <span>{new Date(apt.appointment_date).toLocaleDateString()}</span>
                                    <span>•</span>
                                    <span>{new Date(apt.appointment_date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                  </div>
                                </div>
                              </div>
                              <div className="flex items-center gap-2">
                                {getStatusBadge(apt.status)}
                                {apt.status === 'confirmed' && (
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    className="h-8 gap-2 border-primary/20 text-primary hover:bg-primary/5 shadow-sm"
                                    onClick={() => {
                                      setSelectedAptForTicket(apt);
                                      setIsTicketModalOpen(true);
                                    }}
                                  >
                                    <Ticket className="w-4 h-4" />
                                    <span className="hidden sm:inline">Token Ticket</span>
                                  </Button>
                                )}
                              </div>
                            </div>
                            {apt.status === 'completed' && apt.doctor_remarks && (
                              <div className="mx-4 mb-4 p-3 bg-blue-50/50 border border-blue-100 rounded-lg">
                                <p className="text-[10px] font-black uppercase text-blue-600 mb-1 flex items-center gap-1">
                                  <MessageSquare className="w-3 h-3" /> Doctor's Remarks
                                </p>
                                <p className="text-xs text-blue-900 italic leading-relaxed">
                                  "{apt.doctor_remarks}"
                                </p>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-20">
                        <ClipboardList className="w-12 h-12 text-gray-200 mx-auto mb-2" />
                        <p className="text-muted-foreground font-medium">No appointments found.</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            )}

            {activeView === 'records' && (
              <div className="space-y-6 animate-in fade-in duration-500">
                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 italic">
                  <h3 className="text-lg font-bold not-italic">Records Gallery</h3>
                  <p className="text-sm text-gray-500 not-italic">A consolidated view of all your uploaded files and reports.</p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  {medicalRecords.length > 0 ? medicalRecords.map(record => (
                    <Card key={record.id} className="border-none shadow-sm bg-white hover:bg-gray-50 cursor-pointer overflow-hidden group">
                      <div className="h-24 bg-gray-100 flex items-center justify-center relative">
                        {record.file_type.includes('image') ? (
                          <img src={record.file_url} className="w-full h-full object-cover opacity-50" />
                        ) : (
                          <FileText className="w-10 h-10 text-gray-400" />
                        )}
                        <div className="absolute inset-0 bg-primary/20 opacity-0 group-hover:opacity-100 flex items-center justify-center gap-3 transition-opacity">
                          <button
                            onClick={() => handleDownload(record.file_url, record.file_name)}
                            className="p-2 bg-white rounded-full text-primary hover:bg-primary hover:text-white shadow-sm transition-all"
                          >
                            <Download className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handlePinRecord(record.id, !!record.is_pinned)}
                            className={`p-2 rounded-full shadow-sm transition-all ${record.is_pinned ? 'bg-red-500 text-white' : 'bg-white text-gray-400 hover:text-red-500'}`}
                            title={record.is_pinned ? "Unpin from Emergency Summary" : "Pin to Emergency Summary"}
                          >
                            <Activity className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDeleteRecord(record)}
                            className="p-2 bg-white rounded-full text-gray-400 hover:text-red-600 hover:bg-red-50 shadow-sm transition-all"
                            title="Delete Record"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                      <CardContent className="p-3 relative">
                        {record.is_pinned && <div className="absolute top-0 right-0 w-2 h-2 bg-red-500 rounded-full animate-pulse mr-3 mt-1" />}
                        <p className="text-xs font-bold truncate">{record.file_name}</p>
                        <p className="text-[9px] text-gray-400 mt-0.5">{new Date(record.created_at).toLocaleDateString()}</p>
                      </CardContent>
                    </Card>
                  )) : (
                    <div className="col-span-full py-20 text-center border-2 border-dashed rounded-xl bg-white">
                      <File className="w-12 h-12 text-gray-300 mx-auto mb-2" />
                      <p className="text-sm text-gray-400">No medical records uploaded yet.</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {activeView === 'settings' && (
              <div className="max-w-4xl mx-auto space-y-6 animate-in fade-in duration-500">
                <Card className="border-none shadow-sm bg-white overflow-hidden">
                  <header className="p-6 bg-gray-50 border-b border-gray-100 flex items-center gap-4">
                    <AvatarLetter name={editName} className="w-16 h-16 text-2xl" />
                    <div>
                      <h3 className="text-xl font-bold">Account Settings</h3>
                      <p className="text-sm text-gray-500">Update your information and medical profile details.</p>
                    </div>
                  </header>
                  <CardContent className="p-8 space-y-8">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                      {/* Personal Info */}
                      <div className="space-y-4">
                        <h4 className="text-xs font-black uppercase text-gray-400 tracking-widest border-b pb-2">Identification</h4>
                        <div className="space-y-2">
                          <Label className="text-sm font-bold">Full Name</Label>
                          <Input value={editName} onChange={e => setEditName(e.target.value)} />
                        </div>
                        <div className="space-y-2">
                          <Label className="text-sm font-bold">Phone Number</Label>
                          <Input value={editPhone} onChange={e => setEditPhone(e.target.value)} />
                        </div>
                        <div className="space-y-2">
                          <Label className="text-sm font-bold">Email (Read Only)</Label>
                          <Input value={user.email} disabled className="bg-gray-50" />
                        </div>
                      </div>

                      {/* Medical Profile Data (Migrated content) */}
                      <div className="space-y-4">
                        <h4 className="text-xs font-black uppercase text-gray-400 tracking-widest border-b pb-2">Medical Profile</h4>
                        <div className="space-y-2">
                          <Label className="text-sm font-bold">Date of Birth</Label>
                          <Input type="date" value={editDob} onChange={e => setEditDob(e.target.value)} />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label className="text-sm font-bold">Gender</Label>
                            <Select value={editGender} onValueChange={setEditGender}>
                              <SelectTrigger className="bg-white">
                                <SelectValue placeholder="Select" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="Male">Male</SelectItem>
                                <SelectItem value="Female">Female</SelectItem>
                                <SelectItem value="Other">Other</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="space-y-2">
                            <Label className="text-sm font-bold">Blood Group</Label>
                            <Select value={editBloodGroup} onValueChange={setEditBloodGroup}>
                              <SelectTrigger className="bg-white">
                                <SelectValue placeholder="Select" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="A+">A+</SelectItem>
                                <SelectItem value="A-">A-</SelectItem>
                                <SelectItem value="B+">B+</SelectItem>
                                <SelectItem value="B-">B-</SelectItem>
                                <SelectItem value="O+">O+</SelectItem>
                                <SelectItem value="O-">O-</SelectItem>
                                <SelectItem value="AB+">AB+</SelectItem>
                                <SelectItem value="AB-">AB-</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                        <div className="p-4 bg-orange-50 border border-orange-100 rounded-lg">
                          <p className="text-[10px] text-orange-700 font-bold flex items-center gap-2 uppercase tracking-tight">
                            <Activity className="w-3 h-3" /> Security Note
                          </p>
                          <p className="text-[11px] text-orange-600 mt-1 leading-tight">These details help us provide better care during emergency situations.</p>
                        </div>
                      </div>
                    </div>

                    <Separator className="bg-gray-50" />

                    <div className="flex justify-end pt-4">
                      <Button
                        onClick={handleUpdateProfile}
                        disabled={isUpdatingProfile}
                        className="px-10 py-6 font-bold text-base shadow-lg hover:shadow-xl transition-all"
                      >
                        {isUpdatingProfile ? 'Saving Changes...' : 'Save Patient Profile'}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}

          </div>
        </div>
      </main >

      {/* Medical Document Upload Modal */}
      < Dialog open={isRecordsModalOpen} onOpenChange={setIsRecordsModalOpen} >
        <DialogContent className="sm:max-w-[450px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Upload className="w-5 h-5 text-green-600" />
              Upload Medical Report
            </DialogTitle>
            <DialogDescription>
              Upload PDF or Image reports to your profile.
            </DialogDescription>
          </DialogHeader>
          <div className="py-6 flex flex-col items-center justify-center border-2 border-dashed border-gray-200 rounded-xl bg-gray-50 hover:bg-gray-100/50 transition-colors cursor-pointer relative">
            {isUploading ? (
              <div className="flex flex-col items-center gap-2">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
                <p className="text-xs font-bold text-primary">Uploading to Storage...</p>
              </div>
            ) : (
              <>
                <Upload className="w-10 h-10 text-gray-300 mb-2" />
                <p className="text-sm text-gray-500 font-medium">Click to select files</p>
                <p className="text-[10px] text-gray-400 mt-1">PDF, JPG, PNG up to 5MB</p>
              </>
            )}
            <input
              type="file"
              className="absolute inset-0 opacity-0 cursor-pointer"
              onChange={handleFileUpload}
              disabled={isUploading}
              accept=".pdf,image/*"
            />
          </div>
          <div className="space-y-4 max-h-40 overflow-y-auto mt-4 px-1">
            <h4 className="text-[10px] font-black uppercase text-gray-400">Recently Imported</h4>
            {medicalRecords.slice(0, 3).map(r => (
              <div key={r.id} className="flex items-center justify-between text-xs bg-white p-2 rounded border border-gray-100">
                <span className="truncate flex-1 font-semibold">{r.file_name}</span>
                <CheckCircle2 className="w-4 h-4 text-green-500 ml-2" />
              </div>
            ))}
          </div>
          <DialogFooter className="mt-4 gap-2">
            <Button variant="outline" className="flex-1" onClick={() => setIsRecordsModalOpen(false)}>Done</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog >

      {/* Booking Dialog */}
      < Dialog open={isBookingDialogOpen} onOpenChange={setIsBookingDialogOpen} >
        <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Calendar className="w-5 h-5 text-primary" />
              Book Appointment
            </DialogTitle>
            <DialogDescription className="text-muted-foreground text-sm font-medium">
              Schedule your visit with Dr. {selectedDoctor?.name}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-6 py-4">
            <div className="space-y-2">
              <Label htmlFor="appointmentDate" className="text-sm font-bold">
                Preferred Date <span className="text-destructive">*</span>
              </Label>
              <Input
                id="appointmentDate"
                type="date"
                value={appointmentDate}
                onChange={(e) => setAppointmentDate(e.target.value)}
                min={new Date().toISOString().split('T')[0]}
                required
                className="border-gray-300 rounded-lg font-medium"
              />
            </div>

            {appointmentDate && (
              <div className="space-y-3">
                <Label className="text-sm font-bold">
                  Available Slots <span className="text-destructive">*</span>
                </Label>
                {loadingSlots ? (
                  <div className="text-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto" />
                  </div>
                ) : (
                  <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">
                    {availableSlots.map((slot) => (
                      <Button
                        key={slot}
                        type="button"
                        variant={selectedSlot === slot ? 'default' : 'outline'}
                        onClick={() => setSelectedSlot(slot)}
                        className={`h-10 text-xs rounded-lg font-bold ${selectedSlot === slot ? 'bg-primary text-white shadow-lg' : 'hover:border-primary/50'}`}
                      >
                        {slot}
                      </Button>
                    ))}
                    {unavailableSlots.map((slot) => (
                      <Button key={slot} disabled variant="ghost" className="h-10 text-xs bg-gray-50 opacity-40 cursor-not-allowed">
                        {slot} 🔒
                      </Button>
                    ))}
                  </div>
                )}
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="notes" className="text-sm font-bold">
                Message to Doctor/Admin
              </Label>
              <Textarea
                id="notes"
                placeholder="Briefly describe your symptoms or reason for visit..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
                className="border-gray-300 rounded-lg text-sm"
              />
            </div>
          </div>
          <DialogFooter className="bg-gray-50 -m-6 p-6 mt-6 rounded-b-lg gap-2">
            <Button variant="ghost" className="font-bold border-none" onClick={() => setIsBookingDialogOpen(false)}>Cancel</Button>
            <Button
              onClick={handleSubmitBooking}
              disabled={bookingLoading || !selectedSlot}
              className="bg-primary text-white px-10 font-black tracking-tight"
            >
              {bookingLoading ? 'Submitting...' : 'Request Visit'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog >
      {/* Token Ticket Dialog */}
      < Dialog open={isTicketModalOpen} onOpenChange={setIsTicketModalOpen} >
        <DialogContent className="sm:max-w-sm p-0 overflow-visible border-none bg-transparent shadow-none scrollbar-hide">
          {selectedAptForTicket && (
            <div ref={ticketRef} className="ticket-content bg-white shadow-2xl border border-gray-200 mx-auto w-full max-w-[280px] animate-in zoom-in-95 duration-300 overflow-hidden">
              {/* Receipt Header */}
              <div className="p-6 text-center border-b-2 border-dashed border-gray-200 bg-white">
                <div className="flex flex-col items-center gap-3">
                  <img src={logoMarkBlack} alt="Logo" className="w-12 h-12 grayscale" />
                  <div className="space-y-1">
                    <h2 className="font-black text-xl tracking-tighter uppercase text-black">Asaan Zindagi</h2>
                    <p className="text-[10px] font-bold uppercase tracking-wider text-black/60">Medical Center Receipt</p>
                  </div>
                </div>
              </div>

              {/* Receipt Body */}
              <div className="p-6 space-y-6 bg-white font-mono">
                <div className="text-center space-y-2">
                  <p className="text-[10px] font-bold text-black/40 uppercase">Queue Position</p>
                  <div className="text-7xl font-black text-black tracking-tighter">
                    #{appointments.filter(a =>
                      a.doctor_id === selectedAptForTicket.doctor_id &&
                      a.appointment_date.split('T')[0] === selectedAptForTicket.appointment_date.split('T')[0]
                    ).length - appointments.filter(a =>
                      a.doctor_id === selectedAptForTicket.doctor_id &&
                      a.appointment_date.split('T')[0] === selectedAptForTicket.appointment_date.split('T')[0] &&
                      new Date(a.appointment_date) > new Date(selectedAptForTicket.appointment_date)
                    ).length}
                  </div>
                  <div className="h-px bg-black/10 w-1/2 mx-auto" />
                </div>

                <div className="space-y-4 text-[11px] uppercase text-black">
                  <div className="flex justify-between border-b border-dashed border-gray-100 pb-2">
                    <span className="font-bold text-black/40">Patient:</span>
                    <span className="font-black">{editName}</span>
                  </div>
                  <div className="flex justify-between border-b border-dashed border-gray-100 pb-2">
                    <span className="font-bold text-black/40">PID:</span>
                    <span className="font-black">{user?.id.split('-')[0]}</span>
                  </div>
                  <div className="flex justify-between border-b border-dashed border-gray-100 pb-2">
                    <span className="font-bold text-black/40">Doctor:</span>
                    <span className="font-black">DR. {selectedAptForTicket.doctor?.name}</span>
                  </div>
                  <div className="flex justify-between border-b border-dashed border-gray-100 pb-2">
                    <span className="font-bold text-black/40">Dept:</span>
                    <span className="font-black">{selectedAptForTicket.doctor?.speciality}</span>
                  </div>
                  <div className="flex justify-between border-b border-dashed border-gray-200 pb-2">
                    <span className="font-bold text-black/40">Date:</span>
                    <span className="font-black">{new Date(selectedAptForTicket.appointment_date).toLocaleDateString('en-US', { day: '2-digit', month: 'short', year: 'numeric' })}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="font-bold text-black/40">Time:</span>
                    <span className="font-black">{new Date(selectedAptForTicket.appointment_date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                  </div>
                </div>

                {/* Footer Barcode Simulation */}
                <div className="pt-6 flex flex-col items-center gap-4">
                  <div className="flex gap-1 w-full justify-center h-8 grayscale opacity-80">
                    {[...Array(25)].map((_, i) => (
                      <div key={i} className={`bg-black ${i % 3 === 0 ? 'w-[2px]' : 'w-[1px]'} ${i % 5 === 0 ? 'h-full' : 'h-3/4'}`} />
                    ))}
                  </div>
                  <p className="text-[8px] font-bold text-black opacity-40 uppercase tracking-[0.3em]">AZ-{selectedAptForTicket.id.split('-')[0]}</p>

                  <div className="flex w-full gap-2 ticket-actions pt-2">
                    <Button
                      className="flex-1 bg-black text-white h-9 font-black hover:bg-black/80 w-full"
                      onClick={handlePrintTicket}
                    >
                      <Printer className="w-4 h-4 mr-1" />
                      Print
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog >

      {/* Cancellation Modal */}
      < Dialog open={isCancelModalOpen} onOpenChange={setIsCancelModalOpen} >
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-600">
              <X className="w-5 h-5" />
              Cancel Appointment
            </DialogTitle>
            <DialogDescription>
              We're sorry you have to cancel. Please tell us why.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label className="text-xs font-bold uppercase text-gray-400">Reason for cancellation</Label>
              <Select value={cancellationReason} onValueChange={setCancellationReason}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select a reason..." />
                </SelectTrigger>
                <SelectContent>
                  {cancellationReasons.map((reason) => (
                    <SelectItem key={reason} value={reason}>
                      {reason}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="p-3 bg-red-50 border border-red-100 rounded-lg">
              <p className="text-[10px] text-red-700 font-bold leading-tight">
                Note: Once cancelled, your slot will be immediately released to other patients. This action cannot be undone.
              </p>
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button
              variant="ghost"
              onClick={() => {
                setIsCancelModalOpen(false);
                setSelectedAptForCancel(null);
                setCancellationReason('');
              }}
              disabled={isCancelling}
            >
              Go Back
            </Button>
            <Button
              variant="destructive"
              onClick={handleCancelAppointment}
              disabled={isCancelling || !cancellationReason}
              className="font-bold"
            >
              {isCancelling ? 'Processing...' : 'Confirm Cancellation'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog >
    </div >
  );
};


export default PatientPortal;
