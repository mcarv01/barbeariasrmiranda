import React, { createContext, useContext, useState, useEffect } from 'react';
import type { Appointment, AgendaConfig } from '../utils/scheduleAlgorithm';
import { parseTimeToMinutes } from '../utils/scheduleAlgorithm';

export interface Client {
  id: string;
  name: string;
  phone: string;
  whatsapp: string;
  birthDate: string;
  instagram: string;
  notes: string;
  hairPreference: string;
  photos?: string[]; // Optional photos
  lastVisit: string;
  visitCount: number;
  totalSpent: number;
  avgInterval: number; // in days
  loyaltyCount: number; // current count towards reward (e.g. 0 to 10)
}

export interface Transaction {
  id: string;
  type: 'entrada' | 'saida';
  description: string;
  amount: number;
  date: string; // YYYY-MM-DD
  category: string;
  paymentMethod?: 'pix' | 'cartao' | 'dinheiro';
}

export interface Promotion {
  id: string;
  title: string;
  date: string; // YYYY-MM-DD
  price: number;
  serviceIds: string[];
  maxSlots: number;
  bannerImage?: string; // base64 string
  active: boolean;
  onlyPix?: boolean;
}

interface AppContextType {
  services: { id: string; name: string; category: string; price: number; duration: number; color: string; status: 'active' | 'inactive' }[];
  clients: Client[];
  appointments: Appointment[];
  transactions: Transaction[];
  config: AgendaConfig;
  activeView: 'barber' | 'client';
  barberSubView: 'dashboard' | 'agenda' | 'clientes' | 'financeiro' | 'promocao' | 'configuracoes';
  currentUser: { name: string; email: string; role: 'barber' | 'client'; phone?: string } | null;
  activeAppointmentId: string | null;
  activeTimer: number; // remaining seconds
  toleranceTimer: number; // remaining seconds of tolerance for next client
  nextAppointmentIdForTolerance: string | null;
  simulatedNotification: string | null;
  promotion: Promotion | null;
  isClosedEmergency: boolean;
  setActiveView: (view: 'barber' | 'client') => void;
  setBarberSubView: (view: 'dashboard' | 'agenda' | 'clientes' | 'financeiro' | 'promocao' | 'configuracoes') => void;
  login: (method: 'google' | 'email' | 'whatsapp', details: { emailOrPhone: string; name?: string; password?: string; rememberMe?: boolean }) => boolean;
  logout: () => void;
  addService: (service: { name: string; category: string; price: number; duration: number; color: string }) => void;
  updateService: (id: string, updated: Partial<{ id: string; name: string; category: string; price: number; duration: number; color: string; status: 'active' | 'inactive' }>) => void;
  addClient: (client: Omit<Client, 'id' | 'lastVisit' | 'visitCount' | 'totalSpent' | 'avgInterval' | 'loyaltyCount'>) => Client;
  updateClient: (id: string, updated: Partial<Client>) => void;
  addAppointment: (appointment: Omit<Appointment, 'id' | 'status' | 'clientStatus'> & { clientPhone: string }) => Appointment;
  updateAppointment: (id: string, updated: Partial<Appointment>) => void;
  cancelAppointment: (id: string) => void;
  startAppointment: (id: string) => void;
  finishAppointment: (id: string, paymentMethod: 'pix' | 'cartao' | 'dinheiro') => void;
  markNoShow: (id: string) => void;
  updateClientStatus: (appointmentId: string, status: 'presente' | 'a_caminho' | 'sem_resposta') => void;
  addTransaction: (transaction: Omit<Transaction, 'id' | 'date'>) => void;
  updateConfig: (updatedConfig: Partial<AgendaConfig>) => void;
  updatePromotion: (promo: Promotion | null) => void;
  setIsClosedEmergency: (closed: boolean) => void;
  dismissNotification: () => void;
  simulateTimeJump: (seconds: number) => void;
  resetData: () => void;
  clientSession: { name: string; phone: string } | null;
  saveClientSession: (session: { name: string; phone: string }) => void;
  clearClientSession: () => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

// Initial/default configuration
const defaultConfig: AgendaConfig = {
  openingTime: '08:00',
  closingTime: '20:00',
  workingDays: [0, 1, 2, 3, 4, 5, 6], // Sunday to Saturday (Sunday enabled by default for testing convenience)
  lunchStart: '12:00',
  lunchEnd: '13:00',
  bufferTime: 5,
  minLeadTime: 1, // 1 hour in advance
  maxAdvanceDays: 30,
  blockedPeriods: [
    { start: '16:00', end: '16:15', label: 'Café da tarde' }
  ],
  vacations: [],
  holidays: ['2026-12-25', '2026-01-01'],
  toleranceTime: 10, // 10 minutes
  notificationTime: 10, // 10 minutes before ending
  shopName: 'Barbearia Sr. Miranda',
  whatsapp: '11988887777',
  instagram: '@barbeariasrmiranda',
  address: 'Rua Augusta, 1234 - Consolação, São Paulo',
  pixKey: '11988887777'
};
// Barber access credentials (in production these would be server-validated)
const BARBER_EMAIL = 'miranda@barbeariasrmiranda.com.br';
const BARBER_PASSWORD = 'Miranda@2025';


// Initial services
const defaultServices = [
  { id: '1', name: 'Corte Tradicional', category: 'Corte', price: 40, duration: 30, color: '#D4AF37', status: 'active' as const },
  { id: '2', name: 'Barba Premium', category: 'Barba', price: 30, duration: 20, color: '#C5A059', status: 'active' as const },
  { id: '3', name: 'Pigmentação', category: 'Acabamento', price: 20, duration: 15, color: '#E74C3C', status: 'active' as const },
  { id: '4', name: 'Corte + Barba', category: 'Combo', price: 65, duration: 50, color: '#9B59B6', status: 'active' as const },
  { id: '5', name: 'Sobrancelha', category: 'Estética', price: 15, duration: 10, color: '#2ECC71', status: 'active' as const },
  { id: '6', name: 'Hidratação Capilar', category: 'Tratamento', price: 35, duration: 25, color: '#3498DB', status: 'active' as const }
];

// Initial mock clients
const defaultClients: Client[] = [];

// Initial mock transactions (populate past revenue data)
const defaultTransactions = (): Transaction[] => [];

// Initial mock appointments
const defaultAppointments = (_todayStr: string): Appointment[] => [];

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const getTodayStr = () => new Date().toISOString().split('T')[0];
  const todayStr = getTodayStr();

