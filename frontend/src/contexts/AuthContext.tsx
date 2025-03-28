// src/contexts/AuthContext.tsx
'use client'; // This context needs to be a client component

import React, {
  createContext,
  useState,
  useEffect,
  ReactNode,
  useCallback,
  useContext, // Import useContext
} from 'react';
import { useRouter } from 'next/navigation';
import api, { setupInterceptors } from '@/lib/api'; // Import setupInterceptors

// Define the User structure
interface User {
  id: string;
  username: string;
}

// Define the shape of the context value
export interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (user: User) => void; // Accepts user object
  logout: () => void;
  isAuthenticated: boolean;
}

// Create the context
const AuthContext = createContext<AuthContextType | null>(null);

// Create the provider component
export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true); // Start loading until check is complete
  const router = useRouter();

  // --- Logout Function ---
  const logout = useCallback(async () => {
    console.log('AuthContext: Logging out');
    try {
      // Call the backend endpoint to clear the HttpOnly cookie
      await api.post('/auth/logout');
      console.log('AuthContext: Logout API call successful.');
    } catch (err) {
      console.error('AuthContext: Logout API call failed:', err);
      // Proceed with client-side cleanup even if API fails
    } finally {
      // Clear client-side state
      setUser(null);
      localStorage.removeItem('authUser'); // Clear user from localStorage
      console.log('AuthContext: Client state cleared. Redirecting to /login');
      // Redirect to login page after cleanup
      router.push('/login');
    }
  }, [router]); // Dependency: router for navigation

  // --- Login Function ---
  // Called by AuthForm after successful backend login (cookie is already set by backend)
  const login = (newUser: User) => {
    console.log('AuthContext: login function CALLED. User:', newUser.username);
    try {
      // Update client-side user state
      setUser(newUser);
      console.log('AuthContext: User state updated.');

      // Store user details in localStorage if needed for quick UI updates
      // (Note: This is NOT used for authentication checks anymore)
      localStorage.setItem('authUser', JSON.stringify(newUser));
      console.log('AuthContext: localStorage updated (user only).');

      console.log('AuthContext: API auth handled by HttpOnly cookie.');
      console.log('AuthContext: Attempting redirect to /dashboard...');
      // Redirect to the dashboard
      router.push('/dashboard');
      console.log("AuthContext: router.push('/dashboard') EXECUTED.");
    } catch (error) {
      console.error('AuthContext: Error within login function execution:', error);
    }
  };

  // --- Initial Authentication Check (on mount) ---
  useEffect(() => {
    console.log('AuthContext: Checking auth status on mount...');
    setLoading(true);

    // Make a request to a protected backend endpoint (/api/auth/me)
    // This request will automatically include the HttpOnly cookie.
    // If the cookie is valid, the backend returns the user data.
    const checkUserSession = async () => {
      try {
        console.log('AuthContext: Making /api/auth/me request...');
        const response = await api.get('/auth/me');

        if (response.data.status === 'success' && response.data.data?.user) {
          // If successful, update the user state
          console.log('AuthContext: Session valid, user found:', response.data.data.user.username);
          setUser(response.data.data.user);
          // Optionally sync localStorage
          localStorage.setItem('authUser', JSON.stringify(response.data.data.user));
        } else {
          // If API indicates no user or error status
          console.log('AuthContext: No valid session found via /me endpoint.');
          setUser(null);
          localStorage.removeItem('authUser');
        }
      } catch (error: any) {
        // If the request fails (e.g., 401 Unauthorized), clear user state
        console.log('AuthContext: /me request failed or returned unauthorized. Status:', error?.response?.status);
        setUser(null);
        localStorage.removeItem('authUser');
      } finally {
        // Mark loading as complete
        setLoading(false);
        console.log('AuthContext: Initial auth check complete.');
      }
    };

    checkUserSession();
  }, []); // Empty dependency array ensures this runs only once on mount

  // --- Setup API Interceptors ---
  useEffect(() => {
    // Setup the response interceptor to handle 401 errors globally
    // If any API request returns 401, trigger the client-side logout
    setupInterceptors({ user, loading, login: () => {}, logout, isAuthenticated: !!user });
    // We pass a dummy login function as the interceptor only needs logout.
    // isAuthenticated is derived from user state.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [logout, user, loading]); // Re-setup if these change

  // --- Determine Authentication Status ---
  // User is considered authenticated if the user object is not null
  const isAuthenticated = !!user;

  // Provide the context value to children
  return (
    <AuthContext.Provider value={{ user, loading, login, logout, isAuthenticated }}>
      {children}
    </AuthContext.Provider>
  );
};

// Export the context itself if needed (less common)
 export default AuthContext;