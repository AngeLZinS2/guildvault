
import React from "react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Calendar, Plus } from "lucide-react";
import { calendarDate } from "@/utils/financeContent";

interface PaymentSchedule {
  id: string;
  title: string;
  amount: number;
  due_date: string;
  members: string[];
}

interface PaymentScheduleCardProps {
  paymentSchedule: PaymentSchedule[];
  onOpenPaymentModal: () => void;
  canManage?: boolean;
  members?: { id: string; name: string }[];
}

export const PaymentScheduleCard: React.FC<PaymentScheduleCardProps> = ({
  paymentSchedule,
  onOpenPaymentModal,
  canManage = false,
  members = [],
}) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Agenda de contribuições</CardTitle>
        <CardDescription>Cronograma</CardDescription>
      </CardHeader>
      <CardContent>
        {paymentSchedule.length > 0 ? (
          <div className="space-y-3">
            {paymentSchedule.map((payment) => (
              <div key={payment.id} className="bg-secondary/50 border border-primary/10 rounded-md p-3">
                <div className="flex justify-between items-center">
                  <div>
                    <h4 className="font-medium">{payment.title}</h4>
                    <div className="flex items-center text-xs text-gray-400 mt-1">
                      <Calendar className="h-3 w-3 mr-1" /> Vencimento: {calendarDate(payment.due_date).toLocaleDateString("pt-BR")}
                    </div>
                  </div>
                  <span className="font-medium text-primary">${payment.amount.toLocaleString()}</span>
                </div>
                <div className="mt-2 text-xs">
                  <span className="text-gray-400">Membros: </span>
                  <span>{(payment.members ?? []).map(member => members.find(profile => profile.id === member)?.name ?? member).join(", ")}</span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-6">
            <p className="text-gray-400">Nenhum pagamento agendado</p>
          </div>
        )}
        <Button 
          variant="outline" 
          className="w-full mt-4"
          onClick={onOpenPaymentModal}
        >
          <Plus className="h-4 w-4 mr-1" /> {canManage ? "Adicionar Pagamento" : "Ver agenda"}
        </Button>
      </CardContent>
    </Card>
  );
};
