import type { CSSProperties } from 'react';

export interface CanvasElement {
  html?: string;
  imageUrl?: string;
  imagePath?: string;
  alt?: string;
  href?: string;
  icon?: string;
  hidden?: boolean;
  style?: CSSProperties;
}
export interface CanvasBlock {
  id: string;
  kind: 'text' | 'image' | 'button' | 'icon';
}
export const CANVAS_FONTS = ['Outfit', 'Arial', 'Georgia', 'Verdana', 'Courier New'];
const cssKeys = ['color', 'backgroundColor', 'fontFamily', 'fontSize', 'fontWeight', 'fontStyle',
  'textDecoration', 'textAlign', 'lineHeight', 'letterSpacing', 'padding', 'marginTop', 'marginBottom',
  'borderRadius', 'borderWidth', 'borderColor', 'borderStyle', 'maxWidth', 'width', 'opacity'] as const;
export function canvasStyle(style: CSSProperties = {}): CSSProperties {
  const result: Record<string, string | number> = {};
  for (const key of cssKeys) {
    const value = style[key];
    if (typeof value === 'number' && Number.isFinite(value)) result[key] = value;
    else if (typeof value === 'string' && !/url|expression|[<>;]/i.test(value)) result[key] = value;
  }
  return result;
}
export function safeLink(value: string): string {
  return /^(https?:\/\/|mailto:|tel:|#)/i.test(value.trim()) ? value.trim() : '';
}
export function escapeText(text: string): string {
  return text.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;').replaceAll('\n', '<br>');
}
/** Rich text is restricted to formatting; never persist pasted scripts or arbitrary HTML. */
export function cleanRichText(html: string): string {
  const doc = new DOMParser().parseFromString(html.slice(0, 30000), 'text/html');
  const tags = new Set(['B','STRONG','I','EM','U','S','BR','SPAN','DIV','P']);
  const clean = (node: Node): string => {
    if (node.nodeType === 3) return escapeText(node.textContent || '');
    if (!(node instanceof HTMLElement)) return '';
    if (['SCRIPT','STYLE','IFRAME','OBJECT','SVG','MATH','IMG'].includes(node.tagName)) return '';
    const children = Array.from(node.childNodes).map(clean).join('');
    if (!tags.has(node.tagName)) return children;
    if (node.tagName === 'BR') return '<br>';
    // Keep inline text formatting only, not layout or event attributes.
    const allowed = ['font-weight','font-style','text-decoration','color'];
    const rules = allowed.map(key => {
      const v = node.style.getPropertyValue(key);
      return v && !/url|expression|[<>;"]/i.test(v) ? key + ':' + v : '';
    }).filter(Boolean).join(';');
    const tag = node.tagName.toLowerCase();
    return '<' + tag + (rules ? ' style="' + rules + '"' : '') + '>' + children + '</' + tag + '>';
  };
  return Array.from(doc.body.childNodes).map(clean).join('');
}
export const TEMPLATE_ORDERS: Record<string, string[]> = {
  essencial: ['featured_properties','neighborhoods','map','info_cards','banners'],
  signature: ['info_cards','featured_properties','banners','neighborhoods','map'],
  urbano: ['featured_properties','map','neighborhoods','info_cards','banners'],
  casa_familia: ['info_cards','neighborhoods','featured_properties','banners','map'],
  prime: ['featured_properties','banners','info_cards','map','neighborhoods']
};

