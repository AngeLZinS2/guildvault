
import React, { useState } from "react";
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
  onSearchChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onFilterChange: (value: string) => void;
  onVerifyTransaction: (id: string, data: { verified: boolean, verified_by: string | null, verification_notes?: string }) => void;
  currentUserId?: string;
}

export const TransactionTable: React.FC<TransactionTableProps> = ({
  transactions,
  filteredTransactions,
  searchTerm,
  filterType,
  onSearchChange,
  onFilterChange,
  onVerifyTransaction,
  currentUserId = "test-user-id" // Placeholder user ID for testing
}) => {
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [verificationOpen, setVerificationOpen] = useState(false);
  const [verificationNotes, setVerificationNotes] = useState("");

  const handleVerificationOpen = (transaction: Transaction) => {
    setSelectedTransaction(transaction);
    setVerificationNotes("");
    setVerificationOpen(true);
  };

  const handleVerify = () => {
    if (!selectedTransaction) return;
    
    onVerifyTransaction(
      selectedTransaction.id, 
      {
        verified: !selectedTransaction.verified,
        verified_by: !selectedTransaction.verified ? currentUserId : null,
        verification_notes: verificationNotes
      }
    );
    
    setVerificationOpen(false);
  };

  const showDetails = (transaction: Transaction) => {
    setSelectedTransaction(transaction);
    setDetailsOpen(true);
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return "-";
    return new Date(dateString).toLocaleDateString('pt-BR', {
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
        onSearchChange={onSearchChange}
        onFilterChange={onFilterChange}
        filteredTransactions={filteredTransactions}
      />

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
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredTransactions.length > 0 ? (
                  filteredTransactions.map((transaction) => (
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
          <CardFooter className="flex justify-between border-t px-4 py-2">
            <p className="text-sm text-gray-400">
              Mostrando {filteredTransactions.length} de {transactions.length} transações
            </p>
            <div className="flex gap-1">
              <button className="px-2 py-1 text-xs rounded border border-gray-200 text-gray-400 cursor-not-allowed">
                Anterior
              </button>
              <button className="px-2 py-1 text-xs rounded border border-primary bg-primary/10 text-primary">
                1
              </button>
              <button className="px-2 py-1 text-xs rounded border border-gray-200 text-gray-400 cursor-not-allowed">
                Próximo
              </button>
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
      />

      <VerificationDialog
        selectedTransaction={selectedTransaction}
        verificationOpen={verificationOpen}
        setVerificationOpen={setVerificationOpen}
        verificationNotes={verificationNotes}
        setVerificationNotes={setVerificationNotes}
        handleVerify={handleVerify}
      />
    </>
  );
};
