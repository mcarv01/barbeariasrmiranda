import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { getAvailableSlots, parseTimeToMinutes, formatMinutesToTime, getLocalDateStr } from '../utils/scheduleAlgorithm';
import { Calendar, Plus, CheckSquare, X, Lock, Unlock } from 'lucide-react';

export const Agenda: React.FC = () => {
  const {
    appointments,
    services,
    clients,
    config,
    addAppointment,
    cancelAppointment,
    markNoShow,
    updateConfig
  } = useApp();

  const [selectedDate, setSelectedDate] = useState<string>(() => getLocalDateStr());
  const [bookingModalOpen, setBookingModalOpen] = useState(false);

  // Form states for manual booking
  const [clientName, setClientName] = useState('');
  const [clientPhone, setClientPhone] = useState('');
  const [selectedServiceIds, setSelectedServiceIds] = useState<string[]>([]);
  const [bookingDate, setBookingDate] = useState(() => getLocalDateStr());
  const [bookingTime, setBookingTime] = useState('');
  const [notes, setNotes] = useState('');

  const today = new Date();
  
  // Generate next 7 days for horizontal selector
  const daysList = Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(today.getDate() + i);
    const dateStr = getLocalDateStr(d);
    const dayNum = d.getDate();
    const dayName = d.toLocaleDateString('pt-BR', { weekday: 'short' }).replace('.', '');
    return { dateStr, dayNum, dayName };
  });

  // Filter and sort appointments for selected date
  const dayAppointments = appointments
    .filter((a) => a.date === selectedDate && a.status !== 'cancelado')
    .sort((a, b) => parseTimeToMinutes(a.startTime) - parseTimeToMinutes(b.startTime));

  // Dynamic slots logic for manual booking form
  const selectedServices = services.filter((s) => selectedServiceIds.includes(s.id));
  const totalDuration = selectedServices.reduce((acc, s) => acc + s.duration, 0);
  const totalValue = selectedServices.reduce((acc, s) => acc + s.price, 0);
  
  const availableSlots = getAvailableSlots(
    bookingDate,
    totalDuration > 0 ? totalDuration : 30, // Fallback to 30 min if none selected
    appointments,
    config,
    new Date()
  );

  // Calculation for full day slots grid control
  const openMins = parseTimeToMinutes(config.openingTime);
  const closeMins = parseTimeToMinutes(config.closingTime);
  const lunchStartMins = parseTimeToMinutes(config.lunchStart);
  const lunchEndMins = parseTimeToMinutes(config.lunchEnd);

  const daySlotTimes: string[] = [];
  for (let m = openMins; m < closeMins; m += 30) {
    daySlotTimes.push(formatMinutesToTime(m));
  }

  const handleToggleSlotBlock = (timeStr: string) => {
    const m = parseTimeToMinutes(timeStr);
    const endTimeStr = formatMinutesToTime(m + 30);

    const existingIndex = (config.blockedPeriods || []).findIndex(
      (bp) => bp.start === timeStr && (!bp.date || bp.date === selectedDate)
    );

    if (existingIndex >= 0) {
      const updated = config.blockedPeriods.filter((_, idx) => idx !== existingIndex);
      updateConfig({ blockedPeriods: updated });
    } else {
      const newBlock = {
        date: selectedDate,
        start: timeStr,
        end: endTimeStr,
        label: 'Bloqueado pelo barbeiro'
      };
      updateConfig({ blockedPeriods: [...(config.blockedPeriods || []), newBlock] });
    }
  };

  const handleOpenBooking = () => {
    setClientName('');
    setClientPhone('');
    setSelectedServiceIds([]);
    setBookingDate(selectedDate);
    setBookingTime('');
    setNotes('');
    setBookingModalOpen(true);
  };

  const handleServiceToggle = (id: string) => {
    setSelectedServiceIds((prev) =>
      prev.includes(id) ? prev.filter((sid) => sid !== id) : [...prev, id]
    );
  };

  const handleConfirmBooking = (e: React.FormEvent) => {
    e.preventDefault();
    if (!clientName || !clientPhone || selectedServiceIds.length === 0 || !bookingTime) {
      alert('Preencha todos os campos obrigatórios.');
      return;
    }

    const appServices = selectedServices.map((s) => ({
      name: s.name,
      price: s.price,
      duration: s.duration
    }));

    addAppointment({
      clientName,
      clientPhone,
      date: bookingDate,
      startTime: bookingTime,
      duration: totalDuration,
      services: appServices,
      totalValue,
      notes
    });

    setBookingModalOpen(false);
  };

  const selectExistingClient = (client: typeof clients[0]) => {
    setClientName(client.name);
    setClientPhone(client.phone);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      
      {/* Day Selector */}
      <div className="agenda-day-selector">
        {daysList.map((day) => (
          <div
            key={day.dateStr}
            className={`day-tab ${selectedDate === day.dateStr ? 'active' : ''}`}
            onClick={() => setSelectedDate(day.dateStr)}
          >
            <span className="day-name">{day.dayName}</span>
            <span className="day-number">{day.dayNum}</span>
          </div>
        ))}
      </div>

      {/* Agenda Main Container */}
      <div className="card-premium">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <h3 className="quick-actions-title" style={{ margin: 0 }}>
            Compromissos do Dia ({dayAppointments.length})
          </h3>
          <button className="btn-primary" style={{ padding: '8px 14px', fontSize: '12px' }} onClick={handleOpenBooking}>
            <Plus size={16} /> Agendar
          </button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {dayAppointments.length === 0 ? (
            <div className="empty-state">
              <Calendar />
              <p>Nenhum agendamento para esta data.</p>
            </div>
          ) : (
            dayAppointments.map((app) => {
              const isFinished = app.status === 'finalizado';
              const isNoShow = app.status === 'no_show';
              return (
                <div 
                  key={app.id} 
                  className="queue-item"
                  style={{
                    opacity: isFinished || isNoShow ? 0.6 : 1,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'stretch',
                    gap: '10px'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div style={{ display: 'flex', gap: '12px' }}>
                      <span className="queue-time" style={{ fontSize: '15px' }}>{app.startTime}</span>
                      <div>
                        <div style={{ fontWeight: '700', fontSize: '14px', color: 'var(--text-primary)' }}>{app.clientName}</div>
                        <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '2px' }}>
                          {app.services.map((s) => s.name).join(', ')} ({app.duration} min)
                        </div>
                      </div>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
                      <span style={{ fontWeight: '700', color: 'var(--accent-gold)' }}>R$ {app.totalValue.toFixed(2)}</span>
                      {app.clientStatus && (
                        <span 
                          style={{
                            fontSize: '9px',
                            marginTop: '4px',
                            color: 
                              app.clientStatus === 'presente' ? 'var(--color-present)' : 
                              app.clientStatus === 'a_caminho' ? 'var(--color-a-caminho)' : 'var(--text-muted)'
                          }}
                        >
                          {app.clientStatus === 'presente' ? '🟢 Presente' : app.clientStatus === 'a_caminho' ? '🟡 A caminho' : '🔴 Sem resposta'}
                        </span>
                      )}
                    </div>
                  </div>

                  {app.notes && (
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)', background: 'var(--bg-primary)', padding: '6px 8px', borderRadius: '4px' }}>
                      📝 {app.notes}
                    </div>
                  )}

                  {!isFinished && !isNoShow && (
                    <div style={{ display: 'flex', gap: '8px', borderTop: '1px solid var(--border-color)', paddingTop: '10px', marginTop: '4px' }}>
                      <button 
                        className="btn-secondary" 
                        style={{ flex: 1, padding: '6px', fontSize: '11px', color: 'var(--color-sem-resposta)' }}
                        onClick={() => cancelAppointment(app.id)}
                      >
                        Cancelar
                      </button>
                      <button 
                        className="btn-secondary" 
                        style={{ flex: 1, padding: '6px', fontSize: '11px', color: 'var(--color-a-caminho)' }}
                        onClick={() => markNoShow(app.id)}
                      >
                        Marcar Falta
                      </button>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Grade e Controle de Horários do Dia */}
      <div className="card-premium">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
          <div>
            <h3 className="quick-actions-title" style={{ margin: 0 }}>
              Controle de Horários da Grade ({selectedDate.split('-').reverse().join('/')})
            </h3>
            <p style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '2px' }}>
              Clique em qualquer horário para <strong>Eliminar/Bloquear</strong> ou <strong>Liberar</strong> para os clientes.
            </p>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(135px, 1fr))', gap: '8px', marginTop: '12px' }}>
          {daySlotTimes.map((slotTime) => {
            const slotMins = parseTimeToMinutes(slotTime);
            const isLunch = slotMins >= lunchStartMins && slotMins < lunchEndMins;

            // Check if booked by client
            const activeBooking = dayAppointments.find((a) => {
              const start = parseTimeToMinutes(a.startTime);
              const end = start + a.duration;
              return slotMins >= start && slotMins < end;
            });

            // Check if blocked in blockedPeriods
            const isBlocked = (config.blockedPeriods || []).some((bp) => {
              if (bp.date && bp.date !== selectedDate) return false;
              const bStart = parseTimeToMinutes(bp.start);
              const bEnd = parseTimeToMinutes(bp.end);
              return slotMins >= bStart && slotMins < bEnd;
            });

            if (activeBooking) {
              return (
                <div
                  key={slotTime}
                  style={{
                    padding: '8px 10px',
                    borderRadius: '8px',
                    background: 'rgba(155, 89, 182, 0.15)',
                    border: '1px solid rgba(155, 89, 182, 0.3)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '2px'
                  }}
                >
                  <div style={{ fontSize: '12px', fontWeight: '700', color: '#9B59B6' }}>
                    ⏰ {slotTime}
                  </div>
                  <div style={{ fontSize: '10px', color: 'white', fontWeight: '600', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>
                    👤 {activeBooking.clientName}
                  </div>
                  <span style={{ fontSize: '9px', color: 'var(--text-muted)' }}>Agendado</span>
                </div>
              );
            }

            if (isLunch) {
              return (
                <div
                  key={slotTime}
                  style={{
                    padding: '8px 10px',
                    borderRadius: '8px',
                    background: 'rgba(255, 255, 255, 0.04)',
                    border: '1px dashed var(--border-color)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '2px',
                    opacity: 0.6
                  }}
                >
                  <div style={{ fontSize: '12px', fontWeight: '700', color: 'var(--text-muted)' }}>
                    ⏰ {slotTime}
                  </div>
                  <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>🍱 Almoço</span>
                </div>
              );
            }

            return (
              <div
                key={slotTime}
                style={{
                  padding: '8px 10px',
                  borderRadius: '8px',
                  background: isBlocked ? 'rgba(239, 68, 68, 0.12)' : 'var(--bg-tertiary)',
                  border: isBlocked ? '1px solid rgba(239, 68, 68, 0.4)' : '1px solid var(--border-color)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '6px',
                  transition: 'all 0.15s ease'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '13px', fontWeight: '700', color: isBlocked ? '#ef4444' : 'white', fontFamily: 'monospace' }}>
                    ⏰ {slotTime}
                  </span>
                  <span style={{ fontSize: '10px', color: isBlocked ? '#ef4444' : '#10b981', fontWeight: '700' }}>
                    {isBlocked ? '🔴 Bloqueado' : '🟢 Livre'}
                  </span>
                </div>

                <button
                  type="button"
                  onClick={() => handleToggleSlotBlock(slotTime)}
                  style={{
                    padding: '4px 8px',
                    borderRadius: '6px',
                    fontSize: '10px',
                    fontWeight: '700',
                    cursor: 'pointer',
                    background: isBlocked ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                    border: isBlocked ? '1px solid rgba(16, 185, 129, 0.4)' : '1px solid rgba(239, 68, 68, 0.4)',
                    color: isBlocked ? '#10b981' : '#ef4444',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '4px'
                  }}
                >
                  {isBlocked ? (
                    <>
                      <Unlock size={11} /> Liberar Horário
                    </>
                  ) : (
                    <>
                      <Lock size={11} /> Eliminar / Bloquear
                    </>
                  )}
                </button>
              </div>
            );
          })}
        </div>
      </div>

      {/* Manual Booking Modal for Barber */}
      {bookingModalOpen && (
        <div className="modal-overlay">
          <div className="modal-container" style={{ maxWidth: '480px' }}>
            <div className="modal-header">
              <h3 className="modal-title">Novo Agendamento (Barbeiro)</h3>
              <button 
                onClick={() => setBookingModalOpen(false)} 
                style={{ background: 'none', border: 'none', color: 'white', cursor: 'pointer' }}
              >
                <X size={20} />
              </button>
            </div>
            
            <form onSubmit={handleConfirmBooking} className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              
              {/* Client Selection (Search existing clients) */}
              <div className="input-group">
                <span className="input-label">Cliente Rápido</span>
                <div style={{ display: 'flex', gap: '6px', overflowX: 'auto', paddingBottom: '4px' }}>
                  {clients.map((c) => (
                    <button
                      key={c.id}
                      type="button"
                      className="simulator-btn"
                      style={{ whiteSpace: 'nowrap' }}
                      onClick={() => selectExistingClient(c)}
                    >
                      {c.name}
                    </button>
                  ))}
                </div>
              </div>

              <div className="input-group">
                <span className="input-label">Nome do Cliente *</span>
                <input 
                  type="text" 
                  className="text-input" 
                  placeholder="Nome completo"
                  value={clientName}
                  onChange={(e) => setClientName(e.target.value)}
                  required 
                />
              </div>

              <div className="input-group">
                <span className="input-label">Telefone / WhatsApp *</span>
                <input 
                  type="tel" 
                  className="text-input" 
                  placeholder="(00) 00000-0000"
                  value={clientPhone}
                  onChange={(e) => setClientPhone(e.target.value)}
                  required 
                />
              </div>

              {/* Services Multi-Select */}
              <div className="input-group">
                <span className="input-label">Serviços *</span>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginTop: '4px' }}>
                  {services.filter(s => s.status === 'active').map((s) => {
                    const isSelected = selectedServiceIds.includes(s.id);
                    return (
                      <div 
                        key={s.id} 
                        className={`service-select-card ${isSelected ? 'selected' : ''}`}
                        onClick={() => handleServiceToggle(s.id)}
                        style={{ padding: '10px 12px' }}
                      >
                        <div>
                          <div style={{ fontSize: '13px', fontWeight: '600' }}>{s.name}</div>
                          <div style={{ fontSize: '10px', color: 'var(--text-secondary)' }}>{s.duration} min | R$ {s.price.toFixed(2)}</div>
                        </div>
                        <div className="checkbox-custom">
                          {isSelected && <CheckSquare size={14} />}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Date Input */}
              <div className="input-group">
                <span className="input-label">Data *</span>
                <input 
                  type="date" 
                  className="text-input"
                  value={bookingDate}
                  onChange={(e) => {
                    setBookingDate(e.target.value);
                    setBookingTime(''); // reset slot when date changes
                  }}
                  required 
                />
              </div>

              {/* Dynamically calculated Slots grid */}
              <div className="input-group">
                <span className="input-label">Horários Disponíveis (Algoritmo inteligente)</span>
                {availableSlots.length === 0 ? (
                  <div style={{ fontSize: '12px', color: 'var(--color-sem-resposta)', marginTop: '6px' }}>
                    Nenhum horário disponível para esta data e serviços.
                  </div>
                ) : (
                  <div className="slots-grid" style={{ gridTemplateColumns: 'repeat(3, 1fr)' }}>
                    {availableSlots.map((time) => (
                      <button
                        key={time}
                        type="button"
                        className={`slot-btn ${bookingTime === time ? 'selected' : ''}`}
                        onClick={() => setBookingTime(time)}
                      >
                        {time}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <div className="input-group">
                <span className="input-label">Observações</span>
                <textarea 
                  className="text-input" 
                  rows={2}
                  placeholder="Instruções especiais ou detalhes"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                />
              </div>

              {selectedServiceIds.length > 0 && (
                <div style={{ background: 'var(--bg-primary)', padding: '12px', borderRadius: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Resumo do agendamento</span>
                    <div style={{ fontSize: '14px', fontWeight: '700', color: 'var(--accent-gold)' }}>R$ {totalValue.toFixed(2)}</div>
                  </div>
                  <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>⏱️ {totalDuration} minutos total</span>
                </div>
              )}

              <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
                <button type="button" className="btn-secondary" style={{ flex: 1 }} onClick={() => setBookingModalOpen(false)}>
                  Voltar
                </button>
                <button 
                  type="submit" 
                  className="btn-primary" 
                  style={{ flex: 2 }}
                  disabled={!clientName || !clientPhone || selectedServiceIds.length === 0 || !bookingTime}
                >
                  Garantir Horário
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
