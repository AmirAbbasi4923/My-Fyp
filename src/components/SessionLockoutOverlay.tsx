import { LockoutReason } from '@/hooks/useSessionGuard';
import { Button } from '@/components/ui/button';
import { ShieldAlert, MonitorSmartphone, Layers } from 'lucide-react';

interface SessionLockoutOverlayProps {
  reason: LockoutReason;
  onReturnToLogin: () => void;
}

const SessionLockoutOverlay = ({ reason, onReturnToLogin }: SessionLockoutOverlayProps) => {
  if (!reason) return null;

  const isOtherTab = reason === 'other_tab';

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center"
      style={{ backdropFilter: 'blur(12px)', background: 'rgba(15, 23, 42, 0.85)' }}
    >
      {/* Animated background glow */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/3 w-96 h-96 rounded-full bg-red-500/10 blur-3xl animate-pulse" />
        <div className="absolute bottom-1/4 right-1/3 w-64 h-64 rounded-full bg-primary/10 blur-3xl animate-pulse delay-700" />
      </div>

      <div className="relative z-10 max-w-sm w-full mx-4 flex flex-col items-center text-center gap-6 animate-in fade-in zoom-in-95 duration-500">

        {/* Icon */}
        <div className="w-20 h-20 rounded-full bg-red-500/10 border-2 border-red-500/30 flex items-center justify-center shadow-xl shadow-red-500/10">
          {isOtherTab
            ? <Layers className="w-9 h-9 text-red-400" />
            : <MonitorSmartphone className="w-9 h-9 text-red-400" />
          }
        </div>

        {/* Content */}
        <div className="space-y-2">
          <div className="flex items-center justify-center gap-2 mb-3">
            <ShieldAlert className="w-4 h-4 text-red-400" />
            <span className="text-[10px] font-black uppercase tracking-widest text-red-400">
              Session Terminated
            </span>
          </div>
          <h2 className="text-2xl font-black text-white leading-tight">
            {isOtherTab
              ? 'Session Moved to Another Tab'
              : 'Signed In on Another Device'
            }
          </h2>
          <p className="text-sm text-gray-400 leading-relaxed font-medium">
            {isOtherTab
              ? 'Your session has been moved to a new tab. This tab is now inactive to protect your account security.'
              : 'Your account was signed in from another device or browser. You have been signed out here for security.'
            }
          </p>
        </div>

        {/* Badge */}
        <div className="px-3 py-1.5 rounded-full bg-white/5 border border-white/10 text-[10px] font-bold uppercase tracking-wider text-gray-400">
          {isOtherTab ? 'Tab Conflict Detected' : 'Multi-Device Login Detected'}
        </div>

        {/* CTA */}
        <Button
          className="w-full h-12 bg-white text-gray-900 hover:bg-gray-100 font-black text-sm uppercase tracking-wider rounded-xl shadow-xl transition-all active:scale-95"
          onClick={onReturnToLogin}
        >
          Return to Login
        </Button>

        <p className="text-[10px] text-gray-600 font-medium">
          Asaan Zindagi · Security System
        </p>
      </div>
    </div>
  );
};

export default SessionLockoutOverlay;
