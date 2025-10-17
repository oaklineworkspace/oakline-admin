// pages/_app.js
import '../styles/globals.css';
import '../styles/button-fixes.css';
import '../styles/responsive.css';
import '../styles/StickyFooter.css';
import Head from 'next/head';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createContext, memo } from 'react';
import { useRouter } from 'next/router';
import StickyFooter from '../components/StickyFooter';
import { AuthProvider } from '../contexts/AuthContext'; // ✅ Added AuthProvider

const queryClient = new QueryClient();

// Create context for pathname
const PathnameContext = createContext();

// Wrapper component to provide pathname
function PathnameContextProviderAdapter({ children, router }) {
  return (
    <PathnameContext.Provider value={router.pathname}>
      {children}
    </PathnameContext.Provider>
  );
}

// Memoized main App component
const App = memo(function App({ Component, pageProps }) {
  const router = useRouter();

  // Pages where sticky footer should not appear
  const hideFooterPages = ['/login', '/signup', '/reset-password', '/verify-email', '/sign-in'];
  const shouldShowFooter = !hideFooterPages.includes(router.pathname);

  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider> {/* ✅ Wrap entire app with AuthProvider */}
        <PathnameContextProviderAdapter router={router}>
          <div style={{ paddingBottom: shouldShowFooter ? '80px' : '0' }}>
            <Component {...pageProps} />
          </div>
          {shouldShowFooter && <StickyFooter />}
        </PathnameContextProviderAdapter>
      </AuthProvider>
    </QueryClientProvider>
  );
});

export default App;
