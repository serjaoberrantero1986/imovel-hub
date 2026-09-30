import { test } from 'node:test';
import assert from 'node:assert/strict';
import { canvasStyle, escapeText, safeLink, TEMPLATE_ORDERS } from './portalCanvas';

test('bloqueia links executáveis e preserva destinos suportados', () => {
  for (const input of ['javascript:alert(1)', 'data:text/html,x', '//example.com']) assert.equal(safeLink(input), '');
  assert.equal(safeLink(' https://example.com '), 'https://example.com');
  assert.equal(safeLink('#contato'), '#contato');
});
test('estilos não permitem código, posição fixa ou valores não finitos', () => {
  assert.deepEqual(canvasStyle({ color: 'red', fontSize: 24, position: 'fixed', width: Infinity, backgroundColor: 'url(x)' }), { color: 'red', fontSize: 24 });
});
test('texto simples é escapado antes da inserção no documento', () => {
  assert.equal(escapeText('<img> &\ntexto'), '&lt;img&gt; &amp;<br>texto');
});
test('os modelos reorganizam as mesmas seções sem duplicação', () => {
  const expected = [...TEMPLATE_ORDERS.essencial].sort();
  for (const order of Object.values(TEMPLATE_ORDERS)) assert.deepEqual([...order].sort(), expected);
  assert.equal(new Set(Object.values(TEMPLATE_ORDERS).map(order => order.join(','))).size, 5);
});