  // State initialization with localStorage
  const [services, setServices] = useState<AppContextType['services']>(() => {
    const saved = localStorage.getItem('barber_services');
    return saved ? JSON.parse(saved) : defaultServices;
  });

  const [clients, setClients] = useState<Client[]>(() => {
    const saved = localStorage.getItem('barber_clients');
    return saved ? JSON.parse(saved) : defaultClients;
  });

  const [appointments, setAppointments] = useState<Appointment[]>(() => {
    const saved = localStorage.getItem('barber_appointments');
    return saved ? JSON.parse(saved) : defaultAppointments(todayStr);
  });

  const [transactions, setTransactions] = useState<Transaction[]>(() => {
    const saved = localStorage.getItem('barber_transactions');
    return saved ? JSON.parse(saved) : defaultTransactions();
  });

  const [config, setConfig] = useState<AgendaConfig>(() => {
    const saved = localStorage.getItem('barber_config');
    return saved ? JSON.parse(saved) : defaultConfig;
  });

  const [activeView, setActiveView] = useState<'barber' | 'client'>('client');
  const [barberSubView, setBarberSubView] = useState<AppContextType['barberSubView']>('dashboard');
  
  const [currentUser, setCurrentUser] = useState<AppContextType['currentUser']>(() => {
    // Check localStorage first (remember me), then sessionStorage (session only)
    const savedLocal = localStorage.getItem('barber_user');
    if (savedLocal) return JSON.parse(savedLocal);
    const savedSession = sessionStorage.getItem('barber_user');
    if (savedSession) return JSON.parse(savedSession);
    return null;
  });

  const [activeAppointmentId, setActiveAppointmentId] = useState<string | null>(() => {
    return localStorage.getItem('barber_active_app_id');
  });

  const [activeTimer, setActiveTimer] = useState<number>(() => {
    const saved = localStorage.getItem('barber_active_timer');
    return saved ? Number(saved) : 0;
  });

  const [toleranceTimer, setToleranceTimer] = useState<number>(() => {
    const saved = localStorage.getItem('barber_tolerance_timer');
    return saved ? Number(saved) : 0;
  });

  const [nextAppointmentIdForTolerance, setNextAppointmentIdForTolerance] = useState<string | null>(() => {
    return localStorage.getItem('barber_tolerance_app_id');
  });

