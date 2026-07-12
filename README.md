# 💈 Barber One - Barbearia Sr. Miranda (PWA)

O **Barber One** é um PWA (Progressive Web App) Mobile-First de nível profissional desenvolvido exclusivamente para barbeiros autônomos. Ele substitui a agenda de papel e o gerenciamento manual via WhatsApp por uma plataforma moderna, rápida e inteligente.

---

## ✨ Funcionalidades Principais

*   **Agenda Inteligente:** Algoritmo dinâmico que calcula slots disponíveis com base no tempo somado dos serviços, respeitando horários de almoço, folgas, buffers e férias.
*   **Fila em Tempo Real (Live Queue):** Acompanhamento de posição, notificações de 10 minutos de antecedência e tolerância automática de atraso (no-show).
*   **Painel de TV da Recepção:** Interface de tela cheia otimizada para Smart TVs na sala de espera da barbearia.
*   **Checkout Flexível:** Pagamento simulado do sinal via PIX (com cópia de código e QR Code) ou pagamento local na barbearia.
*   **Integração com Google Agenda:** Permite ao cliente adicionar o agendamento em sua agenda pessoal com um clique.
*   **CRM de Retorno Ativo:** Identifica clientes sumidos (há mais de 15 dias) e gera links diretos do WhatsApp com mensagens pré-formatadas de reconquista.
*   **Módulo Financeiro:** Fluxo de caixa de entradas/despesas e fechamento diário consolidado com exportação para planilhas.

---

## 🛠️ Como Executar Localmente

1. Instale as dependências:
   ```bash
   npm install
   ```
2. Inicie o servidor local:
   ```bash
   npm run dev
   ```
   *Ou no Windows, apenas dê dois cliques no arquivo `iniciar.bat` na raiz do projeto.*
3. Abra o link gerado (ex: `http://localhost:5174/`) no seu navegador.

---

## 🚀 Como Fazer Deploy no GitHub

Siga os passos abaixo para enviar o código para o seu repositório do GitHub:

1. **Inicialize o Git** localmente (se ainda não tiver inicializado):
   ```bash
   git init
   ```
2. **Adicione os arquivos** ao estágio de commit:
   ```bash
   git add .
   ```
3. **Faça o primeiro commit**:
   ```bash
   git commit -m "feat: release oficial do Barber One com automacoes"
   ```
4. **Crie um repositório** vazio no seu [GitHub](https://github.com/new).
5. **Vincule o repositório remoto** e mude a branch padrão para `main`:
   ```bash
   git remote add origin https://github.com/SEU-USUARIO/NOME-DO-SEU-REPOSITORIO.git
   git branch -M main
   ```
6. **Envie o código**:
   ```bash
   git push -u origin main
   ```

---

## ⚡ Como Publicar na Vercel (Hospedagem Grátis)

A Vercel se integra diretamente ao GitHub e atualiza o aplicativo automaticamente a cada modificação enviada.

1. Acesse o site da [Vercel](https://vercel.com/) e faça login com sua conta do GitHub.
2. No painel da Vercel, clique em **Add New...** ➜ **Project**.
3. Na lista de repositórios, clique em **Import** ao lado do repositório do `Barber One` que você acabou de subir para o GitHub.
4. Na tela de configurações, a Vercel detectará automaticamente as configurações corretas do **Vite**:
   *   **Framework Preset:** `Vite`
   *   **Build Command:** `npm run build`
   *   **Output Directory:** `dist`
5. Clique no botão **Deploy**.
6. Em menos de 1 minuto, seu aplicativo estará online com um link público (ex: `https://barbearia-sr-miranda.vercel.app/`).
