import React, { useEffect, useMemo, useState } from 'react';
import { getSpMunicipalities } from '../../lib/partnershipLocations';
import { getAllKnownSpNeighborhoods, normalizeNeighborhood, searchSimilarNeighborhoods } from '../../lib/neighborhoodCatalog';

interface Props {
 value:string; city:string; state:string;
 onChange:(text:string)=>void;
 onCommit:(text:string)=>void;
 onAddressChanged:()=>void;
}
export const NeighborhoodAutocomplete:React.FC<Props>=({
 value,city,state,onChange,onCommit,onAddressChanged,
})=>{
 const [options,setOptions]=useState<string[]>([]);
 const [open,setOpen]=useState(false);
 useEffect(()=>{
   let alive=true;
   setOptions([]);
   if(state.toUpperCase()!=='SP'||!city.trim())return;
   void getSpMunicipalities().then(cities=>{
     const record=cities.find(c=>normalizeNeighborhood(c.name)===normalizeNeighborhood(city));
     return record?getAllKnownSpNeighborhoods(record.id):[];
   }).then(items=>{if(alive)setOptions(items);}).catch(()=>{if(alive)setOptions([]);});
   return()=>{alive=false;};
 },[city,state]);
 const suggestions=useMemo(()=>searchSimilarNeighborhoods(options,value,8),[options,value]);
 return <div className="relative">
   <input
     type="text" required maxLength={120}
     value={value}
     onChange={e=>{onChange(e.target.value);onAddressChanged();setOpen(true);}}
     onFocus={()=>setOpen(true)}
     onBlur={()=>{setOpen(false);if(value.trim())onCommit(value.trim());}}
     placeholder="Bairro preenchido pelo CEP ou digite para pesquisar"
     autoComplete="off"
     className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm font-semibold text-slate-900 dark:text-white"
   />
   {open&&value.trim().length>=2&&suggestions.length>0&&
     <div role="listbox" aria-label="Bairros semelhantes" className="absolute z-50 mt-1 max-h-52 w-full overflow-y-auto rounded-xl border border-slate-200 bg-white p-1 shadow-xl dark:border-slate-700 dark:bg-slate-900">
       {suggestions.map(item=><button key={item} type="button" role="option"
         aria-selected={normalizeNeighborhood(item)===normalizeNeighborhood(value)}
         onMouseDown={e=>e.preventDefault()}
         onClick={()=>{onChange(item);onAddressChanged();onCommit(item);setOpen(false);}}
         className="block w-full rounded-lg px-3 py-2 text-left text-xs hover:bg-rose-50 dark:hover:bg-slate-800"
       >{item}{normalizeNeighborhood(item)!==normalizeNeighborhood(value)&&
         <span className="ml-2 text-[10px] text-slate-500">nome semelhante</span>}</button>)}
     </div>}
   {value&&options.length>0&&!options.some(item=>normalizeNeighborhood(item)===normalizeNeighborhood(value))&&
     <p className="mt-1 text-[10px] text-slate-500">Se o nome estiver correto, mantenha-o: será registrado para futuras pesquisas.</p>}
 </div>;
};
