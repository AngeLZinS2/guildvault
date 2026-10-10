
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
    <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div><p className="section-kicker">TESOURARIA</p><h1 className="text-3xl sm:text-4xl">Finanças</h1><p className="mt-2 text-sm text-muted-foreground">Acompanhe cada entrada e retirada do caixa.</p></div>
      {!loading && (
        <div className="flex flex-col gap-2 sm:flex-row">
          {/* All users can register deposits */}
          <Button 
            className="min-h-11 bg-emerald-600 hover:bg-emerald-700"
            onClick={onOpenDepositModal}
          >
            <ArrowUpCircle className="h-5 w-5 mr-2" /> Registrar Depósito
          </Button>
          
          {/* Only admins can register withdrawals */}
          {isAdmin && (
            <Button 
              className="min-h-11 bg-rose-600 hover:bg-rose-700"
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