  const [simulatedNotification, setSimulatedNotification] = useState<string | null>(null);
  const [notifiedAppIds, setNotifiedAppIds] = useState<string[]>([]);

  // Client session — persists after first booking so client doesn't have to retype info
  const [clientSession, setClientSession] = useState<{ name: string; phone: string } | null>(() => {
    const saved = localStorage.getItem('barber_client_session');
    return saved ? JSON.parse(saved) : null;
  });

  const [promotion, setPromotion] = useState<Promotion | null>(() => {
    const saved = localStorage.getItem('barber_promotion');
    return saved ? JSON.parse(saved) : null;
  });

  const [isClosedEmergency, setIsClosedEmergency] = useState<boolean>(() => {
    return localStorage.getItem('barber_emergency_closed') === 'true';
  });

  const updatePromotion = (promo: Promotion | null) => {
    setPromotion(promo);
  };

  useEffect(() => {
    if (clientSession) {
      localStorage.setItem('barber_client_session', JSON.stringify(clientSession));
    } else {
      localStorage.removeItem('barber_client_session');
    }
  }, [clientSession]);

  useEffect(() => {
    if (promotion) {
      localStorage.setItem('barber_promotion', JSON.stringify(promotion));
    } else {
      localStorage.removeItem('barber_promotion');
    }
  }, [promotion]);

  useEffect(() => {
    localStorage.setItem('barber_emergency_closed', String(isClosedEmergency));
  }, [isClosedEmergency]);

  // Save states to local storage
  useEffect(() => {
    localStorage.setItem('barber_services', JSON.stringify(services));
  }, [services]);

  useEffect(() => {
    localStorage.setItem('barber_clients', JSON.stringify(clients));
  }, [clients]);

  useEffect(() => {
    localStorage.setItem('barber_appointments', JSON.stringify(appointments));
  }, [appointments]);

  useEffect(() => {
    localStorage.setItem('barber_transactions', JSON.stringify(transactions));
  }, [transactions]);

  useEffect(() => {
    localStorage.setItem('barber_config', JSON.stringify(config));
  }, [config]);

  useEffect(() => {
    // Session persistence is handled at login time (localStorage vs sessionStorage)
    // We only need to clean up localStorage if user is null
    if (!currentUser) {
      localStorage.removeItem('barber_user');
      sessionStorage.removeItem('barber_user');
    }
  }, [currentUser]);

  useEffect(() => {
    if (activeAppointmentId) {
      localStorage.setItem('barber_active_app_id', activeAppointmentId);
    } else {
      localStorage.removeItem('barber_active_app_id');
    }
  }, [activeAppointmentId]);

  useEffect(() => {
    localStorage.setItem('barber_active_timer', String(activeTimer));
  }, [activeTimer]);

  useEffect(() => {
    localStorage.setItem('barber_tolerance_timer', String(toleranceTimer));
  }, [toleranceTimer]);

  useEffect(() => {
    if (nextAppointmentIdForTolerance) {
      localStorage.setItem('barber_tolerance_app_id', nextAppointmentIdForTolerance);
    } else {
      localStorage.removeItem('barber_tolerance_app_id');
    }
  }, [nextAppointmentIdForTolerance]);

