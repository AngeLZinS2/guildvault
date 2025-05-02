
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import Properties from "./pages/Properties";
import Finances from "./pages/Finances";
import Members from "./pages/Members";
import Minigames from "./pages/Minigames";
import NotFound from "./pages/NotFound";
import Navbar from "./components/Navbar";
import { AnimatedBackground } from "./components/AnimatedBackground";

// Create a client
const queryClient = new QueryClient();

// Protected route component
const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const [loading, setLoading] = useState(true);
  const [authenticated, setAuthenticated] = useState(false);

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setAuthenticated(!!session);
      setLoading(false);
    };

    // Set up listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setAuthenticated(!!session);
      setLoading(false);
    });

    checkAuth();

    // Cleanup
    return () => {
      subscription.unsubscribe();
    };
  }, []);

  if (loading) {
    return <div className="flex items-center justify-center h-screen">Carregando...</div>;
  }

  return authenticated ? (
    <>
      <AnimatedBackground />
      {children}
    </>
  ) : <Navigate to="/" />;
};

const App = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <TooltipProvider>
          <Routes>
            <Route path="/" element={<Login />} />
            
            <Route path="/dashboard" element={
              <ProtectedRoute>
                <Navbar />
                <div className="pt-16">
                  <Dashboard />
                </div>
              </ProtectedRoute>
            } />
            
            <Route path="/properties" element={
              <ProtectedRoute>
                <Navbar />
                <div className="pt-16">
                  <Properties />
                </div>
              </ProtectedRoute>
            } />
            
            <Route path="/finances" element={
              <ProtectedRoute>
                <Navbar />
                <div className="pt-16">
                  <Finances />
                </div>
              </ProtectedRoute>
            } />
            
            <Route path="/members" element={
              <ProtectedRoute>
                <Navbar />
                <div className="pt-16">
                  <Members />
                </div>
              </ProtectedRoute>
            } />
            
            <Route path="/minigames" element={
              <ProtectedRoute>
                <Navbar />
                <div className="pt-16">
                  <Minigames />
                </div>
              </ProtectedRoute>
            } />
            
            <Route path="*" element={<NotFound />} />
          </Routes>
          
          <Toaster />
          <Sonner />
        </TooltipProvider>
      </BrowserRouter>
    </QueryClientProvider>
  );
};

export default App;
