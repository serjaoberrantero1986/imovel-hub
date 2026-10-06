import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { extractPortalSlug, PublicPortalData, resolvePublicPortal, ROOT_DOMAIN } from '../lib/tenant';
import { DEFAULT_FOOTER_SETTINGS, DEFAULT_HOME_PAGE_SETTINGS, DEFAULT_PORTAL_IDENTITY } from '../lib/portalSettings';
import { DEFAULT_VISUAL_PORTAL_CONFIGURATION } from '../lib/visualPortalEditor';

interface TenantContextValue {
  portal: PublicPortalData;
  loading: boolean;
  error: string | null;
  refreshTenant: () => Promise<void>;
  canonicalRootUrl: string;
}

const initialPortal: PublicPortalData = {
  mode: 'root', slug: null, ownerProfileId: null, profile: null,
  identity: DEFAULT_PORTAL_IDENTITY,
  footer: DEFAULT_FOOTER_SETTINGS,
  homePage: DEFAULT_HOME_PAGE_SETTINGS,
  visualPublished: DEFAULT_VISUAL_PORTAL_CONFIGURATION,
};

const TenantContext = createContext<TenantContextValue | null>(null);

export function TenantProvider({ children }: { children: React.ReactNode }) {
  const slug = useMemo(() => extractPortalSlug(), []);
  const [portal, setPortal] = useState<PublicPortalData>(initialPortal);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const resolvedOnce = useRef(false);

  const refreshTenant = useCallback(async () => {
    if (!resolvedOnce.current) setLoading(true);
    try {
      setPortal(await resolvePublicPortal(slug));
      setError(null);
    } catch (cause) {
      console.warn('Portal tenant resolution failed:', cause);
      setPortal({ ...initialPortal, mode: slug ? 'not_found' : 'root', slug });
      setError('Não foi possível carregar este portal agora. Tente novamente em instantes.');
    } finally {
      resolvedOnce.current = true;
      setLoading(false);
    }
  }, [slug]);

  useEffect(() => { void refreshTenant(); }, [refreshTenant]);

  return <TenantContext.Provider value={{ portal, loading, error, refreshTenant, canonicalRootUrl: `https://${ROOT_DOMAIN}` }}>
    {children}
  </TenantContext.Provider>;
}

export function useTenant() {
  const context = useContext(TenantContext);
  if (!context) throw new Error('useTenant deve ser utilizado dentro de TenantProvider.');
  return context;
}
