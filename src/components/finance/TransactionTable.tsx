
import React, { useState } from "react";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Search, FileText, ArrowUpCircle, ArrowDownCircle, AlertCircle, Info, Check } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";

interface Transaction {
  id: string;
  type: string;
  amount: number;
  member_name: string;
  description?: string;
  date: string;
  verified: boolean;
  proof_url?: string | null;
}

interface TransactionTableProps {
  transactions: Transaction[];
  filteredTransactions: Transaction[];
  searchTerm: string;
  filterType: string;
  onSearchChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onFilterChange: (value: string) => void;
  onVerifyTransaction: (id: string, currentVerifiedStatus: boolean) => void;
}

export const TransactionTable: React.FC<TransactionTableProps> = ({
  transactions,
  filteredTransactions,
  searchTerm,
  filterType,
  onSearchChange,
  onFilterChange,
  onVerifyTransaction,
}) => {
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);

  const handleVerify = (id: string, currentVerifiedStatus: boolean) => {
    onVerifyTransaction(id, currentVerifiedStatus);
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
                        {transaction.verified ? (
                          <Badge variant="outline" className="border-green-500/30 bg-green-500/10 text-green-500">
                            Verificado
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="border-yellow-500/30 bg-yellow-500/10 text-yellow-500">
                            Pendente
                          </Badge>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex justify-end gap-2">
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            className={`h-7 px-2 text-xs ${transaction.verified ? 'text-red-500' : 'text-green-500'}`}
                            onClick={() => handleVerify(transaction.id, transaction.verified || false)}
                          >
                            {transaction.verified ? (
                              <>Desverificar</>
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
                  {selectedTransaction.verified ? (
                    <Badge variant="outline" className="border-green-500/30 bg-green-500/10 text-green-500 mt-1">
                      Verificado
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="border-yellow-500/30 bg-yellow-500/10 text-yellow-500 mt-1">
                      Pendente
                    </Badge>
                  )}
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
                  variant={selectedTransaction.verified ? "destructive" : "default"}
                  size="sm"
                  onClick={() => {
                    handleVerify(selectedTransaction.id, selectedTransaction.verified || false);
                    setDetailsOpen(false);
                  }}
                >
                  {selectedTransaction.verified ? "Desverificar" : "Verificar"}
                </Button>
                <Button variant="outline" size="sm" onClick={() => setDetailsOpen(false)}>Fechar</Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
};
