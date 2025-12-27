
export type OperationType = 'inbound' | 'outbound' | 'service'; 
export type UserRole = 'admin' | 'operator';

export interface User {
  id: string;
  name: string;
  username: string;
  password: string; // In a real app, this should be hashed
  role: UserRole;
}

export interface ServiceItem {
  id: string;
  name: string;
  price: number;
  icon?: string; // 'box' | 'pallet' | 'default'
}

export interface CostCenter {
  id: string;
  name: string;
  address: string;
}

export interface Company {
  id: string;
  name: string;
  cnpj: string;
  contact: string;
}

export interface Truck {
  id: string;
  plate: string;
  driverName: string;
  companyId: string;
  type: string; // e.g., 'Truck', 'Carreta', 'Vuc'
}

export interface Pricing {
  pricePerPallet: number;
  pricePerBox: number;
}

export interface TicketLog {
  timestamp: string;
  action: 'registered' | 'cancelled' | 'returned_to_yard' | 'completed';
  userRole: string; // Agora armazena "Cargo - Nome"
  details?: string;
}

// Representa a entrada na portaria (Check-in)
export interface Ticket {
  id: string;
  number: string; // Sequencial visível
  costCenterId: string;
  entryTimestamp: string;
  exitTimestamp?: string;
  
  // Dados Obrigatórios da Entrada
  companyName: string; // Pode ser texto livre ou vinculado
  driverName: string;
  plate: string;
  cargoType: string; // Ex: 'Paletizada', 'Granel'

  // Dados Opcionais da Entrada
  invoiceNumber?: string; // Nota Fiscal
  weight?: string;
  volume?: string;
  palletCount?: string; // Novo campo
  driverPhone?: string; // Novo campo (WhatsApp)

  status: 'open' | 'completed' | 'cancelled';
  cancellationReason?: string;
  
  // Histórico de Eventos
  logs: TicketLog[];

  items?: CartItem[]; // Itens cobrados no final
  totalPrice?: number;
  paymentMethod?: string;
}

export interface Movement {
  id: string;
  timestamp: string;
  truckId?: string; // Opcional, pois pode vir de um Ticket avulso
  companyId?: string;
  costCenterId: string; // Linked to Cost Center
  operationType: OperationType;
  unitType: string; // Service Name
  quantity: number;
  unitPriceSnapshot: number; 
  totalPrice: number;
  status: 'completed' | 'pending';
  paymentMethod?: 'cash' | 'card' | 'pix' | 'account';
  batchId?: string;
  ticketId?: string; // Link para o Ticket de Entrada
  notes?: string;
  
  // Snapshot dos dados de entrada para o histórico
  invoiceNumber?: string;
  weight?: string;
  volume?: string;
}

export interface CartItem {
  service: ServiceItem;
  quantity: number;
}

export interface TransactionDraft {
  truck: Truck | null; // Pode ser null se vier apenas do Ticket
  ticket?: Ticket; // Link opcional se vier da portaria
  company: Company | { name: string, id?: string, cnpj?: string }; // Flexível para aceitar dados da portaria
  items: CartItem[];
  total: number;
  notes: string;
}

export interface AppState {
  users: User[]; // Lista de usuários locais/fallback
  operators: User[]; // Lista de operadores sincronizados do banco
  companies: Company[];
  trucks: Truck[];
  movements: Movement[];
  services: ServiceItem[]; 
  costCenters: CostCenter[]; 
  tickets: Ticket[]; 
  activeCostCenterId: string | null; 
  pricing: Pricing; 
}
