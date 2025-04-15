
import React from "react";
import { Shield } from "lucide-react";

export const LoginHeader: React.FC = () => {
  return (
    <div className="text-center mb-8">
      <div className="flex justify-center mb-4">
        <Shield className="h-12 w-12 text-guild-primary" />
      </div>
      <h1 className="text-3xl font-bold text-white">GuildVault</h1>
      <p className="text-gray-400 mt-2">Sistema de Gerenciamento para Guildas GTA V RP</p>
    </div>
  );
};
