import { supabase } from './supabaseClient';

export type AdminPortalFilter = 'all'|'published'|'unpublished'|'approved'|'pending'|'with_properties'|'without_properties';

export interface AdminPortalSummary {
  portalsTotal:number; portalsPublished:number; creciApproved:number;
  propertiesTotal:number; propertiesActive:number; addressesInUse:number;
}

export interface AdminPortalItem {
  profileId:string; name:string; email:string; avatarUrl?:string; creci?:string; creciUf?:string;
  creciStatus:string; isActive:boolean; portalTitle:string; portalSubtitle:string; slug:string; url:string;
  isPublished:boolean; createdAt:string; updatedAt:string; propertiesTotal:number; propertiesActive:number;
  propertiesSale:number; propertiesRent:number; propertiesSeasonal:number; propertiesLaunch:number;
  propertiesPaused:number; propertiesDraft:number; propertiesPending:number; propertiesClosed:number; propertiesArchived:number;
}

const numberValue=(value:unknown)=>Number(value||0);

export async function listAdminPortals(search='',filter:AdminPortalFilter='all',limit=25,offset=0):Promise<{summary:AdminPortalSummary;items:AdminPortalItem[];total:number}> {
  if(!supabase) throw new Error('Serviço temporariamente indisponível.');
  const {data,error}=await (supabase as any).rpc('get_admin_portal_overview',{p_search:search,p_filter:filter,p_limit:limit,p_offset:offset});
  if(error)throw error;
  const summary=data?.summary||{};
  return {
      total:numberValue(data?.total),
      summary:{portalsTotal:numberValue(summary.portals_total),portalsPublished:numberValue(summary.portals_published),creciApproved:numberValue(summary.creci_approved),propertiesTotal:numberValue(summary.properties_total),propertiesActive:numberValue(summary.properties_active),addressesInUse:numberValue(summary.addresses_in_use)},
    items:(data?.items||[]).map((row:any)=>({
        profileId:String(row.profile_id),name:String(row.name||''),email:String(row.email||''),avatarUrl:row.avatar_url||undefined,
        creci:row.creci||undefined,creciUf:row.creci_uf||undefined,creciStatus:String(row.creci_status||''),isActive:row.is_active===true,
        portalTitle:String(row.portal_title||''),portalSubtitle:String(row.portal_subtitle||''),slug:String(row.slug||''),url:String(row.url||''),isPublished:row.is_published===true,
        createdAt:String(row.created_at||''),updatedAt:String(row.updated_at||''),propertiesTotal:numberValue(row.properties_total),propertiesActive:numberValue(row.properties_active),
        propertiesSale:numberValue(row.properties_sale),propertiesRent:numberValue(row.properties_rent),propertiesSeasonal:numberValue(row.properties_seasonal),propertiesLaunch:numberValue(row.properties_launch),
        propertiesPaused:numberValue(row.properties_paused),propertiesDraft:numberValue(row.properties_draft),propertiesPending:numberValue(row.properties_pending),propertiesClosed:numberValue(row.properties_closed),propertiesArchived:numberValue(row.properties_archived)
    }))
  };
}
