
import React from "react";
import { TableCell, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ArrowUpCircle, ArrowDownCircle, Info } from "lucide-react";

interface Transaction {
  id: string;
  type: string;
  amount: number;
  member_name: string;
  description?: string;
  date: string;
  verified: boolean;
  proof_url?: string | null;
  verifier_name?: string;
}

interface TransactionRowProps {
  transaction: Transaction;
  formatDate: (date: string) => string;
  showDetails: (transaction: Transaction) => void;
}

export const TransactionRow: React.FC<TransactionRowProps> = ({
  transaction,
  formatDate,
  showDetails,
}) => {
  return (
    <TableRow key={transaction.id}>
      <TableCell>
        <Badge variant="outline" className={transaction.type === 'deposit' ? 'border-green-500/30 bg-green-500/10' : 'border-red-500/30 bg-red-500/10'}>
          <span className="flex items-center text-xs">
            {transaction.type === 'deposit' ? (
              <>
                <ArrowUpCircle className="h-3 w-3 text-green-500 mr-1" /> Depósito
              </>
            ) : (
              <>
                <ArrowDownCircle className="h-3 w-3 text-red-500 mr-1" /> Retirada
              </>
            )}
          </span>
        </Badge>
      </TableCell>
      <TableCell>{transaction.member_name}</TableCell>
      <TableCell className="max-w-[200px] truncate">{transaction.description}</TableCell>
      <TableCell className={`text-right font-medium ${
        transaction.type === 'deposit' ? 'text-green-500' : 'text-red-500'
      }`}>
        {transaction.type === 'deposit' ? '+' : '-'}${transaction.amount.toLocaleString()}
      </TableCell>
      <TableCell className="text-center">
        {transaction.date ? formatDate(transaction.date) : '-'}
      </TableCell>
      <TableCell><Badge variant="outline">{transaction.verified ? "Verificada" : "Pendente"}</Badge></TableCell>
      <TableCell className="text-right">
        <div className="flex justify-end gap-2">
          <Button 
            variant="ghost" 
            size="sm" 
            className="h-7 px-2 text-xs"
            onClick={() => showDetails(transaction)}
          >
            <Info className="h-3 w-3 mr-1" /> Detalhes
          </Button>
        </div>
      </TableCell>
    </TableRow>
  );
};
