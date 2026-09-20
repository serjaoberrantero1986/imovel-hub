import { supabase } from './supabaseClient';
import { Property, Lead, Conversation, Message, SavedSearch, PropertyMedia, UserProfile } from '../types';
import { getCityFallbackCoordinates, resolvePropertyCoordinates } from './geocoding';

function ensureValidUuid(id?: string): string {
  if (id && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) {
    return id;
  }
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return '10000000-1000-4000-8000-100000000000'.replace(/[018]/g, c =>
    (+c ^ (Math.random() * 16 >> (+c / 4))).toString(16)
  );
}

/**
 * Maps database property + relations to application Property model
 */
export function mapDbPropertyToApp(
  dbProp: any,
  location?: any,
  images: any[] = [],
  features: string[] = [],
  advertiserProfile?: any
): Property {
  const media: PropertyMedia[] = images
    .sort((a, b) => {
      // Prioritize the cover photo
      if (a.is_cover && !b.is_cover) return -1;
      if (!a.is_cover && b.is_cover) return 1;
      return (a.display_order ?? 0) - (b.display_order ?? 0);
    })
    .map(img => {
      const resolvedUrl = img.url || img.image_url || '';
      return {
        id: img.id,
        url: resolvedUrl,
        thumbnailUrl: img.thumbnail_url || resolvedUrl,
        mediaType: img.media_type || 'image',
        caption: img.caption || undefined,
        category: img.category || undefined,
        isCover: Boolean(img.is_cover),
        order: img.display_order || 1,
        size: img.file_size_bytes || undefined,
        mimeType: img.mime_type || undefined
      };
    });

  const advertiser: UserProfile = advertiserProfile
    ? {
        id: advertiserProfile.id,
        name: advertiserProfile.name,
        email: advertiserProfile.email,
        phone: advertiserProfile.phone || undefined,
        whatsapp: advertiserProfile.whatsapp || undefined,
        avatarUrl: advertiserProfile.avatar_url || undefined,
        role: advertiserProfile.role as any,
        creci: advertiserProfile.creci || undefined,
        agencyName: advertiserProfile.agency_name || undefined,
        agencyLogo: advertiserProfile.agency_logo || undefined,
        verified: advertiserProfile.verified,
        rating: advertiserProfile.rating || 5.0,
        totalDeals: advertiserProfile.total_deals || 0
      }
    : {
        id: dbProp.user_id,
        name: 'Corretor Responsável',
        email: 'contato@imovelhub.com.br',
        role: 'broker',
        verified: true
      };

  // Location resolution
  const rawLat = (location?.latitude !== null && location?.latitude !== undefined && !isNaN(Number(location.latitude)))
    ? Number(location.latitude)
    : null;
  const rawLng = (location?.longitude !== null && location?.longitude !== undefined && !isNaN(Number(location.longitude)))
    ? Number(location.longitude)
    : null;

  const [resolvedLat, resolvedLng] = resolvePropertyCoordinates({
    city: location?.city,
    state: location?.state,
    neighborhood: location?.neighborhood,
    addressStreet: location?.street,
    latitude: rawLat,
    longitude: rawLng
  });

  return {
    id: dbProp.id,
    code: dbProp.code,
    userId: dbProp.user_id,
    advertiser,
    title: dbProp.title,
    slug: dbProp.slug || dbProp.id,
    description: dbProp.description,
    purpose: dbProp.purpose,
    type: dbProp.type,
    status: dbProp.status,
    featured: dbProp.featured,
    isExclusive: dbProp.is_exclusive,
    price: Number(dbProp.price),
    pricePerMeter: dbProp.useful_area > 0 ? Math.round(Number(dbProp.price) / Number(dbProp.useful_area)) : undefined,
    condoFee: dbProp.condo_fee ? Number(dbProp.condo_fee) : undefined,
    iptuFee: dbProp.iptu_fee ? Number(dbProp.iptu_fee) : undefined,
    totalArea: Number(dbProp.total_area || dbProp.useful_area || 0),
    usefulArea: dbProp.useful_area ? Number(dbProp.useful_area) : undefined,
    bedrooms: dbProp.bedrooms,
    suites: dbProp.suites,
    bathrooms: dbProp.bathrooms,
    parkingSpots: dbProp.parking_spots,
    floor: dbProp.floor || undefined,
    totalFloors: dbProp.total_floors || undefined,
    solarOrientation: dbProp.solar_orientation ? (dbProp.solar_orientation === 'morning' ? 'Manhã' : 'Tarde') : undefined,
    constructionYear: dbProp.construction_year || undefined,
    deliveryDate: dbProp.delivery_date || undefined,

    addressStreet: location?.street || 'Endereço Principal',
    addressNumber: location?.street_number || '',
    addressComplement: location?.complement || '',
    neighborhood: location?.neighborhood || 'Bairro Nobre',
    city: location?.city || '',
    state: location?.state || '',
    zipCode: location?.zip_code || '',
    latitude: resolvedLat,
    longitude: resolvedLng,

    amenities: features,
    images: media.map(m => m.url).filter(Boolean),
    media,
    videoUrl: dbProp.video_url || undefined,
    tour360Url: dbProp.tour_360_url || undefined,

    viewsCount: dbProp.views_count || 0,
    leadsCount: dbProp.leads_count || 0,
    favoritesCount: dbProp.favorites_count || 0,
    sharesCount: dbProp.shares_count || 0,
    createdAt: dbProp.created_at,
    updatedAt: dbProp.updated_at
  };
}

