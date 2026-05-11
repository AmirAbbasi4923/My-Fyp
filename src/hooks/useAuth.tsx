import { useState, useEffect, createContext, useContext, ReactNode } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

type AppRole = 'patient' | 'doctor' | 'admin';

const SESSION_TOKEN_KEY = 'az_session_token';

const roleTableMap: Record<AppRole, string> = {
  patient: 'patients',
  doctor: 'doctors',
  admin: 'admins',
};

interface AuthContextType {
  user: User | null;
  session: Session | null;
  userRole: AppRole | null;
  userName: string | null;
  loading: boolean;
  signUp: (email: string, password: string, fullName: string, role: AppRole, phone?: string, metadata?: any) => Promise<void>;
  signIn: (email: string, password: string, selectedRole: AppRole) => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [userRole, setUserRole] = useState<AppRole | null>(null);
  const [userName, setUserName] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    // Set up auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);

        if (session?.user) {
          // Fetch user role and name separately
          setTimeout(() => {
            fetchUserRole(session.user.id);
          }, 0);
        } else {
          setUserRole(null);
          setUserName(null);
        }

        setLoading(false);
      }
    );

    // Check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchUserRole(session.user.id);
      }
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const fetchUserRole = async (userId: string) => {
    try {
      // Try finding in admins
      let { data: adminData } = await supabase.from('admins').select('role, full_name').eq('id', userId).maybeSingle();
      if (adminData) {
        setUserRole('admin');
        setUserName(adminData.full_name);
        return;
      }

      // Try patients
      let { data: patientData } = await supabase.from('patients').select('email, full_name').eq('id', userId).maybeSingle();
      if (patientData) {
        setUserRole('patient');
        setUserName(patientData.full_name);
        return;
      }

      // Try doctors
      let { data: doctorData } = await supabase.from('doctors').select('name').eq('id', userId).maybeSingle();
      if (doctorData) {
        setUserRole('doctor');
        setUserName(doctorData.name);
        return;
      }

      // If not found
      setUserRole(null);
      setUserName(null);

    } catch (error) {
      console.error('Error fetching user role:', error);
    }
  };

  const signUp = async (email: string, password: string, fullName: string, role: AppRole, phone?: string, metadata?: any) => {
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName,
            phone_number: phone,
            ...metadata
          }
        }
      });

      if (error) {
        console.error('Auth error:', error);
        throw new Error(error.message);
      }

      if (data.user) {
        let tableToInsert = '';
        let insertData: any = {
          id: data.user.id,
          email: email,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        };

        if (role === 'patient') {
          tableToInsert = 'patients';
          insertData = { ...insertData, full_name: fullName, phone_number: phone, patient_type: metadata?.patient_type };
        } else if (role === 'doctor') {
          // Handled specifically below to map fields correctly
          tableToInsert = ''; // clear it so the generic upsert block doesn't run, we run the specific block below
        } else if (role === 'admin') {
          tableToInsert = 'admins';
          insertData = { ...insertData, full_name: fullName, role: 'admin' };
        }

        if (tableToInsert) {
          const { error: profileError } = await supabase
            .from(tableToInsert)
            .upsert(insertData, { onConflict: 'id' });

          if (profileError) {
            console.error('Table insert error:', profileError);
            throw new Error('Failed to create user profile in ' + tableToInsert);
          }
        } else if (role === 'doctor') {
          // Explicitly handle doctor insertion here to ensure we use the created user's ID immediately
          const { error: doctorError } = await supabase
            .from('doctors')
            .insert({
              id: data.user.id,
              name: fullName,
              email: email,
              phone_number: phone,
              speciality: metadata?.speciality,
              experience_years: metadata?.experience_years || null,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            });

          if (doctorError) {
            console.error('Doctor profile error:', doctorError);
            throw new Error('Failed to create doctor profile details: ' + doctorError.message);
          }
        }

        toast.success(role === 'doctor' ? 'Account created! completing profile...' : '✅ Account Registered Successfully!');

        setTimeout(() => {
          navigate('/signin');
        }, 2500);
      }
    } catch (error: any) {
      console.error('Signup error:', error);
      toast.error(error.message || 'Signup failed');
      throw error;
    }
  };

  const signIn = async (email: string, password: string, selectedRole: AppRole) => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        if (error.message.includes('Invalid login credentials')) {
          throw new Error('Invalid email or password.');
        }
        throw error;
      }

      if (data.user) {
        const userId = data.user.id;
        let roleFound = false;

        // Verify against the SELECTED role table
        if (selectedRole === 'patient') {
          const { data: p } = await supabase.from('patients').select('id').eq('id', userId).maybeSingle();
          if (p) roleFound = true;
        } else if (selectedRole === 'doctor') {
          const { data: d } = await supabase.from('doctors').select('id').eq('id', userId).maybeSingle();
          if (d) roleFound = true;
        } else if (selectedRole === 'admin') {
          // check 'admins' table (renamed from profiles)
          const { data: a } = await supabase.from('admins').select('id, role').eq('id', userId).maybeSingle();
          if (a && a.role === 'admin') roleFound = true;
        }

        if (!roleFound) {
          await supabase.auth.signOut();
          throw new Error(`Account not found for role: ${selectedRole}. Please check your selection.`);
        }

        // ── Session Token (Single Active Session) ──────────────────────────
        const sessionToken = crypto.randomUUID();
        const table = roleTableMap[selectedRole];
        // Write token to DB
        await supabase
          .from(table as any)
          .update({ active_session_token: sessionToken } as any)
          .eq('id', userId);
        // Save to sessionStorage (tab-scoped)
        sessionStorage.setItem(SESSION_TOKEN_KEY, sessionToken);
        // ────────────────────────────────────────────────────────────────────

        setUserRole(selectedRole);
        navigate('/?next=/home');
      }
    } catch (error: any) {
      toast.error(error.message || 'Failed to sign in');
      throw error;
    }
  };

  const signOut = async () => {
    try {
      // Clear session token from DB before signing out
      const currentUser = (await supabase.auth.getUser()).data.user;
      if (currentUser) {
        // Determine table from local role state
        if (userRole) {
          const table = roleTableMap[userRole];
          await supabase
            .from(table as any)
            .update({ active_session_token: null } as any)
            .eq('id', currentUser.id);
        }
      }
      // Clear local token
      sessionStorage.removeItem(SESSION_TOKEN_KEY);

      const { error } = await supabase.auth.signOut();
      if (error) throw error;

      setUser(null);
      setSession(null);
      setUserRole(null);
      setUserName(null);
      toast.success('Signed out successfully');
      navigate('/');
    } catch (error: any) {
      toast.error(error.message || 'Failed to sign out');
    }
  };

  return (
    <AuthContext.Provider value={{ user, session, userRole, userName, loading, signUp, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
