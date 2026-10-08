import React, { useState } from 'react';
import { createRoot } from 'react-dom/client';
import { flushSync } from 'react-dom';
import { ImageEditorModal } from '../src/components/media/ImageEditorModal';
import { useResendCooldown } from '../src/hooks/useResendCooldown';
import { formatProfessionalCreci, formatPersonName, formatPhoneInput, isValidProfessionalCreci, isValidPhone, isValidEmail, normalizeEmailInput } from '../src/lib/formInput';
import { loadImage } from '../src/lib/imageProcessing';

const results: { name: string; passed: boolean; error?: string }[] = [];
const assert = (value: unknown, message: string) => { if (!value) throw new Error(message); };
const wait = (ms = 60) => new Promise(resolve => setTimeout(resolve, ms));
async function test(name: string, action: () => unknown) {
  try { await action(); results.push({ name, passed: true }); } catch (error) { results.push({ name, passed: false, error: String(error) }); }
}
let clockOffset = 0;
const realNow = Date.now.bind(Date);
Date.now = () => realNow() + clockOffset;

function Cooldown() {
  const cooldown = useResendCooldown();
  const [visible, setVisible] = useState(true);
  return <><button id="start" onClick={cooldown.start}>Iniciar prazo</button><button id="toggle" onClick={() => setVisible(value => !value)}>Abrir ou fechar</button>{visible && <button id="resend" disabled={cooldown.remaining > 0}>{cooldown.remaining}</button>}</>;
}
const fixture = document.createElement('canvas'); fixture.width = 640; fixture.height = 400;
const context = fixture.getContext('2d')!;
context.fillStyle = '#fff'; context.fillRect(0, 0, 640, 400);
context.fillStyle = '#ff0000'; context.fillRect(0, 0, 60, 60);
context.fillStyle = '#0000ff'; context.fillRect(580, 340, 60, 60);
context.fillStyle = '#111'; context.font = '28px sans-serif'; context.fillText('Documento inteiro', 100, 200);
const source = fixture.toDataURL('image/png');
let saved: any;
const root = createRoot(document.getElementById('root')!);
const click = (label: string) => { const button = [...document.querySelectorAll('button')].find(item => item.textContent?.includes(label)); assert(button && !button.disabled, 'Controle disponível: ' + label); button!.click(); };

async function run() {
  await test('CRECI: hífen automático, colagem, F/J e números antigos', () => {
    assert(formatProfessionalCreci('123456') === '123456-', 'hífen após seis dígitos');
    assert(formatProfessionalCreci('123456f') === '123456-F', 'F maiúsculo');
    assert(formatProfessionalCreci('9.835-j') === '9835-J', 'registro curto colado');
    assert(formatProfessionalCreci('123456-X') === '123456-', 'letra inválida removida');
    assert(!isValidProfessionalCreci('123456-') && !isValidProfessionalCreci('123456-E'), 'sufixo obrigatório');
    assert(isValidProfessionalCreci(formatProfessionalCreci('1234567j')), 'sete dígitos preservados');
  });
  await test('Nome, telefone e e-mail preservam dados legítimos', () => {
    assert(formatPersonName("João D’Ávila 12") === "João D’Ávila ", 'acentos e apóstrofo');
    assert(formatPhoneInput('15987654321') === '(15) 98765-4321', 'celular');
    assert(formatPhoneInput('1532345678') === '(15) 3234-5678', 'fixo');
    assert(isValidPhone('+55 (15) 98765-4321') && !isValidPhone('1234'), 'validação de telefone');
    assert(normalizeEmailInput(' pessoa+contato@example.com ') === 'pessoa+contato@example.com', 'alias preservado');
    assert(isValidEmail('pessoa+contato@example.com') && !isValidEmail('sem-arroba'), 'validação de e-mail');
  });
  flushSync(() => root.render(<Cooldown />));
  await test('Reenvio bloqueado por 60 segundos e preservado ao reabrir', async () => {
    document.getElementById('start')!.click(); await wait();
    assert((document.getElementById('resend') as HTMLButtonElement).disabled && document.getElementById('resend')!.textContent === '60', 'início bloqueado');
    document.getElementById('toggle')!.click(); await wait();
    clockOffset += 31_000; await wait(300);
    document.getElementById('toggle')!.click(); await wait();
    assert((document.getElementById('resend') as HTMLButtonElement).disabled && Number(document.getElementById('resend')!.textContent) <= 29, 'prazo após reabrir');
    clockOffset += 30_000; await wait(300);
    assert(!(document.getElementById('resend') as HTMLButtonElement).disabled, 'liberação após prazo');
  });
  clockOffset = 0;
  flushSync(() => root.render(<ImageEditorModal isOpen imageUrl={source} purpose="document" onSave={result => { saved = result; }} onClose={() => {}} />));
  await wait(200);
  await test('Editor documental: abas ativas, painel útil e bordas da imagem preservadas', async () => {
    for (const label of ['Proporção', 'Ajustes', 'Zoom e posição']) { click(label); await wait(); }
    const rotation = document.querySelector('[aria-label="Girar documento à direita"]') as HTMLButtonElement;
    rotation.click(); await wait();
    const surface = document.querySelector('.canvas-window-drag')!.parentElement!.parentElement!.getBoundingClientRect();
    assert(surface.left >= -1 && surface.right <= innerWidth + 1, 'janela dentro da tela');
    click('Aplicar & Salvar');
    for (let attempt = 0; !saved && attempt < 50; attempt++) await wait();
    assert(saved, 'imagem salva');
    const image = await loadImage(URL.createObjectURL(saved.blob));
    assert(image.naturalWidth === 400 && image.naturalHeight === 640, 'documento inteiro após rotação');
    const output = document.createElement('canvas'); output.width = 400; output.height = 640;
    const outputContext = output.getContext('2d')!; outputContext.drawImage(image, 0, 0);
    const red = outputContext.getImageData(370, 30, 1, 1).data;
    const blue = outputContext.getImageData(30, 610, 1, 1).data;
    assert(red[0] > 220 && red[2] < 40 && blue[2] > 220 && blue[0] < 40, 'cores e cantos preservados');
  });
  document.documentElement.classList.add('dark');
  await test('Tema escuro do editor acompanha o portal', async () => {
    await wait();
    const surface = document.querySelector('.canvas-window-drag')!.parentElement!.parentElement!;
    assert(getComputedStyle(surface).backgroundColor === 'rgb(15, 23, 43)' || getComputedStyle(surface).backgroundColor === 'rgb(15, 23, 42)' || getComputedStyle(surface).backgroundColor.includes('oklch'), 'fundo do editor no tema escuro');
  });
  (window as any).__authReviewTests = { results, failed: results.some(item => !item.passed) };
}
void run();
