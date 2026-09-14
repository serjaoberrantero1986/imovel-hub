import React from 'react';
import { 
  Card, 
  CardHeader, 
  CardTitle, 
  CardDescription, 
  CardContent, 
  Alert, 
  Button, 
  PropertyCardSkeleton, 
  TableSkeleton 
} from '../../components/ui';

export const DesignSystemFeedbackSection: React.FC<{
  onToast: (type: 'success' | 'error' | 'info' | 'warning', title: string, message?: string) => void;
}> = ({ onToast }) => {
  return (
    <div className="space-y-8 animate-in fade-in duration-200">
      {/* Alerts */}
      <Card>
        <CardHeader>
          <CardTitle>Banners de Alerta & Notificações (Alerts)</CardTitle>
          <CardDescription>
            Avisos importantes de status, pendências do CRECI e novidades da plataforma.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert variant="info" title="Nova versão da plataforma disponível!">
            O Web Imóvel conta agora com arquitetura modular otimizada e gestão de leads em tempo real.
          </Alert>

          <Alert variant="success" title="Credenciais Verificadas com Sucesso">
            Seu número de registro CRECI foi validado pelo conselho. O selo de autenticidade já está ativo nos seus anúncios.
          </Alert>

          <Alert variant="warning" title="Documentação Pendente">
            O imóvel #9840 necessita do envio do IPTU e matrícula atualizada para manter o selo de Destaque Ouro.
          </Alert>

          <Alert variant="error" title="Falha ao processar pagamento do plano">
            Não conseguimos renovar a assinatura da Imobiliária. Atualize os dados do cartão de crédito para evitar a desativação dos anúncios.
          </Alert>

          <Alert variant="luxury" title="Coleção Private Luxury 2026">
            Seu perfil foi selecionado para participar do programa de divulgação em portais internacionais parceiros.
          </Alert>
        </CardContent>
      </Card>

      {/* Toasts Trigger */}
      <Card>
        <CardHeader>
          <CardTitle>Notificações Flutuantes (Toasts)</CardTitle>
          <CardDescription>
            Dispare notificações com feedback instantâneo para ações de CRUD, mensagens e favoritos.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap items-center gap-3">
            <Button
              variant="primary"
              size="sm"
              onClick={() => onToast('success', 'Imóvel Cadastrado!', 'O anúncio já está disponível para busca.')}
            >
              Toast de Sucesso
            </Button>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => onToast('info', 'Novo Lead Recebido', 'Carlos enviou uma mensagem pelo WhatsApp.')}
            >
              Toast Informativo
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => onToast('warning', 'Limite de Fotos', 'Você atingiu o limite de 20 fotos por anúncio.')}
            >
              Toast de Alerta
            </Button>
            <Button
              variant="danger"
              size="sm"
              onClick={() => onToast('error', 'Erro de Conexão', 'Não foi possível salvar as alterações no momento.')}
            >
              Toast de Erro
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Skeletons */}
      <Card>
        <CardHeader>
          <CardTitle>Skeletons & Shimmer Loading</CardTitle>
          <CardDescription>
            Estados de carregamento estruturais com efeito shimmer suave para evitar layout shift durante o carregamento de dados.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div>
            <h5 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3">
              Skeleton de Card de Imóvel
            </h5>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6 max-w-4xl">
              <PropertyCardSkeleton />
              <PropertyCardSkeleton />
              <PropertyCardSkeleton />
            </div>
          </div>

          <div className="pt-4 border-t border-slate-200 dark:border-slate-800">
            <h5 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3">
              Skeleton de Tabela
            </h5>
            <div className="border border-slate-200 dark:border-slate-800 rounded-2xl bg-white dark:bg-slate-900 overflow-hidden">
              <TableSkeleton rows={3} />
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
