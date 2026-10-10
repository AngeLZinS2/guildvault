
import React from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DollarSign } from "lucide-react";
import { MemberData } from "@/types";

interface PaymentFormModalProps {
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
  paymentForm: {
    title: string;
    amount: string;
    dueDate: string;
    members: string;
  };
  members: MemberData[];
  handleFormChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => void;
  handleSelectChange: (formName: string, field: string, value: string) => void;
  handleSubmit: () => void;
  busy?: boolean;
}

export const PaymentFormModal: React.FC<PaymentFormModalProps> = ({
  isOpen,
  setIsOpen,
  paymentForm,
  members,
  handleFormChange,
  handleSelectChange,
  handleSubmit,
  busy = false,
}) => {
  return (
    <Dialog open={isOpen} onOpenChange={open => !busy && setIsOpen(open)}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Agendar Novo Pagamento</DialogTitle>
          <DialogDescription>Organize contribuições. Agendamentos não geram lançamentos no caixa nem enviam notificações automaticamente.</DialogDescription>
        </DialogHeader>
        <form className="space-y-4 py-4" onSubmit={event => { event.preventDefault(); handleSubmit(); }}>
          <div className="space-y-2">
            <label htmlFor="title" className="text-sm font-medium">
              Título
            </label>
            <Input
              id="title"
              placeholder="Ex: Pagamento Semanal"
              value={paymentForm.title}
              onChange={handleFormChange}
            />
          </div>

          <div className="space-y-2">
            <label htmlFor="amount" className="text-sm font-medium">
              Valor
            </label>
            <div className="relative">
              <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <Input
                id="amount"
                type="number"
                placeholder="50000"
                className="pl-8"
                min="1"
                value={paymentForm.amount}
                onChange={handleFormChange}
              />
            </div>
          </div>

          <div className="space-y-2">
            <label htmlFor="dueDate" className="text-sm font-medium">
              Data de Vencimento
            </label>
            <Input
              id="dueDate"
              type="date"
              value={paymentForm.dueDate}
              onChange={handleFormChange}
            />
          </div>

          <div className="space-y-2">
            <label htmlFor="members" className="text-sm font-medium">
              Membros Responsáveis
            </label>
            <Select value={paymentForm.members} onValueChange={(value) => handleSelectChange('payment', 'members', value)}>
              <SelectTrigger id="members">
                <SelectValue placeholder="Selecionar membros" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Todos os membros">Todos os membros</SelectItem>
                {members.map((member) => (
                  <SelectItem key={member.id} value={member.id}>
                    {member.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

        </form>
        <DialogFooter>
          <Button 
            variant="outline" 
            disabled={busy}
            onClick={() => setIsOpen(false)}
          >
            Cancelar
          </Button>
          <Button 
            className="bg-primary hover:bg-primary/90" 
            onClick={handleSubmit}
            disabled={busy || !paymentForm.title || !paymentForm.amount || !paymentForm.dueDate || !paymentForm.members}
          >
            Agendar Pagamento
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
