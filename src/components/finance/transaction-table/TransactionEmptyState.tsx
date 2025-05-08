
import React from "react";
import { TableCell, TableRow } from "@/components/ui/table";
import { AlertCircle } from "lucide-react";

interface TransactionEmptyStateProps {
  hasAllTransactions: boolean;
}

export const TransactionEmptyState: React.FC<TransactionEmptyStateProps> = ({
  hasAllTransactions,
}) => {
  return (
    <TableRow>
      <TableCell colSpan={6} className="text-center py-12">
        <AlertCircle className="h-10 w-10 text-gray-500 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-300 mb-1">Nenhuma transação encontrada</h3>
        <p className="text-gray-400">
          {hasAllTransactions 
            ? "Tente ajustar seus filtros de pesquisa" 
            : "Registre sua primeira transação para começar"
          }
        </p>
      </TableCell>
    </TableRow>
  );
};
