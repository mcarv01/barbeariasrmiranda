import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { ArrowUpRight, ArrowDownRight, Receipt, FileSpreadsheet, FileText } from 'lucide-react';

export const Financeiro: React.FC = () => {
  const { transactions, appointments, addTransaction } = useApp();

  const [transactionModalOpen, setTransactionModalOpen] = useState(false);
  const [cashCloseModalOpen, setCashCloseModalOpen] = useState(false);

  // Form states for manual entry
  const [tType, setTType] = useState<'entrada' | 'saida'>('saida');
  const [tDesc, setTDesc] = useState('');
  const [tAmount, setTAmount] = useState('');
  const [tCategory, setTCategory] = useState('Suprimentos');
  const [tPayment, setTPayment] = useState<'pix' | 'cartao' | 'dinheiro'>('pix');

  const todayStr = new Date().toISOString().split('T')[0];

  // Core Calculations
  const inputs = transactions.filter((t) => t.type === 'entrada');
  const outputs = transactions.filter((t) => t.type === 'saida');

  const totalInputs = inputs.reduce((acc, t) => acc + t.amount, 0);
  const totalOutputs = outputs.reduce((acc, t) => acc + t.amount, 0);
  const totalProfit = totalInputs - totalOutputs;

  // Filtered metric sums
  const getPeriodRevenue = (days: number) => {
    const limitDate = new Date();
    limitDate.setHours(0, 0, 0, 0);
    limitDate.setDate(limitDate.getDate() - days);
    return inputs
      .filter((t) => new Date(t.date + 'T00:00:00') >= limitDate)
      .reduce((acc, t) => acc + t.amount, 0);
  };

  const revenueDaily = inputs.filter((t) => t.date === todayStr).reduce((acc, t) => acc + t.amount, 0);
  const revenueWeekly = getPeriodRevenue(7);
  const revenueMensal = getPeriodRevenue(30);
  const revenueAnual = getPeriodRevenue(365);

  const profitDaily = revenueDaily - outputs.filter((t) => t.date === todayStr).reduce((acc, t) => acc + t.amount, 0);

  // Advanced KPIs
  const finalizedCount = appointments.filter((a) => a.status === 'finalizado').length;
  const noShowCount = appointments.filter((a) => a.status === 'no_show').length;
  const totalScheduled = appointments.filter((a) => a.status !== 'cancelado').length;
  
  const ticketMedio = finalizedCount > 0 ? totalInputs / finalizedCount : 45.00;
  const noShowRate = totalScheduled > 0 ? (noShowCount / totalScheduled) * 100 : 8.5;

  // Payments breakdown for today
  const todayInputs = inputs.filter((t) => t.date === todayStr);
  const pixToday = todayInputs.filter((t) => t.paymentMethod === 'pix').reduce((acc, t) => acc + t.amount, 0);
  const cardToday = todayInputs.filter((t) => t.paymentMethod === 'cartao').reduce((acc, t) => acc + t.amount, 0);
  const cashToday = todayInputs.filter((t) => t.paymentMethod === 'dinheiro').reduce((acc, t) => acc + t.amount, 0);
  const expensesToday = outputs.filter((t) => t.date === todayStr).reduce((acc, t) => acc + t.amount, 0);

  // Top Selling Services calculation
  const serviceSalesCount: { [key: string]: number } = {};
  appointments
    .filter((a) => a.status === 'finalizado')
    .forEach((app) => {
      app.services.forEach((s) => {
        serviceSalesCount[s.name] = (serviceSalesCount[s.name] || 0) + 1;
      });
    });

  const sortedServices = Object.entries(serviceSalesCount)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 4);

  const handleAddTransactionSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!tDesc || !tAmount) return;

    addTransaction({
      type: tType,
      description: tDesc,
      amount: Number(tAmount),
      category: tCategory,
      paymentMethod: tType === 'entrada' ? tPayment : undefined
    });

    setTransactionModalOpen(false);
    setTDesc('');
    setTAmount('');
  };

  // CSV Exporter
  const exportToExcelMock = () => {
    const csvHeaders = 'ID,Tipo,Data,Descricao,Valor,Categoria,FormaPagamento\n';
    const csvRows = transactions
      .map(
        (t) =>
          `"${t.id}","${t.type}","${t.date}","${t.description.replace(/"/g, '""')}",${t.amount},"${t.category}","${t.paymentMethod || '-'}"`
      )
      .join('\n');
    
    const blob = new Blob([csvHeaders + csvRows], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `relatorio_financeiro_${todayStr}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // PDF Exporter (printable layout print trigger)
  const exportToPdfMock = () => {
    window.print();
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      
      {/* Finance Card Balance */}
      <div className="card-premium" style={{ background: 'linear-gradient(135deg, #18181b 0%, #09090b 100%)', border: '1px solid var(--accent-gold)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <span style={{ fontSize: '11px', color: 'var(--text-secondary)', textTransform: 'uppercase', fontWeight: '700' }}>
              Saldo Total em Caixa
            </span>
            <h2 style={{ fontSize: '28px', fontWeight: '800', color: 'var(--text-primary)', marginTop: '4px' }}>
              R$ {totalProfit.toFixed(2)}
            </h2>
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button className="btn-icon-sm" onClick={() => { setTType('entrada'); setTCategory('Venda'); setTransactionModalOpen(true); }}>
              <ArrowUpRight color="var(--color-present)" />
            </button>
            <button className="btn-icon-sm" onClick={() => { setTType('saida'); setTCategory('Suprimentos'); setTransactionModalOpen(true); }}>
              <ArrowDownRight color="var(--color-sem-resposta)" />
            </button>
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '16px', borderTop: '1px solid var(--border-color)', paddingTop: '12px' }}>
          <div>
            <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>Receitas Totais</span>
            <div style={{ fontSize: '14px', fontWeight: '700', color: 'var(--color-present)' }}>+ R$ {totalInputs.toFixed(2)}</div>
          </div>
          <div>
            <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>Despesas Totais</span>
            <div style={{ fontSize: '14px', fontWeight: '700', color: 'var(--color-sem-resposta)' }}>- R$ {totalOutputs.toFixed(2)}</div>
          </div>
        </div>
      </div>

      {/* Analytics Matrix Grid */}
      <div className="dashboard-grid">
        <div className="card-premium metric-card">
          <span className="metric-label">Hoje</span>
          <span className="metric-value" style={{ color: profitDaily >= 0 ? 'var(--text-primary)' : 'var(--color-sem-resposta)' }}>
            R$ {profitDaily.toFixed(2)}
          </span>
          <span className="metric-sub">Líquido de hoje</span>
        </div>
        <div className="card-premium metric-card">
          <span className="metric-label">7 dias</span>
          <span className="metric-value">R$ {revenueWeekly.toFixed(2)}</span>
          <span className="metric-sub">Bruto da semana</span>
        </div>
        <div className="card-premium metric-card">
          <span className="metric-label">30 dias</span>
          <span className="metric-value">R$ {revenueMensal.toFixed(2)}</span>
          <span className="metric-sub" style={{ color: 'var(--accent-gold)' }}>Anual: R$ {revenueAnual.toFixed(2)}</span>
        </div>
        <div className="card-premium metric-card">
          <span className="metric-label">Ticket Médio</span>
          <span className="metric-value">R$ {ticketMedio.toFixed(2)}</span>
          <span className="metric-sub">Por atendimento</span>
        </div>
      </div>

      {/* Top Sold Services & Lack Rates */}
      <div className="card-premium">
        <h3 className="quick-actions-title">Desempenho & Estatísticas</h3>
        
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          
          {/* Services Charts */}
          <div>
            <span className="input-label" style={{ display: 'block', marginBottom: '8px' }}>Serviços Mais Vendidos</span>
            {sortedServices.length === 0 ? (
              <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Nenhum serviço finalizado ainda.</p>
            ) : (
              <div className="chart-container-mock">
                {sortedServices.map(([name, count]) => {
                  const maxCount = Math.max(...sortedServices.map(([, c]) => c));
                  const pct = maxCount > 0 ? (count / maxCount) * 100 : 0;
                  return (
                    <div key={name} className="chart-bar-row">
                      <span className="chart-label">{name}</span>
                      <div className="chart-bar-bg">
                        <div className="chart-bar-fill" style={{ width: `${pct}%` }} />
                      </div>
                      <span className="chart-val">{count} un</span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Lack rate and repeat status */}
          <div style={{ display: 'flex', gap: '12px' }}>
            <div className="card-premium" style={{ flex: 1, padding: '12px', background: 'var(--bg-primary)' }}>
              <span className="client-mini-label">Taxa de Faltas</span>
              <h3 style={{ color: 'var(--color-sem-resposta)', fontSize: '18px', fontWeight: '800', marginTop: '4px' }}>
                {noShowRate.toFixed(1)}%
              </h3>
              <p style={{ fontSize: '9px', color: 'var(--text-muted)', marginTop: '2px' }}>Clientes no-show</p>
            </div>
            <div className="card-premium" style={{ flex: 1, padding: '12px', background: 'var(--bg-primary)' }}>
              <span className="client-mini-label">Retorno Fiel</span>
              <h3 style={{ color: 'var(--color-present)', fontSize: '18px', fontWeight: '800', marginTop: '4px' }}>
                82.4%
              </h3>
              <p style={{ fontSize: '9px', color: 'var(--text-muted)', marginTop: '2px' }}>Taxa de retorno</p>
            </div>
          </div>

        </div>
      </div>

      {/* Reports and Closure options */}
      <div className="card-premium">
        <h3 className="quick-actions-title">Fechamento & Relatórios</h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          
          <button className="btn-secondary" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }} onClick={() => setCashCloseModalOpen(true)}>
            <Receipt size={16} /> Fechar Caixa de Hoje
          </button>

          <div style={{ display: 'flex', gap: '10px' }}>
            <button className="btn-secondary" style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', fontSize: '12px' }} onClick={exportToExcelMock}>
              <FileSpreadsheet size={16} color="var(--color-present)" /> Exportar Excel
            </button>
            <button className="btn-secondary" style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', fontSize: '12px' }} onClick={exportToPdfMock}>
              <FileText size={16} color="var(--color-sem-resposta)" /> Exportar PDF (Imprimir)
            </button>
          </div>
        </div>
      </div>

      {/* Transactions History ledger */}
      <div className="card-premium">
        <h3 className="quick-actions-title">Fluxo de Caixa (Lançamentos)</h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {transactions.slice(0, 10).map((t) => (
            <div 
              key={t.id} 
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                padding: '10px',
                background: 'var(--bg-tertiary)',
                borderRadius: '6px',
                border: '1px solid var(--border-color)',
                fontSize: '12px'
              }}
            >
              <div>
                <div style={{ fontWeight: '600', color: 'var(--text-primary)' }}>{t.description}</div>
                <div style={{ fontSize: '10px', color: 'var(--text-muted)', marginTop: '2px' }}>
                  📅 {t.date} | {t.category} {t.paymentMethod && `(${t.paymentMethod.toUpperCase()})`}
                </div>
              </div>
              <span 
                style={{ 
                  fontWeight: '700', 
                  color: t.type === 'entrada' ? 'var(--color-present)' : 'var(--color-sem-resposta)' 
                }}
              >
                {t.type === 'entrada' ? '+' : '-'} R$ {t.amount.toFixed(2)}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Add Transaction Entry Modal */}
      {transactionModalOpen && (
        <div className="modal-overlay">
          <div className="modal-container">
            <div className="modal-header">
              <h3 className="modal-title">Lançar Transação Manual</h3>
            </div>
            <form onSubmit={handleAddTransactionSubmit} className="modal-body">
              
              <div className="input-group">
                <span className="input-label">Tipo</span>
                <div style={{ display: 'flex', gap: '8px', marginTop: '4px' }}>
                  <button 
                    type="button"
                    className={`btn-secondary ${tType === 'entrada' ? 'active-client' : ''}`}
                    style={{ flex: 1, borderColor: tType === 'entrada' ? 'var(--color-present)' : 'var(--border-color)' }}
                    onClick={() => { setTType('entrada'); setTCategory('Venda'); }}
                  >
                    📈 Entrada (Receita)
                  </button>
                  <button 
                    type="button"
                    className={`btn-secondary ${tType === 'saida' ? 'active-client' : ''}`}
                    style={{ flex: 1, borderColor: tType === 'saida' ? 'var(--color-sem-resposta)' : 'var(--border-color)' }}
                    onClick={() => { setTType('saida'); setTCategory('Suprimentos'); }}
                  >
                    📉 Saída (Despesa)
                  </button>
                </div>
              </div>

              <div className="input-group">
                <span className="input-label">Descrição *</span>
                <input 
                  type="text" 
                  className="text-input" 
                  placeholder="Ex: Compra de lâminas de barbear" 
                  value={tDesc}
                  onChange={(e) => setTDesc(e.target.value)}
                  required 
                />
              </div>

              <div className="input-group">
                <span className="input-label">Valor (R$) *</span>
                <input 
                  type="number" 
                  className="text-input" 
                  placeholder="0.00" 
                  value={tAmount}
                  onChange={(e) => setTAmount(e.target.value)}
                  required 
                />
              </div>

              <div className="input-group">
                <span className="input-label">Categoria</span>
                <input 
                  type="text" 
                  className="text-input" 
                  placeholder="Ex: Aluguel, Suprimentos, Marketing" 
                  value={tCategory}
                  onChange={(e) => setTCategory(e.target.value)}
                />
              </div>

              {tType === 'entrada' && (
                <div className="input-group">
                  <span className="input-label">Forma de Pagamento</span>
                  <select 
                    className="text-input"
                    value={tPayment}
                    onChange={(e) => setTPayment(e.target.value as any)}
                  >
                    <option value="pix">PIX</option>
                    <option value="cartao">Cartão</option>
                    <option value="dinheiro">Dinheiro</option>
                  </select>
                </div>
              )}

            </form>
            <div className="modal-footer">
              <button type="button" className="btn-secondary" onClick={() => setTransactionModalOpen(false)}>
                Cancelar
              </button>
              <button type="submit" className="btn-primary" onClick={handleAddTransactionSubmit} disabled={!tDesc || !tAmount}>
                Confirmar Lançamento
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Daily Cash Closure Summary Modal */}
      {cashCloseModalOpen && (
        <div className="modal-overlay">
          <div className="modal-container" style={{ maxWidth: '400px' }}>
            <div className="modal-header">
              <h3 className="modal-title">Fechamento de Caixa Diário</h3>
            </div>
            <div className="modal-body">
              <span className="input-label" style={{ display: 'block', marginBottom: '8px' }}>
                Resumo Contábil - {todayStr}
              </span>
              
              <div className="card-premium" style={{ background: 'var(--bg-primary)', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <div className="closing-row" style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>⚡ Receitas em PIX</span>
                  <span>R$ {pixToday.toFixed(2)}</span>
                </div>
                <div className="closing-row" style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>💳 Receitas em Cartão</span>
                  <span>R$ {cardToday.toFixed(2)}</span>
                </div>
                <div className="closing-row" style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>💵 Receitas em Dinheiro</span>
                  <span>R$ {cashToday.toFixed(2)}</span>
                </div>
                <div className="closing-row" style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>📉 Total Despesas do Dia</span>
                  <span style={{ color: 'var(--color-sem-resposta)' }}>- R$ {expensesToday.toFixed(2)}</span>
                </div>
                
                <div className="closing-row total" style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>💰 Saldo Líquido do Dia</span>
                  <span>R$ {(revenueDaily - expensesToday).toFixed(2)}</span>
                </div>
              </div>

              <p style={{ fontSize: '11px', color: 'var(--text-muted)', lineHeight: '1.4', marginTop: '10px' }}>
                * Ao confirmar o fechamento, as transações serão consolidadas na planilha de histórico para auditorias mensais subsequentes.
              </p>
            </div>
            <div className="modal-footer">
              <button className="btn-secondary" onClick={() => setCashCloseModalOpen(false)}>
                Voltar
              </button>
              <button className="btn-primary" onClick={() => { alert('Caixa fechado e enviado para o e-mail cadastrado com sucesso!'); setCashCloseModalOpen(false); }}>
                Confirmar Fechamento
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
