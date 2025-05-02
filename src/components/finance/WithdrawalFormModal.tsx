
import React from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { DollarSign, Upload } from "lucide-react";
import { MemberData } from "@/types";

interface WithdrawalFormModalProps {
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
  withdrawalForm: {
    amount: string;
    reason: string;
    member: string;
    description: string;
  };
  members: MemberData[];
  handleFormChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => void;
  handleSelectChange: (formName: string, field: string, value: string) => void;
  handleFileUpload: () => void;
  handleSubmit: () => void;
}

export const WithdrawalFormModal: React.FC<WithdrawalFormModalProps> = ({
  isOpen,
  setIsOpen,
  withdrawalForm,
  members,
  handleFormChange,
  handleSelectChange,
  handleFileUpload,
  handleSubmit,
}) => {
  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Registrar Nova Retirada</DialogTitle>
        </DialogHeader>
        <form className="space-y-4 py-4">
          <div className="space-y-2">
            <label htmlFor="amount" className="text-sm font-medium">
              Valor
            </label>
            <div className="relative">
              <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <Input
                id="amount"
                type="number"
                placeholder="20000"
                className="pl-8"
                min="1"
                value={withdrawalForm.amount}
                onChange={handleFormChange}
              />
            </div>
          </div>

          <div className="space-y-2">
            <label htmlFor="reason" className="text-sm font-medium">
              Motivo
            </label>
            <Select onValueChange={(value) => handleSelectChange('withdrawal', 'reason', value)}>
              <SelectTrigger>
                <SelectValue placeholder="Selecionar motivo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Pagamento de Impostos">Pagamento de Impostos</SelectItem>
                <SelectItem value="Compra de Materiais">Compra de Materiais</SelectItem>
                <SelectItem value="Manutenção de Propriedade">Manutenção de Propriedade</SelectItem>
                <SelectItem value="Pagamento de Salário">Pagamento de Salário</SelectItem>
                <SelectItem value="Outro">Outro</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <label htmlFor="member" className="text-sm font-medium">
              Membro Responsável
            </label>
            <Select onValueChange={(value) => handleSelectChange('withdrawal', 'member', value)}>
              <SelectTrigger>
                <SelectValue placeholder="Selecionar membro" />
              </SelectTrigger>
              <SelectContent>
                {members.map((member) => (
                  <SelectItem key={member.id} value={member.id}>
                    {member.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <label htmlFor="description" className="text-sm font-medium">
              Detalhes Adicionais
            </label>
            <Textarea 
              id="description" 
              placeholder="Ex: Pagamento de imposto da casa #32" 
              className="min-h-24"
              value={withdrawalForm.description}
              onChange={handleFormChange}
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">
              Comprovante
            </label>
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-primary/60 cursor-pointer transition-colors">
              <Upload className="h-8 w-8 mx-auto mb-2 text-gray-400" />
              <p className="text-sm text-gray-400 mb-1">
                Arraste um arquivo ou clique para fazer upload
              </p>
              <p className="text-xs text-gray-500">
                Formatos suportados: PNG, JPG, PDF (Máx: 10MB)
              </p>
              <input type="file" className="hidden" onChange={handleFileUpload} />
            </div>
          </div>
        </form>
        <DialogFooter>
          <Button 
            variant="outline" 
            onClick={() => setIsOpen(false)}
          >
            Cancelar
          </Button>
          <Button 
            className="bg-red-600 hover:bg-red-700" 
            onClick={handleSubmit}
            disabled={!withdrawalForm.amount || !withdrawalForm.member}
          >
            Registrar Retirada
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
