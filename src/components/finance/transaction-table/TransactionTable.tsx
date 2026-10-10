
import React, { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { calendarDate, transactionSummary, type VerificationFilter } from "@/utils/financeContent";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

import { TransactionTableHeader } from "./TransactionTableHeader";
import { TransactionRow } from "./TransactionRow";
import { TransactionDetailsDialog } from "./TransactionDetailsDialog";
import { VerificationDialog } from "./VerificationDialog";
import { TransactionEmptyState } from "./TransactionEmptyState";

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

interface TransactionTableProps {
  transactions: Transaction[];
  filteredTransactions: Transaction[];
  searchTerm: string;
  filterType: string;
  dateFilter: string;
  customDateRange: { from: Date | undefined; to: Date | undefined };
  onSearchChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onFilterChange: (value: string) => void;
  onDateFilterChange: (value: string) => void;
  onCustomDateRangeChange: (range: { from: Date | undefined; to: Date | undefined }) => void;
  onVerifyTransaction: (id: string, data: { verified: boolean, verified_by: string | null, verification_notes?: string }) => Promise<boolean>;
  currentUserId?: string;
  canVerify: boolean;
  verificationFilter: VerificationFilter;
  onVerificationFilterChange: (value: VerificationFilter) => void;
  onResetFilters: () => void;
}

export const TransactionTable: React.FC<TransactionTableProps> = ({
  transactions,
  filteredTransactions,
  searchTerm,
  filterType,
  dateFilter,
  customDateRange,
  onSearchChange,
  onFilterChange,
  onDateFilterChange,
  onCustomDateRangeChange,
  onVerifyTransaction,
  currentUserId,
  canVerify,
  verificationFilter,
  onVerificationFilterChange,
  onResetFilters,
}) => {
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [verificationOpen, setVerificationOpen] = useState(false);
  const [verificationNotes, setVerificationNotes] = useState("");
  const [verifying, setVerifying] = useState(false);
  const verifyLock = useRef(false);
  const [page, setPage] = useState(1);
  const [previousFilter, setPreviousFilter] = useState("");
  const filterKey = JSON.stringify([searchTerm, filterType, dateFilter, verificationFilter, customDateRange]);
  if (previousFilter !== filterKey) {
    setPreviousFilter(filterKey);
    setPage(1);
  }
  const pageSize = 10;
  const totalPages = Math.max(1, Math.ceil(filteredTransactions.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const pageTransactions = filteredTransactions.slice((currentPage - 1) * pageSize, currentPage * pageSize);
  const summary = transactionSummary(filteredTransactions);

  const handleVerificationOpen = (transaction: Transaction) => {
    setSelectedTransaction(transaction);
    setVerificationNotes("");
    setVerificationOpen(true);
  };

  const handleVerify = async () => {
    if (!selectedTransaction || !canVerify || !currentUserId || verifyLock.current) return;
    verifyLock.current = true;
    setVerifying(true);
    try {
    const success = await onVerifyTransaction(
      selectedTransaction.id, 
      {
        verified: !selectedTransaction.verified,
        verified_by: !selectedTransaction.verified ? currentUserId : null,
        verification_notes: verificationNotes
      }
    );
    
    if (success) {
      setVerificationOpen(false);
      setSelectedTransaction(null);
    }
    } finally {
      verifyLock.current = false;
      setVerifying(false);
    }
  };

  const showDetails = (transaction: Transaction) => {
    setSelectedTransaction(transaction);
    setDetailsOpen(true);
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return "-";
    return calendarDate(dateString).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  return (
    <>
      <TransactionTableHeader
        searchTerm={searchTerm}
        filterType={filterType}
        dateFilter={dateFilter}
        customDateRange={customDateRange}
        onSearchChange={onSearchChange}
        onFilterChange={onFilterChange}
        onDateFilterChange={onDateFilterChange}
        onCustomDateRangeChange={onCustomDateRangeChange}
        filteredTransactions={filteredTransactions}
        verificationFilter={verificationFilter}
        onVerificationFilterChange={onVerificationFilterChange}
        onResetFilters={onResetFilters}
      />

      <div aria-live="polite" className="flex flex-wrap gap-x-6 gap-y-2 text-sm text-muted-foreground">
        <span>{filteredTransactions.length} transações no filtro</span>
        <span>Entradas: ${summary.income.toLocaleString("pt-BR")}</span>
        <span>Saídas: ${summary.expenses.toLocaleString("pt-BR")}</span>
        <span>Saldo do filtro: ${summary.balance.toLocaleString("pt-BR")}</span>
      </div>

      <Card className="overflow-hidden">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Membro</TableHead>
                  <TableHead>Descrição</TableHead>
                  <TableHead className="text-right">Valor</TableHead>
                  <TableHead className="text-center">Data</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredTransactions.length > 0 ? (
                  pageTransactions.map((transaction) => (
                    <TransactionRow
                      key={transaction.id}
                      transaction={transaction}
                      formatDate={formatDate}
                      showDetails={showDetails}
                    />
                  ))
                ) : (
                  <TransactionEmptyState 
                    hasAllTransactions={transactions.length > 0} 
                  />
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
        {filteredTransactions.length > 0 && (
          <CardFooter className="flex flex-wrap justify-between gap-3 border-t px-4 py-2">
            <p className="text-sm text-gray-400">
              Mostrando {(currentPage - 1) * pageSize + 1}–{Math.min(currentPage * pageSize, filteredTransactions.length)} de {filteredTransactions.length} transações
            </p>
            <div className="flex gap-1">
              <Button variant="outline" size="sm" disabled={currentPage === 1} onClick={() => setPage(currentPage - 1)}>
                Anterior
              </Button>
              <span className="self-center px-2 text-xs" aria-live="polite">{currentPage} / {totalPages}</span>
              <Button variant="outline" size="sm" disabled={currentPage === totalPages} onClick={() => setPage(currentPage + 1)}>
                Próximo
              </Button>
            </div>
          </CardFooter>
        )}
      </Card>

      <TransactionDetailsDialog
        selectedTransaction={selectedTransaction}
        detailsOpen={detailsOpen}
        setDetailsOpen={setDetailsOpen}
        handleVerificationOpen={handleVerificationOpen}
        formatDate={formatDate}
        canVerify={canVerify}
      />

      <VerificationDialog
        selectedTransaction={selectedTransaction}
        verificationOpen={verificationOpen}
        setVerificationOpen={setVerificationOpen}
        verificationNotes={verificationNotes}
        setVerificationNotes={setVerificationNotes}
        handleVerify={handleVerify}
        busy={verifying}
      />
    </>
  );
};
