import React, { useState } from 'react';
import type { Client } from '../context/AppContext';
import { useApp } from '../context/AppContext';
import { Search, User, Award, Edit3, X, Image as ImageIcon, Globe } from 'lucide-react';

export const Clientes: React.FC = () => {
  const { clients, appointments, updateClient } = useApp();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [isEditing, setIsEditing] = useState(false);

  // Editing form states
  const [notes, setNotes] = useState('');
  const [hairPreference, setHairPreference] = useState('');
  const [instagram, setInstagram] = useState('');
  const [whatsapp, setWhatsapp] = useState('');

  // Filter clients based on search query (name, phone)
  const filteredClients = clients.filter(
    (c) =>
      c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.phone.includes(searchQuery)
  );

  const handleOpenClientDetails = (client: Client) => {
    setSelectedClient(client);
    setNotes(client.notes);
    setHairPreference(client.hairPreference);
    setInstagram(client.instagram);
    setWhatsapp(client.whatsapp);
    setIsEditing(false);
  };

  const handleSaveChanges = () => {
    if (selectedClient) {
      updateClient(selectedClient.id, {
        notes,
        hairPreference,
        instagram,
        whatsapp
      });
      // Update local state to reflect change immediately in view details
      setSelectedClient({
        ...selectedClient,
        notes,
        hairPreference,
        instagram,
        whatsapp
      });
      setIsEditing(false);
    }
  };

  // Find all appointments of the selected client
  const getClientHistory = (client: Client) => {
    return appointments
      .filter((a) => (a.clientPhone === client.phone || a.clientName === client.name) && a.status === 'finalizado')
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  };

  // CRM: Days elapsed since last visit logic
  const getDaysSinceLastVisit = (lastVisitStr: string) => {
    if (lastVisitStr === '-' || !lastVisitStr) return 999;
    const today = new Date();
    const lastVisitDate = new Date(lastVisitStr + 'T00:00:00');
    const diffTime = today.getTime() - lastVisitDate.getTime();
    return Math.floor(diffTime / (1000 * 60 * 60 * 24));
  };

  // Filter clients that have been absent for more than 15 days
  const absentClients = clients.filter((c) => {
    const days = getDaysSinceLastVisit(c.lastVisit);
    return days > 15; // Sumido há mais de 15 dias
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      
      {/* CRM Absent Clients / Return Reminders Alert Section */}
      {absentClients.length > 0 && (
        <div className="card-premium" style={{ borderLeft: '4px solid var(--accent-gold)' }}>
          <h3 className="quick-actions-title" style={{ color: 'var(--accent-gold)' }}>
            Lembretes de Retorno (Clientes Sumidos)
          </h3>
          <p style={{ fontSize: '11px', color: 'var(--text-secondary)', marginBottom: '8px' }}>
            Clientes que não cortam há mais de 15 dias. Clique para iniciar conversa amigável:
          </p>
          <div style={{ display: 'flex', gap: '10px', overflowX: 'auto', paddingBottom: '8px', marginTop: '8px' }}>
            {absentClients.map((client) => {
              const days = getDaysSinceLastVisit(client.lastVisit);
              const daysLabel = days === 999 ? 'Sem visitas registradas' : `${days} dias atrás`;
              const msg = `Fala ${client.name}! Faz um tempinho do seu último corte degradê conosco na Barbearia Sr. Miranda. Que tal garantir seu horário para essa semana? Agende direto pelo nosso aplicativo: http://localhost:5174/`;
              const waUrl = `https://wa.me/${client.phone}?text=${encodeURIComponent(msg)}`;

              return (
                <div 
                  key={client.id} 
                  className="card-premium" 
                  style={{ minWidth: '220px', padding: '12px', background: 'var(--bg-primary)', display: 'flex', flexDirection: 'column', gap: '8px', border: '1px solid var(--border-color)' }}
                >
                  <div>
                    <div style={{ fontWeight: '700', fontSize: '13px' }}>{client.name}</div>
                    <div style={{ fontSize: '11px', color: 'var(--color-sem-resposta)', marginTop: '2px' }}>
                      Última visita: {daysLabel}
                    </div>
                  </div>
                  <a 
                    href={waUrl} 
                    target="_blank" 
                    rel="noopener noreferrer" 
                    className="btn-primary" 
                    style={{ fontSize: '10px', padding: '6px', textAlign: 'center', textDecoration: 'none', background: 'var(--accent-gold-gradient)', color: 'black' }}
                  >
                    💬 Enviar Mensagem
                  </a>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Search Input Bar */}
      <div className="search-bar-container">
        <Search size={18} className="search-icon-svg" />
        <input
          type="text"
          className="search-input"
          placeholder="Pesquisar cliente por nome ou telefone..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>

      {/* Clients Grid List */}
      <div className="client-list">
        {filteredClients.length === 0 ? (
          <div className="empty-state">
            <User />
            <p>Nenhum cliente encontrado.</p>
          </div>
        ) : (
          filteredClients.map((client) => {
            const clientHistory = appointments.filter(
              (a) => (a.clientPhone === client.phone || a.clientName === client.name) && a.status === 'finalizado'
            );
            return (
              <div 
                key={client.id} 
                className="client-card" 
                onClick={() => handleOpenClientDetails(client)}
              >
                <div className="client-card-header">
                  <div>
                    <h4 className="client-card-name">{client.name}</h4>
                    <span className="client-card-phone">📞 {client.phone}</span>
                  </div>
                  <div className="client-loyalty-preview">
                    <span className="loyalty-badge">
                      🏆 Fidelidade: {client.loyaltyCount}/10
                    </span>
                  </div>
                </div>

                <div className="client-metrics-summary">
                  <div className="client-mini-metric">
                    <span className="client-mini-label">Visitas</span>
                    <span className="client-mini-val">{clientHistory.length || client.visitCount}</span>
                  </div>
                  <div className="client-mini-metric">
                    <span className="client-mini-label">Total Gasto</span>
                    <span className="client-mini-val">R$ {(clientHistory.reduce((acc, a) => acc + a.totalValue, 0) || client.totalSpent).toFixed(2)}</span>
                  </div>
                  <div className="client-mini-metric">
                    <span className="client-mini-label">Retorno Médio</span>
                    <span className="client-mini-val">
                      {client.avgInterval > 0 ? `${client.avgInterval} dias` : '18 dias'}
                    </span>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Client Detail modal with CRM history and loyalty stamping card */}
      {selectedClient && (
        <div className="modal-overlay">
          <div className="modal-container" style={{ maxWidth: '460px' }}>
            <div className="modal-header">
              <h3 className="modal-title">Ficha do Cliente</h3>
              <button 
                onClick={() => setSelectedClient(null)} 
                style={{ background: 'none', border: 'none', color: 'white', cursor: 'pointer' }}
              >
                <X size={20} />
              </button>
            </div>
            
            <div className="modal-body" style={{ paddingBottom: '30px' }}>
              
              {/* Profile Card Header */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px', borderBottom: '1px solid var(--border-color)', paddingBottom: '16px' }}>
                <div style={{ width: '56px', height: '56px', borderRadius: '50%', background: 'var(--accent-gold-gradient)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'black', fontSize: '20px', fontWeight: '800' }}>
                  {selectedClient.name.charAt(0).toUpperCase()}
                </div>
                <div>
                  <h2 style={{ fontSize: '18px', fontWeight: '800' }}>{selectedClient.name}</h2>
                  <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '2px' }}>
                    Desde {selectedClient.lastVisit !== '-' ? selectedClient.lastVisit : 'Julho/2026'}
                  </p>
                </div>
              </div>

              {/* Editable Fields info */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <h4 style={{ fontSize: '12px', color: 'var(--accent-gold)', textTransform: 'uppercase', fontWeight: '700' }}>
                  Informações de Contato & Detalhes
                </h4>

                <div className="input-group">
                  <span className="input-label">WhatsApp</span>
                  {isEditing ? (
                    <input 
                      type="text" 
                      className="text-input" 
                      value={whatsapp} 
                      onChange={(e) => setWhatsapp(e.target.value)} 
                    />
                  ) : (
                    <span style={{ fontSize: '13px' }}>{selectedClient.whatsapp || selectedClient.phone}</span>
                  )}
                </div>

                <div className="input-group">
                  <span className="input-label">Instagram</span>
                  {isEditing ? (
                    <input 
                      type="text" 
                      className="text-input" 
                      value={instagram} 
                      onChange={(e) => setInstagram(e.target.value)} 
                    />
                  ) : (
                    <span style={{ fontSize: '13px', color: 'var(--accent-gold)' }}>
                      <Globe size={12} style={{ display: 'inline', marginRight: '4px', verticalAlign: 'middle' }} />
                      {selectedClient.instagram || 'Não informado'}
                    </span>
                  )}
                </div>

                <div className="input-group">
                  <span className="input-label">Preferência de Corte</span>
                  {isEditing ? (
                    <textarea 
                      className="text-input" 
                      rows={2} 
                      value={hairPreference} 
                      onChange={(e) => setHairPreference(e.target.value)} 
                    />
                  ) : (
                    <span style={{ fontSize: '13px', background: 'rgba(255,255,255,0.02)', padding: '8px', borderRadius: '6px', border: '1px solid var(--border-color)' }}>
                      {selectedClient.hairPreference || 'Nenhuma preferência registrada ainda.'}
                    </span>
                  )}
                </div>

                <div className="input-group">
                  <span className="input-label">Observações Clínicas / Barba</span>
                  {isEditing ? (
                    <textarea 
                      className="text-input" 
                      rows={2} 
                      value={notes} 
                      onChange={(e) => setNotes(e.target.value)} 
                    />
                  ) : (
                    <span style={{ fontSize: '13px' }}>{selectedClient.notes || 'Sem observações.'}</span>
                  )}
                </div>
              </div>

              {/* Loyalty Program Section */}
              <div className="loyalty-card-wrapper" style={{ marginTop: '10px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <h4 style={{ fontSize: '14px', fontWeight: '700', color: 'var(--accent-gold)' }}>Cartão Fidelidade Digital</h4>
                    <p style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '2px' }}>10 cortes = 1 corte grátis</p>
                  </div>
                  <Award color="var(--accent-gold)" size={24} />
                </div>
                
                {/* 10 Stamps box */}
                <div className="loyalty-stamps-grid">
                  {Array.from({ length: 10 }).map((_, i) => {
                    const isStamped = i < selectedClient.loyaltyCount;
                    return (
                      <div key={i} className={`loyalty-stamp ${isStamped ? 'stamped' : ''}`}>
                        {isStamped ? '✂️' : i + 1}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Past Cuts Mock Photos section */}
              <div style={{ marginTop: '10px' }}>
                <span className="input-label" style={{ display: 'block', marginBottom: '8px' }}>Fotos de Cortes Anteriores</span>
                <div style={{ display: 'flex', gap: '10px' }}>
                  <div style={{ flex: 1, aspectRatio: '1', border: '1.5px dashed var(--border-color)', borderRadius: '8px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', fontSize: '10px' }}>
                    <ImageIcon size={18} />
                    <span style={{ marginTop: '4px' }}>Foto 1</span>
                  </div>
                  <div style={{ flex: 1, aspectRatio: '1', border: '1.5px dashed var(--border-color)', borderRadius: '8px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', fontSize: '10px' }}>
                    <ImageIcon size={18} />
                    <span style={{ marginTop: '4px' }}>Foto 2</span>
                  </div>
                  <div style={{ flex: 1, aspectRatio: '1', border: '1.5px dashed var(--border-color)', borderRadius: '8px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', fontSize: '10px' }}>
                    <ImageIcon size={18} />
                    <span style={{ marginTop: '4px' }}>Adicionar</span>
                  </div>
                </div>
              </div>

              {/* CRM Appointment History list */}
              <div style={{ marginTop: '10px' }}>
                <span className="input-label" style={{ display: 'block', marginBottom: '8px' }}>Histórico Completo de Atendimentos</span>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {getClientHistory(selectedClient).length === 0 ? (
                    <div style={{ fontSize: '12px', color: 'var(--text-muted)', padding: '10px', textAlign: 'center' }}>
                      Nenhum atendimento finalizado registrado.
                    </div>
                  ) : (
                    getClientHistory(selectedClient).map((historyItem) => (
                      <div key={historyItem.id} style={{ background: 'var(--bg-primary)', padding: '10px', borderRadius: '6px', border: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', fontSize: '12px' }}>
                        <div>
                          <div style={{ fontWeight: '600' }}>
                            {historyItem.services.map((s) => s.name).join(' + ')}
                          </div>
                          <div style={{ color: 'var(--text-secondary)', fontSize: '11px', marginTop: '2px' }}>
                            📅 {historyItem.date} às {historyItem.startTime} ({historyItem.paymentMethod?.toUpperCase()})
                          </div>
                        </div>
                        <span style={{ color: 'var(--accent-gold)', fontWeight: '700' }}>
                          R$ {historyItem.totalValue.toFixed(2)}
                        </span>
                      </div>
                    ))
                  )}
                </div>
              </div>

            </div>

            <div className="modal-footer">
              {isEditing ? (
                <>
                  <button className="btn-secondary" onClick={() => setIsEditing(false)}>
                    Cancelar
                  </button>
                  <button className="btn-primary" onClick={handleSaveChanges}>
                    Salvar Mudanças
                  </button>
                </>
              ) : (
                <>
                  <button className="btn-secondary" onClick={() => setSelectedClient(null)}>
                    Fechar
                  </button>
                  <button className="btn-primary" onClick={() => setIsEditing(true)}>
                    <Edit3 size={16} /> Editar Ficha
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
