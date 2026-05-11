import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import logoMark from '@/assets/az-logo.svg';
import { ArrowLeft } from 'lucide-react';

const ForgotPassword = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
        // Optional: You can customize email template here if needed
      });

      if (error) {
        throw error;
      }

      toast.success('Password reset link has been sent to your email.');
      setTimeout(() => {
        navigate('/signin');
      }, 2000);
    } catch (error: any) {
      console.error('Password reset error:', error);
      toast.error(error.message || 'Failed to send password reset email');
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
              Asaan Zindagi
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6 px-6 pb-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email" className="text-sm font-medium text-foreground">
                Email
              </Label>
              <Input
                id="email"
                type="email"
                placeholder="Enter your email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="border-gray-300 focus:border-primary focus:ring-primary"
              />
            </div>

            <Button
              type="submit"
              className="w-full bg-gradient-to-r from-primary to-primary-glow hover:from-primary/90 hover:to-primary-glow/90 text-white font-semibold py-3.5 shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-[1.02]"
              disabled={loading}
            >
              {loading ? (
                <span className="flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Sending...
                </span>
              ) : (
                'Send Reset Link'
              )}
            </Button>
          </form>

          <Button
            variant="ghost"
            onClick={() => navigate('/signin')}
            className="w-full flex items-center justify-center gap-2 text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Sign In
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};

export default ForgotPassword;

