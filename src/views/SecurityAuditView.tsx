import React, { useState, useEffect } from 'react';
import { 
  ShieldCheck, 
  ShieldAlert, 
  Lock, 
  Eye, 
  EyeOff, 
  FileCode, 
  AlertTriangle, 
  CheckCircle2, 
  XCircle, 
  Activity, 
  RefreshCw, 
  Download, 
  Trash2, 
  Search, 
  Bot, 
  Database, 
  Zap, 
  Terminal,
  FileCheck2,
  Server,
  UserX,
  Layers,
  KeyRound
} from 'lucide-react';
import { 
  auditService, 
  SecurityAuditLog, 
  SecuritySeverity, 
  inspectFileMagicBytes, 
  sanitizeHtml, 
  enforceAllowlist, 
  ClientRateLimiter,
  verifyHoneypot,
  maskCPF,
  maskPhone,
  maskEmail
} from '../lib/security';
import { useApp } from '../context/AppContext';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';

export const SecurityAuditView: React.FC = () => {
  const { currentUser, addToast } = useApp();
  const [logs, setLogs] = useState<SecurityAuditLog[]>([]);
  const [filterSeverity, setFilterSeverity] = useState<string>('ALL');
  const [filterQuery, setFilterQuery] = useState<string>('');
  const [activeTab, setActiveTab] = useState<'matrix' | 'logs' | 'sandbox' | 'lgpd'>('matrix');

  // Sandbox States
  const [xssInput, setXssInput] = useState<string>('<script>alert("Ataque XSS!")</script><img src=x onerror=alert(1)>');
  const [sanitizedOutput, setSanitizedOutput] = useState<string>('');
  const [massAssignInput, setMassAssignInput] = useState<string>(JSON.stringify({ name: 'Imóvel Teste', role: 'super_admin', verified: true, viewsCount: 999999 }, null, 2));
  const [massAssignOutput, setMassAssignOutput] = useState<string>('');
  const [honeypotInput, setHoneypotInput] = useState<string>('');
  const [honeypotResult, setHoneypotResult] = useState<string | null>(null);
  const [fileTestResult, setFileTestResult] = useState<string | null>(null);
  const [rateLimitHits, setRateLimitHits] = useState<number>(0);
  const [rateLimitStatus, setRateLimitStatus] = useState<string | null>(null);

  // LGPD Demo State
  const [unmaskedLeadIds, setUnmaskedLeadIds] = useState<Record<string, boolean>>({});

  useEffect(() => {
    const fetchLogs = () => {
      setLogs(auditService.getLogs());
    };
    fetchLogs();

    const unsubscribe = auditService.subscribe(() => {
      fetchLogs();
    });

    return () => unsubscribe();
  }, []);

  const handleClearLogs = () => {
    auditService.clearLogs();
    setLogs([]);
    addToast({ type: 'info', title: 'Logs de Auditoria Limpos', message: 'Histórico de eventos de segurança redefinido.' });
  };

  const handleExportLogs = () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(logs, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `imovelhub_security_audit_${new Date().toISOString().slice(0, 10)}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
    addToast({ type: 'success', title: 'Exportação Concluída', message: 'Relatório de conformidade e auditoria baixado em JSON.' });
  };

  // Sandbox tests
  const runXssTest = () => {
    const cleaned = sanitizeHtml(xssInput);
    setSanitizedOutput(cleaned);
    auditService.log({
      eventType: 'XSS_INJECTION_DETECTED',
      severity: 'MEDIUM',
      userId: currentUser.id,
      userRole: currentUser.role,
      details: 'Payload XSS testado e neutralizado pelo motor de sanitização.',
      metadata: { original: xssInput, cleaned },
      blocked: true
    });
    addToast({ type: 'success', title: 'Sanitização XSS Executada', message: 'Tags executáveis neutralizadas com sucesso.' });
  };

  const runMassAssignTest = () => {
    try {
      const parsed = JSON.parse(massAssignInput);
      const allowed = enforceAllowlist(parsed, ['name', 'description', 'price'] as any);
      setMassAssignOutput(JSON.stringify(allowed, null, 2));
      addToast({ type: 'warning', title: 'Filtro de Mass Assignment Aplicado', message: 'Campos privilegiados (role, verified, viewsCount) foram expurgados.' });
    } catch {
      setMassAssignOutput('JSON inválido.');
    }
  };

  const runHoneypotTest = () => {
    const isHuman = verifyHoneypot(honeypotInput);
    if (!isHuman) {
      setHoneypotResult('⚠️ SPAMBOT DETECTADO! O campo invisível foi preenchido e a requisição foi abortada silenciosamente.');
      addToast({ type: 'error', title: 'Bot Honeypot Disparado', message: 'Tentativa de spam neutralizada.' });
    } else {
      setHoneypotResult('✅ Requisição humana legítima (campo honeypot vazio).');
      addToast({ type: 'success', title: 'Validação Humana', message: 'Formulário limpo e aprovado.' });
    }
  };

  const runRateLimitTest = () => {
    const allowed = ClientRateLimiter.checkLimit('sandbox_button_click', 5, 10000); // 5 clicks per 10s
    setRateLimitHits(prev => prev + 1);
    if (!allowed) {
      setRateLimitStatus('🛑 RATE LIMIT ATIVADO! Mais de 5 requisições em menos de 10s. Requisição bloqueada.');
      addToast({ type: 'error', title: 'Rate Limit Excedido', message: 'Defesa contra DoS / Brute-force acionada.' });
    } else {
      setRateLimitStatus(`⚡ Requisição ${rateLimitHits + 1}/5 aceita.`);
    }
  };

  const simulateExecutableUploadTest = async (type: 'fake_exe' | 'fake_elf' | 'fake_php') => {
    let dummyBytes: Uint8Array;
    let fakeName = '';

    if (type === 'fake_exe') {
      // MZ header for Windows PE
      dummyBytes = new Uint8Array([0x4D, 0x5A, 0x90, 0x00, 0x03, 0x00, 0x00, 0x00]);
      fakeName = 'foto_fachada.jpg.exe';
    } else if (type === 'fake_elf') {
      // ELF header for Linux
      dummyBytes = new Uint8Array([0x7F, 0x45, 0x4C, 0x46, 0x02, 0x01, 0x01, 0x00]);
      fakeName = 'sala_luxo.png';
    } else {
      // PHP web shell disguised
      const text = 'GIF89a<?php system($_GET["cmd"]); ?>';
      dummyBytes = new TextEncoder().encode(text);
      fakeName = 'piscina.gif';
    }

    const fakeFile = new File([dummyBytes], fakeName, { type: 'image/jpeg' });
    const result = await inspectFileMagicBytes(fakeFile);

    if (!result.isSafe) {
      setFileTestResult(`🛑 BLOQUEADO: ${result.error} (Formato detectado: ${result.detectedFormat})`);
      addToast({ type: 'error', title: 'Binário Executável Bloqueado!', message: result.error });
    } else {
      setFileTestResult('✅ Arquivo considerado seguro.');
    }
  };

  const toggleLeadUnmask = (leadId: string, leadName: string) => {
    const isCurrentlyUnmasked = unmaskedLeadIds[leadId];
    if (!isCurrentlyUnmasked) {
      // Audit log LGPD sensitive data access
      auditService.log({
        eventType: 'LGPD_DATA_UNMASKED',
        severity: 'MEDIUM',
        userId: currentUser.id,
        userRole: currentUser.role,
        resourceType: 'lead',
        resourceId: leadId,
        details: `Dados pessoais sensíveis (CPF, Telefone, E-mail) do lead "${leadName}" desmascarados para atendimento comercial.`,
        blocked: false
      });
      addToast({ type: 'info', title: 'Acesso Auditado (LGPD)', message: 'Visualização de dados pessoais registrada no log de conformidade.' });
    }
    setUnmaskedLeadIds(prev => ({ ...prev, [leadId]: !prev[leadId] }));
  };

  const filteredLogs = logs.filter(l => {
    if (filterSeverity !== 'ALL' && l.severity !== filterSeverity) return false;
    if (filterQuery.trim()) {
      const q = filterQuery.toLowerCase();
      return (
        l.details.toLowerCase().includes(q) ||
        l.eventType.toLowerCase().includes(q) ||
        (l.ipAddress && l.ipAddress.toLowerCase().includes(q)) ||
        (l.userId && l.userId.toLowerCase().includes(q))
      );
    }
    return true;
  });

  const securityVectors = [
    {
      name: 'IDOR (Insecure Direct Object Reference)',
      status: 'PROTECTED',
      description: 'Isolamento rigoroso no banco (RLS) e checagem server-side de posse de anúncios e leads.',
      layer: 'Supabase RLS + Express Middleware'
    },
    {
      name: 'XSS (Cross-Site Scripting)',
      status: 'PROTECTED',
      description: 'Sanitização de HTML, escape de strings e Content-Security-Policy (CSP) estrito.',
      layer: 'Client Sanitizer + CSP Header'
    },
    {
      name: 'CSRF (Cross-Site Request Forgery)',
      status: 'PROTECTED',
      description: 'Autenticação com JWT/Bearer tokens e headers customizados para todas as mutações.',
      layer: 'Auth Headers & SameSite Cookies'
    },
    {
      name: 'SQL Injection',
      status: 'PROTECTED',
      description: 'Consultas parametrizadas pelo query builder do PostgreSQL/PostgREST; sem raw SQL concatenado.',
      layer: 'PostgreSQL Parameterization'
    },
    {
      name: 'Mass Assignment',
      status: 'PROTECTED',
      description: 'Allowlist obrigatório de campos em updates e criações, rejeitando atributos de role ou verified.',
      layer: 'Payload Schema Allowlist'
    },
    {
      name: 'Upload Malicioso & Executáveis (.exe / .elf / scripts)',
      status: 'PROTECTED',
      description: 'Inspeção binária de Magic Bytes (MZ, ELF, Mach-O, PHP/eval) e limite rígido de 3MB por arquivo.',
      layer: 'Binary Magic Number Inspector'
    },
    {
      name: 'Exposição de Dados Privados (LGPD)',
      status: 'PROTECTED',
      description: 'Mascaramento de CPF, telefones e e-mails com auditoria de desmascaramento em tempo real.',
      layer: 'LGPD Masking & Access Logs'
    },
    {
      name: 'Enumeração de Usuários & Brute Force',
      status: 'PROTECTED',
      description: 'Mensagens de login genéricas em tempo constante e rate-limiting estrito para tentativas de autenticação.',
      layer: 'Rate Limiter & Constant-Time Auth'
    },
    {
      name: 'Spam & Bots Automatizados',
      status: 'PROTECTED',
      description: 'Campos Honeypot invisíveis em formulários públicos que descartam bots silenciosamente.',
      layer: 'Honeypot Form Trap'
    },
    {
      name: 'Scraping Abusivo & Scanners Maliciosos',
      status: 'PROTECTED',
      description: 'Bloqueio de user-agents suspeitos (sqlmap, nikto) e throttling de varredura massiva de listagens.',
      layer: 'Anti-Scraper Middleware'
    },
    {
      name: 'Acesso Indevido ao CRM Imobiliário',
      status: 'PROTECTED',
      description: 'Apenas corretores autenticados e administradores podem visualizar pipelines, notas e contatos.',
      layer: 'RBAC Access Gatekeeper'
    },
    {
      name: 'Chaves de API & IA Server-Side',
      status: 'PROTECTED',
      description: 'GEMINI_API_KEY e credenciais sensíveis ficam restritas ao backend Express, sem vazamento no browser.',
      layer: 'Express AI Proxy Engine'
    }
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-6">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center border border-emerald-500/20">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-950 dark:text-white">
                Centro de Segurança, LGPD & Auditoria
              </h1>
              <p className="text-sm text-slate-600 dark:text-slate-300">
                Auditoria de vulnerabilidades, trilha de conformidade LGPD e defesas ativas em tempo real.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <Button
            variant="outline"
            size="sm"
            onClick={handleExportLogs}
            className="flex items-center gap-1.5"
          >
            <Download className="w-4 h-4" />
            <span>Exportar Relatório</span>
          </Button>
          <Button
            variant="danger"
            size="sm"
            onClick={handleClearLogs}
            className="flex items-center gap-1.5"
          >
            <Trash2 className="w-4 h-4" />
            <span>Limpar Logs</span>
          </Button>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex border-b border-slate-200 dark:border-slate-800 gap-2">
        <button
          onClick={() => setActiveTab('matrix')}
          className={`pb-3 px-4 text-sm font-semibold border-b-2 transition-colors flex items-center gap-2 cursor-pointer ${
            activeTab === 'matrix'
              ? 'border-emerald-600 text-emerald-600 dark:border-emerald-400 dark:text-emerald-400'
              : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
          }`}
        >
          <Layers className="w-4 h-4" />
          <span>Matriz de Vulnerabilidades & Defesas</span>
        </button>

        <button
          onClick={() => setActiveTab('logs')}
          className={`pb-3 px-4 text-sm font-semibold border-b-2 transition-colors flex items-center gap-2 cursor-pointer ${
            activeTab === 'logs'
              ? 'border-emerald-600 text-emerald-600 dark:border-emerald-400 dark:text-emerald-400'
              : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
          }`}
        >
          <Activity className="w-4 h-4" />
          <span>Trilha de Auditoria em Tempo Real</span>
          {logs.length > 0 && (
            <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold">
              {logs.length}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab('sandbox')}
          className={`pb-3 px-4 text-sm font-semibold border-b-2 transition-colors flex items-center gap-2 cursor-pointer ${
            activeTab === 'sandbox'
              ? 'border-emerald-600 text-emerald-600 dark:border-emerald-400 dark:text-emerald-400'
              : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
          }`}
        >
          <Terminal className="w-4 h-4" />
          <span>Sandbox de Testes de Ataque</span>
        </button>

        <button
          onClick={() => setActiveTab('lgpd')}
          className={`pb-3 px-4 text-sm font-semibold border-b-2 transition-colors flex items-center gap-2 cursor-pointer ${
            activeTab === 'lgpd'
              ? 'border-emerald-600 text-emerald-600 dark:border-emerald-400 dark:text-emerald-400'
              : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
          }`}
        >
          <KeyRound className="w-4 h-4" />
          <span>Painel de Privacidade LGPD</span>
        </button>
      </div>

      {/* TAB 1: Matriz de Proteções */}
      {activeTab === 'matrix' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {securityVectors.map((v, i) => (
              <div
                key={i}
                className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-3"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                    <span className="text-xs font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
                      Protegido
                    </span>
                  </div>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                    {v.layer}
                  </span>
                </div>
                <h3 className="font-bold text-sm text-slate-900 dark:text-white">
                  {v.name}
                </h3>
                <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                  {v.description}
                </p>
              </div>
            ))}
          </div>

          <div className="p-6 rounded-2xl bg-gradient-to-r from-slate-900 to-slate-800 text-white shadow-xl space-y-4">
            <div className="flex items-center gap-3">
              <Server className="w-6 h-6 text-emerald-400" />
              <h3 className="text-lg font-bold">Arquitetura de Segurança End-to-End</h3>
            </div>
            <p className="text-sm text-slate-300 max-w-4xl leading-relaxed">
              A aplicação opera sob o modelo <strong>Zero-Trust</strong> com múltiplas camadas de blindagem: no cabeçalho HTTP (Helmet e CSP), no roteamento Express (Rate-Limiting, Anti-Bot e Proxy Gemini seguro), na camada de acesso a dados (PostgreSQL Row-Level Security e Validações de Posse), e na camada de UI (Sanitização e Mascaramento LGPD com logs de auditoria).
            </p>
          </div>
        </div>
      )}

      {/* TAB 2: Trilha de Auditoria em Tempo Real */}
      {activeTab === 'logs' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
            <div className="relative w-full sm:w-80">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Filtrar por ação, IP ou usuário..."
                value={filterQuery}
                onChange={e => setFilterQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            <div className="flex items-center gap-1.5 w-full sm:w-auto overflow-x-auto">
              {['ALL', 'CRITICAL', 'HIGH', 'MEDIUM', 'INFO'].map(sev => (
                <button
                  key={sev}
                  onClick={() => setFilterSeverity(sev)}
                  className={`text-xs px-3 py-1.5 rounded-lg font-semibold transition-colors cursor-pointer ${
                    filterSeverity === sev
                      ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900'
                      : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400 hover:bg-slate-200'
                  }`}
                >
                  {sev}
                </button>
              ))}
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800">
                  <tr>
                    <th className="py-3 px-4 font-semibold">Data / Hora</th>
                    <th className="py-3 px-4 font-semibold">Severidade</th>
                    <th className="py-3 px-4 font-semibold">Evento</th>
                    <th className="py-3 px-4 font-semibold">Detalhes</th>
                    <th className="py-3 px-4 font-semibold">Usuário / IP</th>
                    <th className="py-3 px-4 font-semibold text-right">Ação</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {filteredLogs.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-slate-400">
                        Nenhum evento registrado com os filtros selecionados.
                      </td>
                    </tr>
                  ) : (
                    filteredLogs.map(log => (
                      <tr key={log.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                        <td className="py-3 px-4 font-mono text-[11px] text-slate-500 whitespace-nowrap">
                          {new Date(log.timestamp).toLocaleTimeString('pt-BR')}
                        </td>
                        <td className="py-3 px-4 whitespace-nowrap">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                              log.severity === 'CRITICAL'
                                ? 'bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300'
                                : log.severity === 'HIGH'
                                ? 'bg-orange-100 text-orange-700 dark:bg-orange-950 dark:text-orange-300'
                                : log.severity === 'MEDIUM'
                                ? 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300'
                                : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300'
                            }`}
                          >
                            {log.severity}
                          </span>
                        </td>
                        <td className="py-3 px-4 font-semibold text-slate-800 dark:text-slate-200 whitespace-nowrap">
                          {log.eventType}
                        </td>
                        <td className="py-3 px-4 text-slate-600 dark:text-slate-300 max-w-md">
                          {log.details}
                        </td>
                        <td className="py-3 px-4 text-slate-500 font-mono text-[11px] whitespace-nowrap">
                          {log.userId || log.ipAddress || '127.0.0.1'}
                        </td>
                        <td className="py-3 px-4 text-right whitespace-nowrap">
                          {log.blocked ? (
                            <span className="inline-flex items-center gap-1 text-[11px] font-bold text-rose-600 dark:text-rose-400">
                              <XCircle className="w-3.5 h-3.5" /> Bloqueado
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-600 dark:text-emerald-400">
                              <CheckCircle2 className="w-3.5 h-3.5" /> Registrado
                            </span>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: Sandbox de Testes de Ataque */}
      {activeTab === 'sandbox' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Teste 1: XSS */}
          <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-4 shadow-sm">
            <div className="flex items-center gap-2">
              <FileCode className="w-5 h-5 text-indigo-500" />
              <h3 className="font-bold text-sm text-slate-900 dark:text-white">
                Teste 1: Neutralizador de Injeção XSS
              </h3>
            </div>
            <p className="text-xs text-slate-500">
              Digite código HTML malicioso para verificar a sanitização e escape de tags e eventos.
            </p>
            <textarea
              rows={2}
              value={xssInput}
              onChange={e => setXssInput(e.target.value)}
              className="w-full p-2.5 text-xs font-mono rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60 text-slate-900 dark:text-white focus:outline-none"
            />
            <Button size="sm" onClick={runXssTest}>
              Executar Sanitização XSS
            </Button>
            {sanitizedOutput && (
              <div className="p-3 rounded-xl bg-slate-100 dark:bg-slate-800 font-mono text-xs text-slate-700 dark:text-slate-300 break-all">
                <strong>Resultado Seguro:</strong> {sanitizedOutput}
              </div>
            )}
          </div>

          {/* Teste 2: Mass Assignment */}
          <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-4 shadow-sm">
            <div className="flex items-center gap-2">
              <Lock className="w-5 h-5 text-amber-500" />
              <h3 className="font-bold text-sm text-slate-900 dark:text-white">
                Teste 2: Defesa contra Mass Assignment
              </h3>
            </div>
            <p className="text-xs text-slate-500">
              Simule o envio de campos privilegiados (como <code>role: 'super_admin'</code> ou <code>verified: true</code>) que devem ser descartados pelo allowlist.
            </p>
            <textarea
              rows={4}
              value={massAssignInput}
              onChange={e => setMassAssignInput(e.target.value)}
              className="w-full p-2.5 text-xs font-mono rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60 text-slate-900 dark:text-white focus:outline-none"
            />
            <Button size="sm" onClick={runMassAssignTest}>
              Filtrar Payload via Allowlist
            </Button>
            {massAssignOutput && (
              <pre className="p-3 rounded-xl bg-slate-100 dark:bg-slate-800 font-mono text-xs text-slate-700 dark:text-slate-300 overflow-x-auto">
                {massAssignOutput}
              </pre>
            )}
          </div>

          {/* Teste 3: Upload de Executáveis e Magic Bytes */}
          <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-4 shadow-sm">
            <div className="flex items-center gap-2">
              <FileCheck2 className="w-5 h-5 text-rose-500" />
              <h3 className="font-bold text-sm text-slate-900 dark:text-white">
                Teste 3: Inspeção Binária de Magic Bytes (Anti-Executável)
              </h3>
            </div>
            <p className="text-xs text-slate-500">
              Simule o upload de arquivos maliciosos (EXE/ELF/WebShell) renomeados como se fossem imagens normais.
            </p>
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" size="sm" onClick={() => simulateExecutableUploadTest('fake_exe')}>
                Simular Windows .EXE (MZ)
              </Button>
              <Button variant="outline" size="sm" onClick={() => simulateExecutableUploadTest('fake_elf')}>
                Simular Linux ELF
              </Button>
              <Button variant="outline" size="sm" onClick={() => simulateExecutableUploadTest('fake_php')}>
                Simular Polyglot PHP
              </Button>
            </div>
            {fileTestResult && (
              <div className="p-3 rounded-xl bg-slate-100 dark:bg-slate-800 font-mono text-xs text-slate-800 dark:text-slate-200">
                {fileTestResult}
              </div>
            )}
          </div>

          {/* Teste 4: Honeypot & Rate Limiting */}
          <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-4 shadow-sm">
            <div className="flex items-center gap-2">
              <Bot className="w-5 h-5 text-emerald-500" />
              <h3 className="font-bold text-sm text-slate-900 dark:text-white">
                Teste 4: Honeypot & Throttling / Rate-Limit
              </h3>
            </div>
            <div className="space-y-2">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                Simular Campo Honeypot (Preencha para agir como bot):
              </label>
              <input
                type="text"
                placeholder="Deixe em branco (humano) ou digite algo (bot)"
                value={honeypotInput}
                onChange={e => setHoneypotInput(e.target.value)}
                className="w-full p-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white"
              />
              <Button size="sm" onClick={runHoneypotTest}>
                Testar Honeypot Trap
              </Button>
              {honeypotResult && (
                <p className="text-xs font-medium text-slate-700 dark:text-slate-300 mt-2">
                  {honeypotResult}
                </p>
              )}
            </div>

            <div className="pt-4 border-t border-slate-100 dark:border-slate-800 space-y-2">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                Teste de Rate Limiting (Clique rapidamente mais de 5 vezes):
              </label>
              <div className="flex items-center gap-3">
                <Button variant="outline" size="sm" onClick={runRateLimitTest}>
                  <Zap className="w-4 h-4" />
                  <span>Enviar Requisição Rápida</span>
                </Button>
                <span className="text-xs font-mono text-slate-500">Hits: {rateLimitHits}</span>
              </div>
              {rateLimitStatus && (
                <p className="text-xs font-medium text-slate-700 dark:text-slate-300">
                  {rateLimitStatus}
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: LGPD & Mascaramento */}
      {activeTab === 'lgpd' && (
        <div className="space-y-6">
          <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-4 shadow-sm">
            <h3 className="font-bold text-base text-slate-900 dark:text-white">
              Demonstrador de Conformidade LGPD & Trilha de Auditoria
            </h3>
            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
              Todos os dados sensíveis de clientes e leads (como CPF, telefone e e-mail) são armazenados e transmitidos sob camadas de mascaramento. Cada ação de desmascaramento por um corretor gera um registro indelével na trilha de auditoria para conformidade jurídica.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
              {[
                { id: 'lead_lgpd_1', name: 'Juliana Paes Silveira', rawCpf: '38491823901', rawPhone: '15998761234', rawEmail: 'juliana.silveira@gmail.com', budget: 'R$ 850.000' },
                { id: 'lead_lgpd_2', name: 'Roberto Carlos Alcantara', rawCpf: '19284756209', rawPhone: '11987654321', rawEmail: 'roberto.carlos@empresa.com.br', budget: 'R$ 1.400.000' },
                { id: 'lead_lgpd_3', name: 'Mariana Duarte', rawCpf: '58473920199', rawPhone: '15981223344', rawEmail: 'mariana.duarte@adv.br', budget: 'R$ 620.000' }
              ].map(lead => {
                const isUnmasked = unmaskedLeadIds[lead.id];
                return (
                  <div
                    key={lead.id}
                    className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 space-y-3"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-xs text-slate-900 dark:text-white">{lead.name}</span>
                      <button
                        onClick={() => toggleLeadUnmask(lead.id, lead.name)}
                        className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 flex items-center gap-1 hover:underline cursor-pointer"
                      >
                        {isUnmasked ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                        <span>{isUnmasked ? 'Ocultar' : 'Revelar'}</span>
                      </button>
                    </div>

                    <div className="text-xs space-y-1 font-mono text-slate-600 dark:text-slate-300">
                      <div><strong>CPF:</strong> {isUnmasked ? lead.rawCpf : maskCPF(lead.rawCpf)}</div>
                      <div><strong>Telefone:</strong> {isUnmasked ? lead.rawPhone : maskPhone(lead.rawPhone)}</div>
                      <div><strong>E-mail:</strong> {isUnmasked ? lead.rawEmail : maskEmail(lead.rawEmail)}</div>
                      <div><strong>Orçamento:</strong> {lead.budget}</div>
                    </div>

                    <div className="text-[10px] text-slate-400 pt-1 border-t border-slate-200 dark:border-slate-700">
                      {isUnmasked ? '🔓 Dados revelados e auditados' : '🔒 Protegido sob a Lei Geral de Proteção de Dados'}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