// ============================================================================
// REAL PROPERTIES CRUD API
// ============================================================================

export async function fetchPropertiesFromSupabase(): Promise<Property[] | null> {
  if (!supabase) return null;
  try {
    const { data: dbProperties, error } = await supabase
      .from('properties')
      .select(`
        *,
        property_locations (*),
        property_images (*),
        property_features (*)
      `)
      .order('created_at', { ascending: false });

    if (error) {
      console.warn('Supabase fetch properties error:', error);
      return null;
    }

    if (!dbProperties || dbProperties.length === 0) {
      return [];
    }

    // Fetch advertiser profiles for unique user_ids safely without foreign key constraint failure
    const userIds = [...new Set(dbProperties.map((p: any) => p.user_id).filter(Boolean))];
    const profilesMap: Record<string, any> = {};
    if (userIds.length > 0) {
      try {
        const { data: profiles } = await supabase
          .from('profiles')
          .select('*')
          .in('id', userIds);

        (profiles || []).forEach((prof: any) => {
          profilesMap[prof.id] = prof;
        });
      } catch (profErr) {
        console.warn('Could not query advertiser profiles:', profErr);
      }
    }

    return dbProperties.map((p: any) => {
      const location = Array.isArray(p.property_locations) ? p.property_locations[0] : p.property_locations;
      const images = p.property_images || [];
      const features = (p.property_features || []).map((f: any) => f.feature_id || f);
      const profile = profilesMap[p.user_id];
      return mapDbPropertyToApp(p, location, images, features, profile);
    });
  } catch (err) {
    console.warn('Network error reading from Supabase properties:', err);
    return null;
  }
}

export interface InsertPropertyResult {
  success: boolean;
  error?: string;
  propertyId?: string;
}

