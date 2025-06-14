import React, { useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { DollarSign, Upload, AlertCircle } from "lucide-react";
import { MemberData } from "@/types";
import { useAdminCheck } from "@/hooks/useAdminCheck";

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
  const { isAdmin, loading } = useAdminCheck();
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

  // Não renderizar o modal se não for admin
  if (!isAdmin && !loading) {
    return null;
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Registrar Novo Depósito</DialogTitle>
        </DialogHeader>
        
        {!isAdmin && loading && (
          <div className="p-4 text-center">
            <div className="animate-spin h-6 w-6 border-2 border-primary border-t-transparent rounded-full mx-auto mb-2"></div>
            <p>Verificando permissões...</p>
          </div>
        )}

        {!isAdmin && !loading && (
          <div className="p-4 bg-red-50 border border-red-200 rounded-lg flex items-center space-x-2">
            <AlertCircle className="h-5 w-5 text-red-500" />
            <p className="text-red-700">Apenas administradores podem registrar depósitos.</p>
          </div>
        )}

        {isAdmin && (
          <>
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
          </>
        )}
      </DialogContent>
    </Dialog>
  );
};
