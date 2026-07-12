import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { getAvailableSlots } from '../utils/scheduleAlgorithm';
import { Check, MapPin, ArrowRight, Clipboard, Calendar } from 'lucide-react';

export const ClientFlow: React.FC = () => {
  const {
    services,
    appointments,
    config,
    addAppointment,
    updateClientStatus
  } = useApp();

  const [step, setStep] = useState<1 | 2 | 3 | 3.5 | 4>(1);
  const [selectedServiceIds, setSelectedServiceIds] = useState<string[]>([]);
  const [selectedDate, setSelectedDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [selectedTime, setSelectedTime] = useState('');
  const [clientName, setClientName] = useState('');
  const [clientPhone, setClientPhone] = useState('');
  
  // Payment option: 'pix' or 'local' (Pagar na Barbearia)
  const [paymentMethodSelection, setPaymentMethodSelection] = useState<'pix' | 'local'>('pix');

  // active appointment state for check-in view
  const [activeClientAppId, setActiveClientAppId] = useState<string | null>(null);

  // Search existing booking state
  const [searchPhone, setSearchPhone] = useState('');
  const [searchMode, setSearchMode] = useState(false);

  const todayStr = new Date().toISOString().split('T')[0];

  // Helper calculations
  const selectedServices = services.filter((s) => selectedServiceIds.includes(s.id));
  const totalDuration = selectedServices.reduce((acc, s) => acc + s.duration, 0);
  const totalValue = selectedServices.reduce((acc, s) => acc + s.price, 0);

  // Get dynamic free times slots
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

  // Triggers once payment choice confirms
  const handleBookingSubmit = () => {
    if (!clientName || !clientPhone || !selectedTime) return;

    const appServices = selectedServices.map((s) => ({
      name: s.name,
      price: s.price,
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
      notes: paymentMethodSelection === 'local' ? 'Pagamento presencial na barbearia.' : 'Sinal pago via PIX.'
    });

    setActiveClientAppId(newApp.id);
    setStep(4); // go directly to check-in/queue monitoring
  };

  const handleFindBooking = () => {
    if (!searchPhone) return;
    // Find active appointment for today
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

  // Google Calendar URL generator helper
  const getGoogleCalendarUrl = (app: any) => {
    const dateClean = app.date.replace(/-/g, ''); // "20260712"
    const [h, m] = app.startTime.split(':').map(Number);
    
    const startStr = `${dateClean}T${String(h).padStart(2, '0')}${String(m).padStart(2, '0')}00`;
    
    // Calculate end time based on minutes
    const totalMins = h * 60 + m + app.duration;
    const endH = Math.floor(totalMins / 60);
    const endM = totalMins % 60;
    const endStr = `${dateClean}T${String(endH).padStart(2, '0')}${String(endM).padStart(2, '0')}00`;
    
    const title = encodeURIComponent("Corte na Barbearia Sr. Miranda");
    const details = encodeURIComponent(
      `Serviços agendados:\n${app.services.map((s: any) => `- ${s.name} (R$ ${s.price})`).join('\n')}\n\nTempo estimado: ${app.duration} min`
    );
    const location = encodeURIComponent("Rua Augusta, 1234 - Consolação, São Paulo");
    
    return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${title}&dates=${startStr}/${endStr}&details=${details}&location=${location}`;
  };

  // Mock PIX Code Generator
  const getPixCode = () => {
    const amountFormatted = totalValue.toFixed(2);
    return `00020101021126580014br.gov.bcb.pix0111119888877775204000053039865405${amountFormatted}5802BR5920Barbearia Sr Miranda6009Sao Paulo62070503***6304`;
  };

  const copyPixCode = () => {
    navigator.clipboard.writeText(getPixCode());
    alert('Código Copia-e-Cola do PIX copiado com sucesso!');
  };

  // Find the details of the active booking for the client status view
  const currentApp = appointments.find((a) => a.id === activeClientAppId);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      
      {/* Premium Header Banner (Visible on steps 1, 2, 3) */}
      {step !== 4 && (
        <div className="premium-banner-container">
          <div className="premium-banner-image" style={{ backgroundImage: "url('/banner.png')" }} />
          <div className="premium-banner-overlay" />
        </div>
      )}

      {/* Title */}
      <div style={{ textAlign: 'center', margin: '10px 0' }}>
        <h2 style={{ fontSize: '24px', fontWeight: '800', color: 'white' }}>Agende Seu Horário</h2>
        <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '4px' }}>
          Sem ligações, sem WhatsApp. Rápido e inteligente.
        </p>
      </div>

      {/* Booking Search Switch */}
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

      {/* Progress Wizard Nodes */}
      {step !== 4 && !searchMode && (
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

      {/* STEP 1: Service Selection */}
      {step === 1 && !searchMode && (
        <div className="card-premium" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <h3 className="quick-actions-title">1. Selecione os Serviços</h3>
          
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
                        <span className="service-tag" style={{ background: 'var(--bg-tertiary)', color: s.color }}>
                          {s.category}
                        </span>
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
                Escolher Data <ArrowRight size={16} />
              </button>
            </div>
          ) : (
            <div style={{ textAlign: 'center', padding: '16px', color: 'var(--text-muted)', fontSize: '13px' }}>
              Selecione pelo menos um serviço para prosseguir.
            </div>
          )}
        </div>
      )}

      {/* STEP 2: Calendar & Timing */}
      {step === 2 && !searchMode && (
        <div className="card-premium" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <h3 className="quick-actions-title">2. Escolha Data e Horário</h3>
          
          <div className="input-group">
            <span className="input-label">Data de Preferência</span>
            <input 
              type="date" 
              className="text-input" 
              value={selectedDate}
              min={new Date().toISOString().split('T')[0]}
              onChange={(e) => {
                setSelectedDate(e.target.value);
                setSelectedTime('');
              }}
            />
          </div>

          <div className="input-group">
            <span className="input-label">Horários Disponíveis (Calculados dinamicamente)</span>
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

      {/* STEP 3: Client Identification */}
      {step === 3 && !searchMode && (
        <div className="card-premium" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <h3 className="quick-actions-title">3. Confirme seus Dados</h3>
          
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

          {/* Checkout Review Box */}
          <div style={{ background: 'var(--bg-primary)', padding: '14px', borderRadius: '8px', border: '1px solid var(--border-color)', display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <span className="input-label">Resumo do Agendamento</span>
            <div style={{ fontSize: '13px', display: 'flex', justifyContent: 'space-between' }}>
              <span>Serviços:</span>
              <span style={{ fontWeight: '700' }}>{selectedServices.map(s => s.name).join(' + ')}</span>
            </div>
            <div style={{ fontSize: '13px', display: 'flex', justifyContent: 'space-between' }}>
              <span>Data e Horário:</span>
              <span style={{ fontWeight: '700', color: 'var(--accent-gold)' }}>{selectedDate} às {selectedTime}</span>
            </div>
            <div style={{ fontSize: '13px', display: 'flex', justifyContent: 'space-between' }}>
              <span>Tempo Total:</span>
              <span>{totalDuration} minutos</span>
            </div>
            <div style={{ fontSize: '14px', fontWeight: '800', borderTop: '1px solid var(--border-color)', paddingTop: '8px', display: 'flex', justifyContent: 'space-between', color: 'var(--accent-gold)' }}>
              <span>Total a pagar:</span>
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

      {/* STEP 3.5: Payment options (PIX vs Local) */}
      {step === 3.5 && !searchMode && (
        <div className="card-premium" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <h3 className="quick-actions-title">🔑 Forma de Pagamento</h3>
          
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

          {/* Conditional Rendering based on Payment Choice */}
          {paymentMethodSelection === 'pix' ? (
            <>
              <p style={{ fontSize: '12px', color: 'var(--text-secondary)', lineHeight: '1.4' }}>
                Para garantir seu horário na agenda, realize o pagamento do sinal de <strong>R$ {totalValue.toFixed(2)}</strong> via PIX.
              </p>

              {/* Simulated QR Code box */}
              <div style={{ background: 'white', padding: '20px', borderRadius: '12px', width: '180px', height: '180px', margin: '0 auto', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px', width: '120px', height: '120px' }}>
                  {Array.from({ length: 9 }).map((_, idx) => (
                    <div 
                      key={idx} 
                      style={{ 
                        background: (idx === 0 || idx === 2 || idx === 6 || idx === 8 || idx === 4) ? 'black' : 'none',
                        border: (idx === 0 || idx === 2 || idx === 6 || idx === 8) ? '4px solid black' : 'none',
                        borderRadius: '2px'
                      }} 
                    />
                  ))}
                </div>
                <span style={{ color: 'black', fontSize: '9px', fontWeight: '800', marginTop: '10px', letterSpacing: '1px' }}>PIX QR CODE MOCK</span>
              </div>

              {/* Copy Paste key */}
              <div className="input-group">
                <span className="input-label">Chave Copia e Cola</span>
                <div style={{ display: 'flex', gap: '6px' }}>
                  <input 
                    type="text" 
                    className="text-input" 
                    style={{ flex: 1, textOverflow: 'ellipsis', fontSize: '12px', background: 'var(--bg-primary)' }}
                    value={getPixCode()} 
                    readOnly 
                  />
                  <button type="button" className="btn-secondary" style={{ padding: '10px' }} onClick={copyPixCode}>
                    <Clipboard size={16} />
                  </button>
                </div>
              </div>

              <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '16px', marginTop: '10px' }}>
                <span className="input-label" style={{ display: 'block', marginBottom: '8px', color: 'var(--color-present)' }}>Simulador de Testes:</span>
                <button 
                  type="button" 
                  className="btn-primary" 
                  style={{ width: '100%', background: 'var(--accent-green-gradient)', color: 'white' }}
                  onClick={handleBookingSubmit}
                >
                  ⚡ Simular Confirmação de PIX
                </button>
              </div>
            </>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', padding: '18px', background: 'var(--bg-primary)', borderRadius: '10px', border: '1px solid var(--border-color)', textAlign: 'center' }}>
                <span style={{ fontSize: '32px' }}>🏪</span>
                <h4 style={{ fontSize: '15px', fontWeight: '700', color: 'white' }}>Agendamento com Pagamento Local</h4>
                <p style={{ fontSize: '12px', color: 'var(--text-secondary)', lineHeight: '1.4' }}>
                  Você escolheu pagar presencialmente na barbearia. O valor total de <strong>R$ {totalValue.toFixed(2)}</strong> poderá ser quitado via PIX, Cartão ou Dinheiro ao finalizar seu serviço.
                </p>
              </div>

              <button 
                type="button" 
                className="btn-primary" 
                style={{ width: '100%', background: 'var(--accent-gold-gradient)', color: 'black' }}
                onClick={handleBookingSubmit}
              >
                Confirmar Agendamento e Reservar
              </button>
            </div>
          )}

          <div style={{ display: 'flex', gap: '10px', marginTop: '6px' }}>
            <button className="btn-secondary" style={{ width: '100%' }} onClick={() => setStep(3)}>
              Voltar
            </button>
          </div>
        </div>
      )}

      {/* STEP 4: Live Check-in & Queue monitoring room */}
      {step === 4 && currentApp && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          
          <div className="card-premium" style={{ textAlign: 'center', border: '1px solid var(--color-present)', background: '#121c15' }}>
            <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: 'rgba(16, 185, 129, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px auto' }}>
              <Check color="var(--color-present)" size={24} />
            </div>
            <h3 style={{ fontSize: '16px', fontWeight: '800', color: 'var(--color-present)' }}>Agendamento Concluído com Sucesso!</h3>
            <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '4px' }}>
              Seu lugar na fila foi reservado.
            </p>
          </div>

          {/* Ticket Information card */}
          <div className="card-premium">
            <h3 className="quick-actions-title">Seu Ticket Digital</h3>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border-color)', paddingBottom: '8px' }}>
                <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Cliente</span>
                <span style={{ fontSize: '13px', fontWeight: '700' }}>{currentApp.clientName}</span>
              </div>
              
              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border-color)', paddingBottom: '8px' }}>
                <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Horário Agendado</span>
                <span style={{ fontSize: '13px', fontWeight: '700', color: 'var(--accent-gold)' }}>Hoje às {currentApp.startTime}</span>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border-color)', paddingBottom: '8px' }}>
                <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Serviços</span>
                <span style={{ fontSize: '13px', fontWeight: '700' }}>{currentApp.services.map(s => s.name).join(', ')}</span>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '8px' }}>
                <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Valor</span>
                <span style={{ fontSize: '13px', fontWeight: '700', color: 'var(--accent-gold)' }}>
                  R$ {currentApp.totalValue.toFixed(2)} {currentApp.notes?.includes('presencial') ? '(Pagar na Barbearia)' : '(PIX Pago)'}
                </span>
              </div>
            </div>
            
            {/* Google Calendar export button */}
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

          {/* Live Check-in / Presence Confirmations */}
          <div className="card-premium" style={{ borderLeft: '4px solid var(--accent-gold)' }}>
            <h3 className="quick-actions-title">Aviso de Chegada (Check-in)</h3>
            <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '14px' }}>
              Informe o barbeiro sobre a sua localização para otimizar a fila de atendimentos:
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
                  <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>Estou a caminho da barbearia. Chego em alguns minutos.</span>
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
                  <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>Cheguei! Aguardando minha vez na recepção.</span>
                </div>
              </button>
            </div>
          </div>

          {/* Shop address/details */}
          <div className="card-premium">
            <h3 className="quick-actions-title" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <MapPin size={16} /> Como Chegar
            </h3>
            <p style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
              Rua Augusta, 1234 - Consolação, São Paulo
            </p>
            <p style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>
              Contato: (11) 98888-7777 | Instagram: @barbeariasrmiranda
            </p>
          </div>

          <button 
            className="btn-secondary" 
            style={{ width: '100%' }}
            onClick={() => {
              setStep(1);
              setSelectedServiceIds([]);
              setSelectedTime('');
              setClientName('');
              setClientPhone('');
              setActiveClientAppId(null);
            }}
          >
            Novo Agendamento
          </button>
        </div>
      )}

    </div>
  );
};
