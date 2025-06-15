
import React from "react";
import { Button } from "@/components/ui/button";
import { ArrowUpCircle, ArrowDownCircle } from "lucide-react";
import { useAdminCheck } from "@/hooks/useAdminCheck";

interface FinanceHeaderProps {
  onOpenDepositModal: () => void;
  onOpenWithdrawalModal: () => void;
}

export const FinanceHeader: React.FC<FinanceHeaderProps> = ({
  onOpenDepositModal,
  onOpenWithdrawalModal,
}) => {
  const { isAdmin, loading } = useAdminCheck();

  return (
    <div className="flex justify-between items-center mb-6">
      <h1 className="text-3xl font-bold">Finanças</h1>
      {!loading && (
        <div className="flex space-x-2">
          {/* All users can register deposits */}
          <Button 
            className="bg-green-600 hover:bg-green-700"
            onClick={onOpenDepositModal}
          >
            <ArrowUpCircle className="h-5 w-5 mr-2" /> Registrar Depósito
          </Button>
          
          {/* Only admins can register withdrawals */}
          {isAdmin && (
            <Button 
              className="bg-red-600 hover:bg-red-700"
              onClick={onOpenWithdrawalModal}
            >
              <ArrowDownCircle className="h-5 w-5 mr-2" /> Registrar Retirada
            </Button>
          )}
        </div>
      )}
      {loading && (
        <div className="text-sm text-gray-500">
          Carregando...
        </div>
      )}
    </div>
  );
};
