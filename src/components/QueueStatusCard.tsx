import { useEffect, useState, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Clock, Stethoscope, Users, Timer } from 'lucide-react';

// ─── Types ────────────────────────────────────────────────────────────────────

interface QueueEntry {
  id: string;
  patient_id: string;
  queue_position: number | null;
  status: string;
  consultation_started_at: string | null;
  appointment_date: string;
}

interface QueueStatusCardProps {
  /** The current patient's user ID */
  patientId: string;
  /** The doctor ID this patient has a confirmed appointment with */
  doctorId: string;
  /** Doctor's display name */
  doctorName: string;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

const MINUTES_PER_SLOT = 5;

/** Format seconds as MM:SS */
function formatCountdown(totalSeconds: number): string {
  if (totalSeconds <= 0) return '00:00';
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

/** Format elapsed seconds as MM:SS (for in-consultation timer) */
function formatElapsed(startedAt: string): string {
  const diffMs = Date.now() - new Date(startedAt).getTime();
  const totalSeconds = Math.floor(diffMs / 1000);
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

// ─── Component ────────────────────────────────────────────────────────────────

const QueueStatusCard = ({ patientId, doctorId, doctorName }: QueueStatusCardProps) => {
  const [queue, setQueue] = useState<QueueEntry[]>([]);
  const [tick, setTick] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // ── Fetch queue for this doctor (confirmed + in_consultation) ──────────────
  const fetchQueue = async () => {
    const { data, error } = await supabase
      .from('appointments')
      .select('id, patient_id, queue_position, status, consultation_started_at, appointment_date')
      .eq('doctor_id', doctorId)
      .in('status', ['confirmed', 'in_consultation'])
      .order('queue_position', { ascending: true, nullsFirst: false });

    if (!error && data) {
      // Sort: in_consultation first, then by queue_position
      const sorted = (data as QueueEntry[]).sort((a, b) => {
        if (a.status === 'in_consultation') return -1;
        if (b.status === 'in_consultation') return 1;
        return (a.queue_position ?? 999) - (b.queue_position ?? 999);
      });
      setQueue(sorted);
    }
  };

  // ── Supabase Realtime subscription ────────────────────────────────────────
  useEffect(() => {
    fetchQueue();

    const channel = supabase
      .channel(`queue_watch_${doctorId}_${patientId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'appointments',
          filter: `doctor_id=eq.${doctorId}`,
        },
        () => {
          fetchQueue();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [doctorId, patientId]);

  // ── setInterval for live MM:SS tick ───────────────────────────────────────
  useEffect(() => {
    intervalRef.current = setInterval(() => {
      setTick(t => t + 1);
    }, 1000);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);

  // ── Derive this patient's queue entry ─────────────────────────────────────
  const myIndex = queue.findIndex(e => e.patient_id === patientId);
  if (myIndex === -1) return null; // Patient not in queue → don't render

  const myEntry = queue[myIndex];
  const isInConsultation = myEntry.status === 'in_consultation';
  const positionInQueue = myIndex + 1; // 1-based display position

  // ── Build display values ──────────────────────────────────────────────────
  let waitSeconds = (positionInQueue - 1) * MINUTES_PER_SLOT * 60;

  // Find if someone is currently in consultation
  const activeConsultation = queue.find(e => e.status === 'in_consultation');

  // If I am NOT the one in consultation, and someone else is, calculate descending wait time
  if (!isInConsultation && activeConsultation && activeConsultation.consultation_started_at) {
    const elapsedSeconds = Math.floor((Date.now() - new Date(activeConsultation.consultation_started_at).getTime()) / 1000);
    // Time remaining for the current patient (max 5 mins, clamped at 0 if they take longer)
    const activeRemaining = Math.max(0, (MINUTES_PER_SLOT * 60) - elapsedSeconds);
    // Number of people waiting BEFORE me (excluding the one in consultation)
    const othersAhead = Math.max(0, positionInQueue - 2); 
    
    waitSeconds = activeRemaining + (othersAhead * MINUTES_PER_SLOT * 60);
  }

  // ── Status badge config ───────────────────────────────────────────────────
  type StatusConfig = { label: string; color: string; bgColor: string; borderColor: string };

  const statusConfig: StatusConfig = isInConsultation
    ? { label: 'In Consultation', color: 'text-green-700', bgColor: 'bg-green-50', borderColor: 'border-green-200' }
    : positionInQueue === 1
      ? { label: 'Your Turn Next!', color: 'text-amber-700', bgColor: 'bg-amber-50', borderColor: 'border-amber-200' }
      : { label: 'Waiting', color: 'text-blue-700', bgColor: 'bg-blue-50', borderColor: 'border-blue-200' };

  return (
    <Card className={`border-2 ${statusConfig.borderColor} ${statusConfig.bgColor} shadow-lg overflow-hidden animate-in fade-in duration-500`}>
      {/* Accent top bar */}
      <div className={`h-1 w-full ${isInConsultation ? 'bg-green-500' : positionInQueue === 1 ? 'bg-amber-500' : 'bg-blue-500'}`} />

      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className={`p-2 rounded-lg ${isInConsultation ? 'bg-green-500' : positionInQueue === 1 ? 'bg-amber-500' : 'bg-blue-500'}`}>
              {isInConsultation
                ? <Stethoscope className="w-4 h-4 text-white" />
                : <Timer className="w-4 h-4 text-white" />}
            </div>
            <CardTitle className="text-sm font-black uppercase tracking-wider text-gray-800">
              Live Queue Status
            </CardTitle>
          </div>
          <Badge
            className={`text-[10px] font-black uppercase tracking-wide px-2 py-0.5 border ${statusConfig.borderColor} ${statusConfig.bgColor} ${statusConfig.color}`}
          >
            {statusConfig.label}
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="pt-0 space-y-4">
        <div className="flex items-center justify-between gap-4">

          {/* Queue position */}
          <div className="text-center">
            <p className="text-[9px] font-black uppercase text-gray-400 tracking-wider mb-1">Queue Position</p>
            <div className={`w-14 h-14 rounded-2xl flex items-center justify-center font-black text-2xl shadow-sm
              ${isInConsultation ? 'bg-green-500 text-white' : positionInQueue === 1 ? 'bg-amber-500 text-white' : 'bg-white border-2 border-blue-200 text-blue-700'}`}>
              {isInConsultation ? '🩺' : `#${positionInQueue}`}
            </div>
          </div>

          {/* Divider */}
          <div className="h-12 w-px bg-gray-200" />

          {/* Timer / elapsed */}
          <div className="flex-1 text-center">
            <p className="text-[9px] font-black uppercase text-gray-400 tracking-wider mb-1">
              {isInConsultation ? 'Elapsed Time' : 'Est. Wait Time'}
            </p>
            <div className={`font-mono text-3xl font-black tracking-tighter tabular-nums
              ${isInConsultation ? 'text-green-600' : positionInQueue === 1 ? 'text-amber-600' : 'text-blue-700'}`}>
              {isInConsultation && myEntry.consultation_started_at
                ? formatElapsed(myEntry.consultation_started_at)
                : formatCountdown(waitSeconds)}
            </div>
            <p className="text-[9px] text-gray-400 font-semibold mt-0.5">
              {isInConsultation ? 'Consultation in progress' : positionInQueue === 1 ? 'You\'re up next!' : `~${(positionInQueue - 1) * MINUTES_PER_SLOT} min remaining`}
            </p>
          </div>

          {/* Divider */}
          <div className="h-12 w-px bg-gray-200" />

          {/* Patients ahead */}
          <div className="text-center">
            <p className="text-[9px] font-black uppercase text-gray-400 tracking-wider mb-1">Ahead</p>
            <div className="flex flex-col items-center gap-1">
              <Users className={`w-5 h-5 ${isInConsultation ? 'text-green-500' : 'text-blue-400'}`} />
              <span className="text-lg font-black text-gray-800">
                {isInConsultation ? 0 : positionInQueue - 1}
              </span>
            </div>
          </div>
        </div>

        {/* Doctor info strip */}
        <div className="flex items-center gap-2 pt-2 border-t border-gray-100/80">
          <Stethoscope className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
          <p className="text-[11px] font-bold text-gray-500">
            Dr. {doctorName} · {queue.length} patient{queue.length !== 1 ? 's' : ''} in queue today
          </p>
          <div className="ml-auto flex items-center gap-1">
            <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
            <span className="text-[9px] font-bold text-green-600 uppercase">Live</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default QueueStatusCard;
