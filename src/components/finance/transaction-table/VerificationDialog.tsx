
import React from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";

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

interface VerificationDialogProps {
  selectedTransaction: Transaction | null;
  verificationOpen: boolean;
  setVerificationOpen: (open: boolean) => void;
  verificationNotes: string;
  setVerificationNotes: (notes: string) => void;
  handleVerify: () => void;
}

export const VerificationDialog: React.FC<VerificationDialogProps> = ({
  selectedTransaction,
  verificationOpen,
  setVerificationOpen,
  verificationNotes,
  setVerificationNotes,
  handleVerify,
}) => {
  if (!selectedTransaction) return null;

  return (
    <Dialog open={verificationOpen} onOpenChange={setVerificationOpen}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {selectedTransaction.verified ? "Reverter Verificação" : "Verificar Transação"}
          </DialogTitle>
          <DialogDescription>
            {selectedTransaction.verified 
              ? "Reverter o status de verificação desta transação."
              : "Confirme que esta transação é válida."}
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
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
              variant={selectedTransaction.verified ? "destructive" : "default"}
            >
              {selectedTransaction.verified ? "Reverter verificação" : "Verificar"}
            </Button>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  );
};
