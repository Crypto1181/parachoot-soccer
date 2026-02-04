import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Eye, EyeOff, Mail, Lock, ArrowRight, Apple } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

export const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const { signIn, user } = useAuth();
  const { toast } = useToast();
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Redirect if already logged in
  React.useEffect(() => {
    if (user) {
      navigate('/home', { replace: true });
    }
  }, [user, navigate]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email || !password) {
      toast({
        title: 'Error',
        description: 'Please fill in all fields',
        variant: 'destructive',
      });
      return;
    }

    setIsLoading(true);
    try {
      const { error } = await signIn(email, password);
      
      if (error) {
        toast({
          title: 'Login Failed',
          description: error.message || 'Invalid email or password',
          variant: 'destructive',
        });
      } else {
        toast({
          title: 'Success',
          description: 'Logged in successfully',
        });
        navigate('/home', { replace: true });
      }
    } catch (err) {
      toast({
        title: 'Error',
        description: 'An unexpected error occurred',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen stadium-bg flex flex-col items-center justify-center p-6 relative overflow-hidden">
      {/* Floating logo decorations */}
      <div className="absolute top-10 left-10 opacity-20 animate-float">
        <img 
          src="/parachoot-logo.png" 
          alt="Parachoot Soccer Logo" 
          className="w-16 h-16 object-contain blend-logo"
        />
      </div>
      <div className="absolute bottom-32 right-8 opacity-20 animate-float" style={{ animationDelay: '1s' }}>
        <img 
          src="/parachoot-logo.png" 
          alt="Parachoot Soccer Logo" 
          className="w-10 h-10 object-contain blend-logo"
        />
      </div>
      <div className="absolute top-1/4 right-12 opacity-10 animate-float" style={{ animationDelay: '2s' }}>
        <img 
          src="/parachoot-logo.png" 
          alt="Parachoot Soccer Logo" 
          className="w-20 h-20 object-contain blend-logo"
        />
      </div>

      {/* Logo and header */}
      <div className="text-center mb-10 animate-slide-up">
        <div className="flex justify-center mb-4">
          <div className="relative">
            <img 
              src="/parachoot-logo.png" 
              alt="Parachoot Soccer Logo" 
              className="w-32 h-32 object-contain drop-shadow-2xl blend-logo"
            />
            <div className="absolute inset-0 bg-primary/30 rounded-full blur-2xl -z-10" />
          </div>
        </div>
        <h1 className="text-3xl font-bold text-foreground mb-2">Parachoot Soccer</h1>
        <p className="text-muted-foreground text-sm">Never Miss a Kick!</p>
      </div>

      {/* Login form */}
      <div className="w-full max-w-sm animate-slide-up" style={{ animationDelay: '0.2s' }}>
        <div className="glass rounded-3xl p-6 border border-border/30">
          <h2 className="text-xl font-semibold text-foreground mb-6 text-center">Welcome Back</h2>
          
          <form onSubmit={handleLogin} className="space-y-4">
            <div className="relative">
              <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} />
              <Input
                type="email"
                placeholder="Email address"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="pl-11 h-12 bg-input border-border/50 rounded-xl text-foreground placeholder:text-muted-foreground"
              />
            </div>

            <div className="relative">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} />
              <Input
                type={showPassword ? 'text' : 'password'}
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="pl-11 pr-11 h-12 bg-input border-border/50 rounded-xl text-foreground placeholder:text-muted-foreground"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>

            <div className="flex justify-end">
              <button type="button" className="text-primary text-sm hover:underline">
                Forgot password?
              </button>
            </div>

            <Button
              type="submit"
              disabled={isLoading}
              className="w-full h-12 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold rounded-xl flex items-center justify-center gap-2 transition-all duration-300 hover:shadow-lg hover:shadow-primary/30"
            >
              {isLoading ? (
                <div className="w-5 h-5 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
              ) : (
                <>
                  Sign In
                  <ArrowRight size={18} />
                </>
              )}
            </Button>
          </form>

          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-border/50" />
            </div>
            <div className="relative flex justify-center text-xs">
              <span className="px-3 bg-transparent text-muted-foreground">or continue with</span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Button variant="outline" className="h-11 bg-secondary border-border/50 hover:bg-secondary/80 rounded-xl flex items-center justify-center">
              <Apple size={20} className="text-foreground" />
            </Button>
            <Button variant="outline" className="h-11 bg-secondary border-border/50 hover:bg-secondary/80 rounded-xl flex items-center justify-center">
              <Mail size={20} className="text-foreground" />
            </Button>
          </div>
        </div>

        <p className="text-center text-muted-foreground text-sm mt-6">
          Don't have an account?{' '}
          <button 
            onClick={() => navigate('/signup')} 
            className="text-primary font-semibold hover:underline"
          >
            Sign Up
          </button>
        </p>
      </div>
    </div>
  );
};

export default LoginPage;
