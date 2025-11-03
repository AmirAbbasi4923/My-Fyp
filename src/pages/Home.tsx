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
    <div className="min-h-screen bg-gradient-to-br from-accent via-background to-muted">
      {/* Header */}
      <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
            Asaan Zindagi
          </h1>
          <Button
            variant="outline"
            size="sm"
            onClick={signOut}
            className="gap-2"
          >
            <LogOut className="w-4 h-4" />
            Sign Out
          </Button>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-12">
        <div className="max-w-4xl mx-auto space-y-8">
          {/* Welcome Card */}
          <Card className="shadow-strong">
            <CardHeader className="text-center space-y-4">
              <div className="mx-auto w-fit p-4 bg-gradient-to-br from-primary/10 to-secondary/10 rounded-full">
                {getRoleIcon()}
              </div>
              <div>
                <CardTitle className="text-3xl mb-2">
                  Welcome, {getRoleDisplay()}!
                </CardTitle>
                <CardDescription className="text-base">
                  {user.email}
                </CardDescription>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="bg-accent/50 rounded-lg p-6 space-y-4">
                <h3 className="font-semibold text-lg text-foreground">
                  About Asaan Zindagi
                </h3>
                <p className="text-muted-foreground leading-relaxed">
                  Smart Healthcare Queue and Appointment Optimization System designed to help patients,
                  doctors, and hospitals manage appointments efficiently, reduce waiting times, and improve
                  healthcare accessibility.
                </p>
              </div>

              <div className="flex justify-center pt-4">
                <Button
                  size="lg"
                  className="gap-2 bg-gradient-to-r from-primary to-primary-glow hover:opacity-90"
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
          <Card className="shadow-medium">
            <CardHeader>
              <CardTitle>Your Dashboard</CardTitle>
              <CardDescription>
                {userRole === 'patient' && 'Manage your appointments and health records'}
                {userRole === 'doctor' && 'View your schedule and patient queue'}
                {userRole === 'admin' && 'Manage system settings and users'}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8 text-muted-foreground">
                <p>Dashboard features coming soon...</p>
                <p className="text-sm mt-2">This is part of the FYP-I deliverable</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
};

export default Home;
