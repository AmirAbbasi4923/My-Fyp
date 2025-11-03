import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Mail, LogOut, UserCircle, Stethoscope, Shield } from 'lucide-react';
import { Navigate } from 'react-router-dom';

const Home = () => {
  const { user, userRole, signOut, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto" />
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/signin" replace />;
  }

  const getRoleIcon = () => {
    switch (userRole) {
      case 'doctor':
        return <Stethoscope className="w-12 h-12 text-secondary" />;
      case 'admin':
        return <Shield className="w-12 h-12 text-purple-500" />;
      default:
        return <UserCircle className="w-12 h-12 text-primary" />;
    }
  };

  const getRoleDisplay = () => {
    if (!userRole) return 'User';
    return userRole.charAt(0).toUpperCase() + userRole.slice(1);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-blue-100 to-white relative overflow-hidden">
      {/* Decorative background elements */}
      <div className="absolute top-20 right-20 w-96 h-96 bg-blue-200/20 rounded-full blur-3xl animate-pulse" />
      <div className="absolute bottom-20 left-20 w-72 h-72 bg-primary/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1.5s' }} />
      
      {/* Header */}
      <header className="border-b border-gray-200/50 bg-white/80 backdrop-blur-md sticky top-0 z-10 shadow-sm">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold text-blue-700 tracking-wide">
            Asaan Zindagi
          </h1>
          <Button
            variant="outline"
            size="sm"
            onClick={signOut}
            className="gap-2 border-red-500 text-red-600 hover:bg-red-50 transition-all duration-300 hover:scale-105"
          >
            <LogOut className="w-4 h-4" />
            Sign Out
          </Button>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-12 relative z-10">
        <div className="max-w-4xl mx-auto space-y-8 animate-fade-in">
          {/* Welcome Card */}
          <Card className="backdrop-blur-sm bg-white/95 shadow-2xl border-0">
            <CardHeader className="text-center space-y-6 pb-6">
              <div className="mx-auto w-fit p-5 bg-gradient-to-br from-blue-100 to-blue-50 rounded-full shadow-lg">
                {getRoleIcon()}
              </div>
              <div>
                <CardTitle className="text-4xl mb-3 text-blue-700 font-bold tracking-wide">
                  Welcome, {getRoleDisplay()}!
                </CardTitle>
                <CardDescription className="text-base text-gray-600">
                  {user.email}
                </CardDescription>
              </div>
            </CardHeader>
            <CardContent className="space-y-8">
              <div className="bg-gradient-to-br from-blue-50 to-white rounded-xl p-8 space-y-4 border border-blue-100 shadow-sm">
                <h3 className="font-bold text-xl text-blue-700">
                  About Asaan Zindagi
                </h3>
                <p className="text-gray-600 leading-relaxed text-base">
                  Smart Healthcare Queue and Appointment Optimization System designed to help patients,
                  doctors, and hospitals manage appointments efficiently, reduce waiting times, and improve
                  healthcare accessibility.
                </p>
              </div>

              <div className="flex justify-center pt-4">
                <Button
                  size="lg"
                  className="gap-2 bg-gradient-to-r from-primary to-primary-glow hover:from-primary/90 hover:to-primary-glow/90 text-white font-semibold px-8 py-6 shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105"
                  asChild
                >
                  <a href="mailto:asaanzindagi@gmail.com">
                    <Mail className="w-5 h-5" />
                    Contact Us
                  </a>
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Role-specific info */}
          <Card className="backdrop-blur-sm bg-white/95 shadow-xl border-0">
            <CardHeader>
              <CardTitle className="text-2xl text-blue-700 font-bold">Your Dashboard</CardTitle>
              <CardDescription className="text-base text-gray-600">
                {userRole === 'patient' && 'Manage your appointments and health records'}
                {userRole === 'doctor' && 'View your schedule and patient queue'}
                {userRole === 'admin' && 'Manage system settings and users'}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-12 text-gray-500">
                <div className="bg-gradient-to-br from-blue-50 to-white rounded-lg p-8 inline-block">
                  <p className="text-lg font-medium">Dashboard features coming soon...</p>
                  <p className="text-sm mt-2">This is part of the FYP-I deliverable</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
};

export default Home;
