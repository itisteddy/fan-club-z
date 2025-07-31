import React, { useState } from 'react';

export const RegisterPage: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // TODO: Implement registration logic
    console.log('Registration attempt:', { email, password, username });
  };

  return (
    <div className="bg-white rounded-lg shadow-lg p-6">
      <h2 className="text-2xl font-semibold text-center mb-6">Join Fan Club Z</h2>
      
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-foreground mb-2">
            Username
          </label>
          <input
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            className="w-full px-3 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
            placeholder="Choose a username"
            required
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium text-foreground mb-2">
            Email
          </label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full px-3 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
            placeholder="Enter your email"
            required
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium text-foreground mb-2">
            Password
          </label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full px-3 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
            placeholder="Create a password"
            required
          />
        </div>
        
        <button
          type="submit"
          className="w-full bg-primary text-white py-2 px-4 rounded-lg font-semibold hover:bg-primary/90 transition-colors"
        >
          Create Account
        </button>
      </form>
      
      <div className="mt-6 text-center">
        <p className="text-muted-foreground">
          Already have an account?{' '}
          <a href="/" className="text-primary hover:underline">
            Sign in
          </a>
        </p>
      </div>
    </div>
  );
};