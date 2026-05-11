import { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { User, Phone, Activity, Mail, Lock } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import logoMark from '@/assets/az-logo.svg';

const SignUp = () => {
  const { signUp } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [patientType, setPatientType] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      // Pass phone and patientType (as metadata) to signUp
      await signUp(email, password, fullName, 'patient', phone, { patient_type: patientType });
      // signUp will handle toast and redirect
    } catch (error) {
      // Error handling is done in useAuth
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-blue-50 via-blue-100 to-white p-4 relative overflow-hidden">
      <div className="absolute top-20 left-20 w-72 h-72 bg-blue-200/30 rounded-full blur-3xl animate-pulse" />
      <div className="absolute bottom-20 right-20 w-96 h-96 bg-primary/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />

      <Card className="w-full max-w-md flex flex-col backdrop-blur-sm bg-white/95 shadow-2xl border-0 relative z-10 animate-fade-in">
        <CardHeader className="text-center space-y-4 pt-6 pb-2 px-6">
          <CardTitle className="flex items-center justify-center gap-3">
            <img
              src={logoMark}
              alt="Asaan Zindagi logo"
              className="h-12 w-12 md:h-16 md:w-16"
              loading="lazy"
              draggable={false}
            />
            <span className="text-3xl font-bold bg-gradient-to-r from-primary to-primary-glow bg-clip-text text-transparent tracking-wide leading-tight">
              Patient Registration
            </span>
          </CardTitle>
          <CardDescription className="text-base">
            Create your patient account to book appointments
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6 px-6 pb-6">
          <form id="signupForm" onSubmit={handleSubmit} className="space-y-5">

            <div className="space-y-2">
              <Label htmlFor="fullName" className="text-sm font-medium text-gray-700 flex items-center gap-2">
                <User className="w-4 h-4 text-primary" /> Full Name <span className="text-red-500">*</span>
              </Label>
              <Input
                id="fullName"
                type="text"
                placeholder="Enter your full name"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                required
                className="border-gray-300 focus:border-primary focus:ring-primary pl-4"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email" className="text-sm font-medium text-gray-700 flex items-center gap-2">
                <Mail className="w-4 h-4 text-primary" /> Email <span className="text-red-500">*</span>
              </Label>
              <Input
                id="email"
                type="email"
                placeholder="Enter your email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="border-gray-300 focus:border-primary focus:ring-primary pl-4"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone" className="text-sm font-medium text-gray-700 flex items-center gap-2">
                <Phone className="w-4 h-4 text-primary" /> Phone Number <span className="text-red-500">*</span>
              </Label>
              <Input
                id="phone"
                type="tel"
                placeholder="Enter your phone number"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                required
                className="border-gray-300 focus:border-primary focus:ring-primary pl-4"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="patientType" className="text-sm font-medium text-gray-700 flex items-center gap-2">
                <Activity className="w-4 h-4 text-primary" /> Patient Type / Condition
              </Label>
              <Input
                id="patientType"
                type="text"
                placeholder="e.g. Regular Checkup, Diabetes, etc."
                value={patientType}
                onChange={(e) => setPatientType(e.target.value)}
                className="border-gray-300 focus:border-primary focus:ring-primary pl-4"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password" className="text-sm font-medium text-gray-700 flex items-center gap-2">
                <Lock className="w-4 h-4 text-primary" /> Password <span className="text-red-500">*</span>
              </Label>
              <Input
                id="password"
                type="password"
                placeholder="Create a password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
                className="border-gray-300 focus:border-primary focus:ring-primary pl-4"
              />
            </div>

            <Button
              type="submit"
              className="w-full bg-gradient-to-r from-primary to-primary-glow hover:from-primary/90 hover:to-primary-glow/90 text-white font-semibold py-3.5 shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-[1.02] mt-2"
              disabled={loading}
            >
              {loading ? (
                <span className="flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Creating Account...
                </span>
              ) : (
                'Register'
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
      <div className="mt-4 text-center text-sm text-gray-600">
        Already have an account?{' '}
        <button onClick={() => navigate('/signin')} className="text-primary font-semibold underline-offset-2 hover:underline">
          Sign in
        </button>
      </div>
    </div>
  );
};

export default SignUp;


