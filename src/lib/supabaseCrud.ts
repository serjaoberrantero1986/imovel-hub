import { supabase } from './supabaseClient';
import { Property, Lead, Conversation, Message, SavedSearch, PropertyMedia, UserProfile } from '../types';

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
    .sort((a, b) => (a.display_order ?? 0) - (b.display_order ?? 0))
    .map(img => ({
      id: img.id,
      url: img.url,
      thumbnailUrl: img.thumbnail_url || img.url,
      mediaType: img.media_type || 'image',
      caption: img.caption || undefined,
      category: img.category || undefined,
      isCover: img.is_cover || false,
      order: img.display_order || 1,
      size: img.file_size_bytes || undefined,
      mimeType: img.mime_type || undefined
    }));

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
    price: dbProp.price,
    pricePerMeter: dbProp.useful_area > 0 ? Math.round(dbProp.price / dbProp.useful_area) : undefined,
    condoFee: dbProp.condo_fee,
    iptuFee: dbProp.iptu_fee,
    totalArea: dbProp.total_area,
    usefulArea: dbProp.useful_area,
    bedrooms: dbProp.bedrooms,
    suites: dbProp.suites,
    bathrooms: dbProp.bathrooms,
    parkingSpots: dbProp.parking_spots,
    floor: dbProp.floor || undefined,
    totalFloors: dbProp.total_floors || undefined,
    solarOrientation: dbProp.solar_orientation ? (dbProp.solar_orientation === 'morning' ? 'Manhã' : 'Tarde') : undefined,
    constructionYear: dbProp.construction_year || undefined,
    deliveryDate: dbProp.delivery_date || undefined,

    // Location
    addressStreet: location?.street || 'Endereço Principal',
    addressNumber: location?.street_number || '',
    addressComplement: location?.complement || '',
    neighborhood: location?.neighborhood || 'Bairro Nobre',
    city: location?.city || 'Sorocaba',
    state: location?.state || 'SP',
    zipCode: location?.zip_code || '18000-000',
    latitude: location?.latitude || -23.5015,
    longitude: location?.longitude || -47.4526,

    amenities: features,
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
        property_features (feature_id),
        profiles:user_id (*)
      `)
      .order('created_at', { ascending: false });

    if (error) {
      console.warn('Supabase fetch properties error:', error);
      return null;
    }

    if (!dbProperties || dbProperties.length === 0) {
      return [];
    }

    return dbProperties.map((p: any) => {
      const location = Array.isArray(p.property_locations) ? p.property_locations[0] : p.property_locations;
      const images = p.property_images || [];
      const features = (p.property_features || []).map((f: any) => f.feature_id);
      const profile = p.profiles;
      return mapDbPropertyToApp(p, location, images, features, profile);
    });
  } catch (err) {
    console.warn('Network error reading from Supabase properties:', err);
    return null;
  }
}

export async function insertPropertyToSupabase(property: Property): Promise<boolean> {
  if (!supabase) return false;
  try {
    // 1. Insert Property Row
    const { error: propError } = await supabase.from('properties').insert({
      id: property.id,
      code: property.code,
      user_id: property.userId,
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
      views_count: property.viewsCount,
      leads_count: property.leadsCount,
      favorites_count: property.favoritesCount,
      shares_count: property.sharesCount
    });

    if (propError) {
      console.error('Supabase property insert error:', propError);
      return false;
    }

    // 2. Insert Location
    await supabase.from('property_locations').insert({
      property_id: property.id,
      street: property.addressStreet,
      street_number: property.addressNumber || null,
      complement: property.addressComplement || null,
      neighborhood: property.neighborhood,
      city: property.city,
      state: property.state,
      zip_code: property.zipCode,
      latitude: property.latitude,
      longitude: property.longitude
    });

    // 3. Insert Images
    if (property.media && property.media.length > 0) {
      const imageRows = property.media.map(m => ({
        id: m.id,
        property_id: property.id,
        url: m.url,
        thumbnail_url: m.thumbnailUrl || m.url,
        media_type: m.mediaType,
        category: m.category || null,
        caption: m.caption || null,
        is_cover: m.isCover,
        display_order: m.order,
        file_size_bytes: m.size || null,
        mime_type: m.mimeType || null
      }));
      await supabase.from('property_images').insert(imageRows);
    }

    // 4. Insert Features
    if (property.amenities && property.amenities.length > 0) {
      const featureRows = property.amenities.map(featId => ({
        property_id: property.id,
        feature_id: featId
      }));
      await supabase.from('property_features').insert(featureRows);
    }

    return true;
  } catch (e) {
    console.error('Failed to sync new property to Supabase:', e);
    return false;
  }
}

export async function updatePropertyInSupabase(id: string, updates: Partial<Property>): Promise<boolean> {
  if (!supabase) return false;
  try {
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

    const { error } = await supabase.from('properties').update(dbUpdates).eq('id', id);
    if (error) {
      console.warn('Supabase property update error:', error);
      return false;
    }

    // Sync media if updated
    if (updates.media) {
      await supabase.from('property_images').delete().eq('property_id', id);
      if (updates.media.length > 0) {
        const imageRows = updates.media.map(m => ({
          id: m.id,
          property_id: id,
          url: m.url,
          thumbnail_url: m.thumbnailUrl || m.url,
          media_type: m.mediaType,
          category: m.category || null,
          caption: m.caption || null,
          is_cover: m.isCover,
          display_order: m.order,
          file_size_bytes: m.size || null,
          mime_type: m.mimeType || null
        }));
        await supabase.from('property_images').insert(imageRows);
      }
    }

    return true;
  } catch (e) {
    console.error('Failed to update property in Supabase:', e);
    return false;
  }
}

export async function deletePropertyFromSupabase(id: string): Promise<boolean> {
  if (!supabase) return false;
  try {
    await supabase.from('property_images').delete().eq('property_id', id);
    await supabase.from('property_locations').delete().eq('property_id', id);
    await supabase.from('property_features').delete().eq('property_id', id);
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

export async function insertLeadToSupabase(lead: Lead): Promise<boolean> {
  if (!supabase) return false;
  try {
    const { error } = await supabase.from('leads').insert({
      id: lead.id,
      property_id: lead.propertyId || null,
      advertiser_id: lead.advertiserId,
      buyer_name: lead.buyerName,
      buyer_email: lead.buyerEmail,
      buyer_phone: lead.buyerPhone,
      message: lead.message,
      origin: lead.origin,
      status: lead.status,
      notes: lead.notes || null,
      budget: lead.budget || null,
      scheduled_visit_date: lead.scheduledVisitDate || null
    });
    return !error;
  } catch (e) {
    console.error('Error inserting lead to Supabase:', e);
    return false;
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
        messages (*),
        buyerProfile:profiles!conversations_buyer_id_fkey (*),
        advertiserProfile:profiles!conversations_advertiser_id_fkey (*)
      `)
      .or(`buyer_id.eq.${userId},advertiser_id.eq.${userId}`)
      .order('last_message_at', { ascending: false });

    if (error) {
      console.warn('Supabase fetch conversations error:', error);
      return null;
    }

    if (!dbConversations || dbConversations.length === 0) return [];

    return dbConversations.map((c: any) => {
      const prop = c.properties;
      const isUserBuyer = c.buyer_id === userId;
      const otherProfile = isUserBuyer ? c.advertiserProfile : c.buyerProfile;
      const coverImage = prop?.property_images?.find((img: any) => img.is_cover)?.url || prop?.property_images?.[0]?.url;

      const msgs: Message[] = (c.messages || [])
        .sort((a: any, b: any) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
        .map((m: any) => ({
          id: m.id,
          conversationId: m.conversation_id,
          senderId: m.sender_id,
          senderName: m.sender_id === userId ? 'Você' : (otherProfile?.name || 'Usuário'),
          senderAvatar: otherProfile?.avatar_url,
          text: m.text,
          createdAt: m.created_at,
          read: Boolean(m.read_at)
        }));

      return {
        id: c.id,
        propertyId: c.property_id || '',
        propertyTitle: prop?.title || 'Imóvel em Destaque',
        propertyImage: coverImage,
        propertyPrice: prop?.price || 0,
        otherUser: {
          id: otherProfile?.id || (isUserBuyer ? c.advertiser_id : c.buyer_id),
          name: otherProfile?.name || (isUserBuyer ? 'Corretor do Imóvel' : 'Comprador Interessado'),
          email: otherProfile?.email || 'contato@imovelhub.com.br',
          role: otherProfile?.role || (isUserBuyer ? 'broker' : 'buyer'),
          avatarUrl: otherProfile?.avatar_url,
          verified: otherProfile?.verified ?? true
        },
        lastMessage: c.last_message_text || 'Conversa iniciada',
        lastMessageTime: new Date(c.last_message_at).toLocaleDateString('pt-BR'),
        unreadCount: isUserBuyer ? c.buyer_unread_count : c.advertiser_unread_count,
        messages: msgs
      };
    });
  } catch (err) {
    console.warn('Error fetching conversations from Supabase:', err);
    return null;
  }
}

export async function insertMessageToSupabase(message: Message, conversationId: string): Promise<boolean> {
  if (!supabase) return false;
  try {
    const { error: msgErr } = await supabase.from('messages').insert({
      id: message.id,
      conversation_id: conversationId,
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
    }).eq('id', conversationId);

    return true;
  } catch (e) {
    console.error('Error inserting message to Supabase:', e);
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
