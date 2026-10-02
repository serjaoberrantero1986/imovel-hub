import type { CSSProperties } from 'react';

export interface Gradient { start: string; end: string; angle: number; startAt?: number; endAt?: number; }
export function gradientCss(value?: Gradient): string | undefined {
  if (!value || !/^#[0-9a-f]{6}$/i.test(value.start) || !/^#[0-9a-f]{6}$/i.test(value.end)) return undefined;
  const angle = Number.isFinite(value.angle) ? value.angle % 360 : 90;
  const start = Math.max(0, Math.min(100, value.startAt || 0));
  const end = Math.max(start, Math.min(100, value.endAt ?? 100));
  return `linear-gradient(${angle}deg,${value.start} ${start}%,${value.end} ${end}%)`;
}
export function elementStyle(item: CanvasElement | undefined, viewport: 'desktop' | 'tablet' | 'mobile'): CSSProperties {
  const style = {...canvasStyle(item?.style), ...(viewport !== 'desktop' ? canvasStyle(item?.responsive?.tablet) : {}), ...(viewport === 'mobile' ? canvasStyle(item?.responsive?.mobile) : {})};
  const background = gradientCss(item?.backgroundGradient), text = gradientCss(item?.textGradient);
  return {...style, ...(background ? {backgroundImage: background} : {}), ...(text ? {backgroundImage:text,backgroundClip:'text',WebkitBackgroundClip:'text',color:'transparent',backgroundColor:'transparent','--canvas-block-background':background || style.backgroundColor || 'transparent'} : {})};
}
export interface CanvasElement {
  html?: string;
  imageUrl?: string;
  imagePath?: string;
  alt?: string;
  href?: string;
  icon?: string;
  hidden?: boolean;
  style?: CSSProperties;
  responsive?: Partial<Record<"tablet" | "mobile", CSSProperties>>;
  textGradient?: Gradient;
  backgroundGradient?: Gradient;
}
export interface CanvasBlock {
  id: string;
  kind: 'text' | 'image' | 'button' | 'icon';
}
export const CANVAS_FONTS = ['Outfit', 'Arial', 'Georgia', 'Verdana', 'Courier New'];
const cssKeys = ['color', 'backgroundColor', 'fontFamily', 'fontSize', 'fontWeight', 'fontStyle',
  'textDecoration', 'textAlign', 'lineHeight', 'letterSpacing', 'padding', 'marginTop', 'marginBottom',
  'borderRadius', 'borderWidth', 'borderColor', 'borderStyle', 'maxWidth', 'width', 'opacity', 'textShadow', 'textTransform'] as const;
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
  const tags = new Set(['B','STRONG','I','EM','U','S','BR','SPAN','DIV','P','A','UL','OL','LI']);
  const clean = (node: Node): string => {
    if (node.nodeType === 3) return escapeText(node.textContent || '');
    if (!(node instanceof HTMLElement)) return '';
    if (['SCRIPT','STYLE','IFRAME','OBJECT','SVG','MATH','IMG'].includes(node.tagName)) return '';
    const children = Array.from(node.childNodes).map(clean).join('');
    if (!tags.has(node.tagName)) return children;
    if (node.tagName === 'BR') return '<br>';
    const gradient = node.getAttribute('data-text-gradient');
    let gradientAttribute = '', safeGradient = '';
    if (gradient) {
      try {
        const parsed = JSON.parse(gradient) as Gradient;
        safeGradient = gradientCss(parsed) || '';
        if (safeGradient) gradientAttribute = ' data-text-gradient="' + escapeText(JSON.stringify(parsed)) + '"';
      } catch { gradientAttribute = ''; }
    }
    // Keep inline text formatting only, not layout or event attributes.
    const allowed = ['font-weight','font-style','text-decoration','color','background-color'];
    const rules = allowed.map(key => {
      const v = node.style.getPropertyValue(key);
      if (!v || /url|expression|[<>;"]/i.test(v)) return '';
      return key + ':' + v;
    }).filter(Boolean);
    if (safeGradient) rules.push('background-image:'+safeGradient, 'background-clip:text', '-webkit-background-clip:text', 'color:transparent');
    const styleRules = rules.join(';');
    const tag = node.tagName.toLowerCase();
    const href = tag === 'a' ? safeLink(node.getAttribute('href') || '') : '';
    return '<' + tag + (href ? ' href="' + escapeText(href) + '"' : '') + gradientAttribute + (styleRules ? ' style="' + styleRules + '"' : '') + '>' + children + '</' + tag + '>';
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

