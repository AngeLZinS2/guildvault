
import React from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { DollarSign, ArrowUpCircle, ArrowDownCircle } from "lucide-react";

interface FinanceStatsProps {
  totalBalance: number;
  totalIncome: number;
  totalExpenses: number;
  currentMonthIncome: number;
  currentMonthExpenses: number;
}

export const FinanceStats: React.FC<FinanceStatsProps> = ({
  totalBalance,
  totalIncome,
  totalExpenses,
  currentMonthIncome,
  currentMonthExpenses,
}) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-gray-400">Saldo Total</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center">
            <DollarSign className="h-6 w-6 text-primary mr-2" />
            <span className="text-2xl font-bold">${totalBalance.toLocaleString()}</span>
          </div>
          <p className={`text-xs ${currentMonthIncome > currentMonthExpenses ? 'text-green-400' : 'text-red-400'} mt-1`}>
            {currentMonthIncome > currentMonthExpenses ? '+' : '-'}${Math.abs(currentMonthIncome - currentMonthExpenses).toLocaleString()} neste mês
          </p>
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-gray-400">Total de Entradas</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center">
            <ArrowUpCircle className="h-6 w-6 text-green-500 mr-2" />
            <span className="text-2xl font-bold">${totalIncome.toLocaleString()}</span>
          </div>
          <p className="text-xs text-gray-400 mt-1">
            ${currentMonthIncome.toLocaleString()} neste mês
          </p>
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-gray-400">Total de Saídas</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center">
            <ArrowDownCircle className="h-6 w-6 text-red-500 mr-2" />
            <span className="text-2xl font-bold">${totalExpenses.toLocaleString()}</span>
          </div>
          <p className="text-xs text-gray-400 mt-1">
            ${currentMonthExpenses.toLocaleString()} neste mês
          </p>
        </CardContent>
      </Card>
    </div>
  );
};
