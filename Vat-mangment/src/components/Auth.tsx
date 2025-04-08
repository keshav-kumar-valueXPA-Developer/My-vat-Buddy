import React, { useState } from 'react';
import { supabase } from '../utils/supabase';
import { FileSpreadsheet, Mail, Lock, UserPlus, LogIn, AlertTriangle } from 'lucide-react';

interface AuthProps {
  onSignIn: () => void;
}

export function Auth({ onSignIn }: AuthProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSignUp, setIsSignUp] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [isResetPassword, setIsResetPassword] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supabase) {
      setError('Authentication service is not available');
      return;
    }

    setLoading(true);
    setError(null);
    setMessage(null);

    try {
      if (isResetPassword) {
        const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: `${window.location.origin}/reset-password`,
        });

        if (resetError) throw resetError;
        setMessage('Password reset instructions have been sent to your email.');
        setIsResetPassword(false);
      } else if (isSignUp) {
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email,
          password: 'dummy-password'
        });

        if (!signInError || (signInError && !signInError.message.includes('Invalid login credentials'))) {
          setError('This email is already registered. Please sign in instead.');
          setLoading(false);
          return;
        }

        const { data, error: signUpError } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: window.location.origin
          }
        });

        if (signUpError) throw signUpError;

        if (data.user) {
          setMessage('Account created successfully! You can now sign in.');
          setIsSignUp(false);
          setEmail('');
          setPassword('');
        }
      } else {
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email,
          password
        });

        if (signInError) {
          if (signInError.message.includes('Invalid login credentials')) {
            const { error: checkError } = await supabase.auth.signInWithOtp({
              email,
              options: { shouldCreateUser: false }
            });

            if (checkError && checkError.message.includes('Email not found')) {
              setError('No account found with this email. Please sign up first.');
            } else {
              setError('Invalid password. Please try again.');
            }
          } else {
            throw signInError;
          }
          return;
        }
        onSignIn();
      }
    } catch (err) {
      console.error('Auth error:', err);
      setError(err instanceof Error ? err.message : 'An error occurred during authentication');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#6B8F71] flex items-center">
      {/* Left side - Product Info */}
      <div className="flex-1 flex flex-col justify-center px-16">
        <div className="max-w-xl">
          <div className="flex items-center gap-3 mb-8">
            <FileSpreadsheet className="h-12 w-12 text-white" />
            <h1 className="text-4xl font-bold text-white">MyVATbuddy</h1>
          </div>
          
          <h2 className="text-3xl font-bold text-white mb-6">
            Simplify Your UAE VAT Management
          </h2>
          
          <div className="space-y-6 text-lg text-white/90">
            <p>
              Streamline your VAT calculations, reporting, and compliance with our comprehensive solution designed specifically for UAE businesses.
            </p>
            <div className="grid grid-cols-2 gap-6">
              <div className="flex items-start gap-2">
                <div className="mt-1 w-5 h-5 rounded-full bg-white/20 flex items-center justify-center text-white text-sm">✓</div>
                <p>Automated VAT Calculations</p>
              </div>
              <div className="flex items-start gap-2">
                <div className="mt-1 w-5 h-5 rounded-full bg-white/20 flex items-center justify-center text-white text-sm">✓</div>
                <p>Real-time Reports</p>
              </div>
              <div className="flex items-start gap-2">
                <div className="mt-1 w-5 h-5 rounded-full bg-white/20 flex items-center justify-center text-white text-sm">✓</div>
                <p>Document Management</p>
              </div>
              <div className="flex items-start gap-2">
                <div className="mt-1 w-5 h-5 rounded-full bg-white/20 flex items-center justify-center text-white text-sm">✓</div>
                <p>Compliance Tracking</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Right side - Auth Form */}
      <div className="w-[480px] mr-16">
        <div className="bg-white rounded-lg shadow-xl p-10">
          <h2 className="text-2xl font-bold text-center mb-8 text-gray-800">
            {isResetPassword ? 'Reset Password' : isSignUp ? 'Create Account' : 'Welcome back!'}
          </h2>
          
          {error && (
            <div className="bg-red-50 text-red-600 p-4 rounded-lg mb-6 flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 flex-shrink-0" />
              <p>{error}</p>
            </div>
          )}

          {message && (
            <div className="bg-green-50 text-green-600 p-4 rounded-lg mb-6 flex items-center gap-2">
              <span className="flex-shrink-0">✓</span>
              <p>{message}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Email Address
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="pl-10 block w-full rounded-lg border-gray-300 shadow-sm focus:border-[#6B8F71] focus:ring-[#6B8F71]"
                  placeholder="Enter your email"
                  disabled={loading}
                />
              </div>
            </div>

            {!isResetPassword && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Password
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="pl-10 block w-full rounded-lg border-gray-300 shadow-sm focus:border-[#6B8F71] focus:ring-[#6B8F71]"
                    placeholder={isSignUp ? 'Create a password' : 'Enter your password'}
                    minLength={6}
                    disabled={loading}
                  />
                </div>
                {isSignUp && (
                  <p className="mt-1 text-xs text-gray-500">
                    Password must be at least 6 characters long
                  </p>
                )}
              </div>
            )}

            <button
              type="submit"
              disabled={loading || !email || (!isResetPassword && !password)}
              className="w-full bg-[#6B8F71] text-white py-3 px-4 rounded-lg hover:bg-[#6B8F71]/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
            >
              {loading ? (
                <div className="flex items-center gap-2">
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                  <span>
                    {isResetPassword ? 'Sending Reset Link...' : 
                     isSignUp ? 'Creating Account...' : 
                     'Signing In...'}
                  </span>
                </div>
              ) : (
                <>
                  {isResetPassword ? (
                    'Send Reset Link'
                  ) : isSignUp ? (
                    <>
                      <UserPlus className="h-5 w-5" />
                      <span>Create Account</span>
                    </>
                  ) : (
                    <>
                      <LogIn className="h-5 w-5" />
                      <span>Sign In</span>
                    </>
                  )}
                </>
              )}
            </button>
          </form>

          <div className="mt-6 space-y-4">
            {!isResetPassword && (
              <button
                onClick={() => {
                  setIsSignUp(!isSignUp);
                  setError(null);
                  setMessage(null);
                  setEmail('');
                  setPassword('');
                }}
                className="w-full text-center text-sm text-gray-600 hover:text-gray-900 flex items-center justify-center gap-2"
                disabled={loading}
              >
                {isSignUp ? (
                  <>
                    <LogIn className="h-4 w-4" />
                    Already have an account? Sign in
                  </>
                ) : (
                  <>
                    <UserPlus className="h-4 w-4" />
                    Don't have an account? Sign up
                  </>
                )}
              </button>
            )}

            {!isSignUp && !isResetPassword && (
              <button
                onClick={() => {
                  setIsResetPassword(true);
                  setError(null);
                  setMessage(null);
                  setPassword('');
                }}
                className="w-full text-center text-sm text-gray-500 hover:text-gray-700"
                disabled={loading}
              >
                Forgot password?
              </button>
            )}

            {isResetPassword && (
              <button
                onClick={() => {
                  setIsResetPassword(false);
                  setError(null);
                  setMessage(null);
                }}
                className="w-full text-center text-sm text-gray-500 hover:text-gray-700"
                disabled={loading}
              >
                Back to sign in
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}