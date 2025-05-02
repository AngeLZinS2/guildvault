
import React from "react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Calendar, AlertCircle, Plus } from "lucide-react";

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
                      <Button variant="ghost" size="sm" className="h-8 px-2">
                        Editar
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
    </Card>
  );
};
