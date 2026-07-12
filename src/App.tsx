import React, { useState, useEffect } from 'react';
import { AppProvider, useApp } from './context/AppContext';
import { Dashboard } from './components/Dashboard';
import { Agenda } from './components/Agenda';
import { Clientes } from './components/Clientes';
import { Financeiro } from './components/Financeiro';
import { Configuracoes } from './components/Configuracoes';
import { ClientFlow } from './components/ClientFlow';
import { 
  Scissors, 
  Calendar, 
  Users, 
  DollarSign, 
  Settings, 
  LogOut, 
  Eye,
  Smartphone
} from 'lucide-react';
import './index.css';
import './App.css';

// Full-screen TV Reception Dashboard designed for TV monitors in the shop
const TVPanel: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const { appointments, activeAppointmentId, activeTimer, toleranceTimer, nextAppointmentIdForTolerance } = useApp();
  const [time, setTime] = useState(new Date().toLocaleTimeString('pt-BR'));

  useEffect(() => {
    const timer = setInterval(() => {
      setTime(new Date().toLocaleTimeString('pt-BR'));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const todayStr = new Date().toISOString().split('T')[0];
  
  // Sort today's appointments by time
  const todayApps = appointments
    .filter((a) => a.date === todayStr && a.status !== 'cancelado')
    .sort((a, b) => {
      const [hA, mA] = a.startTime.split(':').map(Number);
      const [hB, mB] = b.startTime.split(':').map(Number);
      return (hA * 60 + mA) - (hB * 60 + mB);
    });

  const activeApp = todayApps.find((a) => a.id === activeAppointmentId);
  const nextApps = todayApps.filter((a) => a.status === 'pendente' && a.id !== activeAppointmentId);

  const formatTimer = (secs: number) => {
    const mins = Math.floor(secs / 60);
    const remainingSecs = secs % 60;
    return `${String(mins).padStart(2, '0')}:${String(remainingSecs).padStart(2, '0')}`;
  };

  return (
    <div className="tv-panel-viewport">
      <div className="tv-header">
        <h1 className="tv-title">
          <span>💈</span> Barbearia Sr. Miranda - Painel de Fila
        </h1>
        <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
          <span className="tv-clock">{time}</span>
          <button className="btn-secondary" onClick={onClose} style={{ fontSize: '14px', padding: '8px 16px', border: '1px solid var(--accent-gold)', color: 'var(--accent-gold)' }}>
            Sair do Modo TV
          </button>
        </div>
      </div>

      <div className="tv-content-grid">
        {/* Left Side: Active Cut */}
        <div className="tv-section-card">
          <span className="tv-section-title">Em Atendimento Ativo</span>
          {activeApp ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '15px', justifyContent: 'center', flex: 1 }}>
              <h2 className="tv-active-client">{activeApp.clientName}</h2>
              <p className="tv-active-services">
                ✂️ {activeApp.services.map((s) => s.name).join(' + ')}
              </p>
              <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '20px', marginTop: '10px' }}>
                <span className="client-mini-label" style={{ fontSize: '14px', letterSpacing: '1px' }}>Tempo Restante do Corte</span>
                <div className="tv-timer-display" style={{ marginTop: '15px' }}>
                  {formatTimer(activeTimer)}
                </div>
              </div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '15px', justifyContent: 'center', flex: 1, color: 'var(--text-secondary)' }}>
              <h2 className="tv-active-client" style={{ color: 'var(--text-muted)' }}>Cadeira Livre</h2>
              <p className="tv-active-services">Aguardando o início do próximo corte</p>
              
              {nextAppointmentIdForTolerance && (
                <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '20px', marginTop: '10px' }}>
                  <span className="client-mini-label" style={{ fontSize: '14px', color: 'var(--color-sem-resposta)', letterSpacing: '1px' }}>Tolerância Atraso (No-Show)</span>
                  <div className="tv-timer-display" style={{ color: 'var(--color-sem-resposta)', marginTop: '15px' }}>
                    {formatTimer(toleranceTimer)}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Right Side: Waiting queue */}
        <div className="tv-section-card">
          <span className="tv-section-title">Fila de Espera</span>
          <div className="tv-queue-list">
            {nextApps.length === 0 ? (
              <div style={{ display: 'flex', flex: 1, alignItems: 'center', justifyContent: 'center', height: '100%' }}>
                <p style={{ color: 'var(--text-muted)', fontSize: '18px', textAlign: 'center', padding: '40px' }}>
                  Sem mais agendamentos previstos para hoje.
                </p>
              </div>
            ) : (
              nextApps.slice(0, 4).map((app) => {
                let statusLabel = 'Ausente';
                let statusStyle = { background: 'rgba(239, 68, 68, 0.15)', color: 'var(--color-sem-resposta)', border: '1px solid rgba(239, 68, 68, 0.3)' };

                if (app.clientStatus === 'presente') {
                  statusLabel = 'Presente';
                  statusStyle = { background: 'rgba(16, 185, 129, 0.15)', color: 'var(--color-present)', border: '1px solid rgba(16, 185, 129, 0.3)' };
                } else if (app.clientStatus === 'a_caminho') {
                  statusLabel = 'A Caminho';
                  statusStyle = { background: 'rgba(245, 158, 11, 0.15)', color: 'var(--color-a-caminho)', border: '1px solid rgba(245, 158, 11, 0.3)' };
                }

                return (
                  <div key={app.id} className="tv-queue-row">
                    <div>
                      <div className="tv-queue-name">{app.clientName}</div>
                      <div style={{ color: 'var(--text-secondary)', fontSize: '14px', marginTop: '4px' }}>
                        {app.services.map((s) => s.name).join(', ')}
                      </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
                      <span className="tv-status-badge" style={statusStyle}>
                        {statusLabel}
                      </span>
                      <span className="tv-queue-time">{app.startTime}</span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

const AppContent: React.FC = () => {
  const {
    activeView,
    barberSubView,
    currentUser,
    setActiveView,
    setBarberSubView,
    login,
    logout
  } = useApp();

  // Login form helper states
  const [emailOrPhone, setEmailOrPhone] = useState('');
  const [loginMethod, setLoginMethod] = useState<'google' | 'email' | 'whatsapp'>('email');

  const [tvViewOpen, setTvViewOpen] = useState(false);

  const handleLoginSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!emailOrPhone) return;
    login(loginMethod, { emailOrPhone });
  };

  // Render Barber sub-view contents
  const renderBarberSubView = () => {
    switch (barberSubView) {
      case 'dashboard':
        return <Dashboard />;
      case 'agenda':
        return <Agenda />;
      case 'clientes':
        return <Clientes />;
      case 'financeiro':
        return <Financeiro />;
      case 'configuracoes':
        return <Configuracoes />;
      default:
        return <Dashboard />;
    }
  };

  return (
    <>
      <div className="app-container">
        
        {/* Top Header with Role Switcher & Real-time Cloud Backup Sync */}
        <header className="role-switcher-header">
          <h1 className="brand-title">
            <Scissors size={20} style={{ color: 'var(--accent-gold)' }} />
            <span>Barber One</span>
          </h1>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {/* TV Panel Toggle Button */}
            <button 
              className="role-toggle-btn"
              onClick={() => setTvViewOpen(true)}
              style={{ background: 'rgba(212, 175, 55, 0.08)', color: 'var(--accent-gold)', borderColor: 'rgba(212, 175, 55, 0.3)' }}
            >
              📺 Painel TV
            </button>

            {/* Quick role-switch for demo convenience */}
            <button 
              className={`role-toggle-btn ${activeView === 'client' ? 'active-client' : ''}`}
              onClick={() => setActiveView(activeView === 'barber' ? 'client' : 'barber')}
            >
              <Eye size={12} />
              <span>Ver como {activeView === 'barber' ? 'Cliente' : 'Barbeiro'}</span>
            </button>
          </div>
        </header>

        {/* Main Page Viewport */}
        <main className="main-viewport">
          {activeView === 'client' ? (
            /* Client Booking Screen */
            <ClientFlow />
          ) : (
            /* Barber Control Panel */
            !currentUser ? (
              /* Mock Login Screen */
              <div className="login-screen">
                <div className="login-card">
                  <div className="login-header">
                    <div className="login-logo">💈</div>
                    <h2 className="login-title">Barber One</h2>
                    <p className="login-subtitle">Sistema inteligente para Barbeiro Autônomo</p>
                  </div>

                  <form onSubmit={handleLoginSubmit} className="login-form">
                    <div className="input-group">
                      <span className="input-label">E-mail ou WhatsApp</span>
                      <input
                        type="text"
                        className="text-input"
                        placeholder="Ex: miranda@barber.com.br ou admin"
                        value={emailOrPhone}
                        onChange={(e) => setEmailOrPhone(e.target.value)}
                        required
                      />
                    </div>

                    <button type="submit" className="btn-primary" onClick={() => setLoginMethod('email')}>
                      Acessar Painel
                    </button>
                    
                    <div className="login-divider">Ou acesse com</div>
                    
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button 
                        type="button" 
                        className="social-login-btn" 
                        style={{ flex: 1 }}
                        onClick={() => {
                          setEmailOrPhone('miranda.google@gmail.com');
                          login('google', { emailOrPhone: 'miranda.google@gmail.com', name: 'Miranda Google' });
                        }}
                      >
                        🌐 Google
                      </button>
                      <button 
                        type="button" 
                        className="social-login-btn" 
                        style={{ flex: 1 }}
                        onClick={() => {
                          setEmailOrPhone('11988887777');
                          login('whatsapp', { emailOrPhone: '11988887777', name: 'Miranda WhatsApp' });
                        }}
                      >
                        💬 WhatsApp
                      </button>
                    </div>
                    
                    <p style={{ fontSize: '11px', color: 'var(--text-muted)', textAlign: 'center', lineHeight: '1.4' }}>
                      Dica: use <strong>admin</strong> ou qualquer texto com <strong>miranda</strong> para logar como Barbeiro. Outros logam como Cliente de teste.
                    </p>
                  </form>
                </div>
              </div>
            ) : (
              /* Logged-in Barber Subviews */
              <>
                {/* Profile Bar in Barber View */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--bg-secondary)', padding: '12px 16px', borderRadius: '12px', border: '1px solid var(--border-color)' }}>
                  <div>
                    <span style={{ fontSize: '10px', color: 'var(--text-secondary)', textTransform: 'uppercase', fontWeight: 600 }}>Barbeiro</span>
                    <div style={{ fontSize: '14px', fontWeight: '800' }}>Olá, Sr. {currentUser.name}</div>
                  </div>
                  <button 
                    onClick={logout}
                    style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '11px' }}
                  >
                    <LogOut size={14} /> Sair
                  </button>
                </div>
                {renderBarberSubView()}
              </>
            )
          )}
        </main>

        {/* Bottom Nav Bar (only visible when in Barber Mode and logged in) */}
        {activeView === 'barber' && currentUser && (
          <nav className="bottom-nav">
            <button 
              className={`nav-item ${barberSubView === 'dashboard' ? 'active' : ''}`}
              onClick={() => setBarberSubView('dashboard')}
            >
              <Smartphone />
              <span>Fila/Painel</span>
            </button>
            
            <button 
              className={`nav-item ${barberSubView === 'agenda' ? 'active' : ''}`}
              onClick={() => setBarberSubView('agenda')}
            >
              <Calendar />
              <span>Agenda</span>
            </button>
            
            <button 
              className={`nav-item ${barberSubView === 'clientes' ? 'active' : ''}`}
              onClick={() => setBarberSubView('clientes')}
            >
              <Users size={16} />
              <span>Clientes</span>
            </button>
            
            <button 
              className={`nav-item ${barberSubView === 'financeiro' ? 'active' : ''}`}
              onClick={() => setBarberSubView('financeiro')}
            >
              <DollarSign />
              <span>Financeiro</span>
            </button>
            
            <button 
              className={`nav-item ${barberSubView === 'configuracoes' ? 'active' : ''}`}
              onClick={() => setBarberSubView('configuracoes')}
            >
              <Settings />
              <span>Ajustes</span>
            </button>
          </nav>
        )}

      </div>
      
      {/* TV Reception Dashboard Screen Overlay */}
      {tvViewOpen && <TVPanel onClose={() => setTvViewOpen(false)} />}
    </>
  );
};

export const App: React.FC = () => {
  return (
    <AppProvider>
      <AppContent />
    </AppProvider>
  );
};
export default App;
