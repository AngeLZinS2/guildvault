
import React, { useState } from "react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Calendar, AlertCircle, Plus, Edit } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { updatePaymentSchedule } from "@/services/financeService";

interface Payment {
  id: string;
  title: string;
  amount: number;
  due_date: string;
  members: string[];
}

interface PaymentSchedulePageProps {
  paymentSchedule: Payment[];
  isAddPaymentOpen: boolean;
  setIsAddPaymentOpen: (isOpen: boolean) => void;
}

export const PaymentSchedulePage: React.FC<PaymentSchedulePageProps> = ({
  paymentSchedule,
  isAddPaymentOpen,
  setIsAddPaymentOpen,
}) => {
  const [isEditPaymentOpen, setIsEditPaymentOpen] = useState(false);
  const [currentPayment, setCurrentPayment] = useState<Payment | null>(null);
  const [editForm, setEditForm] = useState({
    title: "",
    amount: "",
    dueDate: "",
    members: "",
  });

  const handleEditPayment = (payment: Payment) => {
    setCurrentPayment(payment);
    setEditForm({
      title: payment.title,
      amount: payment.amount.toString(),
      dueDate: payment.due_date.split('T')[0], // Format date for input
      members: payment.members.join(", "),
    });
    setIsEditPaymentOpen(true);
  };

  const handleEditFormChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setEditForm({
      ...editForm,
      [e.target.id]: e.target.value,
    });
  };

  const handleSubmitEdit = async () => {
    if (!currentPayment) return;
    
    if (!editForm.title || !editForm.amount || !editForm.dueDate) {
      return; // Basic validation
    }

    const membersList = editForm.members
      .split(",")
      .map((member) => member.trim())
      .filter((member) => member !== "");

    const updatedPayment = {
      title: editForm.title,
      amount: Number(editForm.amount),
      due_date: editForm.dueDate,
      members: membersList.length > 0 ? membersList : currentPayment.members,
    };

    const { success } = await updatePaymentSchedule(currentPayment.id, updatedPayment);
    
    if (success) {
      setIsEditPaymentOpen(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-center">
          <div>
            <CardTitle>Cronograma de Pagamentos</CardTitle>
            <CardDescription>Agenda de contribuições obrigatórias</CardDescription>
          </div>
          <Button className="bg-primary hover:bg-primary/90" onClick={() => setIsAddPaymentOpen(true)}>
            <Calendar className="h-4 w-4 mr-2" /> Agendar Pagamento
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {paymentSchedule.length > 0 ? (
          <div className="space-y-4">
            {paymentSchedule.map((payment) => (
              <Card key={payment.id} className="bg-secondary border-primary/10">
                <CardHeader className="pb-2">
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle className="text-lg">{payment.title}</CardTitle>
                      <CardDescription>
                        Vencimento: {new Date(payment.due_date).toLocaleDateString()}
                      </CardDescription>
                    </div>
                    <div className="text-right">
                      <p className="text-xl font-bold text-primary">
                        ${payment.amount.toLocaleString()}
                      </p>
                      <p className="text-xs text-gray-400">
                        por membro
                      </p>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="pb-2">
                  <div className="flex justify-between items-center">
                    <div className="text-sm text-gray-400">
                      <span className="font-medium text-foreground">Membros:</span> {payment.members.join(", ")}
                    </div>
                    <div className="flex gap-2">
                      <Button variant="ghost" size="sm" className="h-8 px-2 text-yellow-500">
                        <AlertCircle className="h-4 w-4 mr-1" /> Lembrar
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="h-8 px-2"
                        onClick={() => handleEditPayment(payment)}
                      >
                        <Edit className="h-4 w-4 mr-1" /> Editar
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <div className="text-center py-12">
            <Calendar className="h-10 w-10 text-gray-500 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-300 mb-1">Nenhum pagamento agendado</h3>
            <p className="text-gray-400 mb-4">
              Crie seu primeiro agendamento para organizar suas finanças
            </p>
            <Button 
              className="bg-primary hover:bg-primary/90" 
              onClick={() => setIsAddPaymentOpen(true)}
            >
              <Plus className="h-4 w-4 mr-2" /> Agendar Pagamento
            </Button>
          </div>
        )}
      </CardContent>
      
      {/* Edit Payment Dialog */}
      <Dialog open={isEditPaymentOpen} onOpenChange={setIsEditPaymentOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Editar Pagamento</DialogTitle>
            <DialogDescription>
              Altere os detalhes do pagamento agendado
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="title" className="text-right">Título</Label>
              <Input
                id="title"
                value={editForm.title}
                onChange={handleEditFormChange}
                className="col-span-3"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="amount" className="text-right">Valor</Label>
              <Input
                id="amount"
                type="number"
                value={editForm.amount}
                onChange={handleEditFormChange}
                className="col-span-3"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="dueDate" className="text-right">Vencimento</Label>
              <Input
                id="dueDate"
                type="date"
                value={editForm.dueDate}
                onChange={handleEditFormChange}
                className="col-span-3"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="members" className="text-right">Membros</Label>
              <Input
                id="members"
                placeholder="Membros separados por vírgula"
                value={editForm.members}
                onChange={handleEditFormChange}
                className="col-span-3"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditPaymentOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSubmitEdit}>
              Salvar alterações
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
};
