# DESIGN SYSTEM OFICIAL - Noêmia Paixão Advocacia
## **REGRA ABSOLUTA: NÃO ALTERAR ESTE SISTEMA SEM APROVAÇÃO**

---

## 🚨 **AVISO CRÍTICO**

**ESTE DESIGN SYSTEM É O PADRÃO OFICIAL E INALTERÁVEL**
- ✅ **USE APENAS ESTAS CORES**
- ❌ **NÃO CRIE NOVAS CORES**
- ❌ **NÃO USE CORES FORA DA PALETA**
- ❌ **NÃO MODIFIQUE EXISTENTES**

---

## 🎨 **PALETA OFICIAL (OBRIGATÓRIA)**

### Cores Principais
```css
--primary-dark: #0F2A23      /* Verde escuro principal */
--primary-secondary: #1C3D33  /* Verde secundário */
--gold: #C8A96A               /* Dourado premium */
--bg-light: #F8F6F2          /* Fundo claro */
--bg-white: #FFFFFF          /* Branco puro */
```

### Cores de Texto
```css
--text-primary: #0B1F1A      /* Texto principal */
--text-secondary: #4A5C57     /* Texto secundário */
```

### Utilitários
```css
--border-light: rgba(15, 42, 35, 0.1)
--shadow-light: 0 8px 24px rgba(15, 42, 35, 0.08)
--shadow-medium: 0 16px 32px rgba(15, 42, 35, 0.12)
--radius-smooth: 12px
--radius-large: 24px
--radius-full: 999px
```

---

## 🔘 **BOTÕES OFICIAIS (APENAS 3 ESTILOS)**

### 1. Botão Primário (.btn-primary)
- **Uso:** Ações principais, CTAs principais
- **Background:** `--primary-dark`
- **Texto:** Branco
- **Borda:** None
- **Hover:** `--primary-secondary`

```html
<button class="btn-primary">Ação Principal</button>
<a href="#" class="btn-primary">Link Principal</a>
```

### 2. Botão Secundário (.btn-secondary)
- **Uso:** Ações secundárias, links alternativos
- **Background:** Transparente
- **Texto:** `--primary-dark`
- **Borda:** 1px solid `--gold`
- **Hover:** `--bg-light`

```html
<button class="btn-secondary">Ação Secundária</button>
<a href="#" class="btn-secondary">Link Secundário</a>
```

### 3. Botão de Destaque (.btn-gold)
- **Uso:** Ações especiais, destaques premium
- **Background:** `--gold`
- **Texto:** `--primary-dark`
- **Borda:** None
- **Hover:** `#D4B57A`

```html
<button class="btn-gold">Ação Premium</button>
<a href="#" class="btn-gold">Link Premium</a>
```

---

## 📦 **CARDS PREMIUM**

### Card Padrão (.card-premium)
- **Background:** Branco
- **Borda:** 1px solid `--border-light`
- **Border-radius:** `--radius-large`
- **Sombra:** `--shadow-light`
- **Padding:** 32px

```html
<div class="card-premium">
  <h3>Título do Card</h3>
  <p>Conteúdo do card com aparência premium.</p>
</div>
```

---

## 🎯 **TIPOGRAFIA**

### Classes de Texto
```css
.text-primary   /* Cor principal */
.text-secondary  /* Cor secundária */
.text-center     /* Alinhado centro */
.text-left       /* Alinhado esquerda */
.text-right      /* Alinhado direita */
```

---

## 📏 **ESPAÇAMENTO**

### Classes de Margem
```css
.space-sm  /* 8px */
.space-md  /* 16px */
.space-lg  /* 24px */
.space-xl  /* 32px */
```

---

## 🚫 **PROIBIÇÕES ABSOLUTAS**

### NUNCA USE:
- ❌ Azul (`#1976d2`, `#2196f3`, etc.)
- ❌ Verde (`#2e7d32`, `#43a047`, etc.)
- ❌ Roxo (`#6a1b9a`, `#8e24aa`, etc.)
- ❌ Laranja (`#f57c00`, `#ff9800`, etc.)
- ❌ Vermelho (`#d32f2f`, `#f44336`, etc.)
- ❌ Cinza (`#455a64`, `#607d8b`, etc.)
- ❌ Cores genéricas fora da paleta

### NUNCA CRIE:
- ❌ Novas classes de botão
- ❌ Novas cores customizadas
- ❌ Estilos inline com cores
- ❌ !important para sobrescrever cores

---

## ✅ **OBRIGATÓRIOS**

### Sempre use:
- ✅ Classes do design system
- ✅ Variáveis CSS definidas
- ✅ Cores da paleta oficial
- ✅ 3 estilos de botão apenas

### Arquivos que usam este sistema:
- `assets/css/design-system.css` (SISTEMA PRINCIPAL)
- `index.html`
- `noemia.html`
- `triagem.html`
- `blog.html`
- `direito-*.html`
- `portal/dashboard.html`

---

## 🔧 **MANUTENÇÃO**

### Se precisar adicionar um novo componente:
1. **VERIFIQUE** se realmente precisa de novo estilo
2. **USE** cores da paleta existente
3. **CRIE** classe reutilizável
4. **DOCUMENTE** aqui neste arquivo

### Se precisar modificar:
1. **SOLICITE** aprovação
2. **JUSTIFIQUE** necessidade
3. **TESTE** em todas as páginas
4. **ATUALIZE** documentação

---

## 📋 **CHECKLIST DE VALIDAÇÃO**

### Antes de publicar:
- [ ] Nenhuma cor fora da paleta
- [ ] Apenas 3 estilos de botão
- [ ] Todos os cards usam `.card-premium`
- [ ] Tipografia consistente
- [ ] Funcionalidade intacta

### Depois de alterações:
- [ ] Testar em todas as páginas
- [ ] Verificar responsividade
- [ ] Validar acessibilidade
- [ ] Conferir identidade visual

---

## 🎯 **OBJETIVO**

Manter a **identidade visual premium** e **consistente** em todo o ecossistema Noêmia Paixão Advocacia, garantindo:

- ✅ **Aparência sofisticada**
- ✅ **Consistência visual**
- ✅ **Sensação premium**
- ✅ **Identidade forte**
- ✅ **Zero elementos fora do padrão**

---

**ESTE DOCUMENTO É VINCULANTE. QUALQUER ALTERAÇÃO DEVE SEGUIR ESTAS REGRAS.**
