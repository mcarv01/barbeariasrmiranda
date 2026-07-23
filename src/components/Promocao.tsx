import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { getLocalDateStr } from '../utils/scheduleAlgorithm';
import { Save, Upload, Trash2, Tag, Calendar, Users, Percent } from 'lucide-react';

export const Promocao: React.FC = () => {
  const { services, appointments, promotion, updatePromotion } = useApp();

  const [title, setTitle] = useState('');
  const [date, setDate] = useState('');
  const [price, setPrice] = useState('');
  const [serviceIds, setServiceIds] = useState<string[]>([]);
  const [maxSlots, setMaxSlots] = useState('8');
  const [bannerImage, setBannerImage] = useState<string | undefined>(undefined);
  const [active, setActive] = useState(false);
  const [onlyPix, setOnlyPix] = useState(false);

  // Load existing promotion into form
  useEffect(() => {
    if (promotion) {
      setTitle(promotion.title);
      setDate(promotion.date);
      setPrice(String(promotion.price));
      setServiceIds(promotion.serviceIds || []);
      setMaxSlots(String(promotion.maxSlots));
      setBannerImage(promotion.bannerImage);
      setActive(promotion.active);
      setOnlyPix(promotion.onlyPix || false);
    } else {
      // Defaults
      setTitle('Segunda do Homem Moderno');
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      setDate(getLocalDateStr(tomorrow));
      setPrice('30');
      setServiceIds([]);
      setMaxSlots('8');
      setBannerImage(undefined);
      setActive(false);
      setOnlyPix(false);
    }
  }, [promotion, services]);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onloadend = () => {
      setBannerImage(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !date || !price || serviceIds.length === 0 || !maxSlots) {
      alert('Por favor, preencha todos os campos obrigatórios (incluindo pelo menos um serviço).');
      return;
    }

    updatePromotion({
      id: promotion?.id || String(Date.now()),
      title,
      date,
      price: Number(price),
      serviceIds,
      maxSlots: Number(maxSlots),
      bannerImage,
      active,
      onlyPix
    });

    alert('Configurações de promoção salvas com sucesso!');
  };

  const handleClear = () => {
    if (confirm('Tem certeza de que deseja excluir a promoção atual?')) {
      updatePromotion(null);
      alert('Promoção excluída com sucesso.');
    }
  };

  const handleServiceToggle = (id: string) => {
    setServiceIds(prev =>
      prev.includes(id) ? prev.filter(sid => sid !== id) : [...prev, id]
    );
  };

  // Calculate booked count
  const currentPromoServiceIds = promotion?.serviceIds || serviceIds;
  const promoServices = services.filter(s => currentPromoServiceIds.includes(s.id));
  const promoServiceNames = promoServices.map(s => s.name);

  const bookedCount = promotion
    ? appointments.filter(
        (app) =>
          app.date === promotion.date &&
          app.status !== 'cancelado' &&
          promoServiceNames.every((name) => app.services.some((s) => s.name === name))
      ).length
    : 0;

  const remainingSlots = promotion ? Math.max(0, promotion.maxSlots - bookedCount) : 0;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      
      {/* Promotion Stats / Summary Card */}
      {promotion && (
        <div className="card-premium" style={{ borderLeft: promotion.active ? '4px solid var(--accent-gold)' : '4px solid var(--text-muted)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <span className="client-mini-label" style={{ background: promotion.active ? 'var(--accent-gold-glow)' : 'var(--bg-tertiary)', color: promotion.active ? 'var(--accent-gold)' : 'var(--text-muted)' }}>
                {promotion.active ? '🔴 Promoção Ativa' : '⚪ Pausada'}
              </span>
              <h3 style={{ fontSize: '18px', fontWeight: '800', marginTop: '8px' }}>{promotion.title}</h3>
              <p style={{ fontSize: '13px', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '6px', marginTop: '4px' }}>
                <Calendar size={14} /> Data: {promotion.date.split('-').reverse().join('/')}
              </p>
              <p style={{ fontSize: '13px', color: 'var(--text-secondary)', display: 'flex', alignItems: 'flex-start', gap: '6px', marginTop: '4px' }}>
                <Percent size={14} style={{ marginTop: '2px' }} />
                <span>
                  Preço: <strong style={{ color: 'var(--accent-gold)' }}>R$ {promotion.price.toFixed(2)}</strong> (Combo de Serviços: {promoServiceNames.join(' + ') || 'Nenhum'})
                </span>
              </p>
              {promotion.onlyPix && (
                <p style={{ fontSize: '12px', color: '#2ECC71', fontWeight: '800', display: 'flex', alignItems: 'center', gap: '6px', marginTop: '6px' }}>
                  ⚡ Exige pagamento antecipado via PIX
                </p>
              )}
            </div>
            
            <div style={{ textAlign: 'right' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'var(--bg-tertiary)', padding: '6px 12px', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                <Users size={16} color="var(--accent-gold)" />
                <div style={{ textAlign: 'left' }}>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Vagas Preenchidas</div>
                  <div style={{ fontSize: '15px', fontWeight: '800' }}>{bookedCount} / {promotion.maxSlots}</div>
                </div>
              </div>
              <span style={{ display: 'inline-block', fontSize: '11px', color: remainingSlots === 0 ? 'var(--color-sem-resposta)' : 'var(--color-present)', fontWeight: '600', marginTop: '6px' }}>
                {remainingSlots === 0 ? 'Vagas esgotadas!' : `${remainingSlots} vagas restantes`}
              </span>
            </div>
          </div>

          {promotion.bannerImage && (
            <div style={{ marginTop: '16px', borderRadius: '10px', overflow: 'hidden', border: '1px solid var(--border-color)', maxHeight: '120px' }}>
              <img src={promotion.bannerImage} alt="Banner" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            </div>
          )}
        </div>
      )}

      {/* Promotion Config Form */}
      <div className="card-premium">
        <h3 className="quick-actions-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Tag size={18} color="var(--accent-gold)" />
          Configurar Promoção Relâmpago
        </h3>
        
        <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '14px', marginTop: '10px' }}>
          <div className="input-group">
            <span className="input-label">Título do Popup / Promoção *</span>
            <input 
              type="text" 
              className="text-input" 
              placeholder="Ex: Segunda do Homem Moderno" 
              value={title} 
              onChange={(e) => setTitle(e.target.value)} 
              required
            />
          </div>

          <div style={{ display: 'flex', gap: '10px' }}>
            <div className="input-group" style={{ flex: 1 }}>
              <span className="input-label">Dia da Promoção *</span>
              <input 
                type="date" 
                className="text-input" 
                value={date} 
                onChange={(e) => setDate(e.target.value)} 
                required
              />
            </div>
            <div className="input-group" style={{ flex: 1 }}>
              <span className="input-label">Preço Promocional do Combo (R$) *</span>
              <input 
                type="number" 
                step="0.01" 
                className="text-input" 
                placeholder="29.90" 
                value={price} 
                onChange={(e) => setPrice(e.target.value)} 
                required
              />
            </div>
          </div>

          {/* Multiple Services checkboxes */}
          <div className="input-group">
            <span className="input-label">Serviços Inclusos na Promoção * (Selecione um ou mais)</span>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '6px' }}>
              {services.filter(s => s.status === 'active').map(s => {
                const isSelected = serviceIds.includes(s.id);
                return (
                  <div 
                    key={s.id} 
                    onClick={() => handleServiceToggle(s.id)}
                    style={{ 
                      display: 'flex', 
                      alignItems: 'center', 
                      justifyContent: 'space-between',
                      padding: '10px 14px', 
                      background: 'var(--bg-tertiary)', 
                      borderRadius: '8px', 
                      border: `1px solid ${isSelected ? 'var(--accent-gold)' : 'var(--border-color)'}`,
                      cursor: 'pointer',
                      transition: 'all 0.15s'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <div 
                        style={{
                          width: '20px', height: '20px', borderRadius: '6px',
                          border: `2px solid ${isSelected ? 'var(--accent-gold)' : 'var(--border-color-hover)'}`,
                          background: isSelected ? 'var(--accent-gold-glow)' : 'transparent',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          transition: 'all 0.15s'
                        }}
                      >
                        {isSelected && <span style={{ color: 'var(--accent-gold)', fontSize: '13px', fontWeight: '800' }}>✓</span>}
                      </div>
                      <span style={{ fontSize: '13px', fontWeight: '600' }}>{s.name}</span>
                    </div>
                    <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>R$ {s.price.toFixed(2)}</span>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="input-group">
            <span className="input-label">Limite de Clientes (Vagas) *</span>
            <input 
              type="number" 
              className="text-input" 
              value={maxSlots} 
              onChange={(e) => setMaxSlots(e.target.value)} 
              required
              min="1"
            />
          </div>

          {/* Banner Upload */}
          <div className="input-group">
            <span className="input-label">Imagem do Banner do Popup</span>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '4px' }}>
              <label 
                style={{ 
                  border: '2px dashed var(--border-color)', 
                  borderRadius: '10px', 
                  padding: '20px', 
                  textAlign: 'center', 
                  cursor: 'pointer',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: '6px',
                  background: 'var(--bg-tertiary)',
                  transition: 'border-color 0.2s'
                }}
                onMouseEnter={(e) => e.currentTarget.style.borderColor = 'var(--accent-gold)'}
                onMouseLeave={(e) => e.currentTarget.style.borderColor = 'var(--border-color)'}
              >
                <Upload size={24} color="var(--accent-gold)" />
                <span style={{ fontSize: '13px', fontWeight: '600' }}>Selecionar Imagem do Computador</span>
                <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Formatos suportados: PNG, JPG ou GIF</span>
                <input 
                  type="file" 
                  accept="image/*" 
                  style={{ display: 'none' }} 
                  onChange={handleImageUpload} 
                />
              </label>

              {bannerImage && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', background: 'var(--bg-primary)', padding: '10px', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                  <img src={bannerImage} alt="Preview" style={{ width: '60px', height: '40px', objectFit: 'cover', borderRadius: '4px' }} />
                  <span style={{ fontSize: '12px', flex: 1, textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>Imagem carregada com sucesso!</span>
                  <button 
                    type="button" 
                    className="btn-secondary" 
                    style={{ padding: '6px', borderColor: 'var(--color-sem-resposta)', color: 'var(--color-sem-resposta)' }}
                    onClick={() => setBannerImage(undefined)}
                  >
                    Remover
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Pix Only toggle switch */}
          <label style={{ display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer', padding: '6px 0', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '12px', marginBottom: '6px' }}>
            <div
              onClick={() => setOnlyPix(!onlyPix)}
              style={{
                width: '44px',
                height: '24px',
                borderRadius: '12px',
                background: onlyPix ? 'var(--accent-gold-gradient)' : 'var(--bg-tertiary)',
                border: '1px solid var(--border-color)',
                position: 'relative',
                transition: 'background-color 0.2s'
              }}
            >
              <div 
                style={{
                  width: '18px',
                  height: '18px',
                  borderRadius: '50%',
                  background: onlyPix ? 'black' : 'var(--text-muted)',
                  position: 'absolute',
                  top: '2px',
                  left: onlyPix ? '22px' : '2px',
                  transition: 'left 0.2s, background-color 0.2s'
                }}
              />
            </div>
            <div>
              <span style={{ fontSize: '14px', fontWeight: '700', color: 'white' }}>Exigir pagamento antecipado via PIX</span>
              <p style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>Quando marcada, o cliente é obrigado a pagar via PIX para reservar o horário.</p>
            </div>
          </label>

          {/* Active toggle switch */}
          <label style={{ display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer', padding: '6px 0' }}>
            <div
              onClick={() => setActive(!active)}
              style={{
                width: '44px',
                height: '24px',
                borderRadius: '12px',
                background: active ? 'var(--accent-gold-gradient)' : 'var(--bg-tertiary)',
                border: '1px solid var(--border-color)',
                position: 'relative',
                transition: 'background-color 0.2s'
              }}
            >
              <div 
                style={{
                  width: '18px',
                  height: '18px',
                  borderRadius: '50%',
                  background: active ? 'black' : 'var(--text-muted)',
                  position: 'absolute',
                  top: '2px',
                  left: active ? '22px' : '2px',
                  transition: 'left 0.2s, background-color 0.2s'
                }}
              />
            </div>
            <div>
              <span style={{ fontSize: '14px', fontWeight: '700', color: 'white' }}>Ativar esta promoção imediatamente</span>
              <p style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>Quando marcada como ativa, o popup aparecerá na tela do cliente.</p>
            </div>
          </label>

          <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
            <button type="submit" className="btn-primary" style={{ flex: 1 }}>
              <Save size={16} /> Salvar Configurações
            </button>
            
            {promotion && (
              <button 
                type="button" 
                className="btn-secondary" 
                style={{ borderColor: 'var(--color-sem-resposta)', color: 'var(--color-sem-resposta)' }}
                onClick={handleClear}
              >
                <Trash2 size={16} /> Excluir Promoção
              </button>
            )}
          </div>
        </form>
      </div>

    </div>
  );
};
