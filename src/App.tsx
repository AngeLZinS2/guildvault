import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { lazy, Suspense, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import Login from "./pages/Login";
import Navbar from "./components/Navbar";
import { ThemeInitializer } from "./components/ThemeInitializer";
import { GameExperience } from "./components/GameExperience";
import { GameLoader } from "./components/ui/game-loader";
import { PanelPage } from "./components/motion/PanelPage";
import { GtaCinematicBackground } from "./components/GtaCinematicBackground";
import { PreviewBanner } from "./components/PreviewBanner";
import { SiteFooter } from "./components/SiteFooter";
import "./cinematic.css";

const Dashboard = lazy(() => import("./pages/Dashboard"));
const Properties = lazy(() => import("./pages/Properties"));
const Finances = lazy(() => import("./pages/Finances"));
const Members = lazy(() => import("./pages/Members"));
const Organization = lazy(() => import("./pages/Organization"));
const NotFound = lazy(() => import("./pages/NotFound"));

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
    return <div className="flex items-center justify-center h-screen"><GameLoader label="Conectando à sua crew" /></div>;
  }

  return authenticated ? (
    <>
      {children}
    </>
  ) : <Navigate to="/" />;
};

const App = () => {
  const protectedPage = (page: React.ReactNode) => (
    <ProtectedRoute>
      <div className="panel-shell-theme">
        <GtaCinematicBackground animated={false} />
        <Navbar />
        <PanelPage><PreviewBanner />{page}</PanelPage>
      </div>
    </ProtectedRoute>
  );

  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <ThemeInitializer />
        <GameExperience />
        <TooltipProvider>
          <Suspense fallback={<div className="grid min-h-screen place-items-center"><GameLoader label="Abrindo sua central" /></div>}>
          <Routes>
            <Route path="/" element={<Login />} />
            
            <Route path="/dashboard" element={
              protectedPage(<Dashboard />)
            } />
            
            <Route path="/properties" element={
              protectedPage(<Properties />)
            } />
            
            <Route path="/finances" element={
              protectedPage(<Finances />)
            } />
            
            <Route path="/members" element={
              protectedPage(<Members />)
            } />
            <Route path="/organization" element={protectedPage(<Organization />)} />
            
            <Route path="*" element={<NotFound />} />
          </Routes>
          </Suspense>
          <SiteFooter />
          
          <Toaster />
          <Sonner />
        </TooltipProvider>
      </BrowserRouter>
    </QueryClientProvider>
  );
};

export default App;