export async function insertPropertyToSupabase(property: Property): Promise<InsertPropertyResult> {
  if (!supabase) return { success: false, error: 'Supabase não inicializado ou credenciais ausentes.' };
  try {
    // 1. Verify active Supabase session and user_id
    let sessionUser: any = null;
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      sessionUser = sessionData?.session?.user;
      if (!sessionUser) {
        const { data: userData } = await supabase.auth.getUser();
        sessionUser = userData?.user;
      }
    } catch {
      // session check fallback
    }

    // Determine targetUserId: Prefer the logged-in session user ID, then property.userId or advertiser.id
    const rawUserId = sessionUser?.id || property.userId || property.advertiser?.id;
    const targetUserId = ensureValidUuid(rawUserId);

    // 2. Ensure user has a corresponding row in public.profiles table (Foreign Key constraint)
    try {
      const { data: existingProfile, error: profileCheckErr } = await supabase
        .from('profiles')
        .select('id, role, email')
        .eq('id', targetUserId)
        .maybeSingle();

      const meta = sessionUser?.user_metadata || {};
      const fallbackName = property.advertiser?.name || meta.name || sessionUser?.email?.split('@')[0] || 'Corretor';
      const fallbackEmail = property.advertiser?.email || sessionUser?.email || meta.email || 'corretor@webimovel.com.br';
      const fallbackRole = property.advertiser?.role || meta.role || 'broker';
      const fallbackPhone = property.advertiser?.phone || meta.phone || null;
      const fallbackCreci = property.advertiser?.creci || meta.creci || null;

      if (!existingProfile || profileCheckErr) {
        const { error: profileUpsertErr } = await supabase.from('profiles').upsert({
          id: targetUserId,
          name: fallbackName,
          email: fallbackEmail,
          role: fallbackRole,
          phone: fallbackPhone,
          creci: fallbackCreci,
          verified: true
        }, { onConflict: 'id' });

        if (profileUpsertErr) {
          console.warn('Profile sync notice before inserting property:', profileUpsertErr.message);
        }
      }
    } catch (profErr) {
      console.warn('Profile check notice:', profErr);
    }

    const propertyId = ensureValidUuid(property.id);

    // 3. Insert Property Row
    const { error: propError } = await supabase.from('properties').insert({
      id: propertyId,
      code: property.code,
      user_id: targetUserId,
      title: property.title,
      slug: property.slug,
      description: property.description,
      purpose: property.purpose,
      type: property.type,
      status: property.status,
      featured: property.featured,
      is_exclusive: property.isExclusive ?? false,
      price: property.price,
      condo_fee: property.condoFee ?? 0,
      iptu_fee: property.iptuFee ?? 0,
      total_area: property.totalArea,
      useful_area: property.usefulArea,
      bedrooms: property.bedrooms,
      suites: property.suites,
      bathrooms: property.bathrooms,
      parking_spots: property.parkingSpots,
      floor: property.floor ?? null,
      total_floors: property.totalFloors ?? null,
      video_url: property.videoUrl ?? null,
      tour_360_url: property.tour360Url ?? null,
      views_count: property.viewsCount || 1,
      leads_count: property.leadsCount || 0,
      favorites_count: property.favoritesCount || 0,
      shares_count: property.sharesCount || 0
    });

    if (propError) {
      console.warn('Supabase property insert notice:', propError.message);
      return {
        success: false,
        error: propError.message || propError.details || 'Falha ao gravar na tabela properties do Supabase',
        propertyId
      };
    }

    // 4. Insert Location
    const zipCode = property.zipCode && property.zipCode.trim().length > 0 
      ? property.zipCode.trim() 
      : '00000-000';

    const [resolvedLat, resolvedLng] = resolvePropertyCoordinates(property);

    const { error: locError } = await supabase.from('property_locations').insert({
      id: crypto.randomUUID(),
      property_id: propertyId,
      street: property.addressStreet || 'Não informado',
      street_number: property.addressNumber || null,
      complement: property.addressComplement || null,
      neighborhood: property.neighborhood || 'Centro',
      city: property.city || '',
      state: property.state || '',
      zip_code: zipCode,
      latitude: resolvedLat,
      longitude: resolvedLng
    });

    if (locError) {
      console.warn('Supabase location insert notice:', locError.message);
    }

    // 5. Insert Images
    if (property.media && property.media.length > 0) {
      const imageRows = property.media.map(m => ({
        id: ensureValidUuid(m.id),
        property_id: propertyId,
        url: m.url,
        thumbnail_url: m.thumbnailUrl || m.url,
        media_type: m.mediaType || 'image',
        category: m.category || null,
        caption: m.caption || null,
        is_cover: m.isCover ?? false,
        display_order: m.order ?? 1,
        file_size_bytes: m.size || null,
        mime_type: m.mimeType || null
      }));
      const { error: imgError } = await supabase.from('property_images').insert(imageRows);
      if (imgError) {
        console.warn('Supabase property_images insert notice:', imgError.message);
      }
    }

    // 6. Insert Features (if catalog is populated)
    if (property.amenities && property.amenities.length > 0) {
      try {
        const featureRows = property.amenities
          .filter(featId => featId && typeof featId === 'string')
          .map(featId => ({
            property_id: propertyId,
            feature_id: featId
          }));
        if (featureRows.length > 0) {
          const { error: featError } = await supabase.from('property_features').insert(featureRows);
          if (featError) {
            console.warn('Notice on property_features insert:', featError.message);
          }
        }
      } catch (featErr) {
        console.warn('Notice on property_features insert:', featErr);
      }
    }

    return { success: true, propertyId };
  } catch (e: any) {
    console.error('Failed to sync new property to Supabase:', e);
    return { 
      success: false, 
      error: e?.message || 'Falha de comunicação de rede ou permissão ao salvar no Supabase.' 
    };
  }
}

