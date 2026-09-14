import { Lead, Conversation } from '../../types';

export const INITIAL_LEADS: Lead[] = [
  {
    id: 'lead-1',
    propertyId: 'prop-1',
    propertyTitle: 'Central Station - Apartamento Alto Padrão no Centro',
    propertyCode: '24636068-MEOA',
    propertyPrice: 485000,
    propertyImage: 'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?auto=format&fit=crop&w=400&q=80',
    advertiserId: 'user_current',
    buyerName: 'Mariana Silveira',
    buyerEmail: 'mariana.silveira@gmail.com',
    buyerPhone: '(15) 99788-1234',
    buyerWhatsapp: '5515997881234',
    buyerDocument: '348.912.458-90',
    buyerOccupation: 'Gerente Comercial',
    buyerEstimatedIncome: 18000,
    message: 'Olá! Tenho interesse no imóvel código 24636068-MEOA. Gostaria de agendar uma visita presencial neste sábado pela manhã e saber sobre as opções de financiamento.',
    origin: 'portal_form',
    originDetails: 'Formulário de Detalhes do Imóvel',
    status: 'visit_scheduled',
    priority: 'high',
    budget: 500000,
    budgetMin: 450000,
    budgetMax: 530000,
    desiredLocation: 'Centro, Jardim Vergueiro, Sorocaba',
    preferences: {
      purpose: 'sale',
      types: ['apartment'],
      minBedrooms: 2,
      minBathrooms: 2,
      minParkingSpots: 1,
      desiredNeighborhoods: ['Centro', 'Jardim Vergueiro', 'Vila Leão'],
      desiredCity: 'Sorocaba',
      desiredAmenities: ['piscina', 'academia', 'varanda_gourmet', 'portaria_24h']
    },
    interestedPropertyIds: ['prop-1', 'prop-8'],
    interestedProperties: [
      { propertyId: 'prop-1', addedAt: '2026-08-30T14:15:00Z', compatibilityScore: 98, status: 'visited' },
      { propertyId: 'prop-8', addedAt: '2026-08-30T16:20:00Z', compatibilityScore: 84, status: 'interested' }
    ],
    notes: 'Cliente pré-aprovada na Caixa Econômica. Já possui 30% de entrada em FGTS e poupança.',
    privateNotes: 'Disposta a fechar rápido caso consiga desconto na taxa de escritura. Não aceita andar baixo.',
    scheduledVisitDate: '2026-09-05T10:30:00',
    nextFollowUpDate: '2026-09-05T14:00:00',
    lastContactDate: '2026-08-31T09:00:00Z',
    tags: ['Financiamento Caixa', 'Entrada Pronta', 'Visita Confirmada', 'Urgente'],
    accessRestricted: false,
    assignedBrokerId: 'user_current',
    assignedBrokerName: 'Edson Ricardo',
    tasks: [
      {
        id: 'task-101',
        leadId: 'lead-1',
        title: 'Acompanhar visita presencial no Central Station',
        dueDate: '2026-09-05',
        dueTime: '10:30',
        type: 'visit',
        priority: 'high',
        completed: false,
        notes: 'Levar cópia da convenção de condomínio e demonstrativo de IPTU.'
      },
      {
        id: 'task-102',
        leadId: 'lead-1',
        title: 'Ligar para confirmar presença na visita de sábado',
        dueDate: '2026-09-04',
        dueTime: '16:00',
        type: 'call',
        priority: 'medium',
        completed: false
      }
    ],
    interactions: [
      {
        id: 'int-101',
        leadId: 'lead-1',
        type: 'system',
        title: 'Lead Recebido via Portal',
        description: 'Cliente enviou solicitação de agendamento através do formulário do imóvel 24636068-MEOA.',
        createdAt: '2026-08-30T14:15:00Z',
        createdBy: 'Sistema Web Imóvel'
      },
      {
        id: 'int-102',
        leadId: 'lead-1',
        type: 'whatsapp',
        title: 'Contato por WhatsApp e Envio de Vídeo',
        description: 'Enviado tour virtual e fotos adicionais do imóvel. Mariana confirmou interesse e agendou visita para sábado 10:30.',
        createdAt: '2026-08-30T15:45:00Z',
        createdBy: 'Edson Ricardo'
      },
      {
        id: 'int-103',
        leadId: 'lead-1',
        type: 'status_change',
        title: 'Status Alterado para Visita Agendada',
        description: 'Lead avançou para o estágio Visita Agendada no funil de vendas.',
        createdAt: '2026-08-30T16:00:00Z',
        createdBy: 'Edson Ricardo'
      }
    ],
    createdAt: '2026-08-30T14:15:00Z',
    updatedAt: '2026-08-30T16:00:00Z'
  },
  {
    id: 'lead-2',
    propertyId: 'prop-2',
    propertyTitle: 'Mansão Neoclássica com Vista Panorâmica em Alphaville',
    propertyCode: '38914022-ALPH',
    propertyPrice: 3750000,
    propertyImage: 'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?auto=format&fit=crop&w=400&q=80',
    advertiserId: 'user_current',
    buyerName: 'Dr. Roberto Vasconcelos',
    buyerEmail: 'roberto.vasconcelos@med.br',
    buyerPhone: '(11) 98122-9988',
    buyerWhatsapp: '5511981229988',
    buyerDocument: '189.442.110-33',
    buyerOccupation: 'Médico Cirurgião',
    buyerEstimatedIncome: 85000,
    message: 'Gostaria de saber se o proprietário aceita permuta parcial por apartamento no Campolim no valor de R$ 1.2M.',
    origin: 'whatsapp',
    originDetails: 'Clique no botão WhatsApp do Portal',
    status: 'negotiation',
    priority: 'vip',
    budget: 3800000,
    budgetMin: 3200000,
    budgetMax: 4200000,
    desiredLocation: 'Alphaville Nova Esplanada, Fazenda Alvorada',
    preferences: {
      purpose: 'sale',
      types: ['condo_house', 'house'],
      minBedrooms: 4,
      minBathrooms: 5,
      minParkingSpots: 4,
      minArea: 400,
      desiredNeighborhoods: ['Alphaville Nova Esplanada', 'Parque Campolim'],
      desiredCity: 'Votorantim',
      desiredAmenities: ['piscina', 'churrasqueira', 'academia', 'quadra_tenis', 'sauna', 'portaria_24h']
    },
    interestedPropertyIds: ['prop-2', 'prop-5'],
    interestedProperties: [
      { propertyId: 'prop-2', addedAt: '2026-08-29T11:00:00Z', compatibilityScore: 96, status: 'proposed' }
    ],
    notes: 'Enviada contraproposta de R$ 3.6M com permuta de R$ 1.1M. Aguardando laudo de vistoria do apartamento.',
    privateNotes: 'Comprador tem alto poder aquisitivo e liquidez imediata para o saldo residual.',
    scheduledVisitDate: '2026-08-29T15:00:00',
    nextFollowUpDate: '2026-09-02T11:00:00',
    lastContactDate: '2026-08-30T17:00:00Z',
    tags: ['Investidor VIP', 'Permuta', 'Alto Padrão', 'Em Negociação'],
    accessRestricted: true,
    assignedBrokerId: 'user_current',
    assignedBrokerName: 'Edson Ricardo',
    tasks: [
      {
        id: 'task-201',
        leadId: 'lead-2',
        title: 'Receber laudo de avaliação do apartamento do Campolim',
        dueDate: '2026-09-02',
        dueTime: '11:00',
        type: 'follow_up',
        priority: 'urgent',
        completed: false,
        notes: 'Avaliador Sérgio enviará por e-mail até quarta-feira.'
      },
      {
        id: 'task-202',
        leadId: 'lead-2',
        title: 'Reunião com proprietário para fechamento da minuta',
        dueDate: '2026-09-03',
        dueTime: '15:00',
        type: 'meeting',
        priority: 'high',
        completed: false
      }
    ],
    interactions: [
      {
        id: 'int-201',
        leadId: 'lead-2',
        type: 'whatsapp',
        title: 'Contato inicial via WhatsApp',
        description: 'Dr. Roberto solicitou detalhes sobre a possibilidade de permuta imobiliária.',
        createdAt: '2026-08-29T11:00:00Z',
        createdBy: 'Edson Ricardo'
      },
      {
        id: 'int-202',
        leadId: 'lead-2',
        type: 'visit',
        title: 'Visita realizada na Mansão Alphaville',
        description: 'Cliente e esposa visitaram o imóvel por 1h30. Adoraram a área gourmet e a vista da suíte master.',
        createdAt: '2026-08-29T16:30:00Z',
        createdBy: 'Edson Ricardo'
      },
      {
        id: 'int-203',
        leadId: 'lead-2',
        type: 'proposal',
        title: 'Formalização de Proposta Escrita',
        description: 'Recebida proposta de R$ 3.600.000 (R$ 2.5M em dinheiro + R$ 1.1M em imóvel).',
        createdAt: '2026-08-30T09:30:00Z',
        createdBy: 'Edson Ricardo'
      }
    ],
    createdAt: '2026-08-29T11:00:00Z',
    updatedAt: '2026-08-30T09:30:00Z'
  },
  {
    id: 'lead-3',
    propertyId: 'prop-6',
    propertyTitle: 'Studio Mobiliado & Equipado no Além Ponte',
    propertyCode: '45812390-ALUG',
    propertyPrice: 2400,
    propertyImage: 'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?auto=format&fit=crop&w=400&q=80',
    advertiserId: 'user_current',
    buyerName: 'Lucas Fernandes',
    buyerEmail: 'lucas.fernandes@tech.io',
    buyerPhone: '(15) 98877-6655',
    buyerWhatsapp: '5515988776655',
    buyerOccupation: 'Engenheiro de Software',
    buyerEstimatedIncome: 12000,
    message: 'Preciso me mudar urgente no dia 15 deste mês por conta de transferência de trabalho. Qual a garantia locatícia solicitada?',
    origin: 'portal_form',
    originDetails: 'Formulário de Aluguel no Portal',
    status: 'new',
    priority: 'high',
    budget: 2600,
    budgetMin: 1800,
    budgetMax: 2800,
    desiredLocation: 'Além Ponte, Centro, Campolim',
    preferences: {
      purpose: 'rent',
      types: ['apartment'],
      minBedrooms: 1,
      minBathrooms: 1,
      minParkingSpots: 1,
      desiredNeighborhoods: ['Além Ponte', 'Centro', 'Campolim'],
      desiredCity: 'Sorocaba',
      desiredAmenities: ['portaria_24h', 'academia', 'elevador']
    },
    interestedPropertyIds: ['prop-6', 'prop-7'],
    notes: 'Aceita seguro fiança CredPago ou fiador.',
    nextFollowUpDate: '2026-08-31T14:00:00',
    tags: ['Locação Rápida', 'Mobiliado', 'Mudança Próxima'],
    accessRestricted: false,
    assignedBrokerId: 'user_current',
    assignedBrokerName: 'Edson Ricardo',
    tasks: [
      {
        id: 'task-301',
        leadId: 'lead-3',
        title: 'Primeiro contato telefônico e envio de checklist de locação',
        dueDate: '2026-08-31',
        dueTime: '14:00',
        type: 'call',
        priority: 'urgent',
        completed: false,
        notes: 'Explicar aprovação de crédito online sem burocracia.'
      }
    ],
    interactions: [
      {
        id: 'int-301',
        leadId: 'lead-3',
        type: 'system',
        title: 'Novo Lead de Locação Criado',
        description: 'Cliente cadastrou interesse no Studio Mobiliado.',
        createdAt: '2026-08-31T04:20:00Z',
        createdBy: 'Sistema Web Imóvel'
      }
    ],
    createdAt: '2026-08-31T04:20:00Z',
    updatedAt: '2026-08-31T04:20:00Z'
  },
  {
    id: 'lead-4',
    propertyId: 'prop-1',
    propertyTitle: 'Central Station - Apartamento Alto Padrão no Centro',
    propertyCode: '24636068-MEOA',
    propertyPrice: 485000,
    propertyImage: 'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?auto=format&fit=crop&w=400&q=80',
    advertiserId: 'user_current',
    buyerName: 'Camila Duarte',
    buyerEmail: 'camiladuarte@adv.br',
    buyerPhone: '(15) 99111-2233',
    buyerWhatsapp: '5515991112233',
    buyerOccupation: 'Advogada Tributarista',
    buyerEstimatedIncome: 22000,
    message: 'Tem vaga para carro grande tipo SUV? Aceita proposta à vista com desconto?',
    origin: 'phone_call',
    originDetails: 'Ligação direta para a Imobiliária',
    status: 'contacted',
    priority: 'medium',
    budget: 460000,
    budgetMin: 420000,
    budgetMax: 490000,
    desiredLocation: 'Centro, Santa Rosália',
    preferences: {
      purpose: 'sale',
      types: ['apartment'],
      minBedrooms: 2,
      minBathrooms: 2,
      minParkingSpots: 2,
      desiredNeighborhoods: ['Centro', 'Jardim Santa Rosália'],
      desiredCity: 'Sorocaba'
    },
    interestedPropertyIds: ['prop-1', 'prop-8'],
    notes: 'Vaga é coberta no subsolo 1, cabe SUV tranquilamente. Pagamento à vista.',
    lastContactDate: '2026-08-28T14:00:00Z',
    nextFollowUpDate: '2026-09-01T10:00:00',
    tags: ['Pagamento À Vista', 'Vaga Dupla', 'Em Contato'],
    accessRestricted: false,
    assignedBrokerId: 'user_current',
    assignedBrokerName: 'Edson Ricardo',
    tasks: [
      {
        id: 'task-401',
        leadId: 'lead-4',
        title: 'Enviar planta das vagas de garagem e vídeo da entrada',
        dueDate: '2026-09-01',
        dueTime: '10:00',
        type: 'whatsapp',
        priority: 'medium',
        completed: false
      }
    ],
    interactions: [
      {
        id: 'int-401',
        leadId: 'lead-4',
        type: 'call',
        title: 'Atendimento telefônico receptivo',
        description: 'Tiradas dúvidas sobre dimensões da vaga de garagem e condomínio.',
        createdAt: '2026-08-28T09:40:00Z',
        createdBy: 'Edson Ricardo'
      }
    ],
    createdAt: '2026-08-28T09:40:00Z',
    updatedAt: '2026-08-28T14:00:00Z'
  },
  {
    id: 'lead-5',
    propertyId: 'prop-3',
    propertyTitle: 'Apartamento Garden no Parque Campolim com 3 Suítes',
    propertyCode: '19854091-CAMP',
    propertyPrice: 1350000,
    propertyImage: 'https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?auto=format&fit=crop&w=400&q=80',
    advertiserId: 'user_current',
    buyerName: 'Henrique Barreto',
    buyerEmail: 'henrique.barreto@globo.com',
    buyerPhone: '(15) 99655-4433',
    buyerWhatsapp: '5515996554433',
    buyerOccupation: 'Empresário',
    buyerEstimatedIncome: 45000,
    message: 'Gostaria de saber se o condomínio aceita pets de porte grande (Golden Retriever) e se a jacuzzi tem aquecimento solar.',
    origin: 'referral',
    originDetails: 'Indicação de cliente antigo (Dr. Paulo)',
    status: 'interested',
    priority: 'high',
    budget: 1400000,
    budgetMin: 1200000,
    budgetMax: 1500000,
    desiredLocation: 'Parque Campolim, Jardim Faculdade',
    preferences: {
      purpose: 'sale',
      types: ['apartment', 'penthouse'],
      minBedrooms: 3,
      minBathrooms: 3,
      minParkingSpots: 2,
      desiredNeighborhoods: ['Parque Campolim', 'Jardim Faculdade'],
      desiredCity: 'Sorocaba',
      desiredAmenities: ['piscina', 'churrasqueira', 'varanda_gourmet', 'pet_friendly']
    },
    interestedPropertyIds: ['prop-3'],
    notes: 'Tem 2 filhos e 1 pet grande. O garden é perfeito para a família.',
    nextFollowUpDate: '2026-09-02T15:00:00',
    tags: ['Família', 'Pet Friendly', 'Indicação', 'Campolim'],
    accessRestricted: false,
    assignedBrokerId: 'user_current',
    assignedBrokerName: 'Edson Ricardo',
    tasks: [
      {
        id: 'task-501',
        leadId: 'lead-5',
        title: 'Enviar regulamento interno do condomínio sobre animais',
        dueDate: '2026-09-02',
        dueTime: '15:00',
        type: 'email',
        priority: 'high',
        completed: false
      }
    ],
    interactions: [
      {
        id: 'int-501',
        leadId: 'lead-5',
        type: 'call',
        title: 'Qualificação inicial do cliente',
        description: 'Henrique foi indicado pelo Dr. Paulo. Busca imóvel pronto para morar no Campolim.',
        createdAt: '2026-08-27T10:00:00Z',
        createdBy: 'Edson Ricardo'
      }
    ],
    createdAt: '2026-08-27T10:00:00Z',
    updatedAt: '2026-08-29T11:00:00Z'
  },
  {
    id: 'lead-6',
    propertyId: 'prop-4',
    propertyTitle: 'Casa Térrea Moderna no Condomínio Ibiti Reserva',
    propertyCode: '91204855-IBIT',
    propertyPrice: 890000,
    propertyImage: 'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?auto=format&fit=crop&w=400&q=80',
    advertiserId: 'user_current',
    buyerName: 'Patrícia & Gustavo Mendes',
    buyerEmail: 'familia.mendes@uol.com.br',
    buyerPhone: '(15) 99822-7711',
    buyerWhatsapp: '5515998227711',
    buyerOccupation: 'Servidores Públicos',
    buyerEstimatedIncome: 28000,
    message: 'Enviamos proposta de R$ 850.000 à vista com sinal de 20% no ato do compromisso.',
    origin: 'portal_form',
    originDetails: 'Formulário Portal Proposta Oficial',
    status: 'proposal',
    priority: 'urgent',
    budget: 900000,
    budgetMin: 800000,
    budgetMax: 920000,
    desiredLocation: 'Ibiti Reserva, Ibiti Royal, Éden',
    preferences: {
      purpose: 'sale',
      types: ['condo_house', 'house'],
      minBedrooms: 3,
      minBathrooms: 3,
      minParkingSpots: 2,
      desiredNeighborhoods: ['Ibiti Reserva', 'Ibiti Royal'],
      desiredCity: 'Sorocaba'
    },
    interestedPropertyIds: ['prop-4'],
    notes: 'Proposta formalizada na mesa do proprietário. Aguardando aceite até amanhã.',
    nextFollowUpDate: '2026-09-01T17:00:00',
    tags: ['Proposta Ativa', 'Condomínio Fechado', 'Casal'],
    accessRestricted: false,
    assignedBrokerId: 'user_current',
    assignedBrokerName: 'Edson Ricardo',
    tasks: [
      {
        id: 'task-601',
        leadId: 'lead-6',
        title: 'Cobrar resposta do vendedor sobre proposta de R$ 850k',
        dueDate: '2026-09-01',
        dueTime: '17:00',
        type: 'call',
        priority: 'urgent',
        completed: false
      }
    ],
    interactions: [
      {
        id: 'int-601',
        leadId: 'lead-6',
        type: 'proposal',
        title: 'Proposta de R$ 850.000 recebida',
        description: 'Documento assinado digitalmente pelo casal Mendes.',
        createdAt: '2026-08-30T18:00:00Z',
        createdBy: 'Edson Ricardo'
      }
    ],
    createdAt: '2026-08-25T14:00:00Z',
    updatedAt: '2026-08-30T18:00:00Z'
  },
  {
    id: 'lead-7',
    propertyId: 'prop-8',
    propertyTitle: 'Apartamento com Varanda Gourmet no Jardim Santa Rosália',
    propertyCode: '33491022-SANTA',
    propertyPrice: 620000,
    propertyImage: 'https://images.unsplash.com/photo-1560185007-cde436f6a4d0?auto=format&fit=crop&w=400&q=80',
    advertiserId: 'user_current',
    buyerName: 'Juliana Fagundes',
    buyerEmail: 'juliana.fagundes@arquitetura.com.br',
    buyerPhone: '(15) 99188-3322',
    buyerWhatsapp: '5515991883322',
    buyerOccupation: 'Arquiteta Urbanista',
    buyerEstimatedIncome: 24000,
    message: 'Contrato de compra e venda assinado e escritura lavrada no 2º Cartório de Notas!',
    origin: 'social_media',
    originDetails: 'Instagram Imobiliária / Reels',
    status: 'closed_won',
    priority: 'low',
    budget: 620000,
    closedValue: 610000,
    desiredLocation: 'Jardim Santa Rosália',
    preferences: {
      purpose: 'sale',
      types: ['apartment'],
      minBedrooms: 3,
      desiredNeighborhoods: ['Jardim Santa Rosália'],
      desiredCity: 'Sorocaba'
    },
    interestedPropertyIds: ['prop-8'],
    notes: 'Negócio fechado com sucesso por R$ 610.000. Comissão 6% faturada.',
    tags: ['Negócio Fechado', 'Escritura Assinada', 'Cliente Satisfeita'],
    accessRestricted: false,
    assignedBrokerId: 'user_current',
    assignedBrokerName: 'Edson Ricardo',
    tasks: [],
    interactions: [
      {
        id: 'int-701',
        leadId: 'lead-7',
        type: 'status_change',
        title: 'Negócio Concluído / Venda Realizada',
        description: 'Chaves entregues e comissão liberada.',
        createdAt: '2026-08-28T16:00:00Z',
        createdBy: 'Edson Ricardo'
      }
    ],
    createdAt: '2026-08-15T11:00:00Z',
    updatedAt: '2026-08-28T16:00:00Z'
  },
  {
    id: 'lead-8',
    propertyId: 'prop-5',
    propertyTitle: 'Terreno Plano Pronto para Construir no Villa Flora',
    propertyCode: '78291033-VILL',
    propertyPrice: 320000,
    propertyImage: 'https://images.unsplash.com/photo-1500382017468-9049fed747ef?auto=format&fit=crop&w=400&q=80',
    advertiserId: 'user_current',
    buyerName: 'Marcelo Castro',
    buyerEmail: 'marcelocastro@gmail.com',
    buyerPhone: '(15) 99700-1122',
    buyerWhatsapp: '5515997001122',
    message: 'Infelizmente comprou outro lote em condomínio mais próximo dos pais.',
    origin: 'campaign',
    originDetails: 'Google Ads Campanha Lotes Sorocaba',
    status: 'lost',
    priority: 'low',
    budget: 350000,
    lostReason: 'Comprou imóvel com concorrente em outra região',
    desiredLocation: 'Villa Flora, Éden',
    notes: 'Lead arquivado como perdido. Manter na base para futuros lançamentos de lotes.',
    tags: ['Perdido', 'Comprou Concorrente', 'Loteamento'],
    accessRestricted: false,
    assignedBrokerId: 'user_current',
    assignedBrokerName: 'Edson Ricardo',
    tasks: [],
    interactions: [
      {
        id: 'int-801',
        leadId: 'lead-8',
        type: 'status_change',
        title: 'Lead marcado como Perdido',
        description: 'Cliente optou por condomínio em outra cidade.',
        createdAt: '2026-08-26T14:00:00Z',
        createdBy: 'Edson Ricardo'
      }
    ],
    createdAt: '2026-08-18T10:00:00Z',
    updatedAt: '2026-08-26T14:00:00Z'
  }
];

