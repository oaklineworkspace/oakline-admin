// pages/_app.js
import '../styles/globals.css';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createContext } from 'react';
import { useRouter } from 'next/router';

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

// Main App component
function App({ Component, pageProps }) {
  const router = useRouter();

  return (
    <QueryClientProvider client={queryClient}>
      <PathnameContextProviderAdapter router={router}>
        <Component {...pageProps} />
      </PathnameContextProviderAdapter>
    </QueryClientProvider>
  );
}

export default App;