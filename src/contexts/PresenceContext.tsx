import React, { createContext, useContext, useEffect, useState, useMemo, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from './AuthContext';

export interface OnlineUserPresence {
  id: string;
  name: string;
  role?: string;
  email?: string;
  team?: string;
  online_at: string;
  last_seen: number;
}

export interface PresenceContextType {
  onlineUsers: Record<string, OnlineUserPresence>; // indexed by id AND lowercase name
  onlineList: OnlineUserPresence[]; // unique array of online users
  onlineCount: number;
  isUserOnline: (userId?: string, userName?: string) => boolean;
  getUserOnlineInfo: (userId?: string, userName?: string) => OnlineUserPresence | null;
  refreshPresence: () => void;
}

const PresenceContext = createContext<PresenceContextType>({
  onlineUsers: {},
  onlineList: [],
  onlineCount: 0,
  isUserOnline: () => false,
  getUserOnlineInfo: () => null,
  refreshPresence: () => {},
});

const PRESENCE_CHANNEL_NAME = 'dashboard-live-presence-v1';
const HEARTBEAT_EXPIRY_MS = 90 * 1000; // 90 seconds

export const PresenceProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { profile } = useAuth();
  const [realtimeState, setRealtimeState] = useState<Record<string, OnlineUserPresence>>({});
  const [heartbeatState, setHeartbeatState] = useState<Record<string, OnlineUserPresence>>({});

  // 1. Fetch heartbeats from page_announcements (fallback layer)
  const fetchHeartbeats = useCallback(async () => {
    try {
      const { data } = await supabase
        .from('page_announcements')
        .select('page_key, message, updated_at')
        .like('page_key', 'online_%');

      if (data && Array.isArray(data)) {
        const now = Date.now();
        const map: Record<string, OnlineUserPresence> = {};
        for (const row of data) {
          if (!row.message) continue;
          try {
            const parsed = JSON.parse(row.message);
            const ts = parsed.timestamp || (row.updated_at ? new Date(row.updated_at).getTime() : 0);
            if (now - ts < HEARTBEAT_EXPIRY_MS) {
              const uId = parsed.id || row.page_key.replace('online_', '');
              map[uId] = {
                id: uId,
                name: parsed.name || 'مستخدم',
                role: parsed.role || 'junior',
                team: parsed.team,
                email: parsed.email,
                online_at: parsed.online_at || row.updated_at || new Date().toISOString(),
                last_seen: ts
              };
            }
          } catch {}
        }
        setHeartbeatState(map);
      }
    } catch (e) {
      console.warn('[Presence] fetchHeartbeats error:', e);
    }
  }, []);

  // 2. Setup Realtime Presence Channel + Track current user
  useEffect(() => {
    const channel = supabase.channel(PRESENCE_CHANNEL_NAME, {
      config: {
        presence: {
          key: profile?.id || 'guest-' + Math.random().toString(36).slice(2, 8)
        }
      }
    });

    const syncPresence = () => {
      const state = channel.presenceState();
      const map: Record<string, OnlineUserPresence> = {};
      
      for (const [key, presences] of Object.entries(state)) {
        if (Array.isArray(presences) && presences.length > 0) {
          const latest: any = presences[presences.length - 1];
          const uId = latest.id || latest.user_id || key;
          map[uId] = {
            id: uId,
            name: latest.name || 'مستخدم',
            role: latest.role || 'junior',
            email: latest.email,
            team: latest.team,
            online_at: latest.online_at || new Date().toISOString(),
            last_seen: Date.now()
          };
        }
      }
      setRealtimeState(map);
    };

    channel
      .on('presence', { event: 'sync' }, syncPresence)
      .on('presence', { event: 'join' }, syncPresence)
      .on('presence', { event: 'leave' }, syncPresence)
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED' && profile?.id) {
          await channel.track({
            id: profile.id,
            name: profile.name,
            role: profile.role,
            email: profile.email,
            team: profile.team,
            online_at: new Date().toISOString()
          });
        }
      });

    // Initial heartbeat fetch once on mount
    fetchHeartbeats();

    return () => {
      if (profile?.id) {
        channel.untrack();
      }
      supabase.removeChannel(channel);
    };
  }, [profile?.id, profile?.name, profile?.role, profile?.email, profile?.team, fetchHeartbeats]);

  // 3. Heartbeat writer for current logged in user (write once on mount, clean up on unmount)
  useEffect(() => {
    if (!profile?.id) return;

    const writeHeartbeat = async () => {
      try {
        await supabase.from('page_announcements').upsert([
          {
            page_key: `online_${profile.id}`,
            page_label: 'user_online_heartbeat',
            message: JSON.stringify({
              id: profile.id,
              name: profile.name,
              role: profile.role,
              email: profile.email,
              team: profile.team,
              timestamp: Date.now(),
              online_at: new Date().toISOString()
            }),
            type: 'info',
            is_active: true,
            updated_at: new Date().toISOString()
          }
        ], { onConflict: 'page_key' });
      } catch {}
    };

    // Write once on load
    writeHeartbeat();

    // Clean up on tab close
    const handleBeforeUnload = () => {
      if (navigator.sendBeacon) {
        supabase.from('page_announcements').delete().eq('page_key', `online_${profile.id}`);
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      supabase.from('page_announcements').delete().eq('page_key', `online_${profile.id}`).then(() => {});
    };
  }, [profile?.id, profile?.name, profile?.role, profile?.email, profile?.team]);

  // 4. Merge Realtime + Heartbeat states into single unified lookup
  const { onlineUsers, onlineList, onlineCount } = useMemo(() => {
    const merged: Record<string, OnlineUserPresence> = {};
    const uniqueMap = new Map<string, OnlineUserPresence>();

    // 1. Add heartbeat users first
    for (const [id, user] of Object.entries(heartbeatState)) {
      uniqueMap.set(id, user);
    }

    // 2. Realtime presence takes precedence
    for (const [id, user] of Object.entries(realtimeState)) {
      uniqueMap.set(id, user);
    }

    const list = Array.from(uniqueMap.values());

    // Index by both userId and lowercase name
    for (const user of list) {
      merged[user.id] = user;
      if (user.name) {
        merged[user.name.trim().toLowerCase()] = user;
      }
    }

    return {
      onlineUsers: merged,
      onlineList: list,
      onlineCount: list.length
    };
  }, [realtimeState, heartbeatState]);

  // Helper: check if a user is online right now
  const isUserOnline = useCallback((userId?: string, userName?: string): boolean => {
    if (!userId && !userName) return false;
    if (userId && onlineUsers[userId]) return true;
    if (userName && onlineUsers[userName.trim().toLowerCase()]) return true;
    return false;
  }, [onlineUsers]);

  // Helper: get online user details
  const getUserOnlineInfo = useCallback((userId?: string, userName?: string): OnlineUserPresence | null => {
    if (!userId && !userName) return null;
    if (userId && onlineUsers[userId]) return onlineUsers[userId];
    if (userName && onlineUsers[userName.trim().toLowerCase()]) return onlineUsers[userName.trim().toLowerCase()];
    return null;
  }, [onlineUsers]);

  const refreshPresence = useCallback(() => {
    fetchHeartbeats();
  }, [fetchHeartbeats]);

  return (
    <PresenceContext.Provider
      value={{
        onlineUsers,
        onlineList,
        onlineCount,
        isUserOnline,
        getUserOnlineInfo,
        refreshPresence
      }}
    >
      {children}
    </PresenceContext.Provider>
  );
};

export const usePresence = () => useContext(PresenceContext);
