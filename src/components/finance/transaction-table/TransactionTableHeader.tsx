
import React from "react";
import { Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import { FileText, Download } from "lucide-react";
import { exportToExcel, exportToPDF } from "@/utils/exportUtils";
import { DateFilter } from "./DateFilter";

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

interface TransactionTableHeaderProps {
  searchTerm: string;
  filterType: string;
  dateFilter: string;
  customDateRange: { from: Date | undefined; to: Date | undefined };
  onSearchChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onFilterChange: (value: string) => void;
  onDateFilterChange: (value: string) => void;
  onCustomDateRangeChange: (range: { from: Date | undefined; to: Date | undefined }) => void;
  filteredTransactions: Transaction[];
}

export const TransactionTableHeader: React.FC<TransactionTableHeaderProps> = ({
  searchTerm,
  filterType,
  dateFilter,
  customDateRange,
  onSearchChange,
  onFilterChange,
  onDateFilterChange,
  onCustomDateRangeChange,
  filteredTransactions,
}) => {
  const formatDate = (dateString: string) => {
    if (!dateString) return "-";
    return new Date(dateString).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  const handleExport = (format: 'excel' | 'pdf') => {
    // Format transactions for export
    const formattedTransactions = filteredTransactions.map(transaction => ({
      tipo: transaction.type === 'deposit' ? 'Depósito' : 'Retirada',
      membro: transaction.member_name,
      descricao: transaction.description || '-',
      valor: `${transaction.type === 'deposit' ? '+' : '-'}$${transaction.amount.toLocaleString()}`,
      data: formatDate(transaction.date),
      verificado: transaction.verified ? 'Verificado' : 'Pendente'
    }));

    const fileName = `transacoes-financeiras-${new Date().toISOString().split('T')[0]}`;

    if (format === 'excel') {
      exportToExcel(formattedTransactions, fileName);
    } else {
      exportToPDF(formattedTransactions, fileName);
    }
  };
  
  return (
    <div className="flex flex-col gap-4 mb-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="relative w-full md:w-auto md:flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
          <Input
            placeholder="Pesquisar por membro ou descrição..."
            className="pl-10"
            value={searchTerm}
            onChange={onSearchChange}
          />
        </div>
        
        <div className="flex gap-2 w-full md:w-auto">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline">
                <FileText className="h-4 w-4 mr-2" /> Exportar
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuItem onClick={() => handleExport('excel')}>
                <Download className="h-4 w-4 mr-2" /> Excel (.xlsx)
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleExport('pdf')}>
                <Download className="h-4 w-4 mr-2" /> PDF (.pdf)
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-2">
        <Select value={filterType} onValueChange={onFilterChange}>
          <SelectTrigger className="w-full sm:w-40">
            <SelectValue placeholder="Filtrar por tipo" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os tipos</SelectItem>
            <SelectItem value="deposit">Depósitos</SelectItem>
            <SelectItem value="withdrawal">Retiradas</SelectItem>
          </SelectContent>
        </Select>

        <DateFilter
          dateFilter={dateFilter}
          onDateFilterChange={onDateFilterChange}
          customDateRange={customDateRange}
          onCustomDateRangeChange={onCustomDateRangeChange}
        />
      </div>
    </div>
  );
};
