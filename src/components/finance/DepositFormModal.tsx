
import React, { useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { DollarSign, Upload } from "lucide-react";
import { MemberData } from "@/types";

interface DepositFormModalProps {
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
  depositForm: {
    amount: string;
    member: string;
    description: string;
  };
  members: MemberData[];
  handleFormChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => void;
  handleSelectChange: (formName: string, field: string, value: string) => void;
  handleFileUpload: (file: File | null) => void;
  handleSubmit: () => void;
}

export const DepositFormModal: React.FC<DepositFormModalProps> = ({
  isOpen,
  setIsOpen,
  depositForm,
  members,
  handleFormChange,
  handleSelectChange,
  handleFileUpload,
  handleSubmit,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedFileName, setSelectedFileName] = React.useState<string | null>(null);
  
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null;
    if (file) {
      setSelectedFileName(file.name);
      handleFileUpload(file);
    }
  };
  
  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };
  
  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
  };
  
  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    
    const file = e.dataTransfer.files?.[0] || null;
    if (file) {
      setSelectedFileName(file.name);
      handleFileUpload(file);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Registrar Novo Depósito</DialogTitle>
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
                placeholder="50000"
                className="pl-8"
                min="1"
                value={depositForm.amount}
                onChange={handleFormChange}
              />
            </div>
          </div>

          <div className="space-y-2">
            <label htmlFor="member" className="text-sm font-medium">
              Membro
            </label>
            <Select onValueChange={(value) => handleSelectChange('deposit', 'member', value)}>
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
              Descrição
            </label>
            <Textarea 
              id="description" 
              placeholder="Ex: Depósito semanal" 
              className="min-h-24"
              value={depositForm.description}
              onChange={handleFormChange}
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">
              Comprovante
            </label>
            <div 
              className={`border-2 border-dashed ${selectedFileName ? 'border-green-400' : 'border-gray-300'} rounded-lg p-6 text-center hover:border-primary/60 cursor-pointer transition-colors`}
              onClick={handleUploadClick}
              onDragOver={handleDragOver}
              onDrop={handleDrop}
            >
              <Upload className="h-8 w-8 mx-auto mb-2 text-gray-400" />
              {selectedFileName ? (
                <>
                  <p className="text-sm text-green-500 mb-1 font-medium">
                    Arquivo selecionado
                  </p>
                  <p className="text-xs text-gray-500 truncate max-w-full">
                    {selectedFileName}
                  </p>
                </>
              ) : (
                <>
                  <p className="text-sm text-gray-400 mb-1">
                    Arraste um arquivo ou clique para fazer upload
                  </p>
                  <p className="text-xs text-gray-500">
                    Formatos suportados: PNG, JPG, PDF (Máx: 10MB)
                  </p>
                </>
              )}
              <input 
                type="file" 
                ref={fileInputRef}
                className="hidden" 
                onChange={handleFileChange} 
                accept=".png,.jpg,.jpeg,.pdf"
              />
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
            className="bg-green-600 hover:bg-green-700" 
            onClick={handleSubmit}
            disabled={!depositForm.amount || !depositForm.member}
          >
            Registrar Depósito
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
