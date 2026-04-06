/**
 * Detector de temas jurídicos baseado em palavras-chave
 * Identifica automaticamente a área jurídica com base no texto
 */

// Palavras-chave por área jurídica
const THEME_KEYWORDS = {
  aposentadoria: [
    'aposentadoria', 'aposentar', 'aposentado', 'aposentada',
    'inss', 'benefício', 'beneficio', 'auxílio', 'auxilio',
    'previdenciário', 'previdenciario', 'rgps', 'loas', 'bpc',
    'idade', 'tempo de contribuição', 'contribuição', 'cnis',
    'negada', 'negado', 'revisão', 'perícia', 'pericia',
    'salário maternidade', 'auxilio doença', 'aposentadoria rural'
  ],
  
  bancario: [
    'banco', 'bancário', 'bancario', 'empréstimo', 'emprestimo',
    'financiamento', 'cartão', 'desconto', 'cobrança', 'cobranca',
    'fraude', 'cheque', 'conta', 'agência', 'juros', 'multa',
    'consignado', 'emprestimo consignado', 'fgts', 'extrato',
    'bloqueio', 'senha', 'clonaram', 'clonar', 'saque'
  ],
  
  familia: [
    'família', 'familia', 'divórcio', 'divorcio', 'separação',
    'separacao', 'pensão', 'pensao', 'alimentícia', 'alimenticia',
    'guarda', 'filhos', 'filho', 'filha', 'união estável', 'uniao estavel',
    'inventário', 'inventario', 'partilha', 'testamento', 'herança',
    'heranca', 'alimentos', 'companheiro', 'companheira'
  ],
  
  consumidor: [
    'consumidor', 'consumo', 'compra', 'produto', 'serviço',
    'servico', 'defeito', 'defeituoso', 'troca', 'devolução',
    'devolucao', 'garantia', 'nota fiscal', 'empresa', 'fornecedor',
    'cobrança indevida', 'cobranca indevida', 'negativação', 'negativacao',
    'serasa', 'spc', 'nome sujo', 'contrato', 'cláusula'
  ],
  
  civil: [
    'civil', 'contrato', 'obrigação', 'obrigacao', 'dano', 'indenização',
    'indenizacao', 'responsabilidade', 'culpa', 'prejuízo', 'prejuizo',
    'locação', 'locacao', 'aluguel', 'fiador', 'testemunha',
    'prova', 'ação', 'acao', 'execução', 'execucao', 'cumprimento'
  ]
};

/**
 * Detecta tema jurídico baseado no texto
 */
export function detectThemeFromText(text: string): string {
  if (!text || typeof text !== 'string') {
    return '';
  }

  const normalizedText = text.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  
  const themeScores: Record<string, number> = {};
  
  // Calcular pontuação para cada tema
  for (const [theme, keywords] of Object.entries(THEME_KEYWORDS)) {
    let score = 0;
    
    for (const keyword of keywords) {
      const normalizedKeyword = keyword.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
      
      // Contar ocorrências exatas da palavra-chave
      const regex = new RegExp(`\\b${normalizedKeyword}\\b`, 'gi');
      const matches = normalizedText.match(regex);
      
      if (matches) {
        score += matches.length;
        
        // Bônus para palavras mais importantes
        if (keyword.length <= 4) {
          score += matches.length * 0.5; // Palavras curtas têm mais peso
        }
      }
    }
    
    themeScores[theme] = score;
  }
  
  // Encontrar tema com maior pontuação
  let bestTheme = '';
  let bestScore = 0;
  
  for (const [theme, score] of Object.entries(themeScores)) {
    if (score > bestScore) {
      bestTheme = theme;
      bestScore = score;
    }
  }
  
  // Só retornar tema se tiver pontuação mínima
  if (bestScore >= 1) {
    return bestTheme;
  }
  
  return '';
}

/**
 * Obtém palavras-chave de um tema específico
 */
export function getThemeKeywords(theme: string): string[] {
  return THEME_KEYWORDS[theme as keyof typeof THEME_KEYWORDS] || [];
}

/**
 * Verifica se o texto menciona múltiplos temas
 */
export function detectMultipleThemes(text: string): string[] {
  if (!text || typeof text !== 'string') {
    return [];
  }

  const themes: string[] = [];
  
  for (const theme of Object.keys(THEME_KEYWORDS)) {
    if (detectThemeFromText(text) === theme) {
      themes.push(theme);
    }
  }
  
  return themes;
}

/**
 * Obtém confiança da detecção (0-1)
 */
export function getDetectionConfidence(text: string, theme: string): number {
  if (!text || !theme) {
    return 0;
  }

  const keywords = getThemeKeywords(theme);
  const normalizedText = text.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  
  let matches = 0;
  
  for (const keyword of keywords) {
    const normalizedKeyword = keyword.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    const regex = new RegExp(`\\b${normalizedKeyword}\\b`, 'gi');
    const found = normalizedText.match(regex);
    
    if (found) {
      matches += found.length;
    }
  }
  
  // Confiança baseada no número de matches vs tamanho do texto
  const wordsInText = normalizedText.split(/\s+/).length;
  return Math.min(matches / wordsInText, 1);
}

/**
 * Mapeia tema para área jurídica
 */
export function mapThemeToArea(theme: string): string {
  const themeToAreaMap: Record<string, string> = {
    aposentadoria: 'previdenciario',
    inss: 'previdenciario',
    bancario: 'bancario',
    familia: 'familia',
    consumidor: 'consumidor',
    civil: 'civil'
  };
  
  return themeToAreaMap[theme] || 'geral';
}
