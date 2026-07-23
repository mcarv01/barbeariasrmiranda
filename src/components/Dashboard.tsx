import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { 
  Play, 
  Check, 
  TrendingUp, 
  Clock, 
  DollarSign, 
  Scissors, 
  Calendar, 
  Settings, 
  AlertCircle, 
  Plus,
  Users
} from 'lucide-react';
import { parseTimeToMinutes, getAvailableSlots, getLocalDateStr } from '../utils/scheduleAlgorithm';

export const Dashboard: React.FC = () => {
  const {
    appointments,
    activeAppointmentId,
    activeTimer,
    toleranceTimer,
    nextAppointmentIdForTolerance,
    config,
    startAppointment,
    finishAppointment,
    markNoShow,
    updateClientStatus,
    setBarberSubView,
    setActiveView,
    simulateTimeJump
  } = useApp();

  const [checkoutModalOpen, setCheckoutModalOpen] = useState(false);
  const [selectedPayment, setSelectedPayment] = useState<'pix' | 'cartao' | 'dinheiro'>('pix');

  const todayStr = getLocalDateStr();

  // Helper: Filter today's appointments
  const todayApps = appointments
    .filter((a) => a.date === todayStr && a.status !== 'cancelado')
    .sort((a, b) => parseTimeToMinutes(a.startTime) - parseTimeToMinutes(b.startTime));

  const activeApp = todayApps.find((a) => a.id === activeAppointmentId);
  const finalizedApps = todayApps.filter((a) => a.status === 'finalizado');
  const pendingApps = todayApps.filter((a) => a.status === 'pendente' && a.id !== activeAppointmentId);

  // Next scheduled customer
  const nextApp = pendingApps[0];

  // Calculations for dashboard indicators
  const totalCutsToday = finalizedApps.length;
  const revenueToday = finalizedApps.reduce((acc, a) => acc + a.totalValue, 0);
  
  // Calculate total monthly revenue (current day's finalized + past monthly data)
  const currentMonthStr = todayStr.substring(0, 7); // YYYY-MM
  const savedTransactions = localStorage.getItem('barber_transactions');
  const transactionsList = savedTransactions ? JSON.parse(savedTransactions) : [];
  const monthlyRevenue = transactionsList
    .filter((t: any) => t.type === 'entrada' && t.date.startsWith(currentMonthStr))
    .reduce((acc: number, t: any) => acc + t.amount, 0) + revenueToday;

  // Calculate free slots count
  const allFreeSlotsToday = getAvailableSlots(todayStr, 30, appointments, config, new Date());
  const freeSlotsCount = allFreeSlotsToday.length;

  const handleOpenCheckout = () => {
    setCheckoutModalOpen(true);
  };

  const handleConfirmCheckout = () => {
    if (activeAppointmentId) {
      finishAppointment(activeAppointmentId, selectedPayment);
      setCheckoutModalOpen(false);
    }
  };

  // Timer Circle Progress Math
  const getProgressPercentage = () => {
    if (!activeApp) return 0;
    const totalSecs = activeApp.duration * 60;
    const percentage = ((totalSecs - activeTimer) / totalSecs) * 100;
    return Math.min(100, Math.max(0, percentage));
  };

  const formatTimer = (secs: number) => {
    const mins = Math.floor(secs / 60);
    const remainingSecs = secs % 60;
    return `${String(mins).padStart(2, '0')}:${String(remainingSecs).padStart(2, '0')}`;
  };

  const strokeDashoffset = 220 - (220 * getProgressPercentage()) / 100;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      
      {/* Simulation Jump Controls for testing */}
      <div className="simulator-panel">
        <div className="simulator-header">
          <span>🛠️ Painel Simulador de Testes (Acelerar Tempo)</span>
          <span style={{ fontSize: '9px', opacity: 0.8 }}>Útil para testar notificações e tolerância</span>
        </div>
        <div className="simulator-actions">
          <button className="simulator-btn" onClick={() => simulateTimeJump(60)}>+1 Minuto</button>
          <button className="simulator-btn" onClick={() => simulateTimeJump(300)}>+5 Minutos</button>
          <button className="simulator-btn" onClick={() => {
            // Trigger 10 mins remaining
            if (activeApp) {
              const targetRemaining = 590; // 9m50s (triggers push message)
              const totalSecs = activeApp.duration * 60;
              const jumpSecs = totalSecs - activeTimer - targetRemaining;
              if (jumpSecs > 0) simulateTimeJump(jumpSecs);
            }
          }}>
            Restar 10 min no atendimento
          </button>
          {nextAppointmentIdForTolerance && (
            <button className="simulator-btn" style={{ borderColor: 'var(--color-sem-resposta)' }} onClick={() => simulateTimeJump(toleranceTimer)}>
              Esgotar Tolerância
            </button>
          )}
        </div>
      </div>

      {/* Metrics Row */}
      <div className="dashboard-grid">
        <div className="card-premium metric-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span className="metric-label">Hoje</span>
            <DollarSign size={14} color="var(--accent-gold)" />
          </div>
          <span className="metric-value">R$ {revenueToday.toFixed(2)}</span>
          <span className="metric-sub">Faturamento diário</span>
        </div>
        
        <div className="card-premium metric-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span className="metric-label">Mês</span>
            <TrendingUp size={14} color="var(--color-present)" />
          </div>
          <span className="metric-value">R$ {monthlyRevenue.toFixed(2)}</span>
          <span className="metric-sub">Faturamento mensal</span>
        </div>

        <div className="card-premium metric-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span className="metric-label">Cortes</span>
            <Scissors size={14} color="var(--text-secondary)" />
          </div>
          <span className="metric-value">{totalCutsToday}</span>
          <span className="metric-sub">Realizados hoje</span>
        </div>

        <div className="card-premium metric-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span className="metric-label">Horários</span>
            <Clock size={14} color="var(--accent-gold)" />
          </div>
          <span className="metric-value">{freeSlotsCount}</span>
          <span className="metric-sub">Livres para hoje</span>
        </div>
      </div>

      {/* Active Session Status Widget */}
      {activeApp ? (
        <div className="card-premium active-service-widget pulse-gold">
          <div className="timer-circle-container">
            <svg className="timer-circle-svg" viewBox="0 0 80 80">
              <circle className="timer-circle-bg" cx="40" cy="40" r="35" />
              <circle 
                className="timer-circle-progress" 
                cx="40" 
                cy="40" 
                r="35" 
                strokeDasharray="220" 
                strokeDashoffset={strokeDashoffset} 
              />
            </svg>
            <div className="timer-text-overlay">
              {formatTimer(activeTimer)}
            </div>
          </div>

          <div className="active-service-details">
            <span className="loyalty-badge" style={{ marginBottom: '6px', display: 'inline-block' }}>
              Em atendimento
            </span>
            <h3 className="active-client-name">{activeApp.clientName}</h3>
            <p className="active-services-list">
              {activeApp.services.map((s) => s.name).join(' + ')} ({activeApp.duration} min)
            </p>
            <div className="timer-controls">
              <button className="btn-primary" style={{ padding: '8px 16px', fontSize: '12px' }} onClick={handleOpenCheckout}>
                <Check size={16} /> Finalizar
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div className="card-premium" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '24px' }}>
          <div>
            <h3 style={{ fontSize: '16px', fontWeight: '700', marginBottom: '4px' }}>Nenhum cliente ativo</h3>
            <p style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
              {nextApp ? `Próximo: ${nextApp.clientName} às ${nextApp.startTime}` : 'Sem mais agendamentos hoje.'}
            </p>
          </div>
          {nextApp && (
            <button className="btn-primary" onClick={() => startAppointment(nextApp.id)}>
              <Play size={16} fill="black" /> Iniciar Vez
            </button>
          )}
        </div>
      )}

      {/* Tolerance Countdown Banner */}
      {nextAppointmentIdForTolerance && (
        <div className="card-premium" style={{ borderLeft: '4px solid var(--color-sem-resposta)', background: '#1c1212' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px' }}>
            <AlertCircle color="var(--color-sem-resposta)" size={24} />
            <div style={{ flex: 1 }}>
              <h4 style={{ fontSize: '14px', fontWeight: '700', color: 'var(--color-sem-resposta)' }}>
                Aguardando Próximo Cliente
              </h4>
              <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '2px' }}>
                O cliente está atrasado. Tempo limite de tolerância restante:
              </p>
            </div>
            <div style={{ fontSize: '20px', fontWeight: '800', color: 'var(--color-sem-resposta)' }}>
              {formatTimer(toleranceTimer)}
            </div>
          </div>
          <div style={{ display: 'flex', gap: '8px', marginTop: '12px' }}>
            <button 
              className="btn-primary" 
              style={{ flex: 1, padding: '8px', fontSize: '11px', background: 'var(--accent-red-gradient)', color: 'white' }}
              onClick={() => markNoShow(nextAppointmentIdForTolerance)}
            >
              Marcar No-Show (Falta)
            </button>
            <button 
              className="btn-primary" 
              style={{ flex: 1, padding: '8px', fontSize: '11px', background: 'var(--accent-green-gradient)', color: 'white' }}
              onClick={() => startAppointment(nextAppointmentIdForTolerance)}
            >
              Iniciar Mesmo Assim
            </button>
          </div>
        </div>
      )}

      {/* Live Queue Monitor */}
      <div className="card-premium">
        <h3 className="quick-actions-title">Fila de Atendimento em Tempo Real</h3>
        <div className="queue-panel">
          {todayApps.length === 0 ? (
            <div className="empty-state">
              <Calendar />
              <p>Nenhum agendamento para hoje.</p>
            </div>
          ) : (
            todayApps.map((app) => {
              const isCurrent = app.id === activeAppointmentId;
              const isFinished = app.status === 'finalizado';
              const isNoShow = app.status === 'no_show';
              
              let statusLabel = 'Aguardando';
              let statusClass = 'status-sem-resposta';

              if (app.clientStatus === 'presente') {
                statusLabel = 'Presente';
                statusClass = 'status-presente';
              } else if (app.clientStatus === 'a_caminho') {
                statusLabel = 'A caminho';
                statusClass = 'status-a-caminho';
              }

              return (
                <div 
                  key={app.id} 
                  className="queue-item"
                  style={{
                    opacity: isFinished || isNoShow ? 0.5 : 1,
                    borderColor: isCurrent ? 'var(--accent-gold)' : 'var(--border-color)',
                    background: isCurrent ? 'rgba(212, 175, 55, 0.02)' : 'var(--bg-tertiary)'
                  }}
                >
                  <div className="queue-item-info">
                    <span className="queue-time">{app.startTime}</span>
                    <div className="queue-client-details">
                      <span className="queue-client-name">
                        {app.clientName}
                        {isCurrent && <span style={{ color: 'var(--accent-gold)', marginLeft: '6px', fontSize: '10px' }}>(Ativo)</span>}
                      </span>
                      <span className="queue-services">
                        {app.services.map((s) => s.name).join(', ')} ({app.duration} min)
                      </span>
                    </div>
                  </div>

                  {/* Status Indicator */}
                  {!isFinished && !isNoShow && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span className={`queue-badge-status ${statusClass}`}>
                        {statusLabel}
                      </span>
                      {/* Barber triggers status edit easily */}
                      <select 
                        className="text-input" 
                        style={{ padding: '4px 8px', fontSize: '10px', width: 'auto', background: 'var(--bg-secondary)' }}
                        value={app.clientStatus || 'sem_resposta'}
                        onChange={(e) => updateClientStatus(app.id, e.target.value as any)}
                        disabled={isCurrent}
                      >
                        <option value="sem_resposta">Sem Resposta</option>
                        <option value="a_caminho">A caminho</option>
                        <option value="presente">Presente</option>
                      </select>
                    </div>
                  )}

                  {(isFinished || isNoShow) && (
                    <span style={{ fontSize: '11px', fontWeight: '600', color: isFinished ? 'var(--color-present)' : 'var(--color-sem-resposta)' }}>
                      {isFinished ? 'Concluído' : 'Falta (No-Show)'}
                    </span>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Quick Access Menu Options */}
      <div>
        <h3 className="quick-actions-title">Atalhos Rápidos</h3>
        <div className="quick-actions-grid">
          <button className="action-btn" onClick={() => setActiveView('client')}>
            <Plus />
            <span>Novo Agendamento</span>
          </button>
          <button className="action-btn" onClick={() => setBarberSubView('agenda')}>
            <Calendar />
            <span>Agenda</span>
          </button>
          <button className="action-btn" onClick={() => setBarberSubView('clientes')}>
            <Users size={16} />
            <span>Clientes</span>
          </button>
          <button className="action-btn" onClick={() => setBarberSubView('financeiro')}>
            <DollarSign />
            <span>Financeiro</span>
          </button>
          <button className="action-btn" onClick={() => setBarberSubView('configuracoes')}>
            <Settings />
            <span>Configurações</span>
          </button>
        </div>
      </div>

      {/* Checkout Modal Form */}
      {checkoutModalOpen && activeApp && (
        <div className="modal-overlay">
          <div className="modal-container">
            <div className="modal-header">
              <h3 className="modal-title">Finalizar Atendimento</h3>
            </div>
            <div className="modal-body">
              <div style={{ textAlign: 'center', margin: '10px 0' }}>
                <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>Valor total do serviço</span>
                <h2 style={{ fontSize: '32px', fontWeight: '800', color: 'var(--accent-gold)', marginTop: '4px' }}>
                  R$ {activeApp.totalValue.toFixed(2)}
                </h2>
              </div>
              
              <div className="input-group">
                <span className="input-label">Forma de Pagamento</span>
                <div style={{ display: 'flex', gap: '8px', marginTop: '4px' }}>
                  <button 
                    className={`btn-secondary ${selectedPayment === 'pix' ? 'active-client' : ''}`}
                    style={{ flex: 1, borderColor: selectedPayment === 'pix' ? 'var(--accent-gold)' : 'var(--border-color)' }}
                    onClick={() => setSelectedPayment('pix')}
                  >
                    ⚡ PIX
                  </button>
                  <button 
                    className={`btn-secondary ${selectedPayment === 'cartao' ? 'active-client' : ''}`}
                    style={{ flex: 1, borderColor: selectedPayment === 'cartao' ? 'var(--accent-gold)' : 'var(--border-color)' }}
                    onClick={() => setSelectedPayment('cartao')}
                  >
                    💳 Cartão
                  </button>
                  <button 
                    className={`btn-secondary ${selectedPayment === 'dinheiro' ? 'active-client' : ''}`}
                    style={{ flex: 1, borderColor: selectedPayment === 'dinheiro' ? 'var(--accent-gold)' : 'var(--border-color)' }}
                    onClick={() => setSelectedPayment('dinheiro')}
                  >
                    💵 Dinheiro
                  </button>
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn-secondary" onClick={() => setCheckoutModalOpen(false)}>
                Cancelar
              </button>
              <button className="btn-primary" onClick={handleConfirmCheckout}>
                Confirmar e Receber
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
