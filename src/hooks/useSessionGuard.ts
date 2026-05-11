import { useEffect, useRef, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

export type LockoutReason = 'other_tab' | 'other_device' | null;

const SESSION_TOKEN_KEY = 'az_session_token';
const CHANNEL_NAME_PREFIX = 'az_tab_guard_';

// Map roles to their Supabase table
const roleTable: Record<string, string> = {
  patient: 'patients',
  doctor: 'doctors',
  admin: 'admins',
};

interface UseSessionGuardOptions {
  userId: string | null;
  userRole: 'patient' | 'doctor' | 'admin' | null;
  /** Called when a forced sign-out is needed (other device case) */
  onForceSignOut: () => Promise<void>;
}

interface SessionGuardResult {
  lockoutReason: LockoutReason;
}

export function useSessionGuard({
  userId,
  userRole,
  onForceSignOut,
}: UseSessionGuardOptions): SessionGuardResult {
  // ⛔ In development: hook is fully inert — multiple portals can run simultaneously
  const isDev = import.meta.env.DEV;

  const [lockoutReason, setLockoutReason] = useState<LockoutReason>(null);
  const channelRef = useRef<BroadcastChannel | null>(null);
  const realtimeChannelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const tokenRef = useRef<string | null>(null);
  const lockedRef = useRef(false);

  // ── Read local token from sessionStorage ────────────────────────────────
  const getLocalToken = useCallback(() => {
    return sessionStorage.getItem(SESSION_TOKEN_KEY);
  }, []);

  // ── Verify DB token vs local token ──────────────────────────────────────
  const verifyToken = useCallback(async () => {
    if (isDev) return; // disabled in dev
    if (!userId || !userRole || lockedRef.current) return;
    const localToken = getLocalToken();
    if (!localToken) return;

    const table = roleTable[userRole];
    if (!table) return;

    try {
      const { data, error } = await supabase
        .from(table as any)
        .select('active_session_token')
        .eq('id', userId)
        .single();

      if (error || !data) return;

      const dbToken = (data as any).active_session_token;

      if (dbToken && dbToken !== localToken) {
        lockedRef.current = true;
        setLockoutReason('other_device');
        setTimeout(() => onForceSignOut(), 800);
      }
    } catch (e) {
      // Silently ignore — don't disrupt user on network hiccup
    }
  }, [isDev, userId, userRole, getLocalToken, onForceSignOut]);

  // ── Setup on mount, tear down on unmount ────────────────────────────────
  useEffect(() => {
    if (isDev) return; // ⛔ fully disabled in development
    if (!userId || !userRole) return;

    const localToken = getLocalToken();
    if (!localToken) return;

    tokenRef.current = localToken;
    const channelName = `${CHANNEL_NAME_PREFIX}${userRole}`;

    // ── 1. BroadcastChannel — Same-browser, multi-tab detection ────────────
    if (typeof BroadcastChannel !== 'undefined') {
      const bc = new BroadcastChannel(channelName);
      channelRef.current = bc;

      // Announce our presence to any existing tabs
      bc.postMessage({ type: 'NEW_TAB', token: localToken, userId });

      bc.onmessage = (event) => {
        if (lockedRef.current) return;
        const { type, token: incomingToken, userId: incomingUserId } = event.data;

        if (incomingUserId !== userId) return; // Different user — ignore

        if (type === 'NEW_TAB' && incomingToken !== localToken) {
          // A newer tab just opened — this tab is now stale
          lockedRef.current = true;
          setLockoutReason('other_tab');
        }

        if (type === 'TAKE_OVER') {
          // An explicit takeover signal
          if (incomingToken !== localToken) {
            lockedRef.current = true;
            setLockoutReason('other_tab');
          }
        }
      };

      // Broadcast that we're taking over existing tabs
      setTimeout(() => {
        bc.postMessage({ type: 'TAKE_OVER', token: localToken, userId });
      }, 200);
    }

    // ── 2. Supabase Realtime — Cross-device token mismatch detection ────────
    const table = roleTable[userRole];
    if (table) {
      const rtChannel = supabase
        .channel(`session_guard_${userId}`)
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table,
            filter: `id=eq.${userId}`,
          },
          () => {
            // Token may have changed (another device logged in)
            verifyToken();
          }
        )
        .subscribe();

      realtimeChannelRef.current = rtChannel;

      // Also do an immediate check on mount
      verifyToken();
    }

    return () => {
      channelRef.current?.close();
      channelRef.current = null;
      if (realtimeChannelRef.current) {
        supabase.removeChannel(realtimeChannelRef.current);
        realtimeChannelRef.current = null;
      }
    };
  }, [userId, userRole, verifyToken, getLocalToken]);

  return { lockoutReason };
}
