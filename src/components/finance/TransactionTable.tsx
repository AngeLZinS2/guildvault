
import React, { useState } from "react";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Search, FileText, ArrowUpCircle, ArrowDownCircle, AlertCircle, Info, Check, X } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { FinanceStatus } from "@/integrations/supabase/client";

interface Transaction {
  id: string;
  type: string;
  amount: number;
  member_name: string;
  description?: string;
  date: string;
  verified: boolean;
  status: FinanceStatus;
  verified_by?: string | null;
  verifier_name?: string | null;
  verification_notes?: string | null;
  proof_url?: string | null;
}

interface TransactionTableProps {
  transactions: Transaction[];
  filteredTransactions: Transaction[];
  searchTerm: string;
  filterType: string;
  onSearchChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onFilterChange: (value: string) => void;
  onVerifyTransaction: (id: string, data: { verified: boolean, status: FinanceStatus, verified_by: string | null, verification_notes?: string }) => void;
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
  const [verificationStatus, setVerificationStatus] = useState<FinanceStatus>(FinanceStatus.VERIFIED);

  const handleVerificationOpen = (transaction: Transaction) => {
    setSelectedTransaction(transaction);
    setVerificationStatus(transaction.status === FinanceStatus.VERIFIED ? 
      FinanceStatus.PENDING : FinanceStatus.VERIFIED);
    setVerificationNotes("");
    setVerificationOpen(true);
  };

