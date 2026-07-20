import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { getAvailableSlots } from '../utils/scheduleAlgorithm';
import { Check, MapPin, ArrowRight, Clipboard, Calendar, Clock, User, X, ChevronRight, Tag } from 'lucide-react';

export const ClientFlow: React.FC = () => {
  const {
    services,
    appointments,
    config,
    addAppointment,
    updateClientStatus,
    clientSession,
    saveClientSession,
    clearClientSession,
    promotion,
    isClosedEmergency
  } = useApp();

  // step 0 = home/quick view, 1 = services, 2 = date+time, 3 = client info, 3.5 = payment, 4 = check-in
  const [step, setStep] = useState<0 | 1 | 2 | 3 | 3.5 | 4>(0);
  const [selectedServiceIds, setSelectedServiceIds] = useState<string[]>([]);
  const [selectedDate, setSelectedDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [selectedTime, setSelectedTime] = useState('');
  const [clientName, setClientName] = useState('');
  const [clientPhone, setClientPhone] = useState('');

  // Payment option
  const [paymentMethodSelection, setPaymentMethodSelection] = useState<'pix' | 'local'>('pix');

  // Active appointment for check-in view
  const [activeClientAppId, setActiveClientAppId] = useState<string | null>(null);

  // Search existing booking
  const [searchPhone, setSearchPhone] = useState('');
  const [searchMode, setSearchMode] = useState(false);

  // Quick booking: slot clicked from home → service picker opens
  const [quickPickerOpen, setQuickPickerOpen] = useState(false);

  // Popup de promoção
  const [showPromoPopup, setShowPromoPopup] = useState(false);

  const todayStr = new Date().toISOString().split('T')[0];

  // ── Promotion Popup Check ──────────────────────────────────────────────────
  useEffect(() => {
    if (promotion && promotion.active && promotion.serviceIds && promotion.serviceIds.length > 0 && !isClosedEmergency) {
      const today = new Date().toISOString().split('T')[0];
      if (promotion.date >= today) {
        const dismissed = sessionStorage.getItem('barber_promo_dismissed');
        if (!dismissed) {
          // Count active/pending spots
          const promoServices = services.filter((s) => promotion.serviceIds.includes(s.id));
          const promoServiceNames = promoServices.map((s) => s.name);
          const bookedCount = appointments.filter(
            (app) =>
              app.date === promotion.date &&
              app.status !== 'cancelado' &&
              promoServiceNames.every((name) => app.services.some((s) => s.name === name))
          ).length;

          if (promotion.maxSlots - bookedCount > 0) {
            setShowPromoPopup(true);
          }
        }
      }
    }
  }, [promotion, appointments, services, isClosedEmergency]);

  // ── Pre-fill from saved client session ────────────────────────────────────
  useEffect(() => {
    if (clientSession) {
      setClientName(clientSession.name);
      setClientPhone(clientSession.phone);
    }
  }, [clientSession]);

  // ── Calculated totals ─────────────────────────────────────────────────────
  const selectedServices = services.filter((s) => selectedServiceIds.includes(s.id));
  const totalDuration = selectedServices.reduce((acc, s) => acc + s.duration, 0);

  const isPromoApplicable = !!(
    promotion &&
    promotion.active &&
    selectedDate === promotion.date &&
    selectedServiceIds.length === promotion.serviceIds.length &&
    promotion.serviceIds.every((id) => selectedServiceIds.includes(id))
  );

  const totalValue = isPromoApplicable
    ? promotion.price
    : selectedServices.reduce((acc, s) => acc + s.price, 0);

  // Today's quick slots (minimum 30-min window, for home preview)
  const todaySlots = getAvailableSlots(todayStr, 30, appointments, config, new Date());

  // Dynamic slots based on selected services duration
  const availableSlots = getAvailableSlots(
    selectedDate,
    totalDuration > 0 ? totalDuration : 30,
    appointments,
    config,
    new Date()
  );

  const handleServiceToggle = (id: string) => {
    setSelectedServiceIds((prev) =>
      prev.includes(id) ? prev.filter((sid) => sid !== id) : [...prev, id]
    );
  };

  // ── Quick slot clicked from home view ─────────────────────────────────────
  const handleQuickSlotClick = (slot: string) => {
    setSelectedTime(slot);
    setSelectedDate(todayStr);
    setSelectedServiceIds([]); // clear previous
    setQuickPickerOpen(true);
  };

  // After service picked in quick mode → go to info or payment
  const handleQuickContinue = () => {
    if (selectedServiceIds.length === 0) return;
    setQuickPickerOpen(false);
    if (clientSession) {
      // Already know who the client is → go straight to payment
      setStep(3.5);
    } else {
      setStep(3);
    }
  };

  const handleFindBooking = () => {
    if (!searchPhone) return;
    const app = appointments.find(
      (a) => a.clientPhone === searchPhone && a.date === todayStr && a.status === 'pendente'
    );
    if (app) {
      setActiveClientAppId(app.id);
      setStep(4);
      setSearchMode(false);
    } else {
      alert('Nenhum agendamento ativo encontrado para hoje com este telefone.');
    }
  };

  const handleBookingSubmit = () => {
    if (!clientName || !clientPhone || !selectedTime) return;

    const originalTotal = selectedServices.reduce((acc, s) => acc + s.price, 0);
    const appServices = selectedServices.map((s) => ({
      name: s.name,
      price: isPromoApplicable && originalTotal > 0 ? (s.price / originalTotal) * promotion.price : s.price,
      duration: s.duration
    }));

    const newApp = addAppointment({
      clientName,
      clientPhone,
      date: selectedDate,
      startTime: selectedTime,
      duration: totalDuration,
      services: appServices,
      totalValue,
      notes: paymentMethodSelection === 'local'
        ? 'Pagamento presencial na barbearia.'
        : 'Sinal pago via PIX.'
    });

    // Save client session so next time they don't need to retype
    saveClientSession({ name: clientName, phone: clientPhone });

    setActiveClientAppId(newApp.id);
    setStep(4);
  };

  // Google Calendar URL
  const getGoogleCalendarUrl = (app: { date: string; startTime: string; duration: number; services: { name: string; price: number }[] }) => {
    const dateClean = app.date.replace(/-/g, '');
    const [h, m] = app.startTime.split(':').map(Number);
    const startStr = `${dateClean}T${String(h).padStart(2, '0')}${String(m).padStart(2, '0')}00`;
    const totalMins = h * 60 + m + app.duration;
    const endH = Math.floor(totalMins / 60);
    const endM = totalMins % 60;
    const endStr = `${dateClean}T${String(endH).padStart(2, '0')}${String(endM).padStart(2, '0')}00`;
    const title = encodeURIComponent('Corte na Barbearia Sr. Miranda');
    const details = encodeURIComponent(
      `Serviços:\n${app.services.map((s) => `- ${s.name} (R$ ${s.price})`).join('\n')}\n\nTempo: ${app.duration} min`
    );
    const location = encodeURIComponent('Barbearia Sr. Miranda');
    return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${title}&dates=${startStr}/${endStr}&details=${details}&location=${location}`;
  };

  const getPixCode = () => {
    const amountFormatted = totalValue.toFixed(2);
    return `00020101021126580014br.gov.bcb.pix0111119888877775204000053039865405${amountFormatted}5802BR5920Barbearia Sr Miranda6009Sao Paulo62070503***6304`;
  };

  const copyPixCode = () => {
    navigator.clipboard.writeText(getPixCode());
    alert('Código PIX copiado!');
  };

  const currentApp = appointments.find((a) => a.id === activeClientAppId);

  const resetFlow = () => {
    setStep(0);
    setSelectedServiceIds([]);
    setSelectedTime('');
    setSelectedDate(todayStr);
    setActiveClientAppId(null);
    setQuickPickerOpen(false);
    setPaymentMethodSelection('pix');
    // Keep name/phone from session
    if (clientSession) {
      setClientName(clientSession.name);
      setClientPhone(clientSession.phone);
    } else {
      setClientName('');
      setClientPhone('');
    }
  };

  // ── Formatted date display ────────────────────────────────────────────────
  const formatDateBR = (dateStr: string) => {
    const [y, m, d] = dateStr.split('-');
    return `${d}/${m}/${y}`;
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column' }}>

      {/* Premium Header Banner — flush to header, no padding */}
      {step !== 4 && (
        <div className="premium-banner-container">
          <div className="premium-banner-image" style={{ backgroundImage: "url('/banner.png')" }} />
          <div className="premium-banner-overlay" />
        </div>
      )}

      {/* All content below the banner gets 16px side padding */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', padding: step === 4 ? '16px' : '16px 16px 0' }}>

      {/* ── Search / Check-in mode ── */}
      {step !== 4 && (
        <div className="card-premium" style={{ padding: '12px' }}>
          {searchMode ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <span className="input-label">Digite seu Telefone cadastrado</span>
              <div style={{ display: 'flex', gap: '8px' }}>
                <input
                  type="tel"
                  className="text-input"
                  style={{ flex: 1, padding: '8px 12px' }}
                  placeholder="(00) 90000-0000"
                  value={searchPhone}
                  onChange={(e) => setSearchPhone(e.target.value)}
                />
                <button className="btn-primary" style={{ padding: '8px 16px', fontSize: '12px' }} onClick={handleFindBooking}>
                  Buscar
                </button>
              </div>
              <button
                className="simulator-btn"
                style={{ alignSelf: 'flex-start', border: 'none', background: 'none', color: 'var(--text-muted)' }}
                onClick={() => setSearchMode(false)}
              >
                Voltar para Agendamento
              </button>
            </div>
          ) : (
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Já possui agendamento para hoje?</span>
              <button
                className="role-toggle-btn active-client"
                onClick={() => setSearchMode(true)}
              >
                Acompanhar Fila / Check-in
              </button>
            </div>
          )}
        </div>
      )}

      {/* ── Emergency Closed Mode Banner ── */}
      {isClosedEmergency && step !== 4 && !searchMode && (
        <div className="card-premium" style={{ 
          textAlign: 'center', 
          padding: '40px 24px', 
          border: '1px solid #ef4444', 
          background: 'linear-gradient(135deg, #1c1212 0%, #140d0d 100%)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '16px',
          borderRadius: '16px',
          boxShadow: '0 0 20px rgba(239, 68, 68, 0.15)',
          marginTop: '10px'
        }}>
          <div style={{
            width: '64px',
            height: '64px',
            borderRadius: '50%',
            background: 'rgba(239, 68, 68, 0.1)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            border: '1px solid rgba(239, 68, 68, 0.3)'
          }}>
            <span style={{ fontSize: '32px' }}>⚠️</span>
          </div>
          <div>
            <h3 style={{ fontSize: '18px', fontWeight: '800', color: '#ef4444' }}>Barbearia Temporariamente Fechada</h3>
            <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '8px', lineHeight: '1.5' }}>
              O barbeiro precisou se ausentar temporariamente para resolver uma emergência rápida. Os agendamentos estão suspensos no momento.
            </p>
            <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '6px' }}>
              Voltaremos às atividades normais em breve! Agradecemos a compreensão.
            </p>
          </div>
        </div>
      )}

      {/* ── STEP 0: Home — Quick Slots + Client Greeting ── */}
      {step === 0 && !searchMode && !isClosedEmergency && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>

          {/* Client greeting if session exists */}
          {clientSession && (
            <div className="card-premium" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 16px', borderLeft: '4px solid var(--accent-gold)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: 'var(--accent-gold-glow)', border: '1px solid var(--accent-gold)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <User size={20} color="var(--accent-gold)" />
                </div>
                <div>
                  <p style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Bem-vindo de volta!</p>
                  <p style={{ fontSize: '15px', fontWeight: '700', color: 'white' }}>{clientSession.name}</p>
                </div>
              </div>
              <button
                onClick={() => { clearClientSession(); setClientName(''); setClientPhone(''); }}
                style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '4px' }}
                title="Trocar conta"
              >
                <X size={16} />
              </button>
            </div>
          )}

          {/* Today's Quick Slots */}
          <div className="card-premium" style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Clock size={16} color="var(--accent-gold)" />
              <h3 style={{ fontSize: '15px', fontWeight: '700', color: 'white' }}>Horários Disponíveis Hoje</h3>
            </div>
            <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '-8px' }}>
              Toque num horário para agendar rapidamente
            </p>

            {todaySlots.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '20px', color: 'var(--text-muted)', fontSize: '13px' }}>
                😔 Sem horários disponíveis para hoje.<br />
                <button
                  style={{ marginTop: '10px', background: 'none', border: 'none', color: 'var(--accent-gold)', cursor: 'pointer', fontSize: '13px', textDecoration: 'underline' }}
                  onClick={() => { setStep(1); }}
                >
                  Ver outros dias →
                </button>
              </div>
            ) : (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                {todaySlots.map((slot) => (
                  <button
                    key={slot}
                    onClick={() => handleQuickSlotClick(slot)}
                    style={{
                      background: 'var(--bg-tertiary)',
                      border: '1px solid var(--border-color-hover)',
                      color: 'white',
                      borderRadius: '10px',
                      padding: '10px 14px',
                      fontSize: '14px',
                      fontWeight: '700',
                      cursor: 'pointer',
                      transition: 'all 0.15s ease',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '5px',
                      fontFamily: 'monospace'
                    }}
                    onMouseEnter={(e) => {
                      (e.currentTarget as HTMLButtonElement).style.background = 'var(--accent-gold-glow)';
                      (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--accent-gold)';
                      (e.currentTarget as HTMLButtonElement).style.color = 'var(--accent-gold)';
                    }}
                    onMouseLeave={(e) => {
                      (e.currentTarget as HTMLButtonElement).style.background = 'var(--bg-tertiary)';
                      (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--border-color-hover)';
                      (e.currentTarget as HTMLButtonElement).style.color = 'white';
                    }}
                  >
                    ⏰ {slot}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Full booking flow button */}
          <button
            className="btn-secondary"
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', padding: '14px' }}
            onClick={() => setStep(1)}
          >
            <Calendar size={16} />
            Escolher Outro Dia ou Serviços
            <ChevronRight size={14} />
          </button>
        </div>
      )}

      {/* ── Quick Service Picker Overlay (after clicking slot from home) ── */}
      {quickPickerOpen && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.88)',
          zIndex: 8000, display: 'flex', alignItems: 'flex-end', justifyContent: 'center'
        }}>
          <div style={{
            background: 'var(--bg-secondary)', width: '100%', maxWidth: '480px',
            borderRadius: '20px 20px 0 0', padding: '24px 20px 32px',
            border: '1px solid var(--border-color)', borderBottom: 'none',
            display: 'flex', flexDirection: 'column', gap: '16px',
            maxHeight: '80vh', overflowY: 'auto'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h3 style={{ fontSize: '16px', fontWeight: '800' }}>Escolha os Serviços</h3>
                <p style={{ fontSize: '12px', color: 'var(--accent-gold)', fontWeight: '600' }}>
                  ⏰ Horário: {selectedTime} — Hoje
                </p>
              </div>
              <button
                onClick={() => setQuickPickerOpen(false)}
                style={{ background: 'var(--bg-tertiary)', border: '1px solid var(--border-color)', borderRadius: '50%', width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
              >
                <X size={16} color="var(--text-secondary)" />
              </button>
            </div>

            <div className="service-select-list">
              {services.filter(s => s.status === 'active').map((s) => {
                const isSelected = selectedServiceIds.includes(s.id);
                return (
                  <div
                    key={s.id}
                    className={`service-select-card ${isSelected ? 'selected' : ''}`}
                    onClick={() => handleServiceToggle(s.id)}
                  >
                    <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                      <div style={{ width: '6px', height: '36px', borderRadius: '4px', background: s.color }} />
                      <div>
                        <h4 style={{ fontSize: '14px', fontWeight: '700' }}>{s.name}</h4>
                        <div className="service-meta">
                          <span className="service-tag" style={{ background: 'var(--bg-tertiary)', color: s.color }}>{s.category}</span>
                          <span>⏱️ {s.duration} min</span>
                        </div>
                      </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                      <span style={{ fontWeight: '700', fontSize: '15px' }}>R$ {s.price.toFixed(2)}</span>
                      <div className="checkbox-custom">
                        {isSelected && <Check size={14} />}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {selectedServiceIds.length > 0 && (
              <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '14px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
                  <span style={{ color: 'var(--text-secondary)' }}>Total</span>
                  <span style={{ fontWeight: '800', color: 'var(--accent-gold)', fontSize: '16px' }}>R$ {totalValue.toFixed(2)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: 'var(--text-muted)' }}>
                  <span>Duração estimada</span>
                  <span>{totalDuration} min</span>
                </div>
                <button className="btn-primary" style={{ marginTop: '6px' }} onClick={handleQuickContinue}>
                  Confirmar Horário {selectedTime} <ArrowRight size={16} />
                </button>
              </div>
            )}

            {selectedServiceIds.length === 0 && (
              <p style={{ textAlign: 'center', fontSize: '12px', color: 'var(--text-muted)' }}>
                Selecione pelo menos um serviço para continuar
              </p>
            )}
          </div>
        </div>
      )}

      {/* ── Progress Bar (steps 1, 2, 3, 3.5) ── */}
      {(step === 1 || step === 2 || step === 3 || step === 3.5) && !searchMode && !isClosedEmergency && (
        <div className="wizard-progress-bar">
          <div className="wizard-progress-line" />
          <div
            className="wizard-progress-line-fill"
            style={{ width: step === 1 ? '10%' : step === 2 ? '40%' : step === 3 ? '70%' : '90%' }}
          />
          <div className={`wizard-step-node ${step === 1 ? 'active' : step > 1 ? 'completed' : ''}`}>1</div>
          <div className={`wizard-step-node ${step === 2 ? 'active' : step > 2 ? 'completed' : ''}`}>2</div>
          <div className={`wizard-step-node ${step === 3 ? 'active' : step > 3 ? 'completed' : ''}`}>3</div>
          <div className={`wizard-step-node ${step === 3.5 ? 'active' : ''}`}>$</div>
        </div>
      )}

      {/* ── STEP 1: Service Selection ── */}
      {step === 1 && !searchMode && !isClosedEmergency && (
        <div className="card-premium" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <h3 className="quick-actions-title">1. Selecione os Serviços</h3>
            <button onClick={() => setStep(0)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '12px' }}>
              ← Voltar
            </button>
          </div>

          <div className="service-select-list">
            {services.filter(s => s.status === 'active').map((s) => {
              const isSelected = selectedServiceIds.includes(s.id);
              return (
                <div
                  key={s.id}
                  className={`service-select-card ${isSelected ? 'selected' : ''}`}
                  onClick={() => handleServiceToggle(s.id)}
                >
                  <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                    <div style={{ width: '6px', height: '36px', borderRadius: '4px', background: s.color }} />
                    <div>
                      <h4 style={{ fontSize: '14px', fontWeight: '700' }}>{s.name}</h4>
                      <div className="service-meta">
                        <span className="service-tag" style={{ background: 'var(--bg-tertiary)', color: s.color }}>{s.category}</span>
                        <span>⏱️ {s.duration} min</span>
                      </div>
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                    <span style={{ fontWeight: '700', fontSize: '15px' }}>R$ {s.price.toFixed(2)}</span>
                    <div className="checkbox-custom">
                      {isSelected && <Check size={14} />}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {selectedServiceIds.length > 0 ? (
            <div className="checkout-sticky-footer">
              <div className="checkout-totals">
                <span className="checkout-totals-label">Resumo do Pedido</span>
                <span className="checkout-totals-price">R$ {totalValue.toFixed(2)}</span>
                <span className="checkout-totals-duration">⏱️ Duração: {totalDuration} minutos</span>
              </div>
              <button className="btn-primary" onClick={() => setStep(2)}>
                Escolher Horário <ArrowRight size={16} />
              </button>
            </div>
          ) : (
            <div style={{ textAlign: 'center', padding: '16px', color: 'var(--text-muted)', fontSize: '13px' }}>
              Selecione pelo menos um serviço para prosseguir.
            </div>
          )}
        </div>
      )}

      {/* ── STEP 2: Calendar & Timing ── */}
      {step === 2 && !searchMode && !isClosedEmergency && (
        <div className="card-premium" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <h3 className="quick-actions-title">2. Escolha Data e Horário</h3>

          <div className="input-group">
            <span className="input-label">Data de Preferência</span>
            <input
              type="date"
              className="text-input"
              value={selectedDate}
              min={new Date().toISOString().split('T')[0]}
              onChange={(e) => { setSelectedDate(e.target.value); setSelectedTime(''); }}
            />
          </div>

          <div className="input-group">
            <span className="input-label">Horários Disponíveis</span>
            {availableSlots.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '24px', color: 'var(--color-sem-resposta)', fontSize: '13px' }}>
                Nenhum horário disponível para esta data. Tente outro dia!
              </div>
            ) : (
              <div className="slots-grid">
                {availableSlots.map((time) => (
                  <button
                    key={time}
                    className={`slot-btn ${selectedTime === time ? 'selected' : ''}`}
                    onClick={() => setSelectedTime(time)}
                  >
                    {time}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
            <button className="btn-secondary" style={{ flex: 1 }} onClick={() => setStep(1)}>
              Voltar
            </button>
            <button
              className="btn-primary"
              style={{ flex: 2 }}
              disabled={!selectedTime}
              onClick={() => setStep(3)}
            >
              Continuar
            </button>
          </div>
        </div>
      )}

      {/* ── STEP 3: Client Info ── */}
      {step === 3 && !searchMode && !isClosedEmergency && (
        <div className="card-premium" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <h3 className="quick-actions-title">3. Confirme seus Dados</h3>

          {/* Show if data is pre-filled from session */}
          {clientSession && (
            <div style={{ background: 'rgba(212,175,55,0.08)', border: '1px solid rgba(212,175,55,0.2)', borderRadius: '10px', padding: '10px 14px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <User size={14} color="var(--accent-gold)" />
              <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                Dados salvos de agendamento anterior. Edite se necessário.
              </span>
            </div>
          )}

          <div className="input-group">
            <span className="input-label">Seu Nome *</span>
            <input
              type="text"
              className="text-input"
              placeholder="Digite seu nome completo"
              value={clientName}
              onChange={(e) => setClientName(e.target.value)}
            />
          </div>

          <div className="input-group">
            <span className="input-label">Telefone de Contato (WhatsApp) *</span>
            <input
              type="tel"
              className="text-input"
              placeholder="(00) 90000-0000"
              value={clientPhone}
              onChange={(e) => setClientPhone(e.target.value)}
            />
          </div>

          {/* Booking summary */}
          <div style={{ background: 'var(--bg-primary)', padding: '14px', borderRadius: '8px', border: '1px solid var(--border-color)', display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <span className="input-label">Resumo do Agendamento</span>
            <div style={{ fontSize: '13px', display: 'flex', justifyContent: 'space-between' }}>
              <span>Serviços:</span>
              <span style={{ fontWeight: '700' }}>{selectedServices.map(s => s.name).join(' + ')}</span>
            </div>
            <div style={{ fontSize: '13px', display: 'flex', justifyContent: 'space-between' }}>
              <span>Data e Horário:</span>
              <span style={{ fontWeight: '700', color: 'var(--accent-gold)' }}>{formatDateBR(selectedDate)} às {selectedTime}</span>
            </div>
            <div style={{ fontSize: '13px', display: 'flex', justifyContent: 'space-between' }}>
              <span>Duração:</span>
              <span>{totalDuration} minutos</span>
            </div>
            <div style={{ fontSize: '14px', fontWeight: '800', borderTop: '1px solid var(--border-color)', paddingTop: '8px', display: 'flex', justifyContent: 'space-between', color: 'var(--accent-gold)' }}>
              <span>Total:</span>
              <span>R$ {totalValue.toFixed(2)}</span>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '10px' }}>
            <button className="btn-secondary" style={{ flex: 1 }} onClick={() => setStep(2)}>
              Voltar
            </button>
            <button
              className="btn-primary"
              style={{ flex: 2 }}
              disabled={!clientName || !clientPhone}
              onClick={() => setStep(3.5)}
            >
              Avançar para Pagamento
            </button>
          </div>
        </div>
      )}

      {/* ── STEP 3.5: Payment ── */}
      {step === 3.5 && !searchMode && !isClosedEmergency && (
        <div className="card-premium" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <h3 className="quick-actions-title">🔑 Forma de Pagamento</h3>

          {/* Booking summary mini */}
          <div style={{ background: 'var(--bg-primary)', padding: '12px 14px', borderRadius: '10px', border: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <p style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>{clientName} · {formatDateBR(selectedDate)} às {selectedTime}</p>
              <p style={{ fontSize: '13px', fontWeight: '700' }}>{selectedServices.map(s => s.name).join(' + ')}</p>
            </div>
            <span style={{ fontSize: '18px', fontWeight: '800', color: 'var(--accent-gold)' }}>R$ {totalValue.toFixed(2)}</span>
          </div>

          <div className="input-group">
            <span className="input-label">Como deseja pagar?</span>
            <div style={{ display: 'flex', gap: '8px', marginTop: '6px' }}>
              <button
                type="button"
                className={`btn-secondary ${paymentMethodSelection === 'pix' ? 'active-client' : ''}`}
                style={{ flex: 1, padding: '12px 6px', fontSize: '12px', borderColor: paymentMethodSelection === 'pix' ? 'var(--accent-gold)' : 'var(--border-color)', display: 'flex', flexDirection: 'column', gap: '4px', alignItems: 'center' }}
                onClick={() => setPaymentMethodSelection('pix')}
              >
                <span>⚡ PIX</span>
                <span style={{ fontSize: '9px', fontWeight: 'normal', color: 'var(--text-secondary)' }}>Pagar Sinal Agora</span>
              </button>
              <button
                type="button"
                className={`btn-secondary ${paymentMethodSelection === 'local' ? 'active-client' : ''}`}
                style={{ flex: 1, padding: '12px 6px', fontSize: '12px', borderColor: paymentMethodSelection === 'local' ? 'var(--accent-gold)' : 'var(--border-color)', display: 'flex', flexDirection: 'column', gap: '4px', alignItems: 'center' }}
                onClick={() => setPaymentMethodSelection('local')}
              >
                <span>🏪 Na Barbearia</span>
                <span style={{ fontSize: '9px', fontWeight: 'normal', color: 'var(--text-secondary)' }}>Pagar Presencialmente</span>
              </button>
            </div>
          </div>

          {paymentMethodSelection === 'pix' ? (
            <>
              <p style={{ fontSize: '12px', color: 'var(--text-secondary)', lineHeight: '1.4' }}>
                Para garantir seu horário, realize o pagamento do sinal de <strong>R$ {totalValue.toFixed(2)}</strong> via PIX.
              </p>
              <div style={{ background: 'white', padding: '20px', borderRadius: '12px', width: '180px', height: '180px', margin: '0 auto', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px', width: '120px', height: '120px' }}>
                  {Array.from({ length: 9 }).map((_, idx) => (
                    <div key={idx} style={{ background: (idx === 0 || idx === 2 || idx === 6 || idx === 8 || idx === 4) ? 'black' : 'none', border: (idx === 0 || idx === 2 || idx === 6 || idx === 8) ? '4px solid black' : 'none', borderRadius: '2px' }} />
                  ))}
                </div>
                <span style={{ color: 'black', fontSize: '9px', fontWeight: '800', marginTop: '10px', letterSpacing: '1px' }}>PIX QR CODE</span>
              </div>
              <div className="input-group">
                <span className="input-label">Chave Copia e Cola</span>
                <div style={{ display: 'flex', gap: '6px' }}>
                  <input type="text" className="text-input" style={{ flex: 1, textOverflow: 'ellipsis', fontSize: '12px', background: 'var(--bg-primary)' }} value={getPixCode()} readOnly />
                  <button type="button" className="btn-secondary" style={{ padding: '10px' }} onClick={copyPixCode}>
                    <Clipboard size={16} />
                  </button>
                </div>
              </div>
              <button type="button" className="btn-primary" style={{ width: '100%', background: 'var(--accent-green-gradient)', color: 'white' }} onClick={handleBookingSubmit}>
                ⚡ Confirmar Pagamento e Reservar
              </button>
            </>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', padding: '18px', background: 'var(--bg-primary)', borderRadius: '10px', border: '1px solid var(--border-color)', textAlign: 'center' }}>
                <span style={{ fontSize: '32px' }}>🏪</span>
                <h4 style={{ fontSize: '15px', fontWeight: '700', color: 'white' }}>Pagamento na Barbearia</h4>
                <p style={{ fontSize: '12px', color: 'var(--text-secondary)', lineHeight: '1.4' }}>
                  O valor de <strong>R$ {totalValue.toFixed(2)}</strong> será quitado presencialmente via PIX, Cartão ou Dinheiro ao finalizar o serviço.
                </p>
              </div>
              <button type="button" className="btn-primary" style={{ width: '100%', background: 'var(--accent-gold-gradient)', color: 'black' }} onClick={handleBookingSubmit}>
                Confirmar Agendamento e Reservar
              </button>
            </div>
          )}

          <button className="btn-secondary" style={{ width: '100%' }} onClick={() => clientSession ? setStep(0) : setStep(3)}>
            Voltar
          </button>
        </div>
      )}

      {/* ── STEP 4: Live Check-in & Queue ── */}
      {step === 4 && currentApp && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>

          <div className="card-premium" style={{ textAlign: 'center', border: '1px solid var(--color-present)', background: '#121c15' }}>
            <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: 'rgba(16, 185, 129, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px auto' }}>
              <Check color="var(--color-present)" size={24} />
            </div>
            <h3 style={{ fontSize: '16px', fontWeight: '800', color: 'var(--color-present)' }}>Agendamento Confirmado!</h3>
            <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '4px' }}>
              Seu lugar na fila foi reservado.
            </p>
          </div>

          <div className="card-premium">
            <h3 className="quick-actions-title">Seu Ticket Digital</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border-color)', paddingBottom: '8px' }}>
                <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Cliente</span>
                <span style={{ fontSize: '13px', fontWeight: '700' }}>{currentApp.clientName}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border-color)', paddingBottom: '8px' }}>
                <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Horário</span>
                <span style={{ fontSize: '13px', fontWeight: '700', color: 'var(--accent-gold)' }}>
                  {formatDateBR(currentApp.date)} às {currentApp.startTime}
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border-color)', paddingBottom: '8px' }}>
                <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Serviços</span>
                <span style={{ fontSize: '13px', fontWeight: '700' }}>{currentApp.services.map(s => s.name).join(', ')}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '8px' }}>
                <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Valor</span>
                <span style={{ fontSize: '13px', fontWeight: '700', color: 'var(--accent-gold)' }}>
                  R$ {currentApp.totalValue.toFixed(2)} {currentApp.notes?.includes('presencial') ? '(Na barbearia)' : '(PIX)'}
                </span>
              </div>
            </div>
            <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '14px', marginTop: '10px' }}>
              <a
                href={getGoogleCalendarUrl(currentApp)}
                target="_blank"
                rel="noopener noreferrer"
                className="btn-secondary"
                style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', textDecoration: 'none', fontSize: '12px' }}
              >
                <Calendar size={16} color="var(--accent-gold)" /> Adicionar ao Google Agenda
              </a>
            </div>
          </div>

          <div className="card-premium" style={{ borderLeft: '4px solid var(--accent-gold)' }}>
            <h3 className="quick-actions-title">Aviso de Chegada (Check-in)</h3>
            <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '14px' }}>
              Informe o barbeiro sobre sua localização para otimizar a fila:
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <button
                className={`btn-secondary ${currentApp.clientStatus === 'a_caminho' ? 'active-client' : ''}`}
                style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '12px' }}
                onClick={() => updateClientStatus(currentApp.id, 'a_caminho')}
              >
                <span>🟡</span>
                <div style={{ textAlign: 'left' }}>
                  <div style={{ fontSize: '13px', fontWeight: '600' }}>Estou Chegando</div>
                  <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>Estou a caminho da barbearia.</span>
                </div>
              </button>
              <button
                className={`btn-secondary ${currentApp.clientStatus === 'presente' ? 'active-client' : ''}`}
                style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '12px' }}
                onClick={() => updateClientStatus(currentApp.id, 'presente')}
              >
                <span>🟢</span>
                <div style={{ textAlign: 'left' }}>
                  <div style={{ fontSize: '13px', fontWeight: '600' }}>Já Estou na Barbearia</div>
                  <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>Cheguei! Aguardando minha vez.</span>
                </div>
              </button>
            </div>
          </div>

          <div className="card-premium">
            <h3 className="quick-actions-title" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <MapPin size={16} /> Como Chegar
            </h3>
            <p style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
              Barbearia Sr. Miranda
            </p>
            <p style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>
              Instagram: @barbeariasrmiranda
            </p>
          </div>

          <button className="btn-secondary" style={{ width: '100%' }} onClick={resetFlow}>
            Fazer Novo Agendamento
          </button>
        </div>
      )}

      </div>{/* end padded content wrapper */}

      {/* ── POPUP DE PROMOÇÃO RELÂMPAGO ── */}
      {showPromoPopup && promotion && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0, 0, 0, 0.85)',
          backdropFilter: 'blur(8px)',
          zIndex: 10000,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '20px'
        }}>
          <div style={{
            background: 'var(--bg-secondary)',
            width: '100%',
            maxWidth: '420px',
            borderRadius: '20px',
            overflow: 'hidden',
            border: '1px solid var(--accent-gold)',
            boxShadow: '0 0 30px rgba(212, 175, 55, 0.25)',
            display: 'flex',
            flexDirection: 'column',
            position: 'relative'
          }}>
            {/* Close button */}
            <button
              onClick={() => {
                setShowPromoPopup(false);
                sessionStorage.setItem('barber_promo_dismissed', 'true');
              }}
              style={{
                position: 'absolute',
                top: '12px',
                right: '12px',
                background: 'rgba(0, 0, 0, 0.5)',
                border: '1px solid rgba(255, 255, 255, 0.2)',
                borderRadius: '50%',
                width: '32px',
                height: '32px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                zIndex: 10
              }}
            >
              <X size={16} color="white" />
            </button>

            {/* Banner image or fallback gradient */}
            {promotion.bannerImage ? (
              <div style={{ width: '100%', height: '180px', overflow: 'hidden', borderBottom: '1px solid var(--border-color)' }}>
                <img src={promotion.bannerImage} alt={promotion.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              </div>
            ) : (
              <div style={{
                width: '100%',
                height: '140px',
                background: 'linear-gradient(135deg, #1a150c 0%, #2c2211 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                borderBottom: '1px solid var(--border-color)',
                position: 'relative'
              }}>
                <div style={{ position: 'absolute', opacity: 0.1, fontSize: '80px' }}>💈</div>
                <Tag size={48} color="var(--accent-gold)" style={{ zIndex: 1, opacity: 0.8 }} />
              </div>
            )}

            {/* Content */}
            <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ textAlign: 'center' }}>
                <span className="client-mini-label" style={{ background: 'var(--accent-gold-glow)', color: 'var(--accent-gold)', fontWeight: '800' }}>
                  🔥 PROMOÇÃO RELÂMPAGO
                </span>
                <h3 style={{ fontSize: '20px', fontWeight: '800', marginTop: '10px', color: 'white' }}>{promotion.title}</h3>
                
                {/* Calculate remaining slots inside the modal */}
                {(() => {
                  const promoServices = services.filter((s) => promotion.serviceIds.includes(s.id));
                  const promoServiceNames = promoServices.map((s) => s.name);
                  const booked = appointments.filter(
                    (app) =>
                      app.date === promotion.date &&
                      app.status !== 'cancelado' &&
                      promoServiceNames.every((name) => app.services.some((s) => s.name === name))
                  ).length;
                  const left = Math.max(0, promotion.maxSlots - booked);
                  return (
                    <div style={{
                      display: 'inline-block',
                      background: 'rgba(239, 68, 68, 0.15)',
                      border: '1px solid rgba(239, 68, 68, 0.3)',
                      color: 'var(--color-sem-resposta)',
                      fontSize: '12px',
                      fontWeight: '700',
                      padding: '4px 10px',
                      borderRadius: '20px',
                      marginTop: '8px'
                    }}>
                      Apenas {left} de {promotion.maxSlots} vagas restantes!
                    </div>
                  );
                })()}
              </div>

              {/* Details table */}
              <div style={{ background: 'var(--bg-primary)', padding: '14px', borderRadius: '10px', border: '1px solid var(--border-color)', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
                  <span style={{ color: 'var(--text-secondary)' }}>Serviços:</span>
                  <span style={{ fontWeight: '700', color: 'white', textAlign: 'right' }}>
                    {services.filter((s) => promotion.serviceIds.includes(s.id)).map((s) => s.name).join(' + ')}
                  </span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
                  <span style={{ color: 'var(--text-secondary)' }}>Data:</span>
                  <span style={{ fontWeight: '700', color: 'white' }}>{promotion.date.split('-').reverse().join('/')}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px', borderTop: '1px solid var(--border-color)', paddingTop: '8px', marginTop: '4px' }}>
                  <span style={{ color: 'var(--text-secondary)' }}>Preço Promocional:</span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span style={{ textDecoration: 'line-through', fontSize: '12px', color: 'var(--text-muted)' }}>
                      R$ {services.filter((s) => promotion.serviceIds.includes(s.id)).reduce((acc, s) => acc + s.price, 0).toFixed(2)}
                    </span>
                    <span style={{ fontWeight: '800', color: 'var(--accent-gold)', fontSize: '16px' }}>
                      R$ {promotion.price.toFixed(2)}
                    </span>
                  </div>
                </div>
              </div>

              <button
                onClick={() => {
                  setSelectedServiceIds(promotion.serviceIds);
                  setSelectedDate(promotion.date);
                  setStep(2); // ir direto para o passo de horários
                  setShowPromoPopup(false);
                  sessionStorage.setItem('barber_promo_dismissed', 'true');
                }}
                className="btn-primary"
                style={{
                  width: '100%',
                  padding: '14px',
                  background: 'var(--accent-gold-gradient)',
                  color: 'black',
                  fontWeight: '800',
                  fontSize: '15px',
                  border: 'none',
                  boxShadow: '0 4px 15px rgba(212, 175, 55, 0.3)'
                }}
              >
                Agende agora mesmo!
              </button>

              <button
                onClick={() => {
                  setShowPromoPopup(false);
                  sessionStorage.setItem('barber_promo_dismissed', 'true');
                }}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'var(--text-muted)',
                  fontSize: '12px',
                  cursor: 'pointer',
                  textDecoration: 'underline',
                  textAlign: 'center'
                }}
              >
                Não, obrigado. Quero agendar outro serviço.
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
