
import React from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ArrowUpCircle, ArrowDownCircle, FileText } from "lucide-react";

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

interface TransactionDetailsDialogProps {
  selectedTransaction: Transaction | null;
  detailsOpen: boolean;
  setDetailsOpen: (open: boolean) => void;
  handleVerificationOpen: (transaction: Transaction) => void;
  formatDate: (date: string) => string;
}

export const TransactionDetailsDialog: React.FC<TransactionDetailsDialogProps> = ({
  selectedTransaction,
  detailsOpen,
  setDetailsOpen,
  handleVerificationOpen,
  formatDate,
}) => {
  if (!selectedTransaction) return null;

  return (
    <Dialog open={detailsOpen} onOpenChange={setDetailsOpen}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Detalhes da Transação</DialogTitle>
          <DialogDescription>
            Informações completas sobre a transação
          </DialogDescription>
        </DialogHeader>
        
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
              <p className="text-sm text-gray-400">Verificação</p>
              {selectedTransaction.verified ? (
                <Badge variant="outline" className="border-green-500/30 bg-green-500/10 text-green-500">
                  Verificado
                </Badge>
              ) : (
                <Badge variant="outline" className="border-yellow-500/30 bg-yellow-500/10 text-yellow-500">
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
          
          {selectedTransaction.verified && selectedTransaction.verifier_name && (
            <div>
              <p className="text-sm text-gray-400">Verificado por</p>
              <p className="font-medium">{selectedTransaction.verifier_name}</p>
            </div>
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
            <Button variant="outline" size="sm" onClick={() => setDetailsOpen(false)}>Fechar</Button>
            <Button 
              variant={selectedTransaction.verified ? "destructive" : "default"}
              size="sm"
              onClick={() => {
                setDetailsOpen(false);
                handleVerificationOpen(selectedTransaction);
              }}
            >
              {selectedTransaction.verified ? "Reverter verificação" : "Verificar"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
