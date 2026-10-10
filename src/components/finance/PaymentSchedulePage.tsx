import { useRef, useState } from "react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { updatePaymentSchedule, deletePaymentSchedule } from "@/services/financeService";
import { toast } from "@/hooks/use-toast";
import { calendarDate, isCalendarDate, isPositiveAmount, localDate } from "@/utils/financeContent";

interface Payment {
  id: string;
  title: string;
  amount: number;
  due_date: string;
  members: string[] | null;
}

interface PaymentSchedulePageProps {
  paymentSchedule: Payment[];
  setIsAddPaymentOpen: (isOpen: boolean) => void;
  onChanged: () => Promise<void>;
  canManage: boolean;
  members: { id: string; name: string }[];
}

export function PaymentSchedulePage({ paymentSchedule, setIsAddPaymentOpen, onChanged, canManage, members }: PaymentSchedulePageProps) {
  const [filter, setFilter] = useState("all");
  const [currentPayment, setCurrentPayment] = useState<Payment | null>(null);
  const [action, setAction] = useState<"edit" | "delete" | "reminder" | null>(null);
  const [saving, setSaving] = useState(false);
  const saveLock = useRef(false);
  const [editForm, setEditForm] = useState({ title: "", amount: "", dueDate: "", members: "" });
  const [reminder, setReminder] = useState("");
  const today = localDate();
  const nextWeek = new Date();
  nextWeek.setDate(nextWeek.getDate() + 7);
  const memberNames = (payment: Payment) => (payment.members ?? []).map(member => members.find(profile => profile.id === member)?.name ?? member).join(", ") || "Não informado";
  const filteredPayments = paymentSchedule.filter(payment => filter === "all" || (filter === "overdue" ? payment.due_date.slice(0, 10) < today : payment.due_date.slice(0, 10) >= today && payment.due_date.slice(0, 10) <= localDate(nextWeek)));

  const openAction = (payment: Payment, nextAction: typeof action) => {
    setCurrentPayment(payment);
    setAction(nextAction);
    setEditForm({ title: payment.title, amount: String(payment.amount), dueDate: payment.due_date.slice(0, 10), members: (payment.members ?? []).join(", ") });
    setReminder(`GuildVault — ${payment.title}\nContribuição: $${payment.amount.toLocaleString("pt-BR")} por membro\nPrazo: ${calendarDate(payment.due_date).toLocaleDateString("pt-BR")}\nResponsáveis: ${memberNames(payment)}\nConfira a agenda e registre seu depósito no sistema.`);
  };

  const save = async () => {
    if (!currentPayment || !canManage || saveLock.current) return;
    if (action === "edit" && (!editForm.title.trim() || !isPositiveAmount(editForm.amount) || !isCalendarDate(editForm.dueDate))) {
      toast({ title: "Dados inválidos", description: "Informe título, valor positivo de até $1.000.000.000 e data válida.", variant: "destructive" });
      return;
    }
    saveLock.current = true;
    setSaving(true);
    try {
      const result = action === "delete"
        ? await deletePaymentSchedule(currentPayment.id)
        : await updatePaymentSchedule(currentPayment.id, { title: editForm.title.trim(), amount: Number(editForm.amount), due_date: editForm.dueDate, members: editForm.members.split(",").map(member => member.trim()).filter(Boolean) });
      if (result.success) {
        setAction(null);
        await onChanged();
      }
    } finally {
      saveLock.current = false;
      setSaving(false);
    }
  };

  const copyReminder = async () => {
    try {
      await navigator.clipboard.writeText(reminder);
      toast({ title: "Lembrete copiado", description: "Compartilhe manualmente com sua equipe." });
    } catch {
      toast({ title: "Cópia indisponível neste navegador", description: "Selecione o texto do lembrete e copie manualmente. Em HTTP, a área de transferência pode estar bloqueada." });
    }
  };

  return (
    <Card>
      <CardHeader className="space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div><CardTitle>Cronograma de Pagamentos</CardTitle><CardDescription>Agenda de contribuições. Prazos não indicam quitação: confira os lançamentos no caixa.</CardDescription></div>
          {canManage && <Button onClick={() => setIsAddPaymentOpen(true)}>Agendar Pagamento</Button>}
        </div>
        <div className="flex flex-wrap gap-2" aria-label="Filtrar agenda">
          {[{ value: "all", label: "Todos" }, { value: "overdue", label: "Prazo vencido" }, { value: "week", label: "Próximos 7 dias" }].map(option => <Button key={option.value} size="sm" variant={filter === option.value ? "default" : "outline"} aria-pressed={filter === option.value} onClick={() => setFilter(option.value)}>{option.label}</Button>)}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground" aria-live="polite">{filteredPayments.length} agendamentos neste filtro</p>
        {filteredPayments.map(payment => (
          <article key={payment.id} className="rounded-lg border border-white/10 p-4">
            <div className="flex flex-wrap justify-between gap-2">
              <div><h3 className="text-lg font-medium">{payment.title}</h3><p className="text-sm text-muted-foreground">Prazo: {calendarDate(payment.due_date).toLocaleDateString("pt-BR")}</p></div>
              <p>${payment.amount.toLocaleString("pt-BR")} <span className="text-xs text-muted-foreground">por membro</span></p>
            </div>
            <div className="my-3"><Badge variant="outline">{payment.due_date.slice(0, 10) < today ? "Prazo vencido" : payment.due_date.slice(0, 10) === today ? "Prazo hoje" : "Programado"}</Badge></div>
            <p className="mb-3 break-words text-sm text-muted-foreground">Responsáveis: {memberNames(payment)}</p>
            <div className="flex flex-wrap gap-2">
              <Button size="sm" variant="outline" onClick={() => openAction(payment, "reminder")}>Gerar lembrete</Button>
              {canManage && <><Button size="sm" variant="outline" onClick={() => openAction(payment, "edit")}>Editar</Button><Button size="sm" variant="destructive" onClick={() => openAction(payment, "delete")}>Excluir</Button></>}
            </div>
          </article>
        ))}
        {filteredPayments.length === 0 && <p className="py-8 text-center text-muted-foreground">{paymentSchedule.length ? "Nenhum agendamento neste filtro." : "Nenhum pagamento agendado. Organize sua primeira contribuição."}</p>}
      </CardContent>
      <Dialog open={action !== null} onOpenChange={open => !open && !saving && setAction(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>{action === "edit" ? "Editar Pagamento" : action === "delete" ? "Excluir agendamento" : "Lembrete para a equipe"}</DialogTitle><DialogDescription>{action === "delete" ? `Excluir “${currentPayment?.title}”? A ação não pode ser desfeita e não altera transações financeiras.` : action === "reminder" ? "Edite e compartilhe este texto manualmente. Nenhuma notificação é enviada automaticamente." : "Altere os dados e salve para atualizar a agenda."}</DialogDescription></DialogHeader>
          {action === "edit" && <div className="space-y-3">
            <Label htmlFor="schedule-title">Título</Label><Input id="schedule-title" maxLength={160} value={editForm.title} onChange={event => setEditForm({ ...editForm, title: event.target.value })} />
            <Label htmlFor="schedule-amount">Valor por membro</Label><Input id="schedule-amount" type="number" min="0.01" step="0.01" value={editForm.amount} onChange={event => setEditForm({ ...editForm, amount: event.target.value })} />
            <Label htmlFor="schedule-date">Vencimento</Label><Input id="schedule-date" type="date" value={editForm.dueDate} onChange={event => setEditForm({ ...editForm, dueDate: event.target.value })} />
            <Label htmlFor="schedule-members">Responsáveis (nomes ou IDs separados por vírgula)</Label><Input id="schedule-members" value={editForm.members} onChange={event => setEditForm({ ...editForm, members: event.target.value })} />
          </div>}
          {action === "reminder" && <Textarea aria-label="Texto do lembrete" rows={7} value={reminder} onChange={event => setReminder(event.target.value)} onFocus={event => event.target.select()} />}
          <DialogFooter><Button variant="outline" disabled={saving} onClick={() => setAction(null)}>Cancelar</Button>{action === "reminder" ? <Button onClick={copyReminder}>Copiar lembrete</Button> : <Button disabled={saving} variant={action === "delete" ? "destructive" : "default"} onClick={save}>{saving ? "Salvando…" : action === "delete" ? "Confirmar exclusão" : "Salvar alterações"}</Button>}</DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