export async function updatePropertyInSupabase(
  id: string, 
  updates: Partial<Property>
): Promise<{ success: boolean; error?: string }> {
  if (!supabase) {
    return { success: false, error: 'Cliente Supabase não está configurado.' };
  }
  try {
    const validId = ensureValidUuid(id);
    const dbUpdates: any = {};
    if (updates.title !== undefined) dbUpdates.title = updates.title;
    if (updates.description !== undefined) dbUpdates.description = updates.description;
    if (updates.price !== undefined) dbUpdates.price = updates.price;
    if (updates.condoFee !== undefined) dbUpdates.condo_fee = updates.condoFee;
    if (updates.iptuFee !== undefined) dbUpdates.iptu_fee = updates.iptuFee;
    if (updates.totalArea !== undefined) dbUpdates.total_area = updates.totalArea;
    if (updates.usefulArea !== undefined) dbUpdates.useful_area = updates.usefulArea;
    if (updates.bedrooms !== undefined) dbUpdates.bedrooms = updates.bedrooms;
    if (updates.suites !== undefined) dbUpdates.suites = updates.suites;
    if (updates.bathrooms !== undefined) dbUpdates.bathrooms = updates.bathrooms;
    if (updates.parkingSpots !== undefined) dbUpdates.parking_spots = updates.parkingSpots;
    if (updates.purpose !== undefined) dbUpdates.purpose = updates.purpose;
    if (updates.type !== undefined) dbUpdates.type = updates.type;
    if (updates.status !== undefined) dbUpdates.status = updates.status;
    if (updates.videoUrl !== undefined) dbUpdates.video_url = updates.videoUrl || null;
    if (updates.viewsCount !== undefined) dbUpdates.views_count = updates.viewsCount;
    if (updates.leadsCount !== undefined) dbUpdates.leads_count = updates.leadsCount;
    if (updates.favoritesCount !== undefined) dbUpdates.favorites_count = updates.favoritesCount;
    dbUpdates.updated_at = new Date().toISOString();

    const { data: updatedRows, error } = await supabase
      .from('properties')
      .update(dbUpdates)
      .eq('id', validId)
      .select('id, user_id');

    if (error) {
      console.warn('Supabase property update error:', error);
      return { success: false, error: `Erro do Supabase ao atualizar imóvel: ${error.message}` };
    }

    if (!updatedRows || updatedRows.length === 0) {
      return { 
        success: false, 
        error: 'O banco de dados não autorizou a alteração do imóvel (0 registros modificados). Verifique se o anúncio pertence à sua conta ou se a permissão RLS do Supabase permite a atualização.' 
      };
    }

    // Sync media if updated
    if (updates.media) {
      const { error: delErr } = await supabase.from('property_images').delete().eq('property_id', validId);
      if (delErr) {
        console.warn('Notice: Error deleting old property images from Supabase:', delErr.message);
      }
      if (updates.media.length > 0) {
        // Always generate new UUIDs to prevent any primary key collisions with previous rows
        const imageRows = updates.media.map(m => ({
          id: (typeof crypto !== 'undefined' && crypto.randomUUID) ? crypto.randomUUID() : ensureValidUuid(),
          property_id: validId,
          url: m.url,
          thumbnail_url: m.thumbnailUrl || m.url,
          media_type: m.mediaType || 'photo',
          category: m.category || null,
          caption: m.caption || null,
          is_cover: Boolean(m.isCover),
          display_order: m.order || 1,
          file_size_bytes: m.size || null,
          mime_type: m.mimeType || null
        }));

        const { error: insErr } = await supabase.from('property_images').insert(imageRows);
        if (insErr) {
          console.warn('Notice: Error inserting updated property images into Supabase:', insErr.message);
          return {
            success: false,
            error: `Erro ao salvar fotos atualizadas no Supabase: ${insErr.message}`
          };
        }
      }
    }

    // Sync amenities / features if updated
    if (updates.amenities) {
      await supabase.from('property_features').delete().eq('property_id', validId);
      if (updates.amenities.length > 0) {
        const featureRows = updates.amenities.map(featureId => ({
          property_id: validId,
          feature_id: featureId
        }));
        await supabase.from('property_features').insert(featureRows);
      }
    }

    // Sync location if any location field is updated
    const hasLocationUpdates = 
      updates.addressStreet !== undefined ||
      updates.addressNumber !== undefined ||
      updates.addressComplement !== undefined ||
      updates.neighborhood !== undefined ||
      updates.city !== undefined ||
      updates.state !== undefined ||
      updates.zipCode !== undefined ||
      updates.latitude !== undefined ||
      updates.longitude !== undefined;

    if (hasLocationUpdates) {
      const locUpdates: Record<string, any> = {};
      if (updates.addressStreet !== undefined) locUpdates.street = updates.addressStreet;
      if (updates.addressNumber !== undefined) locUpdates.street_number = updates.addressNumber || null;
      if (updates.addressComplement !== undefined) locUpdates.complement = updates.addressComplement || null;
      if (updates.neighborhood !== undefined) locUpdates.neighborhood = updates.neighborhood;
      if (updates.city !== undefined) locUpdates.city = updates.city;
      if (updates.state !== undefined) locUpdates.state = updates.state;
      if (updates.zipCode !== undefined) locUpdates.zip_code = updates.zipCode;

      const [rLat, rLng] = resolvePropertyCoordinates({
        city: updates.city,
        state: updates.state,
        neighborhood: updates.neighborhood,
        addressStreet: updates.addressStreet,
        latitude: updates.latitude,
        longitude: updates.longitude
      });
      locUpdates.latitude = rLat;
      locUpdates.longitude = rLng;

      const { data: existingLoc } = await supabase.from('property_locations').select('id').eq('property_id', validId).maybeSingle();
      if (existingLoc) {
        await supabase.from('property_locations').update(locUpdates).eq('property_id', validId);
      } else {
        await supabase.from('property_locations').insert({
          id: ensureValidUuid(),
          property_id: validId,
          street: updates.addressStreet || 'Não informado',
          street_number: updates.addressNumber || null,
          complement: updates.addressComplement || null,
          neighborhood: updates.neighborhood || 'Centro',
          city: updates.city || '',
          state: updates.state || '',
          zip_code: updates.zipCode || '00000-000',
          latitude: rLat,
          longitude: rLng
        });
      }
    }

    return { success: true };
  } catch (e: any) {
    console.error('Failed to update property in Supabase:', e);
    return { success: false, error: e?.message || 'Falha inesperada ao atualizar imóvel no banco de dados.' };
  }
}

export async function deletePropertyFromSupabase(id: string): Promise<boolean> {
  if (!supabase) return false;
  try {
    // Delete all dependent/related rows first
    await supabase.from('property_images').delete().eq('property_id', id);
    await supabase.from('property_locations').delete().eq('property_id', id);
    await supabase.from('property_features').delete().eq('property_id', id);
    await supabase.from('leads').delete().eq('property_id', id);
    await supabase.from('favorites').delete().eq('property_id', id);
    const { error } = await supabase.from('properties').delete().eq('id', id);
    if (error) {
      console.warn('Supabase property delete error:', error);
      return false;
    }
    return true;
  } catch (e) {
    console.error('Failed to delete property from Supabase:', e);
    return false;
  }
}