  const handleVerify = () => {
    if (!selectedTransaction) return;
    
    const isVerifying = verificationStatus === FinanceStatus.VERIFIED;
    const isRejecting = verificationStatus === FinanceStatus.REJECTED;
    
    onVerifyTransaction(
      selectedTransaction.id, 
      {
        verified: isVerifying,
        status: verificationStatus,
        verified_by: isVerifying || isRejecting ? currentUserId : null,
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

  const getStatusBadge = (status: FinanceStatus) => {
    switch(status) {
      case FinanceStatus.VERIFIED:
        return (
          <Badge variant="outline" className="border-green-500/30 bg-green-500/10 text-green-500">
            Verificado
          </Badge>
        );
      case FinanceStatus.REJECTED:
        return (
          <Badge variant="outline" className="border-red-500/30 bg-red-500/10 text-red-500">
            Recusado
          </Badge>
        );
      case FinanceStatus.PENDING:
      default:
        return (
          <Badge variant="outline" className="border-yellow-500/30 bg-yellow-500/10 text-yellow-500">
            Pendente
          </Badge>
        );
    }
  };

  return (
    <>
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
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
          
          <Button variant="outline">
            <FileText className="h-4 w-4 mr-2" /> Exportar
          </Button>
        </div>
      </div>

      <Card className="overflow-hidden">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-secondary border-b">
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-400">Tipo</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-400">Membro</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-400">Descrição</th>
                  <th className="px-4 py-3 text-right text-sm font-medium text-gray-400">Valor</th>
                  <th className="px-4 py-3 text-center text-sm font-medium text-gray-400">Data</th>
                  <th className="px-4 py-3 text-center text-sm font-medium text-gray-400">Status</th>
                  <th className="px-4 py-3 text-right text-sm font-medium text-gray-400">Ações</th>
                </tr>
              </thead>
              <tbody>
                {filteredTransactions.length > 0 ? (
                  filteredTransactions.map((transaction) => (
                    <tr key={transaction.id} className="border-b hover:bg-primary/5">
                      <td className="px-4 py-3">
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
                      </td>
                      <td className="px-4 py-3 text-sm">{transaction.member_name}</td>
                      <td className="px-4 py-3 text-sm max-w-[200px] truncate">{transaction.description}</td>
                      <td className={`px-4 py-3 text-right text-sm font-medium ${
                        transaction.type === 'deposit' ? 'text-green-500' : 'text-red-500'
                      }`}>
                        {transaction.type === 'deposit' ? '+' : '-'}${transaction.amount.toLocaleString()}
                      </td>
                      <td className="px-4 py-3 text-sm text-center">
                        {transaction.date ? formatDate(transaction.date) : '-'}
                      </td>
                      <td className="px-4 py-3 text-center">
                        {getStatusBadge(transaction.status || FinanceStatus.PENDING)}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex justify-end gap-2">
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            className="h-7 px-2 text-xs"
                            onClick={() => handleVerificationOpen(transaction)}
                          >
                            {transaction.status === FinanceStatus.VERIFIED ? (
                              <>Reverter</>
                            ) : transaction.status === FinanceStatus.REJECTED ? (
                              <>Reavaliar</>
                            ) : (
                              <><Check className="h-3 w-3 mr-1" /> Verificar</>
                            )}
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            className="h-7 px-2 text-xs"
                            onClick={() => showDetails(transaction)}
                          >
                            <Info className="h-3 w-3 mr-1" /> Detalhes
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={7} className="text-center py-12">
                      <AlertCircle className="h-10 w-10 text-gray-500 mx-auto mb-4" />
                      <h3 className="text-lg font-medium text-gray-300 mb-1">Nenhuma transação encontrada</h3>
                      <p className="text-gray-400">
                        {transactions.length === 0 
                          ? "Registre sua primeira transação para começar" 
                          : "Tente ajustar seus filtros de pesquisa"
                        }
                      </p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
        {filteredTransactions.length > 0 && (
          <CardFooter className="flex justify-between border-t px-4 py-2">
            <p className="text-sm text-gray-400">
              Mostrando {filteredTransactions.length} de {transactions.length} transações
            </p>
            <div className="flex gap-1">
              <Button variant="outline" size="sm" className="h-8 px-2" disabled={true}>
                Anterior
              </Button>
              <Button variant="outline" size="sm" className="h-8 px-3 bg-primary/10 border-primary">
                1
              </Button>
              <Button variant="outline" size="sm" className="h-8 px-2" disabled={true}>
                Próximo
              </Button>
            </div>
          </CardFooter>
        )}
      </Card>

      {/* Transaction Details Dialog */}
      <Dialog open={detailsOpen} onOpenChange={setDetailsOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Detalhes da Transação</DialogTitle>
            <DialogDescription>
              Informações completas sobre a transação
            </DialogDescription>
          </DialogHeader>
          
          {selectedTransaction && (
            <div className="space-y-4 pt-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-400">Tipo</p>
                  <Badge variant="outline" className={selectedTransaction.type === 'deposit' ? 'border-green-500/30 bg-green-500/10 mt-1' : 'border-red-500/30 bg-red-500/10 mt-1'}>
                    <span className="flex items-center text-xs">
                      {selectedTransaction.type === 'deposit' ? (
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
                </div>
                
                <div>
                  <p className="text-sm text-gray-400">Status</p>
                  {getStatusBadge(selectedTransaction.status || FinanceStatus.PENDING)}
                </div>
              </div>
              
              <div>
                <p className="text-sm text-gray-400">Membro</p>
                <p className="font-medium">{selectedTransaction.member_name}</p>
              </div>
              
              <div>
                <p className="text-sm text-gray-400">Valor</p>
                <p className={`font-medium ${selectedTransaction.type === 'deposit' ? 'text-green-500' : 'text-red-500'}`}>
                  {selectedTransaction.type === 'deposit' ? '+' : '-'}${selectedTransaction.amount.toLocaleString()}
                </p>
              </div>
              
              <div>
                <p className="text-sm text-gray-400">Data</p>
                <p className="font-medium">{formatDate(selectedTransaction.date)}</p>
              </div>
              
              <div>
                <p className="text-sm text-gray-400">Descrição</p>
                <p className="font-medium">{selectedTransaction.description || "Sem descrição"}</p>
              </div>
              
              {/* New verification information */}
              {selectedTransaction.status !== FinanceStatus.PENDING && (
                <>
                  <div>
                    <p className="text-sm text-gray-400">
                      {selectedTransaction.status === FinanceStatus.VERIFIED ? 'Verificado por' : 'Recusado por'}
                    </p>
                    <p className="font-medium">{selectedTransaction.verifier_name || "Desconhecido"}</p>
                  </div>
                  
                  {selectedTransaction.verification_notes && (
                    <div>
                      <p className="text-sm text-gray-400">Observações</p>
                      <p className="font-medium">{selectedTransaction.verification_notes}</p>
                    </div>
                  )}
                </>
              )}
              
              <div>
                <p className="text-sm text-gray-400">ID da Transação</p>
                <p className="font-medium text-xs opacity-70">{selectedTransaction.id}</p>
              </div>
              
              {selectedTransaction.proof_url && (
                <div>
                  <p className="text-sm text-gray-400 mb-2">Comprovante</p>
                  <a 
                    href={selectedTransaction.proof_url} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="inline-block bg-primary/10 hover:bg-primary/20 text-primary px-3 py-2 rounded-md text-sm transition-colors"
                  >
                    <FileText className="h-4 w-4 inline mr-2" />
                    Ver comprovante
                  </a>
                </div>
              )}
              
              <div className="flex justify-end gap-2 pt-4">
                <Button 
                  variant={selectedTransaction.status === FinanceStatus.VERIFIED ? "destructive" : "default"}
                  size="sm"
                  onClick={() => {
                    setDetailsOpen(false);
                    handleVerificationOpen(selectedTransaction);
                  }}
                >
                  {selectedTransaction.status === FinanceStatus.VERIFIED ? "Reverter verificação" : 
                   selectedTransaction.status === FinanceStatus.REJECTED ? "Reavaliar" : "Verificar"}
                </Button>
                <Button variant="outline" size="sm" onClick={() => setDetailsOpen(false)}>Fechar</Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Verification Dialog */}
      <Dialog open={verificationOpen} onOpenChange={setVerificationOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {verificationStatus === FinanceStatus.VERIFIED ? "Verificar Transação" : 
               verificationStatus === FinanceStatus.REJECTED ? "Recusar Transação" : "Modificar Status"}
            </DialogTitle>
            <DialogDescription>
              {verificationStatus === FinanceStatus.VERIFIED ? "Confirme que esta transação é válida." : 
               verificationStatus === FinanceStatus.REJECTED ? "Indique o motivo da recusa." : 
               "Modificar o status desta transação."}
            </DialogDescription>
          </DialogHeader>
          
          {selectedTransaction && (
            <div className="space-y-4 py-4">
              <div className="flex flex-col gap-2">
                <p className="text-sm font-medium">Selecione o status:</p>
                <div className="flex flex-wrap gap-3">
                  <button 
                    onClick={() => setVerificationStatus(FinanceStatus.VERIFIED)}
                    className={`px-4 py-2 rounded-md flex items-center gap-2 ${
                      verificationStatus === FinanceStatus.VERIFIED 
                        ? 'bg-green-500/20 text-green-500 border border-green-500/30' 
                        : 'bg-muted hover:bg-green-500/10 hover:text-green-500'
                    }`}
                  >
                    <Check className="h-4 w-4" /> Verificar
                  </button>
                  <button 
                    onClick={() => setVerificationStatus(FinanceStatus.REJECTED)}
                    className={`px-4 py-2 rounded-md flex items-center gap-2 ${
                      verificationStatus === FinanceStatus.REJECTED 
                        ? 'bg-red-500/20 text-red-500 border border-red-500/30' 
                        : 'bg-muted hover:bg-red-500/10 hover:text-red-500'
                    }`}
                  >
                    <X className="h-4 w-4" /> Recusar
                  </button>
                  <button 
                    onClick={() => setVerificationStatus(FinanceStatus.PENDING)}
                    className={`px-4 py-2 rounded-md flex items-center gap-2 ${
                      verificationStatus === FinanceStatus.PENDING 
                        ? 'bg-yellow-500/20 text-yellow-500 border border-yellow-500/30' 
                        : 'bg-muted hover:bg-yellow-500/10 hover:text-yellow-500'
                    }`}
                  >
                    <AlertCircle className="h-4 w-4" /> Pendente
                  </button>
                </div>
              </div>
              
              <div className="space-y-2">
                <label htmlFor="notes" className="text-sm font-medium">
                  Observações (opcional)
                </label>
                <Textarea
                  id="notes"
                  placeholder="Adicione observações sobre esta verificação..."
                  value={verificationNotes}
                  onChange={(e) => setVerificationNotes(e.target.value)}
                  rows={3}
                />
              </div>
              
              <DialogFooter className="flex justify-end gap-2 pt-2">
                <Button variant="outline" onClick={() => setVerificationOpen(false)}>Cancelar</Button>
                <Button 
                  onClick={handleVerify}
                  variant={verificationStatus === FinanceStatus.VERIFIED ? "default" : 
                          verificationStatus === FinanceStatus.REJECTED ? "destructive" : "secondary"}
                >
                  {verificationStatus === FinanceStatus.VERIFIED ? "Verificar" : 
                   verificationStatus === FinanceStatus.REJECTED ? "Recusar" : "Definir como Pendente"}
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
};
