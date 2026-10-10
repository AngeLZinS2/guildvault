import React, { useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { DollarSign, Upload, AlertCircle } from "lucide-react";
import { MemberData } from "@/types";
import { useAdminCheck } from "@/hooks/useAdminCheck";
import { GameLoader } from "@/components/ui/game-loader";

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
  handleFileUpload: (file: File | null) => void;
  handleSubmit: () => void;
  busy?: boolean;
  uploadError?: boolean;
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
  busy = false,
  uploadError = false,
}) => {
  const { isAdmin, loading } = useAdminCheck();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedFileName, setSelectedFileName] = React.useState<string | null>(null);
  React.useEffect(() => { if (!isOpen) setSelectedFileName(null); }, [isOpen]);
  
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
    <Dialog open={isOpen} onOpenChange={open => !busy && setIsOpen(open)}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Registrar Nova Retirada</DialogTitle>
        </DialogHeader>
        
        {!isAdmin && loading && (
          <div className="p-4 text-center">
            <GameLoader label="Verificando permissões..." inline />
          </div>
        )}

        {!isAdmin && !loading && (
          <div className="p-4 bg-red-50 border border-red-200 rounded-lg flex items-center space-x-2">
            <AlertCircle className="h-5 w-5 text-red-500" />
            <p className="text-red-700">Apenas administradores podem registrar retiradas.</p>
          </div>
        )}

        {isAdmin && (
          <>
            <form className="space-y-4 py-4" onSubmit={event => { event.preventDefault(); handleSubmit(); }}>
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
                <Select value={withdrawalForm.reason} onValueChange={(value) => handleSelectChange('withdrawal', 'reason', value)}>
                  <SelectTrigger id="reason">
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
                <Select value={withdrawalForm.member} onValueChange={(value) => handleSelectChange('withdrawal', 'member', value)}>
                  <SelectTrigger id="member">
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
              {busy && <p role="status" className="text-sm">Processando envio…</p>}
              {uploadError && <p role="alert" className="text-sm text-destructive">Comprovante não enviado. Escolha outro arquivo ou remova o anexo.</p>}
              {selectedFileName && <Button type="button" variant="ghost" disabled={busy} onClick={() => { setSelectedFileName(null); if (fileInputRef.current) fileInputRef.current.value = ""; handleFileUpload(null); }}>Remover anexo</Button>}
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
                className="bg-red-600 hover:bg-red-700" 
                onClick={handleSubmit}
                disabled={busy || uploadError || !withdrawalForm.amount || !withdrawalForm.member}
              >
                Registrar Retirada
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
};
