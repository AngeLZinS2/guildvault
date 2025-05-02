
import React from "react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowUpCircle, ArrowDownCircle } from "lucide-react";

interface Transaction {
  id: string;
  type: string;
  amount: number;
  member_name: string;
  description?: string;
  date: string;
}

interface RecentTransactionsProps {
  transactions: Transaction[];
  onSeeAllTransactions: () => void;
  onOpenDepositModal: () => void;
}

export const RecentTransactions: React.FC<RecentTransactionsProps> = ({
  transactions,
  onSeeAllTransactions,
  onOpenDepositModal,
}) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Transações Recentes</CardTitle>
        <CardDescription>Últimos 7 dias</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {transactions.slice(0, 4).map((transaction) => (
            <div 
              key={transaction.id} 
              className={`flex justify-between items-center p-3 rounded-md ${transaction.type === 'deposit' ? 'bg-green-500/10' : 'bg-red-500/10'}`}
            >
              <div className="flex items-center">
                {transaction.type === 'deposit' ? (
                  <ArrowUpCircle className="h-5 w-5 text-green-500 mr-2" />
                ) : (
                  <ArrowDownCircle className="h-5 w-5 text-red-500 mr-2" />
                )}
                <div>
                  <p className="text-sm font-medium">{transaction.member_name}</p>
                  <p className="text-xs text-gray-400">{transaction.description}</p>
                </div>
              </div>
              <div className="text-right">
                <span className={`font-medium ${transaction.type === 'deposit' ? 'text-green-500' : 'text-red-500'}`}>
                  {transaction.type === 'deposit' ? '+' : '-'}${transaction.amount.toLocaleString()}
                </span>
                <p className="text-xs text-gray-400">{new Date(transaction.date).toLocaleDateString()}</p>
              </div>
            </div>
          ))}
        </div>
        {transactions.length > 0 ? (
          <Button variant="link" className="text-primary w-full mt-4" onClick={onSeeAllTransactions}>
            Ver todas as transações
          </Button>
        ) : (
          <div className="text-center py-6">
            <p className="text-gray-400">Nenhuma transação registrada</p>
            <Button variant="link" className="text-primary mt-2" onClick={onOpenDepositModal}>
              Registrar primeira transação
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
