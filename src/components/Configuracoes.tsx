import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { Plus, Save, Info, Pencil, X, Trash2, RefreshCw } from 'lucide-react';

export const Configuracoes: React.FC = () => {
  const {
    services,
    config,
    addService,
    updateService,
    deleteService,
    updateConfig,
    resetData,
    syncAllDataToCloud
  } = useApp();

  // Shop details form
  const [shopName, setShopName] = useState(config.shopName || 'Barbearia Sr. Miranda');
  const [whatsapp, setWhatsapp] = useState(config.whatsapp || '11988887777');
  const [instagram, setInstagram] = useState(config.instagram || '@barbeariasrmiranda');
  const [address, setAddress] = useState(config.address || 'Rua Augusta, 1234 - Consolação, São Paulo');
  const [pixKey, setPixKey] = useState(config.pixKey || '11988887777');

  // Sync form details when config is updated or reset
  useEffect(() => {
    setShopName(config.shopName || 'Barbearia Sr. Miranda');
    setWhatsapp(config.whatsapp || '11988887777');
    setInstagram(config.instagram || '@barbeariasrmiranda');
    setAddress(config.address || 'Rua Augusta, 1234 - Consolação, São Paulo');
    setPixKey(config.pixKey || '11988887777');
  }, [config.shopName, config.whatsapp, config.instagram, config.address, config.pixKey]);

  // Agenda settings form
  const [openingTime, setOpeningTime] = useState(config.openingTime);
  const [closingTime, setClosingTime] = useState(config.closingTime);
  const [lunchStart, setLunchStart] = useState(config.lunchStart);
  const [lunchEnd, setLunchEnd] = useState(config.lunchEnd);
  const [bufferTime, setBufferTime] = useState(String(config.bufferTime));
  const [toleranceTime, setToleranceTime] = useState(String(config.toleranceTime));
  const [notificationTime, setNotificationTime] = useState(String(config.notificationTime));
  const [minLeadTime, setMinLeadTime] = useState(String(config.minLeadTime));

  // Agenda blocks form state
  const [blockLabel, setBlockLabel] = useState('');
  const [blockStart, setBlockStart] = useState('');
  const [blockEnd, setBlockEnd] = useState('');
  const [blockType, setBlockType] = useState<'recurrent' | 'date'>('recurrent');
  const [blockDate, setBlockDate] = useState(() => new Date().toISOString().split('T')[0]);

  // Service creation form
  const [newServiceName, setNewServiceName] = useState('');
  const [newServicePrice, setNewServicePrice] = useState('');
  const [newServiceDuration, setNewServiceDuration] = useState('');
  const [newServiceColor, setNewServiceColor] = useState('#D4AF37');
  const [newServiceCategory, setNewServiceCategory] = useState('Outros');

  const [serviceModalOpen, setServiceModalOpen] = useState(false);

  // Edit service state
  const [editingService, setEditingService] = useState<{
    id: string; name: string; price: string; duration: string; category: string; color: string;
  } | null>(null);

  const openEditModal = (s: typeof services[0]) => {
    setEditingService({
      id: s.id,
      name: s.name,
      price: String(s.price),
      duration: String(s.duration),
      category: s.category,
      color: s.color
    });
  };

  const handleEditServiceSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingService) return;
    updateService(editingService.id, {
      name: editingService.name,
      price: Number(editingService.price),
      duration: Number(editingService.duration),
      category: editingService.category,
      color: editingService.color
    });
    setEditingService(null);
  };

  const handleSaveShopDetails = (e: React.FormEvent) => {
    e.preventDefault();
    updateConfig({
      shopName,
      whatsapp,
      instagram,
      address,
      pixKey
    });
    alert('Informações da barbearia salvas com sucesso!');
  };

  const handleAddBlockedPeriod = (e: React.FormEvent) => {
    e.preventDefault();
    if (!blockLabel || !blockStart || !blockEnd) {
      alert('Preencha todos os campos obrigatórios para o bloqueio.');
      return;
    }
    if (blockStart >= blockEnd) {
      alert('O horário de início deve ser anterior ao horário de término.');
      return;
    }

    const newBlock = {
      label: blockLabel,
      start: blockStart,
      end: blockEnd,
      ...(blockType === 'date' ? { date: blockDate } : {})
    };

    updateConfig({
      blockedPeriods: [...(config.blockedPeriods || []), newBlock]
    });

    setBlockLabel('');
    setBlockStart('');
    setBlockEnd('');
    alert('Bloqueio de horário adicionado com sucesso!');
  };

  const handleRemoveBlockedPeriod = (indexToRemove: number) => {
    const updated = (config.blockedPeriods || []).filter((_, idx) => idx !== indexToRemove);
    updateConfig({
      blockedPeriods: updated
    });
    alert('Bloqueio removido com sucesso!');
  };

  const handleSaveAgendaConfig = (e: React.FormEvent) => {
    e.preventDefault();
    updateConfig({
      openingTime,
      closingTime,
      lunchStart,
      lunchEnd,
      bufferTime: Number(bufferTime),
      toleranceTime: Number(toleranceTime),
      notificationTime: Number(notificationTime),
      minLeadTime: Number(minLeadTime)
    });
    alert('Configurações de agendamento aplicadas com sucesso! Todos os próximos horários livres foram recalculados automaticamente.');
  };

  const handleCreateServiceSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newServiceName || !newServicePrice || !newServiceDuration) return;

    addService({
      name: newServiceName,
      price: Number(newServicePrice),
      duration: Number(newServiceDuration),
      color: newServiceColor,
      category: newServiceCategory
    });

    setServiceModalOpen(false);
    setNewServiceName('');
    setNewServicePrice('');
    setNewServiceDuration('');
  };

  const toggleServiceStatus = (id: string, currentStatus: 'active' | 'inactive') => {
    updateService(id, { status: currentStatus === 'active' ? 'inactive' : 'active' });
  };

  const handleDeleteService = (id: string, name: string) => {
    if (confirm(`Tem certeza que deseja excluir permanentemente o serviço "${name}"?`)) {
      deleteService(id);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      
      {/* Cloud Sync Manual Trigger */}
      <div className="card-premium" style={{ border: '1px solid var(--accent-gold)', background: 'linear-gradient(135deg, rgba(212,175,55,0.08) 0%, rgba(0,0,0,0.4) 100%)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
          <div style={{ flex: 1, minWidth: '220px' }}>
            <h3 className="quick-actions-title" style={{ margin: 0, color: 'var(--accent-gold)' }}>
              ⚡ Sincronizar Preços e Dados com os Clientes
            </h3>
            <p style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '4px' }}>
              Transmita instantaneamente os valores atualizados dos serviços, chave PIX, endereço e WhatsApp para todos os clientes em tempo real.
            </p>
          </div>
          <button
            type="button"
            className="btn-primary"
            style={{ padding: '10px 16px', fontSize: '12px', whiteSpace: 'nowrap' }}
            onClick={() => {
              syncAllDataToCloud();
              alert('Tabela de preços, endereço, WhatsApp e chave PIX transmitidos em tempo real para todos os clientes!');
            }}
          >
            <RefreshCw size={14} /> Enviar Atualização Agora
          </button>
        </div>
      </div>

      {/* Shop Info Settings */}
      <div className="card-premium">
        <h3 className="quick-actions-title">Dados da Barbearia</h3>
        <form onSubmit={handleSaveShopDetails} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div className="input-group">
            <span className="input-label">Nome da Barbearia</span>
            <input type="text" className="text-input" value={shopName} onChange={(e) => setShopName(e.target.value)} />
          </div>
          <div style={{ display: 'flex', gap: '10px' }}>
            <div className="input-group" style={{ flex: 1 }}>
              <span className="input-label">WhatsApp Comercial</span>
              <input type="text" className="text-input" value={whatsapp} onChange={(e) => setWhatsapp(e.target.value)} />
            </div>
            <div className="input-group" style={{ flex: 1 }}>
              <span className="input-label">Instagram</span>
              <input type="text" className="text-input" value={instagram} onChange={(e) => setInstagram(e.target.value)} />
            </div>
          </div>
          <div className="input-group">
            <span className="input-label">Endereço Físico</span>
            <input type="text" className="text-input" value={address} onChange={(e) => setAddress(e.target.value)} />
          </div>
          <div className="input-group">
            <span className="input-label">Chave PIX (Recebimentos)</span>
            <input type="text" className="text-input" value={pixKey} onChange={(e) => setPixKey(e.target.value)} />
          </div>
          <button type="submit" className="btn-primary" style={{ alignSelf: 'flex-start', padding: '10px 16px', fontSize: '13px' }}>
            <Save size={16} /> Salvar Dados
          </button>
        </form>
      </div>

      {/* Operational Agenda Configs */}
      <div className="card-premium">
        <h3 className="quick-actions-title">Configurações de Horário e Agenda</h3>
        <form onSubmit={handleSaveAgendaConfig} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          
          <div style={{ display: 'flex', gap: '10px' }}>
            <div className="input-group" style={{ flex: 1 }}>
              <span className="input-label">Abertura</span>
              <input type="time" className="text-input" value={openingTime} onChange={(e) => setOpeningTime(e.target.value)} />
            </div>
            <div className="input-group" style={{ flex: 1 }}>
              <span className="input-label">Fechamento</span>
              <input type="time" className="text-input" value={closingTime} onChange={(e) => setClosingTime(e.target.value)} />
            </div>
          </div>

          <div style={{ display: 'flex', gap: '10px' }}>
            <div className="input-group" style={{ flex: 1 }}>
              <span className="input-label">Almoço (Início)</span>
              <input type="time" className="text-input" value={lunchStart} onChange={(e) => setLunchStart(e.target.value)} />
            </div>
            <div className="input-group" style={{ flex: 1 }}>
              <span className="input-label">Almoço (Fim)</span>
              <input type="time" className="text-input" value={lunchEnd} onChange={(e) => setLunchEnd(e.target.value)} />
            </div>
          </div>

          <div style={{ display: 'flex', gap: '10px' }}>
            <div className="input-group" style={{ flex: 1 }}>
              <span className="input-label">Buffer entre Clientes (min)</span>
              <input type="number" className="text-input" value={bufferTime} onChange={(e) => setBufferTime(e.target.value)} />
            </div>
            <div className="input-group" style={{ flex: 1 }}>
              <span className="input-label">Tolerância Atraso (min)</span>
              <input type="number" className="text-input" value={toleranceTime} onChange={(e) => setToleranceTime(e.target.value)} />
            </div>
          </div>

          <div style={{ display: 'flex', gap: '10px' }}>
            <div className="input-group" style={{ flex: 1 }}>
              <span className="input-label">Notificar Cliente Próximo (min)</span>
              <input type="number" className="text-input" value={notificationTime} onChange={(e) => setNotificationTime(e.target.value)} />
            </div>
            <div className="input-group" style={{ flex: 1 }}>
              <span className="input-label">Antecedência Mínima (horas)</span>
              <input type="number" className="text-input" value={minLeadTime} onChange={(e) => setMinLeadTime(e.target.value)} />
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'rgba(255, 255, 255, 0.02)', padding: '10px', borderRadius: '6px', fontSize: '11px', color: 'var(--text-secondary)' }}>
            <Info size={16} color="var(--accent-gold)" />
            <span>Qualquer alteração acima atualiza dinamicamente as opções da agenda em tempo real para os clientes.</span>
          </div>

          <button type="submit" className="btn-primary" style={{ alignSelf: 'flex-start', padding: '10px 16px', fontSize: '13px' }}>
            <Save size={16} /> Aplicar Configurações
          </button>
        </form>
      </div>

      {/* Bloqueios da Agenda (Horários Indisponíveis) */}
      <div className="card-premium">
        <h3 className="quick-actions-title">Bloqueios de Horários (Indisponibilidade)</h3>
        <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '14px' }}>
          Adicione horários em que a barbearia estará fechada ou você estará ausente. Clientes não poderão agendar nesses intervalos.
        </p>

        {/* Add block form */}
        <form onSubmit={handleAddBlockedPeriod} style={{ display: 'flex', flexDirection: 'column', gap: '12px', background: 'rgba(255, 255, 255, 0.02)', padding: '14px', borderRadius: '8px', border: '1px solid var(--border-color)', marginBottom: '16px' }}>
          <h4 style={{ fontSize: '13px', fontWeight: '700', color: 'var(--accent-gold)' }}>Novo Bloqueio temporário/recorrente</h4>
          
          <div className="input-group">
            <span className="input-label">Motivo do Bloqueio *</span>
            <input type="text" className="text-input" placeholder="Ex: Saída rápida, Compromisso, Café da tarde" value={blockLabel} onChange={(e) => setBlockLabel(e.target.value)} required />
          </div>

          <div style={{ display: 'flex', gap: '10px' }}>
            <div className="input-group" style={{ flex: 1 }}>
              <span className="input-label">Início *</span>
              <input type="time" className="text-input" value={blockStart} onChange={(e) => setBlockStart(e.target.value)} required />
            </div>
            <div className="input-group" style={{ flex: 1 }}>
              <span className="input-label">Fim *</span>
              <input type="time" className="text-input" value={blockEnd} onChange={(e) => setBlockEnd(e.target.value)} required />
            </div>
          </div>

          <div style={{ display: 'flex', gap: '10px' }}>
            <div className="input-group" style={{ flex: 1 }}>
              <span className="input-label">Tipo de Bloqueio</span>
              <select className="text-input" value={blockType} onChange={(e) => setBlockType(e.target.value as 'recurrent' | 'date')}>
                <option value="recurrent">Todo dia (Recorrente)</option>
                <option value="date">Data Específica</option>
              </select>
            </div>
            {blockType === 'date' && (
              <div className="input-group" style={{ flex: 1 }}>
                <span className="input-label">Data do Bloqueio *</span>
                <input type="date" className="text-input" min={new Date().toISOString().split('T')[0]} value={blockDate} onChange={(e) => setBlockDate(e.target.value)} required />
              </div>
            )}
          </div>

          <button type="submit" className="btn-primary" style={{ alignSelf: 'flex-start', padding: '8px 14px', fontSize: '12px', marginTop: '6px' }}>
            <Plus size={14} /> Adicionar Bloqueio
          </button>
        </form>

        {/* Blocks list */}
        <h4 style={{ fontSize: '13px', fontWeight: '700', marginBottom: '8px' }}>Bloqueios Ativos na Agenda</h4>
        {(!config.blockedPeriods || config.blockedPeriods.length === 0) ? (
          <div style={{ padding: '12px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '12px', border: '1px dashed var(--border-color)', borderRadius: '6px' }}>
            Nenhum bloqueio cadastrado.
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {config.blockedPeriods.map((period, idx) => (
              <div 
                key={idx} 
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '10px 12px',
                  background: 'var(--bg-tertiary)',
                  borderRadius: '6px',
                  border: '1px solid var(--border-color)'
                }}
              >
                <div>
                  <div style={{ fontSize: '13px', fontWeight: '700', color: 'white' }}>{period.label}</div>
                  <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '2px', display: 'flex', gap: '8px', alignItems: 'center' }}>
                    <span>⏰ {period.start} - {period.end}</span>
                    <span style={{
                      padding: '2px 6px',
                      borderRadius: '4px',
                      fontSize: '9px',
                      fontWeight: '700',
                      background: period.date ? 'var(--accent-gold-glow)' : 'rgba(255, 255, 255, 0.05)',
                      color: period.date ? 'var(--accent-gold)' : 'var(--text-secondary)',
                      border: period.date ? '1px solid rgba(212,175,55,0.2)' : '1px solid rgba(255,255,255,0.05)'
                    }}>
                      {period.date ? `Apenas em ${period.date.split('-').reverse().join('/')}` : 'Todos os dias'}
                    </span>
                  </div>
                </div>
                
                <button 
                  type="button"
                  className="btn-secondary" 
                  style={{ padding: '6px', borderColor: 'var(--color-sem-resposta)', color: 'var(--color-sem-resposta)' }}
                  onClick={() => handleRemoveBlockedPeriod(idx)}
                >
                  <Trash2 size={12} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Services Catalogue Manager */}
      <div className="card-premium">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <h3 className="quick-actions-title" style={{ margin: 0 }}>Gerenciamento de Serviços</h3>
          <button className="btn-primary" style={{ padding: '6px 12px', fontSize: '11px' }} onClick={() => setServiceModalOpen(true)}>
            <Plus size={14} /> Novo Serviço
          </button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {services.map((s) => (
            <div 
              key={s.id} 
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '10px 12px',
                background: 'var(--bg-tertiary)',
                borderRadius: '6px',
                border: '1px solid var(--border-color)',
                opacity: s.status === 'inactive' ? 0.5 : 1
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{ width: '8px', height: '32px', borderRadius: '4px', background: s.color || 'var(--accent-gold)' }} />
                <div>
                  <div style={{ fontSize: '13px', fontWeight: '600' }}>{s.name}</div>
                  <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                    {s.duration} min | R$ {s.price.toFixed(2)} ({s.category})
                  </div>
                </div>
              </div>
              
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <button 
                  className="btn-secondary" 
                  style={{ padding: '4px 8px', fontSize: '10px', borderColor: s.status === 'active' ? 'var(--border-color)' : 'var(--accent-gold)' }}
                  onClick={() => toggleServiceStatus(s.id, s.status)}
                >
                  {s.status === 'active' ? 'Pausar' : 'Ativar'}
                </button>
                <button
                  className="btn-secondary"
                  style={{ padding: '4px 8px', fontSize: '10px', borderColor: 'rgba(212,175,55,0.4)', color: 'var(--accent-gold)' }}
                  onClick={() => openEditModal(s)}
                  title="Editar serviço"
                >
                  <Pencil size={12} />
                </button>
                <button
                  className="btn-secondary"
                  style={{ padding: '4px 8px', fontSize: '10px', borderColor: 'rgba(239,68,68,0.4)', color: '#ef4444' }}
                  onClick={() => handleDeleteService(s.id, s.name)}
                  title="Deletar serviço"
                >
                  <Trash2 size={12} />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Developer Reset Panel */}
      <div className="card-premium" style={{ border: '1px solid var(--color-sem-resposta)', background: '#1c1212' }}>
        <h3 className="quick-actions-title" style={{ color: 'var(--color-sem-resposta)' }}>Perigo: Limpeza do Sistema</h3>
        <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '12px' }}>
          Limpa o LocalStorage e restaura todos os dados de simulação padrão imediatamente.
        </p>
        <button 
          className="btn-primary" 
          style={{ background: 'var(--accent-red-gradient)', color: 'white', fontSize: '12px', padding: '8px 16px' }}
          onClick={() => {
            if (confirm('Tem certeza que deseja resetar os dados locais?')) {
              resetData();
              alert('Dados reinicializados com sucesso!');
              window.location.reload();
            }
          }}
        >
          Redefinir Dados para o Padrão
        </button>
      </div>

      {/* Edit Service Modal */}
      {editingService && (
        <div className="modal-overlay">
          <div className="modal-container">
            <div className="modal-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 className="modal-title">Editar Serviço</h3>
              <button type="button" onClick={() => setEditingService(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}>
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleEditServiceSubmit} className="modal-body">
              <div className="input-group">
                <span className="input-label">Nome do Serviço *</span>
                <input
                  type="text"
                  className="text-input"
                  value={editingService.name}
                  onChange={(e) => setEditingService({ ...editingService, name: e.target.value })}
                  required
                  autoFocus
                />
              </div>

              <div style={{ display: 'flex', gap: '10px' }}>
                <div className="input-group" style={{ flex: 1 }}>
                  <span className="input-label">Preço (R$) *</span>
                  <input
                    type="number"
                    className="text-input"
                    step="0.01"
                    min="0"
                    value={editingService.price}
                    onChange={(e) => setEditingService({ ...editingService, price: e.target.value })}
                    required
                  />
                </div>
                <div className="input-group" style={{ flex: 1 }}>
                  <span className="input-label">Duração (min) *</span>
                  <input
                    type="number"
                    className="text-input"
                    min="5"
                    value={editingService.duration}
                    onChange={(e) => setEditingService({ ...editingService, duration: e.target.value })}
                    required
                  />
                </div>
              </div>

              <div className="input-group">
                <span className="input-label">Categoria</span>
                <select
                  className="text-input"
                  value={editingService.category}
                  onChange={(e) => setEditingService({ ...editingService, category: e.target.value })}
                >
                  <option value="Corte">Corte</option>
                  <option value="Barba">Barba</option>
                  <option value="Tratamento">Tratamento</option>
                  <option value="Estética">Estética</option>
                  <option value="Combo">Combo</option>
                  <option value="Acabamento">Acabamento</option>
                  <option value="Outros">Outros</option>
                </select>
              </div>

              <div className="input-group">
                <span className="input-label">Cor Indicadora</span>
                <div style={{ display: 'flex', gap: '6px', marginTop: '4px' }}>
                  {['#D4AF37', '#9B59B6', '#3498DB', '#2ECC71', '#E67E22', '#E74C3C', '#C5A059', '#1ABC9C'].map((c) => (
                    <button
                      key={c}
                      type="button"
                      style={{ width: '32px', height: '32px', borderRadius: '50%', background: c, border: editingService.color === c ? '2.5px solid white' : '2px solid transparent', cursor: 'pointer', transition: 'border 0.15s' }}
                      onClick={() => setEditingService({ ...editingService, color: c })}
                    />
                  ))}
                </div>
              </div>
            </form>
            <div className="modal-footer">
              <button type="button" className="btn-secondary" onClick={() => setEditingService(null)}>
                Cancelar
              </button>
              <button
                type="submit"
                className="btn-primary"
                onClick={handleEditServiceSubmit}
                disabled={!editingService.name || !editingService.price || !editingService.duration}
              >
                <Save size={14} /> Salvar Alterações
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Service Creator Modal */}
      {serviceModalOpen && (
        <div className="modal-overlay">
          <div className="modal-container">
            <div className="modal-header">
              <h3 className="modal-title">Novo Serviço</h3>
            </div>
            <form onSubmit={handleCreateServiceSubmit} className="modal-body">
              <div className="input-group">
                <span className="input-label">Nome do Serviço *</span>
                <input 
                  type="text" 
                  className="text-input" 
                  placeholder="Ex: Pigmentação da Barba"
                  value={newServiceName}
                  onChange={(e) => setNewServiceName(e.target.value)}
                  required 
                />
              </div>

              <div style={{ display: 'flex', gap: '10px' }}>
                <div className="input-group" style={{ flex: 1 }}>
                  <span className="input-label">Preço (R$) *</span>
                  <input 
                    type="number" 
                    className="text-input" 
                    placeholder="0.00"
                    value={newServicePrice}
                    onChange={(e) => setNewServicePrice(e.target.value)}
                    required 
                  />
                </div>
                <div className="input-group" style={{ flex: 1 }}>
                  <span className="input-label">Duração (minutos) *</span>
                  <input 
                    type="number" 
                    className="text-input" 
                    placeholder="30"
                    value={newServiceDuration}
                    onChange={(e) => setNewServiceDuration(e.target.value)}
                    required 
                  />
                </div>
              </div>

              <div className="input-group">
                <span className="input-label">Categoria</span>
                <select 
                  className="text-input"
                  value={newServiceCategory}
                  onChange={(e) => setNewServiceCategory(e.target.value)}
                >
                  <option value="Corte">Corte</option>
                  <option value="Barba">Barba</option>
                  <option value="Tratamento">Tratamento</option>
                  <option value="Estética">Estética</option>
                  <option value="Combo">Combo</option>
                  <option value="Outros">Outros</option>
                </select>
              </div>

              <div className="input-group">
                <span className="input-label">Cor Indicadora</span>
                <div style={{ display: 'flex', gap: '6px', marginTop: '4px' }}>
                  {['#D4AF37', '#9B59B6', '#3498DB', '#2ECC71', '#E67E22', '#E74C3C'].map((c) => (
                    <button
                      key={c}
                      type="button"
                      style={{
                        width: '32px',
                        height: '32px',
                        borderRadius: '50%',
                        background: c,
                        border: newServiceColor === c ? '2.5px solid white' : 'none',
                        cursor: 'pointer'
                      }}
                      onClick={() => setNewServiceColor(c)}
                    />
                  ))}
                </div>
              </div>

            </form>
            <div className="modal-footer">
              <button type="button" className="btn-secondary" onClick={() => setServiceModalOpen(false)}>
                Cancelar
              </button>
              <button type="submit" className="btn-primary" onClick={handleCreateServiceSubmit} disabled={!newServiceName || !newServicePrice || !newServiceDuration}>
                Adicionar Serviço
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