export const INITIAL_CONVERSATIONS: Conversation[] = [
  {
    id: 'conv-1',
    propertyId: 'prop-1',
    propertyTitle: 'Central Station - Apartamento no Centro',
    propertyImage: 'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?auto=format&fit=crop&w=400&q=80',
    propertyPrice: 485000,
    otherUser: {
      id: 'buyer-1',
      name: 'Mariana Silveira',
      email: 'mariana.silveira@gmail.com',
      phone: '(15) 99788-1234',
      avatarUrl: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=256&q=80',
      role: 'buyer'
    },
    lastMessage: 'Perfeito! Estarei lá no sábado às 10h30. Obrigada pelo atendimento rápido!',
    lastMessageTime: '10:45',
    unreadCount: 1,
    messages: [
      {
        id: 'msg-1',
        conversationId: 'conv-1',
        senderId: 'buyer-1',
        senderName: 'Mariana Silveira',
        text: 'Olá Edson, vi seu anúncio do Central Station e adorei as fotos da sala integrada.',
        createdAt: '2026-08-30T14:15:00Z',
        read: true
      },
      {
        id: 'msg-2',
        conversationId: 'conv-1',
        senderId: 'user_current',
        senderName: 'Edson Ricardo',
        text: 'Olá Mariana! Seja bem-vinda. O imóvel é realmente espetacular, com sol da manhã e marcenaria completa. Gostaria de conhecer pessoalmente?',
        createdAt: '2026-08-30T14:20:00Z',
        read: true
      },
      {
        id: 'msg-3',
        conversationId: 'conv-1',
        senderId: 'buyer-1',
        senderName: 'Mariana Silveira',
        text: 'Perfeito! Estarei lá no sábado às 10h30. Obrigada pelo atendimento rápido!',
        createdAt: '2026-08-30T14:35:00Z',
        read: false
      }
    ]
  },
  {
    id: 'conv-2',
    propertyId: 'prop-2',
    propertyTitle: 'Mansão Neoclássica em Alphaville',
    propertyImage: 'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?auto=format&fit=crop&w=400&q=80',
    propertyPrice: 3750000,
    otherUser: {
      id: 'buyer-2',
      name: 'Dr. Roberto Vasconcelos',
      email: 'roberto.vasconcelos@med.br',
      phone: '(11) 98122-9988',
      avatarUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=256&q=80',
      role: 'buyer'
    },
    lastMessage: 'Vou enviar a matrícula do imóvel de permuta para sua análise ainda hoje.',
    lastMessageTime: 'Ontem',
    unreadCount: 0,
    messages: [
      {
        id: 'msg-4',
        conversationId: 'conv-2',
        senderId: 'buyer-2',
        senderName: 'Dr. Roberto Vasconcelos',
        text: 'Boa tarde Edson. O proprietário avalia aceitar imóvel como parte de pagamento?',
        createdAt: '2026-08-29T11:00:00Z',
        read: true
      },
      {
        id: 'msg-5',
        conversationId: 'conv-2',
        senderId: 'user_current',
        senderName: 'Edson Ricardo',
        text: 'Boa tarde Dr. Roberto! Sim, até 35% do valor total se for no Campolim ou Jardim Paulistano com liquidez.',
        createdAt: '2026-08-29T11:30:00Z',
        read: true
      },
      {
        id: 'msg-6',
        conversationId: 'conv-2',
        senderId: 'buyer-2',
        senderName: 'Dr. Roberto Vasconcelos',
        text: 'Vou enviar a matrícula do imóvel de permuta para sua análise ainda hoje.',
        createdAt: '2026-08-29T15:20:00Z',
        read: true
      }
    ]
  }
];
