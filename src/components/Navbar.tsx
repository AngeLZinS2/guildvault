
import React from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { LogOut, Menu, X, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

type NavItem = {
  name: string;
  path: string;
  icon: React.ReactNode;
  requiresAuth: boolean;
};

const navItems: NavItem[] = [
  { name: "Dashboard", path: "/dashboard", icon: <Shield className="w-5 h-5" />, requiresAuth: true },
  { name: "Propriedades", path: "/properties", icon: <Shield className="w-5 h-5" />, requiresAuth: true },
  { name: "Finanças", path: "/finances", icon: <Shield className="w-5 h-5" />, requiresAuth: true },
  { name: "Membros", path: "/members", icon: <Shield className="w-5 h-5" />, requiresAuth: true },
];

export default function Navbar() {
  const navigate = useNavigate();
  const location = useLocation();
  const [isOpen, setIsOpen] = React.useState(false);

  const handleLogout = async () => {
    try {
      // Using signOut instead of signout (which was causing the error)
      const { error } = await supabase.auth.signOut();
      
      if (error) {
        throw error;
      }
      
      toast({
        title: "Logout realizado com sucesso",
        description: "Você foi desconectado do sistema"
      });
      
      navigate("/");
    } catch (error: any) {
      toast({
        title: "Erro ao fazer logout",
        description: error.message,
        variant: "destructive"
      });
    }
  };

  // Check if we're on the login page
  const isLoginPage = location.pathname === "/";

  if (isLoginPage) return null;

  return (
    <div className="fixed top-0 left-0 w-full z-50 bg-guild-background/80 backdrop-blur-md border-b border-guild-primary/20">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center">
            <div className="text-guild-primary font-bold text-2xl flex items-center">
              <Shield className="h-6 w-6 mr-2" />
              <span>GuildVault</span>
            </div>
          </div>
          
          <div className="hidden md:block">
            <div className="flex items-center space-x-4">
              {navItems.map((item) => (
                <Button
                  key={item.name}
                  variant="ghost"
                  onClick={() => navigate(item.path)}
                  className={cn(
                    "text-gray-300 hover:text-white",
                    location.pathname === item.path && "text-guild-primary border-b-2 border-guild-primary"
                  )}
                >
                  {item.name}
                </Button>
              ))}
              <Button 
                variant="ghost"
                onClick={handleLogout}
                className="text-gray-300 hover:text-white ml-4"
              >
                <LogOut className="h-5 w-5 mr-1" /> Sair
              </Button>
            </div>
          </div>

          <div className="md:hidden">
            <Button variant="ghost" onClick={() => setIsOpen(!isOpen)}>
              {isOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </Button>
          </div>
        </div>
      </div>

      {/* Mobile menu */}
      {isOpen && (
        <div className="md:hidden bg-guild-surface border-t border-guild-primary/20">
          <div className="px-2 pt-2 pb-3 space-y-1 sm:px-3">
            {navItems.map((item) => (
              <Button
                key={item.name}
                variant="ghost"
                onClick={() => {
                  navigate(item.path);
                  setIsOpen(false);
                }}
                className={cn(
                  "w-full justify-start text-left text-gray-300 hover:text-white",
                  location.pathname === item.path && "text-guild-primary bg-guild-primary/10"
                )}
              >
                {item.icon}
                <span className="ml-2">{item.name}</span>
              </Button>
            ))}
            <Button 
              variant="ghost" 
              onClick={handleLogout}
              className="w-full justify-start text-left text-gray-300 hover:text-white"
            >
              <LogOut className="h-5 w-5 mr-2" /> Sair
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