// ============================================================================
// REAL LEADS CRUD API
// ============================================================================

export async function fetchLeadsFromSupabase(): Promise<Lead[] | null> {
  if (!supabase) return null;
  try {
    const { data: dbLeads, error } = await supabase
      .from('leads')
      .select(`
        *,
        properties (id, title, code, price, property_images (url, is_cover))
      `)
      .order('created_at', { ascending: false });

    if (error) {
      console.warn('Supabase fetch leads error:', error);
      return null;
    }

    if (!dbLeads || dbLeads.length === 0) return [];

    return dbLeads.map((l: any) => {
      const prop = l.properties;
      const coverImage = prop?.property_images?.find((img: any) => img.is_cover)?.url || prop?.property_images?.[0]?.url;
      return {
        id: l.id,
        propertyId: l.property_id || '',
        propertyTitle: prop?.title || 'Imóvel sob consulta',
        propertyCode: prop?.code || 'GERAL',
        propertyPrice: prop?.price || 0,
        propertyImage: coverImage,
        advertiserId: l.advertiser_id,
        buyerName: l.buyer_name,
        buyerEmail: l.buyer_email,
        buyerPhone: l.buyer_phone,
        message: l.message || '',
        origin: l.origin,
        status: l.status,
        notes: l.notes || undefined,
        budget: l.budget || undefined,
        scheduledVisitDate: l.scheduled_visit_date || undefined,
        createdAt: l.created_at,
        updatedAt: l.updated_at
      };
    });
  } catch (err) {
    console.warn('Error fetching leads from Supabase:', err);
    return null;
  }
}

export async function insertLeadToSupabase(lead: Lead): Promise<{ success: boolean; error?: string }> {
  if (!supabase) {
    return { success: false, error: 'Supabase não está configurado.' };
  }
  try {
    const validId = ensureValidUuid(lead.id);
    const validPropId = lead.propertyId && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(lead.propertyId) ? lead.propertyId : null;
    
    // Resolve advertiser_id: must be a valid UUID existing in profiles
    let targetAdvId = lead.advertiserId && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(lead.advertiserId) ? lead.advertiserId : null;

    // If advertiserId is not valid UUID, check property's user_id
    if (!targetAdvId && validPropId) {
      const { data: propRow } = await supabase
        .from('properties')
        .select('user_id')
        .eq('id', validPropId)
        .maybeSingle();
      if (propRow?.user_id) {
        targetAdvId = propRow.user_id;
      }
    }

    // If still null, query first broker/profile in profiles table to satisfy NOT NULL constraint
    if (!targetAdvId) {
      const { data: fallbackProfile } = await supabase
        .from('profiles')
        .select('id')
        .limit(1)
        .maybeSingle();
      if (fallbackProfile?.id) {
        targetAdvId = fallbackProfile.id;
      }
    }

    if (!targetAdvId) {
      return { 
        success: false, 
        error: 'Não foi possível associar a mensagem ao corretor responsável. Verifique se o perfil existe no Supabase.' 
      };
    }

    const { error } = await supabase.from('leads').insert({
      id: validId,
      property_id: validPropId,
      advertiser_id: targetAdvId,
      buyer_name: lead.buyerName,
      buyer_email: lead.buyerEmail,
      buyer_phone: lead.buyerPhone,
      message: lead.message,
      origin: lead.origin || 'portal_form',
      status: lead.status || 'new',
      notes: lead.notes || null,
      budget: lead.budget || null,
      scheduled_visit_date: lead.scheduledVisitDate || null
    });

    if (error) {
      console.warn('Supabase lead insert notice:', error.message);
      return { success: false, error: `Erro no banco de dados ao salvar lead: ${error.message}` };
    }

    // Also initiate or record a conversation in conversations & messages table
    // so that it also appears in the broker's "Mensagens" inbox!
    try {
      const convId = ensureValidUuid();
      const msgId = ensureValidUuid();
      const cleanMsg = (lead.message && lead.message.trim()) || 'Olá! Tenho interesse neste anúncio e gostaria de agendar uma visita e obter mais informações.';
      
      const { error: convErr } = await supabase.from('conversations').insert({
        id: convId,
        property_id: validPropId,
        buyer_id: targetAdvId,
        advertiser_id: targetAdvId,
        last_message_text: `${lead.buyerName}: ${cleanMsg}`,
        last_message_at: new Date().toISOString(),
        buyer_unread_count: 0,
        advertiser_unread_count: 1
      });

      if (!convErr) {
        await supabase.from('messages').insert({
          id: msgId,
          conversation_id: convId,
          sender_id: targetAdvId,
          text: `[Lead do Portal - ${lead.buyerName}]\nNome: ${lead.buyerName}\nTelefone: ${lead.buyerPhone}\nE-mail: ${lead.buyerEmail}\n\nMensagem: ${cleanMsg}`,
          created_at: new Date().toISOString()
        });
      } else {
        console.warn('Notice: Error creating conversation for lead:', convErr.message);
      }
    } catch (chatSyncErr) {
      console.warn('Notice: Could not sync lead to chat conversations:', chatSyncErr);
    }

    return { success: true };
  } catch (e: any) {
    console.error('Error inserting lead to Supabase:', e);
    return { success: false, error: e?.message || 'Erro inesperado ao registrar contato no Supabase.' };
  }
}

