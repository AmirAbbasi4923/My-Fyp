import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import logoMark from '@/assets/az-logo.svg';
import { Eye, EyeOff } from 'lucide-react';

const ResetPassword = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Handle password reset from URL hash (Supabase redirects here with tokens in hash)
    const handleAuthStateChange = async () => {
      // Check URL hash for access_token and refresh_token
      const hashParams = new URLSearchParams(window.location.hash.substring(1));
      const accessToken = hashParams.get('access_token');
      const refreshToken = hashParams.get('refresh_token');
      const type = hashParams.get('type');
      const expiresAt = hashParams.get('expires_at');

      // Check if token is expired
      if (expiresAt) {
        const expiryTime = parseInt(expiresAt) * 1000; // Convert to milliseconds
        const now = Date.now();
        if (now > expiryTime) {
          toast.error('Reset link has expired. Please request a new one.');
          navigate('/forgot-password');
          return;
        }
      }

      if (type === 'recovery' && accessToken && refreshToken) {
        // Set the session from the reset link immediately
        const { error } = await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken,
        });

        if (error) {
          console.error('Error setting session:', error);
          if (error.message?.includes('expired') || error.message?.includes('invalid')) {
            toast.error('Reset link has expired. Please request a new one.');
            navigate('/forgot-password');
          } else {
            toast.error('Invalid reset link');
            navigate('/signin');
          }
        } else {
          // Clear the hash from URL
          window.history.replaceState(null, '', window.location.pathname);
        }
      } else {
        // Check if we already have a valid session
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
          // Try to get from query params as fallback
          const urlParams = new URLSearchParams(window.location.search);
          const token = urlParams.get('token');

          if (!token) {
            toast.error('Invalid or expired reset link. Please request a new one.');
            navigate('/forgot-password');
          }
        }
      }
    };

    handleAuthStateChange();

    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'PASSWORD_RECOVERY' && session) {
        // Session restored successfully
        window.history.replaceState(null, '', window.location.pathname);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (newPassword !== confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }

    if (newPassword.length < 6) {
      toast.error('Password must be at least 6 characters');
      return;
    }

    setLoading(true);

    try {
      // Get current session to get user email and preserve reset tokens
      const { data: { session } } = await supabase.auth.getSession();

      if (!session || !session.user?.email) {
        throw new Error('Session expired. Please request a new reset link.');
      }

      // NOTE: We removed the check for "new password same as old password" because
      // attempting to sign in (to verify old password) invalidates the separate recovery session
      // causing "Session Expired" errors. We will just proceed to update.

      // Now update the password
      const { error: updateError } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (updateError) {
        throw updateError;
      }

      toast.success('Password reset successfully.');

      // Sign out to force re-login with new password
      await supabase.auth.signOut();

      setTimeout(() => {
        navigate('/signin');
      }, 1500);
    } catch (error: any) {
      console.error('Password reset error:', error);

      // Check if error is about password being same
      if (error.message?.includes('same') || error.message?.includes('identical') || error.message?.includes('different')) {
        toast.error('New password should be different from the old one.');
      } else if (!error.message?.includes('Invalid login credentials')) {
        // Don't show error if it's just the expected "invalid credentials" from our check
        toast.error(error.message || 'Failed to reset password');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="h-screen flex flex-col items-center justify-center bg-gradient-to-br from-blue-50 via-blue-100 to-white p-4 relative overflow-hidden">
      {/* Decorative background elements */}
      <div className="absolute top-20 left-20 w-72 h-72 bg-blue-200/30 rounded-full blur-3xl animate-pulse" />
      <div className="absolute bottom-20 right-20 w-96 h-96 bg-primary/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />

      <Card className="w-full max-w-md flex flex-col backdrop-blur-sm bg-white/95 shadow-2xl border-0 relative z-10 animate-fade-in">
        <CardHeader className="text-center space-y-3 pt-6 pb-2 px-6">
          <CardTitle className="flex items-center justify-center gap-3">
            <img
              src={logoMark}
              alt="Asaan Zindagi logo"
              className="h-12 w-12 md:h-16 md:w-16"
              loading="lazy"
              draggable={false}
            />
            <span className="text-4xl font-semibold bg-gradient-to-r from-primary to-primary-glow bg-clip-text text-transparent tracking-tight">
              Reset Password
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6 px-6 pb-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="newPassword" className="text-sm font-medium text-foreground">
                New Password
              </Label>
              <div className="relative">
                <Input
                  id="newPassword"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Enter new password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  required
                  className="border-gray-300 focus:border-primary focus:ring-primary pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmPassword" className="text-sm font-medium text-foreground">
                Confirm New Password
              </Label>
              <div className="relative">
                <Input
                  id="confirmPassword"
                  type={showConfirmPassword ? 'text' : 'password'}
                  placeholder="Confirm new password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  className="border-gray-300 focus:border-primary focus:ring-primary pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <Button
              type="submit"
              className="w-full bg-gradient-to-r from-primary to-primary-glow hover:from-primary/90 hover:to-primary-glow/90 text-white font-semibold py-3.5 shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-[1.02]"
              disabled={loading}
            >
              {loading ? (
                <span className="flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Resetting...
                </span>
              ) : (
                'Reset Password'
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default ResetPassword;

