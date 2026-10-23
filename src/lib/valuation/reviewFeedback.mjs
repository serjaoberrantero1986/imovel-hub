// Somente apresentação e validação da conferência; não altera a triagem.
export const reviewNumber = raw => {
  if (!raw.trim()) return null;
  const value = Number(raw);
  return Number.isFinite(value) && value >= 0 ? value : null;
};

export function validateReview(draft, manualComparable = false) {
  const errors = {};
  for (const field of ['asking_price', 'usable_area', 'total_area', 'built_area', 'bedrooms', 'bathrooms']) {
    const value = reviewNumber(draft[field]);
    if (draft[field].trim() && value === null)
      errors[field] = 'Informe um número válido, maior ou igual a zero.';
    else if (['bedrooms', 'bathrooms'].includes(field) && value !== null && !Number.isInteger(value))
      errors[field] = 'Informe uma quantidade inteira ou deixe o campo vazio.';
    if (field === 'asking_price' && ((draft[field].trim() && !(value > 0)) || (manualComparable && !value)))
      errors[field] = 'Informe um preço maior que zero.';
  }
  if (draft.listing_url.trim()) {
    try {
      const url = new URL(draft.listing_url.trim());
      if (url.protocol !== 'https:' || url.username || url.password) throw new Error();
    } catch {
      errors.listing_url = 'Informe um link HTTPS válido, sem usuário ou senha.';
    }
  } else if (manualComparable) errors.listing_url = 'Informe o link HTTPS do anúncio.';
  return errors;
}

export function reviewSaveError(error) {
  const code = String(error?.code || '');
  if (['PGRST301', 'PGRST302', 'PGRST303', '401'].includes(code))
    return 'Sua sessão expirou. Entre novamente e tente salvar. Os campos preenchidos foram mantidos.';
  if (code === '42501')
    return 'Não foi possível confirmar sua permissão. Verifique a sessão e tente novamente.';
  if (code === 'PGRST116')
    return 'Este anúncio não está mais disponível para alteração. Reabra a avaliação para conferir.';
  if (['23514', '22001', '22P02'].includes(code))
    return 'Algum dado não foi aceito. Confira o link, os valores e o tamanho das observações.';
  return 'Não foi possível gravar a alteração. Confira sua conexão e tente novamente. Os campos preenchidos foram mantidos.';
}

export function savedReviewFeedback(decision, action) {
  const group = {included: 'Aproveitados', pending: 'Conferência', excluded: 'Excluídos'}[decision?.status];
  if (!group) return {type: 'warning', message: 'Alteração gravada. Reabra a avaliação para conferir a classificação.'};
  const blocked = action === 'reuse' && decision.status !== 'included';
  const lead = blocked ? 'Decisão manual gravada, mas o anúncio ainda não compõe o cálculo.' :
    action === 'reuse' ? 'Anúncio reaproveitado no cálculo por decisão do corretor.' :
    action === 'restore' ? 'Decisão manual removida; triagem automática restaurada.' :
    'Conferência gravada; triagem recalculada.';
  return {
    type: decision.status === 'included' ? 'success' : 'warning',
    message: `${lead} Classificação: ${group}. ${decision.reason || ''}`.trim()
  };
}

// O cartão recém-alterado não some ao mudar de categoria. Contagens e filtro
// continuam verdadeiros; a exceção é identificada na própria interface.
export function visibleTriageEntries(entries, filter, limit, retainedId) {
  const shown = entries.filter(row => filter === 'all' || row.status === filter).slice(0, limit);
  const retained = entries.find(row => row.item.id === retainedId);
  return retained && !shown.some(row => row.item.id === retainedId) ? [retained, ...shown] : shown;
}
