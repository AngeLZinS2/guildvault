export type DemoRow = Record<string, unknown> & { id: string };

export const DEMO_USER_ID = 'demo-leader';

export function createDemoData(now = new Date()): { tables: Record<string, DemoRow[]>; records: DemoRow[]; audit: DemoRow[] } {
  const date = (days: number) => {
    const value = new Date(now.getTime());
    value.setHours(12, 0, 0, 0);
    value.setDate(value.getDate() + days);
    return `${String(value.getFullYear()).padStart(4, '0')}-${String(value.getMonth() + 1).padStart(2, '0')}-${String(value.getDate()).padStart(2, '0')}`;
  };
  const profiles: DemoRow[] = [
    [DEMO_USER_ID, 'Visitante · Crew Eclipse', 'Eclipse', 'superadmin'],
    ['demo-radio', 'Rádio Fantasma', 'Rádio', 'admin'],
    ['demo-nitro', 'Nitro Nebulosa', 'Nitro', 'member'],
    ['demo-lua', 'Lua de Cromo', 'Lua', 'member'],
    ['demo-parafuso', 'Parafuso Lunar', 'Parafuso', 'member'],
    ['demo-eco', 'Eco do Asfalto', 'Eco', 'member'],
  ].map(([id, name, alias_name, role], index) => ({
    id, name, alias_name, role, state_id: index === 0 ? 'DEMO' : `DEMO-${index}`,
    status: index === 5 ? 'inactive' : 'active', join_date: date(-170 + index * 19), last_activity: date(-index % 3),
  }));
  const properties: DemoRow[] = [
    { id: 'demo-base-small', number: 'E-01', type: 'Pequena', location: 'Oficina Eclipse · Strawberry', created_at: date(-160) },
    { id: 'demo-base-medium', number: 'E-02', type: 'Media', location: 'Ponto de encontro · La Mesa', created_at: date(-120) },
    { id: 'demo-base-large', number: 'E-03', type: 'Grande', location: 'Galpão da crew · Terminal', created_at: date(-80) },
  ];
  const items: DemoRow[] = [
    ['demo-metal', 'Chapas de metal', 'demo-base-small', 120],
    ['demo-rubber', 'Borracha', 'demo-base-small', 80],
    ['demo-kit', 'Kit de reparo', 'demo-base-small', 14],
    ['demo-radio-item', 'Rádio portátil', 'demo-base-medium', 6],
    ['demo-fuel', 'Galão de combustível', 'demo-base-medium', 0],
    ['demo-crate', 'Caixa de ferramentas', 'demo-base-large', 9],
    ['demo-tire', 'Pneu reserva', 'demo-base-large', 0],
  ].map(([id, name, property_id, quantity]) => ({ id: String(id), name, property_id, quantity, icon_url: null, created_at: date(-60) }));
  const finances: DemoRow[] = Array.from({ length: 24 }, (_, index) => {
    const withdrawal = index % 3 === 0;
    const verified = index % 5 !== 0;
    return {
      id: `demo-finance-${index + 1}`, type: withdrawal ? 'withdrawal' : 'deposit',
      amount: 100 + ((index * 1973) % 49901), member_id: profiles[index % profiles.length].id,
      date: date(-index * 7), description: withdrawal ? 'Manutenção da frota Eclipse' : 'Contribuição da crew · encontro automotivo',
      status: verified ? 'verified' : 'pending', verified, verified_by: verified ? DEMO_USER_ID : null,
      verification_notes: verified ? 'Conferido pela liderança fictícia.' : null, proof_url: null,
    };
  });
  const tables: Record<string, DemoRow[]> = {
    profiles, properties, items, finances,
    goals: [
      { id: 'demo-goal-active', title: 'Reforma do galpão Eclipse', target_amount: 150000, current_amount: 92500, start_date: date(-30), end_date: date(30), created_at: date(-30) },
      { id: 'demo-goal-completed', title: 'Ferramentas para Parafuso', target_amount: 25000, current_amount: 25000, start_date: date(-60), end_date: date(-10), created_at: date(-60) },
      { id: 'demo-goal-overdue', title: 'Reserva para pneus da frota', target_amount: 40000, current_amount: 18000, start_date: date(-45), end_date: date(-3), created_at: date(-45) },
    ],
    payment_schedule: [
      { id: 'demo-payment-1', title: 'Cota semanal do galpão', amount: 1500, members: profiles.map(profile => profile.id), due_date: date(5), created_at: date(-2) },
      { id: 'demo-payment-2', title: 'Revisão do Sultan', amount: 3200, members: ['demo-nitro', 'demo-parafuso'], due_date: date(12), created_at: date(-4) },
      { id: 'demo-payment-3', title: 'Rádios do comboio', amount: 800, members: [DEMO_USER_ID, 'demo-radio'], due_date: date(-2), created_at: date(-14) },
    ],
    property_transactions: [],
  };
  const record = (id: string, module: string, title: string, status: string, data: Record<string, unknown>, days = -2): DemoRow => ({
    id, module, title, status, data, created_at: date(days),
  });
  const records: DemoRow[] = [
    record('demo-organization', 'organization', 'Crew Eclipse', 'active', { type: 'mixed', description: 'Crew fictícia de mecânicos e pilotos: encontros, comboios e apoio nas ruas de Los Santos.' }, -170),
    record('demo-role', 'roles', 'Equipe de pista', 'active', { department: 'Logística e oficina', members: ['demo-nitro', 'demo-parafuso'], permissions: ['vehicles', 'stock', 'recipes', 'orders', 'operations'] }),
    record('demo-vehicle', 'vehicles', 'Sultan · Cometa Azul', 'available', { plate: 'ECLIPSE', owner: 'demo-nitro', location: 'Oficina Eclipse · Strawberry', notes: 'Revisado por Parafuso; pronto para o comboio.' }),
    record('demo-operation', 'operations', 'Comboio da meia-lua', 'planned', { category: 'Encontro automotivo', date: date(3), leader: 'demo-radio', members: [DEMO_USER_ID, 'demo-nitro', 'demo-lua'], location: 'Observatório Galileo', vehicle: 'demo-vehicle', materials: [{ item: 'demo-kit', quantity: 2 }], instructions: 'Rádio abre o comboio; Lua organiza a chegada. Confirmar presença antes da saída.', income: 4500, expense: 1200, _attendance: ['demo-radio'] }),
    record('demo-charge', 'charges', 'Cota de apoio à oficina', 'pending', { member: DEMO_USER_ID, kind: 'money', amount: 1500, date: date(5), period: 'Próximo encontro da Eclipse' }),
    record('demo-recruit', 'recruitment', 'Faísca de Neon', 'interview', { state_id: 'DEMO-CANDIDATO', contact: 'Encontrar no galpão Eclipse durante o RP', mentor: 'demo-lua', notes: 'Personagem fictício; quer aprender mecânica e ajudar nos encontros.' }),
    record('demo-training', 'training', 'Comunicação de comboio', 'scheduled', { member: 'demo-eco', mentor: 'demo-radio', date: date(2), notes: 'Praticar chamadas curtas e distância segura entre veículos.' }),
    record('demo-recipe', 'recipes', 'Kit de reparo Eclipse', 'active', { ingredients: [{ item: 'demo-metal', quantity: 3 }, { item: 'demo-rubber', quantity: 2 }], output_item: 'demo-kit', output_quantity: 1 }),
    record('demo-order', 'orders', 'Cinco kits para o comboio', 'pending', { recipe: 'demo-recipe', quantity: 5, member: 'demo-parafuso', date: date(1) }),
    record('demo-notice', 'notices', 'A Eclipse cuida de quem chega', 'published', { category: 'Regulamento', content: 'Receba novos pilotos, devolva os veículos revisados e registre retiradas de material. Confirme a leitura antes do próximo encontro.', date: date(4), _readers: ['demo-radio', 'demo-lua'] }),
  ];
  const audit: DemoRow[] = [
    { id: 'demo-audit-1', actor: DEMO_USER_ID, module: 'notices', action: 'create', created_at: date(-2), detail: { record_id: 'demo-notice', title: 'A Eclipse cuida de quem chega' } },
    { id: 'demo-audit-2', actor: 'demo-radio', module: 'operations', action: 'attend', created_at: date(-1), detail: { record_id: 'demo-operation', member: 'demo-radio' } },
  ];
  return { tables, records, audit };
}
