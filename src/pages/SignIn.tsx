import { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useNavigate } from 'react-router-dom';
import { UserCircle, Stethoscope, Shield, Eye, EyeOff } from 'lucide-react';
import logoMark from '@/assets/az-logo.svg';

type AppRole = 'patient' | 'doctor' | 'admin';

const SignIn = () => {
  const { signIn } = useAuth();
  const navigate = useNavigate();
  const [selectedRole, setSelectedRole] = useState<AppRole>('patient');

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const roles = [
    { value: 'patient' as AppRole, label: 'Patient', icon: UserCircle, color: 'from-primary to-primary-glow' },
    { value: 'doctor' as AppRole, label: 'Doctor', icon: Stethoscope, color: 'from-secondary to-green-400' },
    { value: 'admin' as AppRole, label: 'Admin', icon: Shield, color: 'from-purple-500 to-purple-600' },
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      await signIn(email, password, selectedRole);
    } catch (error) {
      console.error('Auth error:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-blue-50 via-blue-100 to-white p-3 sm:p-4 relative overflow-x-hidden overflow-y-auto">
      {/* Decorative background elements */}
      <div className="absolute top-20 left-10 sm:left-20 w-48 sm:w-72 h-48 sm:h-72 bg-blue-200/30 rounded-full blur-3xl animate-pulse" />
      <div className="absolute bottom-20 right-10 sm:right-20 w-64 sm:w-96 h-64 sm:h-96 bg-primary/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />

      <Card className="w-full max-w-md flex flex-col backdrop-blur-sm bg-white/95 shadow-2xl border-0 relative z-10 animate-fade-in my-4">
        <CardHeader className="text-center space-y-3 pt-6 pb-2 px-6">
          <CardTitle className="flex items-center justify-center gap-2 sm:gap-3">
            <img
              src={logoMark}
              alt="Asaan Zindagi logo"
              className="h-10 w-10 sm:h-12 sm:w-12 md:h-16 md:w-16 flex-shrink-0"
              loading="lazy"
              draggable={false}
            />
            <span className="text-2xl sm:text-3xl md:text-4xl font-bold bg-gradient-to-r from-primary to-primary-glow bg-clip-text text-transparent tracking-wide leading-tight">
              Asaan Zindagi
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6 px-6 pb-6">
          <Tabs value={'signin'} className="space-y-6">

            <div className="space-y-6">
              <div className="space-y-3">
                <Label className="text-sm font-semibold text-gray-700">Select Your Role</Label>
                <div className="grid grid-cols-3 gap-2 sm:gap-3">
                  {roles.map((role) => {
                    const Icon = role.icon;
                    return (
                      <button
                        key={role.value}
                        type="button"
                        onClick={() => setSelectedRole(role.value)}
                        className={`group flex flex-col items-center gap-1.5 sm:gap-2.5 p-2.5 sm:p-4 rounded-xl border-2 transition-all duration-300 ${
                            selectedRole === role.value
                              ? 'border-primary bg-blue-50 shadow-lg scale-105 ring-2 ring-primary/20'
                              : 'border-gray-200 hover:border-primary/40 hover:bg-gray-50'
                          }`}
                      >
                        <div className={`p-2 rounded-full bg-gradient-to-br ${role.color} shadow-md transition-transform duration-300 ${selectedRole === role.value ? 'scale-110' : 'group-hover:scale-105'
                          }`}>
                          <Icon className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
                        </div>
                        <span className="text-[10px] sm:text-xs font-semibold text-gray-700">{role.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                {/* Removed Sign Up fields here; Sign Up is a separate page now */}

                <div className="space-y-2">
                  <Label htmlFor="email" className="text-sm font-medium text-gray-700">
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

                <div className="space-y-2">
                  <Label htmlFor="password" className="text-sm font-medium text-gray-700">
                    Password
                  </Label>
                  <div className="relative">
                    <Input
                      id="password"
                      type={showPassword ? 'text' : 'password'}
                      placeholder="Enter your password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
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

                <div className="text-right">
                  <button
                    type="button"
                    onClick={() => navigate('/forgot-password')}
                    className="text-sm text-primary font-medium hover:underline"
                  >
                    Forgot Password?
                  </button>
                </div>

                <Button
                  type="submit"
                  className="w-full bg-gradient-to-r from-primary to-primary-glow hover:from-primary/90 hover:to-primary-glow/90 text-white font-semibold py-3.5 shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-[1.02]"
                  disabled={loading}
                >
                  {loading ? (
                    <span className="flex items-center gap-2">
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Processing...
                    </span>
                  ) : (
                    'Sign In'
                  )}
                </Button>
              </form>

              {/* Register links — inside Card so they're never clipped by overflow-x-hidden */}
              <div className="pt-2 text-center text-sm text-gray-600">
                Not registered yet?{' '}
                <button
                  type="button"
                  onClick={() => navigate('/signup')}
                  className="text-primary font-semibold underline-offset-2 hover:underline py-1 px-1"
                >
                  Register yourself
                </button>
                {' '}or{' '}
                <button
                  type="button"
                  onClick={() => navigate('/doctor-signup')}
                  className="text-green-600 font-semibold underline-offset-2 hover:underline py-1 px-1"
                >
                  Register as Doctor
                </button>
              </div>
            </div>
          </Tabs>
        </CardContent>
      </Card>

    </div>
  );
};

export default SignIn;
