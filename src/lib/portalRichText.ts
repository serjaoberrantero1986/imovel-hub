import { cleanRichText, escapeText, safeLink } from './portalCanvas';

export type Mark = 'bold' | 'italic' | 'underline' | 'strike';
export interface Marks { bold?: boolean; italic?: boolean; underline?: boolean; strike?: boolean; color?: string; highlight?: string; link?: string; list?: 'ul'|'ol'; }
interface Run { text: string; marks: Marks; }
interface Snapshot { runs: Run[]; start: number; end: number; }

/** A flat, explicit mark model avoids nested <b>/<u> nodes that cannot toggle off. */
function snapshot(root: HTMLElement, range?: Range | null): Snapshot {
  const runs: Run[] = [];
  let length = 0, start = 0, end = 0;
  const point = (node: Node, offset: number) => {
    if (range?.startContainer === node && range.startOffset === offset) start = length;
    if (range?.endContainer === node && range.endOffset === offset) end = length;
  };
  const append = (text: string, marks: Marks) => { if (text) { runs.push({ text, marks }); length += text.length; } };
  const walk = (node: Node, inherited: Marks) => {
    if (node.nodeType === Node.TEXT_NODE) {
      const text = node.textContent || '';
      if (range?.startContainer === node) start = length + range.startOffset;
      if (range?.endContainer === node) end = length + range.endOffset;
      append(text, inherited); return;
    }
    if (!(node instanceof HTMLElement)) return;
    const marks = { ...inherited };
    const tag = node.tagName;
    if(tag==='UL'||tag==='OL')marks.list=tag.toLowerCase() as 'ul'|'ol';
    if (tag === 'B' || tag === 'STRONG') marks.bold = true;
    if (tag === 'I' || tag === 'EM') marks.italic = true;
    if (tag === 'U') marks.underline = true;
    if (tag === 'S' || tag === 'STRIKE') marks.strike = true;
    if (node !== root) {
      if (node.style.fontWeight) marks.bold = node.style.fontWeight === 'bold' || Number(node.style.fontWeight) >= 600;
      if (node.style.fontStyle) marks.italic = node.style.fontStyle === 'italic';
      if (node.style.textDecoration) { marks.underline = node.style.textDecoration.includes('underline'); marks.strike = node.style.textDecoration.includes('line-through'); }
      if (node.style.color) marks.color = node.style.color;
      if (node.style.backgroundColor) marks.highlight = node.style.backgroundColor;
      if (tag === 'A') marks.link = safeLink(node.getAttribute('href') || '');
    }
    point(node, 0);
    if (tag === 'BR') { append('\n', marks); return; }
    const block = node !== root && ['DIV', 'P', 'LI'].includes(tag);
    if (block && length && !runs.at(-1)?.text.endsWith('\n')) append('\n', inherited);
    Array.from(node.childNodes).forEach((child, i) => { point(node, i); walk(child, marks); point(node, i + 1); });
    if (block && !runs.at(-1)?.text.endsWith('\n')) append('\n', marks);
  };
  const computed=getComputedStyle(root);
  walk(root, {bold:Number(computed.fontWeight)>=600,italic:computed.fontStyle==='italic',underline:computed.textDecorationLine.includes('underline'),strike:computed.textDecorationLine.includes('line-through')});
  return { runs, start, end };
}

