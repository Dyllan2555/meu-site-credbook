
import React, { useEffect, useState, useCallback } from 'react';

import Sidebar from './components/Sidebar';
import Dashboard from './components/Dashboard';
import PointOfSale from './components/PointOfSale';
import GateControl from './components/GateControl';
import Payment from './components/Payment';
import Registry from './components/Registry';
import History from './components/History';
import Settings from './components/Settings';
import Login from './components/Login';

import { loadData, saveData } from './services/storage';
import { fetchAllData, syncTable } from './services/supabase';
import { AppState, TransactionDraft, Ticket, User } from './types';
import { Menu, Store } from 'lucide-react';


function App() {
  const [currentView, setCurrentView] = useState('gate');
  const [data, setData] = useState<AppState>(loadData());
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  
  const [transactionDraft, setTransactionDraft] = useState<TransactionDraft | null>(null);

  const refreshDbData = useCallback(async () => {
    // Sincroniza dados globais mesmo antes do login para atualizar operadores
    setIsSyncing(true);
    try {
        const dbData = await fetchAllData();
        setData(prev => ({
            ...prev,
            ...dbData,
            // Preserva usuários locais caso o fetch falhe
            users: prev.users,
            operators: dbData.operators || prev.operators
        }));
    } catch (e) {
        console.error("Erro ao sincronizar:", e);
    } finally {
        setIsSyncing(false);
    }
  }, []);

  // Busca inicial de dados (incluindo operadores da nuvem)
  useEffect(() => {
    refreshDbData();
  }, [refreshDbData]);

  // Salva e Sincroniza quando os dados mudam e há um usuário logado
  useEffect(() => {
    saveData(data);
    
    if (currentUser) {
        const sync = async () => {
            await syncTable('empresas', data.companies);
            await syncTable('caminhoes', data.trucks);
            await syncTable('servicos', data.services);
            await syncTable('centros_custo', data.costCenters);
            await syncTable('tickets', data.tickets);
            await syncTable('movimentacoes', data.movements);
        };
        sync();
    }
  }, [data, currentUser]);

  if (!currentUser) {
      return <Login users={data.users} operators={data.operators} onLogin={setCurrentUser} />;
  }

  const isAdmin = currentUser.role === 'admin';

  const handleProceedToPayment = (draft: TransactionDraft) => {
    setTransactionDraft(draft);
    setCurrentView('payment');
  };

  const handlePaymentSuccess = (updatedData: AppState) => {
    if (transactionDraft?.ticket) {
        updatedData.tickets = updatedData.tickets.map(t => {
            if (t.id === transactionDraft.ticket!.id) {
                 return { 
                    ...t, 
                    status: 'completed', 
                    exitTimestamp: new Date().toISOString(),
                    logs: [
                        ...t.logs, 
                        {
                            timestamp: new Date().toISOString(),
                            action: 'completed',
                            userRole: `Caixa - ${currentUser.name}`,
                            details: `Pagamento confirmado`
                        }
                    ]
                };
            }
            return t;
        });
    }

    setData(updatedData);
    setTransactionDraft(null);
    setCurrentView('history'); 
  };

  const handleReturnTicketToYard = (ticket: Ticket) => {
     const updatedTickets = data.tickets.map(t => {
        if (t.id === ticket.id) {
            return {
                ...t,
                logs: [
                    ...t.logs,
                    {
                        timestamp: new Date().toISOString(),
                        action: 'returned_to_yard' as const,
                        userRole: `Caixa - ${currentUser.name}`,
                        details: 'Devolvido para a fila do pátio'
                    }
                ]
            };
        }
        return t;
     });
     setData({ ...data, tickets: updatedTickets });
  };

  const handlePaymentCancel = () => {
    setCurrentView('pos');
  };

  const handleLogout = () => {
    setCurrentUser(null);
    setCurrentView('gate');
  };

  const renderView = () => {
    switch (currentView) {
      case 'dashboard':
        return isAdmin ? <Dashboard data={data} /> : <GateControl data={data} onUpdate={setData} currentUser={currentUser} />;
      case 'gate':
        return <GateControl data={data} onUpdate={setData} currentUser={currentUser} />;
      case 'pos':
        return <PointOfSale 
          data={data} 
          onProceedToPayment={handleProceedToPayment}
          initialDraft={transactionDraft} 
          onReturnTicket={handleReturnTicketToYard}
        />;
      case 'payment':
        return transactionDraft ? (
          <Payment 
            draft={transactionDraft} 
            data={data}
            onSuccess={handlePaymentSuccess}
            onBack={handlePaymentCancel}
          />
        ) : (
          <Dashboard data={data} />
        );
      case 'registry':
        return <Registry data={data} onUpdate={setData} />;
      case 'history':
        return <History data={data} />;
      case 'settings':
        return isAdmin ? (
             <Settings data={data} onUpdate={setData} currentUser={currentUser} />
        ) : (
             <GateControl data={data} onUpdate={setData} currentUser={currentUser} />
        );
      default:
        return isAdmin ? <Dashboard data={data} /> : <GateControl data={data} onUpdate={setData} currentUser={currentUser} />;
    }
  };

  return (
    <div className="flex min-h-screen font-sans text-slate-900 bg-slate-50/50">
      <div className="lg:hidden fixed top-0 left-0 right-0 bg-slate-900 text-white z-40 px-4 py-3 flex items-center justify-between shadow-md">
        <div className="flex items-center gap-3">
          <div className="bg-brand-500 p-1.5 rounded-lg">
            <Store className="w-5 h-5 text-white" />
          </div>
          <span className="font-bold tracking-tight">Credbook</span>
        </div>
        <button 
          onClick={() => setIsMobileMenuOpen(true)}
          className="p-2 text-slate-300 hover:text-white rounded-md hover:bg-slate-800"
        >
          <Menu className="w-6 h-6" />
        </button>
      </div>

      <Sidebar 
        currentView={currentView} 
        onChangeView={setCurrentView} 
        isOpen={isMobileMenuOpen}
        onClose={() => setIsMobileMenuOpen(false)}
        isAdmin={isAdmin}
        onLogout={handleLogout}
        userName={currentUser.name}
      />
      
      <main className="flex-1 lg:ml-64 p-4 lg:p-8 pt-20 lg:pt-8 overflow-y-auto min-h-screen">
        <div className="max-w-7xl mx-auto">
          {isSyncing && (
             <div className="mb-4 bg-brand-50 border border-brand-100 p-2 rounded text-xs text-brand-700 flex items-center gap-2 w-fit animate-pulse">
                <div className="w-2 h-2 bg-brand-500 rounded-full"></div>
                Sincronizando com a nuvem...
             </div>
          )}
          {renderView()}
        </div>
      </main>
    </div>
  );
}

export default App;
