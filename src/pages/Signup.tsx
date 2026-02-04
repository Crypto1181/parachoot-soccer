import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Eye, EyeOff, Mail, Lock, User, ArrowRight, Check, Apple } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

export const SignupPage: React.FC = () => {
  const navigate = useNavigate();
  const { signUp, user } = useAuth();
  const { toast } = useToast();
  const [showPassword, setShowPassword] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [agreed, setAgreed] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Redirect if already logged in
  React.useEffect(() => {
    if (user) {
      navigate('/home', { replace: true });
    }
  }, [user, navigate]);

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email || !password || !name) {
      toast({
        title: 'Error',
        description: 'Please fill in all fields',
        variant: 'destructive',
      });
      return;
    }

    if (!agreed) {
      toast({
        title: 'Error',
        description: 'Please agree to the terms and conditions',
        variant: 'destructive',
      });
      return;
    }

    if (password.length < 6) {
      toast({
        title: 'Error',
        description: 'Password must be at least 6 characters',
        variant: 'destructive',
      });
      return;
    }

    setIsLoading(true);
    try {
      const { error } = await signUp(email, password, name);
      
      if (error) {
        toast({
          title: 'Signup Failed',
          description: error.message || 'Failed to create account',
          variant: 'destructive',
        });
      } else {
        toast({
          title: 'Success',
          description: 'Account created successfully! Please check your email to verify your account.',
        });
        navigate('/home');
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

  const passwordStrength = React.useMemo(() => {
    if (password.length === 0) return 0;
    if (password.length < 6) return 1;
    if (password.length < 10) return 2;
    return 3;
  }, [password]);

  return (
    <div className="min-h-screen stadium-bg flex flex-col items-center justify-center p-6 relative overflow-hidden">
      {/* Floating logo decorations */}
      <div className="absolute top-20 right-10 opacity-20 animate-float">
        <img 
          src="/parachoot-logo.png" 
          alt="Parachoot Soccer Logo" 
          className="w-12 h-12 object-contain blend-logo"
        />
      </div>
      <div className="absolute bottom-40 left-6 opacity-15 animate-float" style={{ animationDelay: '1.5s' }}>
        <img 
          src="/parachoot-logo.png" 
          alt="Parachoot Soccer Logo" 
          className="w-16 h-16 object-contain blend-logo"
        />
      </div>

      {/* Logo and header */}
      <div className="text-center mb-8 animate-slide-up">
        <div className="flex justify-center mb-4">
          <div className="relative">
            <img 
              src="/parachoot-logo.png" 
              alt="Parachoot Soccer Logo" 
              className="w-28 h-28 object-contain drop-shadow-2xl blend-logo"
            />
            <div className="absolute inset-0 bg-primary/30 rounded-full blur-2xl -z-10" />
          </div>
        </div>
        <h1 className="text-2xl font-bold text-foreground mb-1">Parachoot Soccer</h1>
        <p className="text-muted-foreground text-sm">Create your account</p>
      </div>

      {/* Signup form */}
      <div className="w-full max-w-sm animate-slide-up" style={{ animationDelay: '0.2s' }}>
        <div className="glass rounded-3xl p-6 border border-border/30">
          <form onSubmit={handleSignup} className="space-y-4">
            <div className="relative">
              <User className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} />
              <Input
                type="text"
                placeholder="Full name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="pl-11 h-12 bg-input border-border/50 rounded-xl text-foreground placeholder:text-muted-foreground"
              />
            </div>

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

            <div className="space-y-2">
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
              
              {/* Password strength indicator */}
              {password.length > 0 && (
                <div className="flex gap-1.5 px-1">
                  {[1, 2, 3].map((level) => (
                    <div
                      key={level}
                      className={`h-1 flex-1 rounded-full transition-colors ${
                        passwordStrength >= level
                          ? level === 1 
                            ? 'bg-destructive' 
                            : level === 2 
                              ? 'bg-yellow-500' 
                              : 'bg-primary'
                          : 'bg-border'
                      }`}
                    />
                  ))}
                </div>
              )}
            </div>

            <label className="flex items-start gap-3 cursor-pointer py-2">
              <div
                onClick={() => setAgreed(!agreed)}
                className={`w-5 h-5 rounded-md border-2 flex items-center justify-center transition-all ${
                  agreed 
                    ? 'bg-primary border-primary' 
                    : 'border-border bg-input'
                }`}
              >
                {agreed && <Check size={14} className="text-primary-foreground" />}
              </div>
              <span className="text-sm text-muted-foreground leading-tight">
                I agree to the{' '}
                <button type="button" className="text-primary hover:underline">Terms of Service</button>
                {' '}and{' '}
                <button type="button" className="text-primary hover:underline">Privacy Policy</button>
              </span>
            </label>

            <Button
              type="submit"
              disabled={isLoading || !agreed}
              className="w-full h-12 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold rounded-xl flex items-center justify-center gap-2 transition-all duration-300 hover:shadow-lg hover:shadow-primary/30 disabled:opacity-50"
            >
              {isLoading ? (
                <div className="w-5 h-5 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
              ) : (
                <>
                  Create Account
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
          Already have an account?{' '}
          <button 
            onClick={() => navigate('/login')} 
            className="text-primary font-semibold hover:underline"
          >
            Sign In
          </button>
        </p>
      </div>
    </div>
  );
};

export default SignupPage;