export async function updateLeadInSupabase(id: string, updates: Partial<Lead>): Promise<boolean> {
  if (!supabase) return false;
  try {
    const dbUpdates: any = {};
    if (updates.status !== undefined) dbUpdates.status = updates.status;
    if (updates.notes !== undefined) dbUpdates.notes = updates.notes;
    if (updates.budget !== undefined) dbUpdates.budget = updates.budget;
    if (updates.scheduledVisitDate !== undefined) dbUpdates.scheduled_visit_date = updates.scheduledVisitDate;
    dbUpdates.updated_at = new Date().toISOString();

    const { error } = await supabase.from('leads').update(dbUpdates).eq('id', id);
    return !error;
  } catch (e) {
    console.error('Error updating lead in Supabase:', e);
    return false;
  }
}

export async function deleteLeadFromSupabase(id: string): Promise<boolean> {
  if (!supabase) return false;
  try {
    const { error } = await supabase.from('leads').delete().eq('id', id);
    return !error;
  } catch (e) {
    console.error('Error deleting lead from Supabase:', e);
    return false;
  }
}

// ============================================================================
// REAL CONVERSATIONS & CHAT MESSAGES CRUD API
// ============================================================================

export async function fetchConversationsFromSupabase(userId: string): Promise<Conversation[] | null> {
  if (!supabase) return null;
  try {
    const { data: dbConversations, error } = await supabase
      .from('conversations')
      .select(`
        *,
        properties (id, title, price, property_images (url, is_cover)),
        messages (*)
      `)
      .or(`buyer_id.eq.${userId},advertiser_id.eq.${userId}`)
      .order('last_message_at', { ascending: false });

    if (error) {
      console.warn('Notice: Error fetching conversations from Supabase:', error.message);
    }

    const conversationsList: Conversation[] = [];

    // Safely collect profiles of participants
    const profileIds = new Set<string>();
    (dbConversations || []).forEach((c: any) => {
      if (c.buyer_id) profileIds.add(c.buyer_id);
      if (c.advertiser_id) profileIds.add(c.advertiser_id);
    });

    const profilesMap: Record<string, any> = {};
    if (profileIds.size > 0) {
      try {
        const { data: profiles } = await supabase
          .from('profiles')
          .select('*')
          .in('id', Array.from(profileIds));
        (profiles || []).forEach((p: any) => {
          profilesMap[p.id] = p;
        });
      } catch (pErr) {
        console.warn('Notice loading conversation profiles:', pErr);
      }
    }

    if (dbConversations && dbConversations.length > 0) {
      for (const c of dbConversations) {
        const prop = c.properties;
        const isLeadPortalConv = c.buyer_id === c.advertiser_id;
        const isUserBuyer = isLeadPortalConv ? false : (c.buyer_id === userId);
        const otherProfile = isUserBuyer ? profilesMap[c.advertiser_id] : profilesMap[c.buyer_id];
        const coverImage = prop?.property_images?.find((img: any) => img.is_cover)?.url || prop?.property_images?.[0]?.url;

        // Parse Lead Information if this conversation was generated by a portal lead
        let leadName = 'Interessado (Lead)';
        let leadPhone = '';
        let leadEmail = '';

        if (isLeadPortalConv) {
          const rawText = c.messages?.[0]?.text || c.last_message_text || '';
          const nameMatch = rawText.match(/Nome:\s*([^\n]+)/) || rawText.match(/\[(?:Novo )?Lead(?: do Portal)?\s*-\s*([^\]\n]+)\]/);
          const phoneMatch = rawText.match(/Telefone:\s*([^\n]+)/);
          const emailMatch = rawText.match(/E-mail:\s*([^\n]+)/);

          if (nameMatch) leadName = nameMatch[1].trim();
          else if (c.last_message_text && c.last_message_text.includes(':')) {
            leadName = c.last_message_text.split(':')[0].trim();
          }
          if (phoneMatch) leadPhone = phoneMatch[1].trim();
          if (emailMatch) leadEmail = emailMatch[1].trim();
        }

        const msgs: Message[] = (c.messages || [])
          .sort((a: any, b: any) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
          .map((m: any) => {
            const isLeadOrigin = m.text?.startsWith('[Lead') || m.text?.startsWith('[Novo Lead');
            const isMine = isLeadOrigin ? false : (m.sender_id === userId && !isLeadPortalConv);

            return {
              id: m.id,
              conversationId: m.conversation_id,
              senderId: isLeadOrigin ? `lead-sender-${c.id}` : m.sender_id,
              senderName: isMine ? 'Você' : (isLeadOrigin ? leadName : (otherProfile?.name || 'Usuário')),
              senderAvatar: isMine 
                ? otherProfile?.avatar_url 
                : (isLeadOrigin 
                    ? `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(leadName)}&backgroundColor=e11d48&textColor=ffffff` 
                    : otherProfile?.avatar_url),
              text: m.text,
              createdAt: m.created_at,
              read: Boolean(m.read_at)
            };
          });

        const unreadCount = isUserBuyer 
          ? (c.buyer_unread_count || 0) 
          : (c.advertiser_unread_count ?? (msgs.some(m => !m.read && m.senderId !== userId) ? 1 : 0));

        conversationsList.push({
          id: c.id,
          propertyId: c.property_id || '',
          propertyTitle: prop?.title || 'Imóvel em Destaque',
          propertyImage: coverImage,
          propertyPrice: prop?.price || 0,
          otherUser: isLeadPortalConv ? {
            id: `lead-user-${c.id}`,
            name: `${leadName} (Lead Portal)`,
            email: leadEmail || 'interessado@portal.com.br',
            role: 'buyer',
            avatarUrl: `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(leadName)}&backgroundColor=e11d48&textColor=ffffff`,
            verified: true,
            phone: leadPhone
          } : {
            id: otherProfile?.id || (isUserBuyer ? c.advertiser_id : c.buyer_id),
            name: otherProfile?.name || (isUserBuyer ? 'Corretor do Imóvel' : 'Comprador Interessado'),
            email: otherProfile?.email || 'contato@imovelhub.com.br',
            role: otherProfile?.role || (isUserBuyer ? 'broker' : 'buyer'),
            avatarUrl: otherProfile?.avatar_url,
            verified: otherProfile?.verified ?? true
          },
          lastMessage: c.last_message_text || 'Conversa iniciada',
          lastMessageTime: new Date(c.last_message_at).toLocaleDateString('pt-BR'),
          unreadCount,
          messages: msgs
        });
      }
    }

    return conversationsList;
  } catch (err) {
    console.warn('Error fetching conversations from Supabase:', err);
    return null;
  }
}