  // Real-time ticking system
  useEffect(() => {
    const interval = setInterval(() => {
      // 1. Tick active appointment timer
      if (activeAppointmentId) {
        const app = appointments.find((a) => a.id === activeAppointmentId);
        if (app && app.status === 'em_atendimento' && app.startedAt) {
          const totalSecs = app.duration * 60;
          const elapsedSecs = Math.floor((Date.now() - new Date(app.startedAt).getTime()) / 1000);
          const remaining = Math.max(0, totalSecs - elapsedSecs);
          setActiveTimer(remaining);

          // Trigger simulated notification when remaining time is less than notificationTime minutes (e.g. 10m = 600s)
          const notificationLimitSecs = config.notificationTime * 60;
          if (remaining <= notificationLimitSecs && remaining > 0 && !notifiedAppIds.includes(app.id)) {
            // Find next appointment for notification
            const todayApps = appointments
              .filter((a) => a.date === todayStr && a.status === 'pendente')
              .sort((a, b) => parseTimeToMinutes(a.startTime) - parseTimeToMinutes(b.startTime));

            if (todayApps.length > 0) {
              const nextApp = todayApps[0];
              setSimulatedNotification(
                `📍 Barber One: Falta aproximadamente ${config.notificationTime} minutos para finalizar o atendimento atual. Você é o próximo da fila (${nextApp.clientName}). Dirija-se à barbearia para evitar atrasos.`
              );
              setNotifiedAppIds((prev) => [...prev, app.id]);
            }
          }
        }
      }

      // 2. Tick tolerance timer for a lagging next client
      if (nextAppointmentIdForTolerance && toleranceTimer > 0) {
        setToleranceTimer((prev) => {
          if (prev <= 1) {
            // Trigger automatic No-Show when tolerance timer runs out!
            markNoShow(nextAppointmentIdForTolerance);
            setNextAppointmentIdForTolerance(null);
            return 0;
          }
          return prev - 1;
        });
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [activeAppointmentId, appointments, toleranceTimer, nextAppointmentIdForTolerance, config, notifiedAppIds]);

  // Simulate auto backup every 30 seconds
  useEffect(() => {
    const backupInterval = setInterval(() => {
      console.log('Backup automático em nuvem simulada concluído!');
    }, 30000);
    return () => clearInterval(backupInterval);
  }, []);

  // Action methods
  const login = (_method: 'google' | 'email' | 'whatsapp', details: { emailOrPhone: string; name?: string; password?: string; rememberMe?: boolean }): boolean => {
    // Only the registered barber email + password combo unlocks barber access
    if (details.emailOrPhone.toLowerCase() === BARBER_EMAIL && details.password === BARBER_PASSWORD) {
      const user = {
        name: 'Sr. Miranda',
        email: BARBER_EMAIL,
        phone: '',
        role: 'barber' as const
      };
      setCurrentUser(user);
      setActiveView('barber');
      // Persist based on rememberMe flag
      if (details.rememberMe !== false) {
        // Default = remember (localStorage survives browser close)
        localStorage.setItem('barber_user', JSON.stringify(user));
        sessionStorage.removeItem('barber_user');
      } else {
        // Session only (cleared when browser closes)
        sessionStorage.setItem('barber_user', JSON.stringify(user));
        localStorage.removeItem('barber_user');
      }
      return true;
    }
    // Wrong credentials
    return false;
  };

  const logout = () => {
    setCurrentUser(null);
    setActiveAppointmentId(null);
    setActiveTimer(0);
    setToleranceTimer(0);
    setNextAppointmentIdForTolerance(null);
    localStorage.removeItem('barber_user');
    sessionStorage.removeItem('barber_user');
  };

  const addService = (service: Omit<typeof services[0], 'id' | 'status'>) => {
    const newService = {
      ...service,
      id: String(Date.now()),
      status: 'active' as const
    };
    setServices((prev) => [...prev, newService]);
  };

  const updateService = (id: string, updated: Partial<typeof services[0]>) => {
    setServices((prev) => prev.map((s) => (s.id === id ? { ...s, ...updated } : s)));
  };

  const addClient = (clientData: Omit<Client, 'id' | 'lastVisit' | 'visitCount' | 'totalSpent' | 'avgInterval' | 'loyaltyCount'>) => {
    const newClient: Client = {
      ...clientData,
      id: 'c-' + Date.now(),
      lastVisit: '-',
      visitCount: 0,
      totalSpent: 0,
      avgInterval: 0,
      loyaltyCount: 0,
      photos: []
    };
    setClients((prev) => [...prev, newClient]);
    return newClient;
  };

  const updateClient = (id: string, updated: Partial<Client>) => {
    setClients((prev) => prev.map((c) => (c.id === id ? { ...c, ...updated } : c)));
  };

  const addAppointment = (appData: Omit<Appointment, 'id' | 'status' | 'clientStatus'> & { clientPhone: string }) => {
    const newApp: Appointment = {
      ...appData,
      id: 'app-' + Date.now(),
      status: 'pendente',
      clientStatus: 'sem_resposta'
    };

    // Update customer lists if client exists, otherwise create new client
    const existingClient = clients.find((c) => c.phone === appData.clientPhone);
    if (!existingClient) {
      addClient({
        name: appData.clientName,
        phone: appData.clientPhone,
        whatsapp: appData.clientPhone,
        birthDate: '',
        instagram: '',
        notes: 'Agendado pelo fluxo de autoatendimento.',
        hairPreference: '',
        photos: []
      });
    }

    setAppointments((prev) => [...prev, newApp]);
    return newApp;
  };

  const updateAppointment = (id: string, updated: Partial<Appointment>) => {
    setAppointments((prev) => prev.map((a) => (a.id === id ? { ...a, ...updated } : a)));
  };

  const cancelAppointment = (id: string) => {
    setAppointments((prev) => prev.map((a) => (a.id === id ? { ...a, status: 'cancelado' } : a)));
    // If the cancelled appointment was the tolerance active target, clear it
    if (nextAppointmentIdForTolerance === id) {
      setNextAppointmentIdForTolerance(null);
      setToleranceTimer(0);
    }
  };

  const startAppointment = (id: string) => {
    setActiveAppointmentId(id);
    const nowStr = new Date().toISOString();
    setAppointments((prev) =>
      prev.map((a) => (a.id === id ? { ...a, status: 'em_atendimento', startedAt: nowStr } : a))
    );
    // Find appointment duration to set timer
    const app = appointments.find((a) => a.id === id);
    if (app) {
      setActiveTimer(app.duration * 60);
    }
    // If we start the appointment, any tolerance for this customer is stopped
    if (nextAppointmentIdForTolerance === id) {
      setNextAppointmentIdForTolerance(null);
      setToleranceTimer(0);
    }
  };

  const finishAppointment = (id: string, paymentMethod: 'pix' | 'cartao' | 'dinheiro') => {
    const app = appointments.find((a) => a.id === id);
    if (!app) return;

    const finishedAtStr = new Date().toISOString();
    
    // 1. Update appointment status
    setAppointments((prev) =>
      prev.map((a) =>
        a.id === id ? { ...a, status: 'finalizado', finishedAt: finishedAtStr, paymentMethod, clientStatus: 'finalizado' } : a
      )
    );

    // 2. Add transaction record
    setTransactions((prev) => [
      ...prev,
      {
        id: 't-in-' + Date.now(),
        type: 'entrada',
        description: `Serviço ${app.services.map((s) => s.name).join(', ')} - ${app.clientName}`,
        amount: app.totalValue,
        date: todayStr,
        category: 'Serviço',
        paymentMethod
      }
    ]);

    // 3. Update client stats (spending, visits, loyalty count)
    setClients((prev) =>
      prev.map((c) => {
        if (c.phone === app.clientPhone || c.name === app.clientName) {
          const newVisitCount = c.visitCount + 1;
          const newLoyalty = (c.loyaltyCount + 1) % 10;
          return {
            ...c,
            lastVisit: todayStr,
            visitCount: newVisitCount,
            totalSpent: c.totalSpent + app.totalValue,
            loyaltyCount: newLoyalty
          };
        }
        return c;
      })
    );

    // Reset active appointment state
    setActiveAppointmentId(null);
    setActiveTimer(0);

    // 4. Queue / Tolerance logic for NEXT client:
    // Look for the next client scheduled for today
    const remainingToday = appointments
      .filter((a) => a.date === todayStr && a.status === 'pendente' && a.id !== id)
      .sort((a, b) => parseTimeToMinutes(a.startTime) - parseTimeToMinutes(b.startTime));

    if (remainingToday.length > 0) {
      const nextApp = remainingToday[0];
      // If the next client is "a_caminho", start tolerance countdown (default 10 mins = 600 seconds)
      if (nextApp.clientStatus === 'a_caminho' || nextApp.clientStatus === 'sem_resposta') {
        setNextAppointmentIdForTolerance(nextApp.id);
        setToleranceTimer(config.toleranceTime * 60);
      }
    }
  };

  const markNoShow = (id: string) => {
    setAppointments((prev) =>
      prev.map((a) => (a.id === id ? { ...a, status: 'no_show', clientStatus: 'no_show' } : a))
    );

    const app = appointments.find((a) => a.id === id);
    if (app) {
      // Record in customer CRM that client missed appointment
      setClients((prev) =>
        prev.map((c) => {
          if (c.phone === app.clientPhone) {
            return {
              ...c,
              notes: `${c.notes ? c.notes + ' | ' : ''}Falta registrada (No-show) em ${todayStr}.`
            };
          }
          return c;
        })
      );
    }
    
    // Clear tolerance timer
    if (nextAppointmentIdForTolerance === id) {
      setNextAppointmentIdForTolerance(null);
      setToleranceTimer(0);
    }
  };

  const updateClientStatus = (appointmentId: string, status: 'presente' | 'a_caminho' | 'sem_resposta') => {
    setAppointments((prev) =>
      prev.map((a) => (a.id === appointmentId ? { ...a, clientStatus: status } : a))
    );

    // If client marks themselves as present, terminate their tolerance timer immediately!
    if (status === 'presente' && nextAppointmentIdForTolerance === appointmentId) {
      setNextAppointmentIdForTolerance(null);
      setToleranceTimer(0);
    }
  };

  const addTransaction = (tData: Omit<Transaction, 'id' | 'date'>) => {
    setTransactions((prev) => [
      ...prev,
      {
        ...tData,
        id: 't-' + Date.now(),
        date: todayStr
      }
    ]);
  };

  const updateConfig = (updatedConfig: Partial<AgendaConfig>) => {
    setConfig((prev) => ({ ...prev, ...updatedConfig }));
  };

  const dismissNotification = () => {
    setSimulatedNotification(null);
  };

  // Helper function to fast forward time in our simulations
  const simulateTimeJump = (seconds: number) => {
    // Jump active timer
    if (activeAppointmentId && activeTimer > 0) {
      setActiveTimer((prev) => Math.max(0, prev - seconds));
      
      // Manually trigger notification if we cross the line
      const app = appointments.find((a) => a.id === activeAppointmentId);
      if (app && !notifiedAppIds.includes(app.id)) {
        const remaining = Math.max(0, activeTimer - seconds);
        const limit = config.notificationTime * 60;
        if (remaining <= limit) {
          const todayApps = appointments
            .filter((a) => a.date === todayStr && a.status === 'pendente')
            .sort((a, b) => parseTimeToMinutes(a.startTime) - parseTimeToMinutes(b.startTime));

          if (todayApps.length > 0) {
            const nextApp = todayApps[0];
            setSimulatedNotification(
              `📍 Barber One: Falta aproximadamente ${config.notificationTime} minutos para finalizar o atendimento atual. Você é o próximo da fila (${nextApp.clientName}). Dirija-se à barbearia para evitar atrasos.`
            );
            setNotifiedAppIds((prev) => [...prev, app.id]);
          }
        }
      }
    }

    // Jump tolerance timer
    if (nextAppointmentIdForTolerance && toleranceTimer > 0) {
      setToleranceTimer((prev) => {
        const nextVal = Math.max(0, prev - seconds);
        if (nextVal === 0) {
          markNoShow(nextAppointmentIdForTolerance);
          setNextAppointmentIdForTolerance(null);
        }
        return nextVal;
      });
    }
  };

  const saveClientSession = (session: { name: string; phone: string }) => {
    setClientSession(session);
  };

  const clearClientSession = () => {
    setClientSession(null);
    localStorage.removeItem('barber_client_session');
  };

  const resetData = () => {
    setServices(defaultServices);
    setClients(defaultClients);
    setAppointments(defaultAppointments(todayStr));
    setTransactions(defaultTransactions());
    setConfig(defaultConfig);
    setActiveAppointmentId(null);
    setActiveTimer(0);
    setToleranceTimer(0);
    setNextAppointmentIdForTolerance(null);
    setSimulatedNotification(null);
    setNotifiedAppIds([]);
    setPromotion(null);
    setIsClosedEmergency(false);
    localStorage.clear();
  };

  return (
    <AppContext.Provider
      value={{
        services,
        clients,
        appointments,
        transactions,
        config,
        activeView,
        barberSubView,
        currentUser,
        activeAppointmentId,
        activeTimer,
        toleranceTimer,
        nextAppointmentIdForTolerance,
        simulatedNotification,
        promotion,
        isClosedEmergency,
        setActiveView,
        setBarberSubView,
        login,
        logout,
        addService,
        updateService,
        addClient,
        updateClient,
        addAppointment,
        updateAppointment,
        cancelAppointment,
        startAppointment,
        finishAppointment,
        markNoShow,
        updateClientStatus,
        addTransaction,
        updateConfig,
        updatePromotion,
        setIsClosedEmergency,
        dismissNotification,
        simulateTimeJump,
        resetData,
        clientSession,
        saveClientSession,
        clearClientSession
      }}
    >
      {children}
      {/* Simulation Banner Info (Console or visual notifications) */}
      {simulatedNotification && (
        <div className="simulated-notification-toast">
          <div className="toast-content">
            <span className="toast-icon">📍</span>
            <div className="toast-text">
              <h4>Notificação Enviada ao Próximo Cliente</h4>
              <p>{simulatedNotification}</p>
            </div>
            <button onClick={dismissNotification} className="toast-close">
              Fechar
            </button>
          </div>
        </div>
      )}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};