function serialize(runs: Run[]): string {
  const lines: Run[][]=[[]];
  for(const run of runs){const chunks=run.text.split('\n');chunks.forEach((text,i)=>{if(i)lines.push([]);if(text)lines.at(-1)!.push({text,marks:run.marks});});}
  const inline=({text,marks:m}:Run)=>{
    const styles = [m.bold !== undefined && `font-weight:${m.bold ? 700 : 400}`, m.italic !== undefined && `font-style:${m.italic ? 'italic' : 'normal'}`,
      (m.underline !== undefined || m.strike !== undefined) && `text-decoration:${[m.underline && 'underline', m.strike && 'line-through'].filter(Boolean).join(' ') || 'none'}`,
      m.color && `color:${m.color}`, m.highlight && `background-color:${m.highlight}`].filter(Boolean).join(';');
    const textHtml = escapeText(text);
    const styled = styles ? `<span style="${styles}">${textHtml}</span>` : textHtml;
    return m.link ? `<a href="${escapeText(safeLink(m.link))}">${styled}</a>` : styled;
  };
  let output='',list:'ul'|'ol'|undefined;
  lines.forEach((line,i)=>{
    const next=line[0]?.marks.list;
    if(list!==next){if(list)output+='</'+list+'>';if(next)output+='<'+next+'>';list=next;}
    const content=line.map(inline).join('');
    output+=list?'<li>'+content+'</li>':content+(i<lines.length-1?'<br>':'');
  });
  if(list)output+='</'+list+'>';
  return cleanRichText(output);
}

function restore(root: HTMLElement, start: number, end: number): Range {
  const range = document.createRange();
  let offset = 0, started = false, ended = false;
  const walk = (node: Node) => {
    if (node.nodeType === Node.TEXT_NODE) {
      const length = node.textContent?.length || 0;
      if (!started && start <= offset + length) { range.setStart(node, Math.max(0, start - offset)); started = true; }
      if (!ended && end <= offset + length) { range.setEnd(node, Math.max(0, end - offset)); ended = true; }
      offset += length;
    } else if (node instanceof HTMLElement && node.tagName === 'BR') {
      const parent = node.parentNode!; const index = Array.from(parent.childNodes).indexOf(node);
      if (!started && start === offset) { range.setStart(parent, index); started = true; }
      if (!ended && end === offset) { range.setEnd(parent, index); ended = true; }
      offset++;
    } else node.childNodes.forEach(walk);
  };
  walk(root);
  if (!started) { range.selectNodeContents(root); range.collapse(false); }
  else if (!ended) range.setEnd(root, root.childNodes.length);
  root.focus({ preventScroll: true });
  const selection = window.getSelection(); selection?.removeAllRanges(); selection?.addRange(range);
  return range;
}

export function markState(root: HTMLElement, range: Range | null, mark: Mark): boolean | 'mixed' {
  if (!range || !root.contains(range.commonAncestorContainer)) return false;
  const { runs, start, end } = snapshot(root, range);
  let offset = 0; const states: boolean[] = [];
  for (const run of runs) { const next = offset + run.text.length;
    if (end === start ? offset <= start && next >= start : next > start && offset < end) states.push(Boolean(run.marks[mark]));
    offset = next;
  }
  return states.every(Boolean) && states.length > 0 ? true : states.some(Boolean) ? 'mixed' : false;
}

export function applyMarks(root: HTMLElement, range: Range, patch: Marks, clear = false): Range {
  const { runs, start, end } = snapshot(root, range);
  if (start === end) return range;
  let offset = 0; const output: Run[] = [];
  for (const run of runs) {
    const a = Math.max(0, start - offset), b = Math.min(run.text.length, end - offset);
    if (a < b) {
      if (a) output.push({ text: run.text.slice(0, a), marks: run.marks });
      output.push({ text: run.text.slice(a, b), marks: clear ? {} : { ...run.marks, ...patch } });
      if (b < run.text.length) output.push({ text: run.text.slice(b), marks: run.marks });
    } else output.push(run);
    offset += run.text.length;
  }
  root.innerHTML = serialize(output);
  return restore(root, start, end);
}

export function insertMarkedText(root: HTMLElement, range: Range, text: string, marks: Marks): Range {
  const state = snapshot(root, range);
  range.deleteContents();
  const fragment = document.createRange().createContextualFragment(serialize([{ text, marks }]));
  range.insertNode(fragment);
  return restore(root, state.start + text.length, state.start + text.length);
}


export function toggleList(root:HTMLElement,kind:'ul'|'ol'):Range {
  const {runs}=snapshot(root);
  const remove=!!root.querySelector(kind);
  root.innerHTML=serialize(runs.map(run=>({...run,marks:{...run.marks,list:remove?undefined:kind}})));
  return restore(root,0,runs.reduce((total,run)=>total+run.text.length,0));
}