export async function markConversationAsReadInSupabase(conversationId: string, userId: string): Promise<boolean> {
  if (!supabase) return false;
  try {
    const validConvId = ensureValidUuid(conversationId);
    
    // Update unread count for advertiser and buyer
    await supabase.from('conversations').update({
      advertiser_unread_count: 0,
      buyer_unread_count: 0,
      updated_at: new Date().toISOString()
    }).eq('id', validConvId);

    // Mark messages in this conversation as read
    await supabase.from('messages')
      .update({ read_at: new Date().toISOString() })
      .eq('conversation_id', validConvId)
      .is('read_at', null);

    return true;
  } catch (e) {
    console.warn('Error marking conversation as read in Supabase:', e);
    return false;
  }
}

export async function insertConversationToSupabase(conversation: {
  id: string;
  propertyId?: string;
  buyerId: string;
  advertiserId: string;
  lastMessageText?: string;
}): Promise<boolean> {
  if (!supabase) return false;
  try {
    const { error } = await supabase.from('conversations').insert({
      id: ensureValidUuid(conversation.id),
      property_id: conversation.propertyId || null,
      buyer_id: conversation.buyerId,
      advertiser_id: conversation.advertiserId,
      last_message_text: conversation.lastMessageText || 'Conversa iniciada',
      last_message_at: new Date().toISOString()
    });
    return !error;
  } catch (e) {
    console.error('Error inserting conversation to Supabase:', e);
    return false;
  }
}

export async function insertMessageToSupabase(message: Message, conversationId: string): Promise<boolean> {
  if (!supabase) return false;
  try {
    const { error: msgErr } = await supabase.from('messages').insert({
      id: ensureValidUuid(message.id),
      conversation_id: ensureValidUuid(conversationId),
      sender_id: message.senderId,
      text: message.text,
      read_at: message.read ? new Date().toISOString() : null
    });

    if (msgErr) return false;

    // Update conversation last message timestamp
    await supabase.from('conversations').update({
      last_message_text: message.text,
      last_message_at: message.createdAt,
      updated_at: new Date().toISOString()
    }).eq('id', ensureValidUuid(conversationId));

    return true;
  } catch (e) {
    console.error('Error inserting message to Supabase:', e);
    return false;
  }
}

export async function deleteConversationFromSupabase(id: string): Promise<boolean> {
  if (!supabase) return false;
  try {
    const validId = ensureValidUuid(id);
    // Delete child messages first to guarantee FK constraint integrity
    await supabase.from('messages').delete().eq('conversation_id', validId);
    const { error } = await supabase.from('conversations').delete().eq('id', validId);
    return !error;
  } catch (err) {
    console.warn('Error deleting conversation from Supabase:', err);
    return false;
  }
}

// ============================================================================
// REAL FAVORITES & SAVED SEARCHES CRUD API
// ============================================================================

export async function fetchFavoritesFromSupabase(userId: string): Promise<string[] | null> {
  if (!supabase) return null;
  try {
    const { data, error } = await supabase
      .from('favorites')
      .select('property_id')
      .eq('user_id', userId);

    if (error) return null;
    return data ? data.map((f: any) => f.property_id) : [];
  } catch {
    return null;
  }
}

