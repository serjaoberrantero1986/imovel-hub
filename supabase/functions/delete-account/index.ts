// @ts-nocheck -- Executed by the Supabase Edge Runtime (Deno), not by Vite.
import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = (origin: string) => ({
  'Access-Control-Allow-Origin': origin,
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Vary': 'Origin',
});

const allowedOrigin = (origin: string) => {
  try {
    const hostname = new URL(origin).hostname.toLowerCase();
    return hostname === 'webimoveis.site' || hostname.endsWith('.webimoveis.site');
  } catch {
    return false;
  }
};

const response = (origin: string, body: Record<string, unknown>, status = 200) => new Response(
  JSON.stringify(body),
  { status, headers: { ...corsHeaders(origin), 'Content-Type': 'application/json; charset=utf-8' } },
);

type StorageItem = { bucket: string; path: string };

async function listFolder(storage: any, bucket: string, prefix: string): Promise<string[]> {
  const { data, error } = await storage.from(bucket).list(prefix, { limit: 1000 });
  if (error) throw error;
  const paths: string[] = [];
  for (const item of data || []) {
    const path = `${prefix}/${item.name}`;
    if (item.id) paths.push(path);
    else paths.push(...await listFolder(storage, bucket, path));
  }
  return paths;
}

Deno.serve(async (request: Request) => {
  const origin = request.headers.get('origin') || '';
  if (!allowedOrigin(origin)) return response(origin || 'https://www.webimoveis.site', { code: 'origin_not_allowed' }, 403);
  if (request.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders(origin) });
  if (request.method !== 'POST') return response(origin, { code: 'method_not_allowed' }, 405);

  const authorization = request.headers.get('authorization');
  if (!authorization?.startsWith('Bearer ')) return response(origin, { code: 'authentication_required' }, 401);

  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY');
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!supabaseUrl || !anonKey || !serviceRoleKey) return response(origin, { code: 'service_not_configured' }, 503);

  const userClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authorization } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const serviceClient = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data: userData, error: userError } = await userClient.auth.getUser();
  const user = userData.user;
  if (userError || !user) return response(origin, { code: 'authentication_required' }, 401);

  let queueId: string | null = null;
  let databaseDeleted = false;
  try {
    const { data: profile, error: profileError } = await serviceClient
      .from('profiles').select('role').eq('id', user.id).single();
    if (profileError || !profile) throw new Error('profile_not_found');
    if (profile.role === 'admin') return response(origin, { code: 'administrative_account' }, 403);

    const storageItems: StorageItem[] = [];
    const { data: documents, error: documentsError } = await serviceClient
      .from('creci_verification_documents').select('storage_path').eq('profile_id', user.id);
    if (documentsError) throw documentsError;
    for (const document of documents || []) {
      if (document.storage_path) storageItems.push({ bucket: 'creci-verification', path: document.storage_path });
    }

    const { data: properties, error: propertiesError } = await serviceClient
      .from('properties').select('id').eq('user_id', user.id);
    if (propertiesError) throw propertiesError;
    const propertyBucket = Deno.env.get('PROPERTY_IMAGES_BUCKET') || 'property-images';
    for (const property of properties || []) {
      for (const path of await listFolder(serviceClient.storage, propertyBucket, `properties/${property.id}`)) {
        storageItems.push({ bucket: propertyBucket, path });
      }
    }
    for (const path of await listFolder(serviceClient.storage, 'portal-assets', user.id)) {
      storageItems.push({ bucket: 'portal-assets', path });
    }

    const uniqueItems = [...new Map(storageItems.map(item => [`${item.bucket}:${item.path}`, item])).values()];
    const { data: queue, error: queueError } = await serviceClient
      .from('account_deletion_cleanup_queue')
      .insert({ user_id: user.id, storage_items: uniqueItems, status: 'prepared' })
      .select('id').single();
    if (queueError) throw queueError;
    queueId = queue.id;

    const { data: prepared, error: preparationError } = await userClient.rpc('begin_my_account_deletion');
    if (preparationError || prepared !== true) throw preparationError || new Error('deletion_not_prepared');

    const { data: deleted, error: deletionError } = await userClient.rpc('delete_my_account');
    if (deletionError || deleted !== true) throw deletionError || new Error('deletion_not_confirmed');
    databaseDeleted = true;

    const cleanupErrors: string[] = [];
    const byBucket = new Map<string, string[]>();
    for (const item of uniqueItems) byBucket.set(item.bucket, [...(byBucket.get(item.bucket) || []), item.path]);
    for (const [bucket, paths] of byBucket) {
      if (!paths.length) continue;
      const { error } = await serviceClient.storage.from(bucket).remove(paths);
      if (error) cleanupErrors.push(`${bucket}: ${error.message}`);
    }

    await serviceClient.from('account_deletion_cleanup_queue').update({
      status: cleanupErrors.length ? 'cleanup_pending' : 'completed',
      error_message: cleanupErrors.length ? cleanupErrors.join(' | ').slice(0, 2000) : null,
      completed_at: cleanupErrors.length ? null : new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }).eq('id', queueId);

    return response(origin, { deleted: true, cleanupPending: cleanupErrors.length > 0 });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (queueId && !databaseDeleted) {
      await serviceClient.from('account_deletion_cleanup_queue').update({
        status: 'database_failed', error_message: message.slice(0, 2000), updated_at: new Date().toISOString(),
      }).eq('id', queueId);
    }
    console.error('Account deletion failed', { userId: user.id, databaseDeleted, message });
    return response(origin, { code: databaseDeleted ? 'cleanup_pending' : 'database_deletion_failed' }, databaseDeleted ? 200 : 409);
  }
});
