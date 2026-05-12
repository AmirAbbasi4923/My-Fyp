import { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { User, Phone, Mail, Lock, Stethoscope, Briefcase } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import logoMark from '@/assets/az-logo.svg';

const specialities = [
  'Orthopedic Surgeon',
  'Cardiologist',
  'Neurologist',
  'Dermatologist',
  'Pediatrician',
  'Gynecologist',
  'Oncologist',
  'Psychiatrist',
  'General Practitioner',
  'ENT Specialist',
  'Ophthalmologist',
  'Urologist',
  'Gastroenterologist',
  'Pulmonologist',
  'Endocrinologist',
];

const DoctorSignup = () => {
  const { signUp } = useAuth();
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [speciality, setSpeciality] = useState('');
  const [experience, setExperience] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Sign up the user with role 'doctor'. 
      // The useAuth hook now handles the insertion into the 'doctors' table using the metadata.
      await signUp(email, password, name, 'doctor', phoneNumber, {
        speciality: speciality,
        experience_years: experience
      });

      // Navigation is now handled by useAuth
    } catch (error: any) {
      console.error('Signup error:', error);
      // Toast is handled by useAuth for common errors, but we can catch others here
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-blue-50 via-blue-100 to-white p-3 sm:p-4 relative overflow-x-hidden overflow-y-auto">
      <div className="absolute top-20 left-10 sm:left-20 w-48 sm:w-72 h-48 sm:h-72 bg-blue-200/30 rounded-full blur-3xl animate-pulse" />
      <div className="absolute bottom-20 right-10 sm:right-20 w-64 sm:w-96 h-64 sm:h-96 bg-primary/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />

      <Card className="w-full max-w-xl flex flex-col backdrop-blur-sm bg-white/95 shadow-2xl border-0 relative z-10 animate-fade-in my-4">
        <CardHeader className="text-center space-y-2 pt-6 pb-2 px-6">
          <CardTitle className="flex items-center justify-center gap-2 sm:gap-3">
            <img
              src={logoMark}
              alt="Asaan Zindagi logo"
              className="h-9 w-9 sm:h-10 sm:w-10 md:h-12 md:w-12 flex-shrink-0"
              loading="lazy"
              draggable={false}
            />
            <span className="text-xl sm:text-2xl md:text-3xl font-bold bg-gradient-to-r from-primary to-primary-glow bg-clip-text text-transparent tracking-wide leading-tight">
              Doctor Registration
            </span>
          </CardTitle>
          <CardDescription className="text-base">
            Join our network of healthcare professionals
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 px-6 pb-6">
          <form onSubmit={handleSubmit} className="space-y-4">

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name" className="text-sm font-medium text-gray-700 flex items-center gap-2">
                  <User className="w-4 h-4 text-primary" /> Full Name <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="name"
                  type="text"
                  placeholder="Dr. Full Name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  className="border-gray-300 focus:border-primary focus:ring-primary pl-4"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="phoneNumber" className="text-sm font-medium text-gray-700 flex items-center gap-2">
                  <Phone className="w-4 h-4 text-primary" /> Phone Number <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="phoneNumber"
                  type="tel"
                  placeholder="0300-1234567"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  required
                  className="border-gray-300 focus:border-primary focus:ring-primary pl-4"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="speciality" className="text-sm font-medium text-gray-700 flex items-center gap-2">
                  <Stethoscope className="w-4 h-4 text-primary" /> Speciality <span className="text-red-500">*</span>
                </Label>
                <Select value={speciality} onValueChange={setSpeciality} required>
                  <SelectTrigger className="border-gray-300 focus:border-primary focus:ring-primary pl-4 text-left">
                    <SelectValue placeholder="Select Speciality" />
                  </SelectTrigger>
                  <SelectContent>
                    {specialities.map((spec) => (
                      <SelectItem key={spec} value={spec}>
                        {spec}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="experience" className="text-sm font-medium text-gray-700 flex items-center gap-2">
                  <Briefcase className="w-4 h-4 text-primary" /> Experience (Years)
                </Label>
                <Input
                  id="experience"
                  type="number"
                  min="0"
                  max="100"
                  placeholder="e.g. 5"
                  value={experience}
                  onChange={(e) => setExperience(e.target.value)}
                  className="border-gray-300 focus:border-primary focus:ring-primary pl-4"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="email" className="text-sm font-medium text-gray-700 flex items-center gap-2">
                <Mail className="w-4 h-4 text-primary" /> Email <span className="text-red-500">*</span>
              </Label>
              <Input
                id="email"
                type="email"
                placeholder="doctor@hospital.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
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
                placeholder="Create a strong password"
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
                  Registering...
                </span>
              ) : (
                'Register as Doctor'
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

export default DoctorSignup;

