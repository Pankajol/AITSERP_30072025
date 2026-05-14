import { useState, useEffect, useContext, createContext } from 'react';
import { useRouter } from 'next/navigation';
import { jwtDecode } from 'jwt-decode';

// Create Auth Context
const AuthContext = createContext({});

// Auth Provider Component
export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [permissions, setPermissions] = useState([]);
  const router = useRouter();

  // Load user from token
  useEffect(() => {
    loadUserFromToken();
  }, []);

  const loadUserFromToken = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        setLoading(false);
        return;
      }

      // Decode token to check expiry
      try {
        const decoded = jwtDecode(token);
        if (decoded.exp * 1000 < Date.now()) {
          localStorage.removeItem('token');
          setLoading(false);
          return;
        }
      } catch (error) {
        localStorage.removeItem('token');
        setLoading(false);
        return;
      }

      // Fetch user profile with permissions
      const response = await fetch('/api/auth/profile', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const userData = await response.json();
        setUser(userData.user);
        setPermissions(userData.permissions || []);
      } else {
        localStorage.removeItem('token');
      }
    } catch (error) {
      console.error('Error loading user:', error);
      localStorage.removeItem('token');
    } finally {
      setLoading(false);
    }
  };

  const login = async (email, password) => {
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ email, password })
      });

      const data = await response.json();

      if (response.ok) {
        localStorage.setItem('token', data.token);
        setUser(data.user);
        setPermissions(data.permissions || []);
        return { success: true };
      } else {
        return { success: false, error: data.message || 'Login failed' };
      }
    } catch (error) {
      console.error('Login error:', error);
      return { success: false, error: 'Network error' };
    }
  };

  const logout = () => {
    localStorage.removeItem('token');
    setUser(null);
    setPermissions([]);
    router.push('/');
  };

  const hasPermission = (module, action) => {
    if (!permissions || permissions.length === 0) return false;
    
    const modulePermission = permissions.find(p => p.module === module);
    return modulePermission ? modulePermission.actions.includes(action) : false;
  };

  const hasRole = (roleName) => {
    return user?.role?.name === roleName;
  };

  const hasAnyRole = (...roleNames) => {
    return roleNames.includes(user?.role?.name);
  };

  const value = {
    user,
    loading,
    permissions,
    login,
    logout,
    hasPermission,
    hasRole,
    hasAnyRole,
    isAuthenticated: !!user,
    isAdmin: hasRole('Super Admin') || hasRole('Admin'),
    refreshUser: loadUserFromToken
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

// Custom hook to use auth context
export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

// Hook for permission checking
export function usePermission(module, action) {
  const { hasPermission } = useAuth();
  return hasPermission(module, action);
}

// Hook for role checking
export function useRole(roleName) {
  const { hasRole } = useAuth();
  return hasRole(roleName);
}

// Component for conditional rendering based on permissions
export function PermissionGate({ module, action, children, fallback = null }) {
  const hasPermission = usePermission(module, action);
  
  if (!hasPermission) {
    return fallback;
  }
  
  return children;
}

// Component for conditional rendering based on roles
export function RoleGate({ roles, children, fallback = null }) {
  const { hasAnyRole } = useAuth();
  const hasRole = Array.isArray(roles) ? hasAnyRole(...roles) : hasAnyRole(roles);
  
  if (!hasRole) {
    return fallback;
  }
  
  return children;
}

// Higher-order component for protecting pages
export function withAuth(Component, requiredPermission = null, requiredRole = null) {
  return function AuthenticatedComponent(props) {
    const { user, loading, hasPermission, hasRole } = useAuth();
    const router = useRouter();

    useEffect(() => {
      if (!loading) {
        if (!user) {
          router.push('/login');
          return;
        }

        if (requiredPermission) {
          const [module, action] = requiredPermission;
          if (!hasPermission(module, action)) {
            router.push('/unauthorized');
            return;
          }
        }

        if (requiredRole && !hasRole(requiredRole)) {
          router.push('/unauthorized');
          return;
        }
      }
    }, [user, loading, router]);

    if (loading) {
      return (
        <div className="flex justify-center items-center h-screen">
          <div className="text-xl">Loading...</div>
        </div>
      );
    }

    if (!user) {
      return null; // Will redirect to login
    }

    if (requiredPermission) {
      const [module, action] = requiredPermission;
      if (!hasPermission(module, action)) {
        return null; // Will redirect to unauthorized
      }
    }

    if (requiredRole && !hasRole(requiredRole)) {
      return null; // Will redirect to unauthorized
    }

    return <Component {...props} />;
  };
}
