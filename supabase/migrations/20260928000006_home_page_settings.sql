-- Editable home page content. The existing visual content is preserved as the default.
alter table public.portal_settings add column if not exists home_page jsonb not null default '{}'::jsonb;
alter table public.portal_settings drop constraint if exists portal_settings_home_page_object_check;
alter table public.portal_settings add constraint portal_settings_home_page_object_check check(jsonb_typeof(home_page)='object');

update public.portal_settings set home_page=jsonb_build_object(
 'heroLine1','Seu próximo imóvel','heroLine2','está mais perto do que','heroLine3','você imagina.',
 'heroSubtitle','Encontre imóveis para comprar, alugar ou investir em poucos cliques.',
 'infoCards',jsonb_build_array(
  jsonb_build_object('id','security','title','Segurança & Verificação CRECI','description','Todos os anúncios e corretores parceiros são verificados garantindo total transparência e proteção jurídica em todas as negociações.','icon','ShieldCheck','iconColor','#e11d48','backgroundColor','#ffffff','textColor','#0f172a','linkLabel','Ver Dicas','action','security','isActive',true,'displayOrder',10),
  jsonb_build_object('id','crm','title','CRM & Gestão de Leads Integrado','description','Para corretores e imobiliárias: funil kanban inteligente, disparo direto para WhatsApp e métricas de desempenho em tempo real.','icon','TrendingUp','iconColor','#4f46e5','backgroundColor','#ffffff','textColor','#0f172a','linkLabel','','action','none','isActive',true,'displayOrder',20),
  jsonb_build_object('id','media','title','Fotos em Alta Resolução & Tour em Vídeo','description','Apresentação impecável com galerias otimizadas para mobile e desktop, gerando até 3x mais contatos qualificados por anúncio.','icon','Award','iconColor','#d97706','backgroundColor','#ffffff','textColor','#0f172a','linkLabel','','action','none','isActive',true,'displayOrder',30)
 ),
 'banners',jsonb_build_array(jsonb_build_object('id','advertise','title','Quer Vender ou Alugar seu Imóvel Mais Rápido?','description','Cadastre seu anúncio em menos de 3 minutos e alcance milhares de compradores e investidores em Sorocaba e região.','buttonLabel','Anunciar Imóvel Agora','action','publish','externalUrl','','startColor','#f00038','endColor','#4338ca','textColor','#ffffff','imageUrl','','imagePath','','startsAt','','endsAt','','isActive',true,'displayOrder',10))
) where id='default' and home_page='{}'::jsonb;