export async function toggleFavoriteInSupabase(userId: string, propertyId: string, isFavNow: boolean): Promise<boolean> {
  if (!supabase) return false;
  try {
    if (isFavNow) {
      await supabase.from('favorites').insert({
        user_id: userId,
        property_id: propertyId
      });
    } else {
      await supabase.from('favorites').delete()
        .eq('user_id', userId)
        .eq('property_id', propertyId);
    }
    return true;
  } catch {
    return false;
  }
}

export async function fetchSavedSearchesFromSupabase(userId: string): Promise<SavedSearch[] | null> {
  if (!supabase) return null;
  try {
    const { data, error } = await supabase
      .from('saved_searches')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error || !data) return null;

    return data.map((s: any) => ({
      id: s.id,
      userId: s.user_id,
      title: s.title,
      filters: s.filters || {},
      alertFrequency: s.alert_frequency || 'daily',
      matchCount: s.match_count,
      createdAt: s.created_at
    }));
  } catch {
    return null;
  }
}

export async function insertSavedSearchToSupabase(search: SavedSearch): Promise<boolean> {
  if (!supabase) return false;
  try {
    const { error } = await supabase.from('saved_searches').insert({
      id: search.id,
      user_id: search.userId,
      title: search.title,
      filters: search.filters,
      alert_frequency: search.alertFrequency,
      match_count: search.matchCount
    });
    return !error;
  } catch {
    return false;
  }
}

export async function deleteSavedSearchFromSupabase(id: string): Promise<boolean> {
  if (!supabase) return false;
  try {
    const { error } = await supabase.from('saved_searches').delete().eq('id', id);
    return !error;
  } catch {
    return false;
  }
}

export async function updateSavedSearchAlertInSupabase(id: string, alertFrequency: string): Promise<boolean> {
  if (!supabase) return false;
  try {
    const { error } = await supabase.from('saved_searches').update({
      alert_frequency: alertFrequency
    }).eq('id', id);
    return !error;
  } catch {
    return false;
  }
}

// ============================================================================
// REAL ACCOUNT DELETION API (TOTAL PURGE FROM DATABASE)
// ============================================================================

export async function deleteUserAccountFromSupabase(userId: string, email: string): Promise<boolean> {
  if (!supabase) return true;
  try {
    // Attempt complete purge via Supabase RPC function (which removes from auth.users and all tables)
    try {
      const { error: rpcError } = await supabase.rpc('delete_user_account');
      if (!rpcError) {
        return true;
      }
      console.warn('RPC delete_user_account notice (falling back to direct deletes):', rpcError.message);
    } catch (rpcErr) {
      console.warn('RPC delete_user_account exception:', rpcErr);
    }

    // 1. If the user owns properties, clean their dependent rows first
    const { data: userProps } = await supabase.from('properties').select('id').eq('user_id', userId);
    if (userProps && userProps.length > 0) {
      const propIds = userProps.map((p: any) => p.id);
      await supabase.from('property_images').delete().in('property_id', propIds);
      await supabase.from('property_locations').delete().in('property_id', propIds);
      await supabase.from('property_features').delete().in('property_id', propIds);
      await supabase.from('leads').delete().in('property_id', propIds);
      await supabase.from('favorites').delete().in('property_id', propIds);
      await supabase.from('properties').delete().in('id', propIds);
    }

    // 2. Delete user's leads (received as advertiser or sent as buyer)
    await supabase.from('leads').delete().eq('advertiser_id', userId);
    await supabase.from('leads').delete().eq('buyer_email', email);

    // 3. Delete user's chat messages and conversations
    const { data: userConvs } = await supabase
      .from('conversations')
      .select('id')
      .or(`buyer_id.eq.${userId},advertiser_id.eq.${userId}`);
    
    if (userConvs && userConvs.length > 0) {
      const convIds = userConvs.map((c: any) => c.id);
      await supabase.from('messages').delete().in('conversation_id', convIds);
      await supabase.from('conversations').delete().in('id', convIds);
    }
    await supabase.from('messages').delete().eq('sender_id', userId);

    // 4. Delete favorites and saved searches
    await supabase.from('favorites').delete().eq('user_id', userId);
    await supabase.from('saved_searches').delete().eq('user_id', userId);

    // 5. Delete audit logs referencing user
    try {
      await supabase.from('audit_logs').delete().eq('user_id', userId);
    } catch {
      // non-blocking
    }

    // 6. Delete profile row thoroughly by id and email
    try {
      const cleanEmail = (email || '').trim().toLowerCase();
      await supabase.from('profiles').delete().eq('id', userId);
      if (cleanEmail) {
        await supabase.from('profiles').delete().eq('email', cleanEmail);
      }
    } catch (profileErr) {
      console.warn('Profile delete notice:', profileErr);
    }

    return true;
  } catch (err) {
    console.error('Error deleting account from Supabase:', err);
    return false;
  }
}

