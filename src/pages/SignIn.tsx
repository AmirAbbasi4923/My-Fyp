import { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { UserCircle, Stethoscope, Shield } from 'lucide-react';

type AppRole = 'patient' | 'doctor' | 'admin';

const SignIn = () => {
  const { signIn, signUp } = useAuth();
  const [selectedRole, setSelectedRole] = useState<AppRole>('patient');
  const [isSignUp, setIsSignUp] = useState(false);
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
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
      if (isSignUp) {
        await signUp(email, password, fullName, selectedRole);
      } else {
        await signIn(email, password);
      }
    } catch (error) {
      console.error('Auth error:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-blue-100 to-white p-4 relative overflow-hidden">
      {/* Decorative background elements */}
      <div className="absolute top-20 left-20 w-72 h-72 bg-blue-200/30 rounded-full blur-3xl animate-pulse" />
      <div className="absolute bottom-20 right-20 w-96 h-96 bg-primary/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
      
      <Card className="w-full max-w-md backdrop-blur-sm bg-white/95 shadow-2xl border-0 relative z-10 animate-fade-in">
        <CardHeader className="text-center space-y-3 pb-6">
          <CardTitle className="text-4xl font-bold text-blue-700 tracking-wide">
            Asaan Zindagi
          </CardTitle>
          <CardDescription className="text-base text-muted-foreground">
            Smart Healthcare Queue & Appointment System
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <Tabs value={isSignUp ? 'signup' : 'signin'} onValueChange={(v) => setIsSignUp(v === 'signup')} className="space-y-6">
            <TabsList className="grid w-full grid-cols-2 bg-muted/50">
              <TabsTrigger value="signin" className="data-[state=active]:bg-white data-[state=active]:shadow-sm">
                Sign In
              </TabsTrigger>
              <TabsTrigger value="signup" className="data-[state=active]:bg-white data-[state=active]:shadow-sm">
                Sign Up
              </TabsTrigger>
            </TabsList>

            <div className="space-y-6">
              <div className="space-y-3">
                <Label className="text-sm font-semibold text-gray-700">Select Your Role</Label>
                <div className="grid grid-cols-3 gap-3">
                  {roles.map((role) => {
                    const Icon = role.icon;
                    return (
                      <button
                        key={role.value}
                        type="button"
                        onClick={() => setSelectedRole(role.value)}
                        className={`group flex flex-col items-center gap-3 p-5 rounded-xl border-2 transition-all duration-300 ${
                          selectedRole === role.value
                            ? 'border-primary bg-blue-50 shadow-lg scale-105 ring-2 ring-primary/20'
                            : 'border-gray-200 hover:border-primary/40 hover:bg-gray-50 hover:scale-102'
                        }`}
                      >
                        <div className={`p-3 rounded-full bg-gradient-to-br ${role.color} shadow-md transition-transform duration-300 ${
                          selectedRole === role.value ? 'scale-110' : 'group-hover:scale-105'
                        }`}>
                          <Icon className="w-6 h-6 text-white" />
                        </div>
                        <span className="text-xs font-semibold text-gray-700">{role.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <form onSubmit={handleSubmit} className="space-y-5">
                <TabsContent value="signup" className="space-y-5 mt-0">
                  <div className="space-y-2">
                    <Label htmlFor="fullName" className="text-sm font-medium text-gray-700">
                      Full Name
                    </Label>
                    <Input
                      id="fullName"
                      type="text"
                      placeholder="Enter your full name"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      required={isSignUp}
                      className="border-gray-300 focus:border-primary focus:ring-primary"
                    />
                  </div>
                </TabsContent>

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
                  <Input
                    id="password"
                    type="password"
                    placeholder="Enter your password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    className="border-gray-300 focus:border-primary focus:ring-primary"
                  />
                </div>

                <Button
                  type="submit"
                  className="w-full bg-gradient-to-r from-primary to-primary-glow hover:from-primary/90 hover:to-primary-glow/90 text-white font-semibold py-6 shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-[1.02]"
                  disabled={loading}
                >
                  {loading ? (
                    <span className="flex items-center gap-2">
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Processing...
                    </span>
                  ) : (
                    isSignUp ? 'Create Account' : 'Sign In'
                  )}
                </Button>
              </form>
            </div>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
};

export default SignIn;
