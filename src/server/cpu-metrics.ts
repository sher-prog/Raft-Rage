import {readFileSync} from 'node:fs';
/** Optional Linux host evidence. Unsupported platforms return null, never fail a room. */
export function readCpuCgroup(paths:{cgroup_stat_paths:string[];cgroup_max_paths:string[]},read:(path:string)=>string=path=>readFileSync(path,'utf8')):Record<string,number|null>{
 const first=(files:string[])=>{for(const path of files)try{return read(path);}catch{}return '';};
 const rows=Object.fromEntries(first(paths.cgroup_stat_paths).trim().split('\n').map(row=>row.trim().split(/\s+/))),limit=first(paths.cgroup_max_paths).trim().split(/\s+/);
 const number=(value:unknown)=>{const n=Number(value);return value!==undefined&&value!==''&&Number.isFinite(n)?n:null;};
 const v2=number(rows.throttled_usec),v1=number(rows.throttled_time);
 return {cgroupPeriods:number(rows.nr_periods),cgroupThrottledPeriods:number(rows.nr_throttled),cgroupThrottledUs:v2??(v1===null?null:v1/1000),cgroupUsageUs:number(rows.usage_usec),cgroupQuotaUs:number(limit[0]),cgroupPeriodUs:number(limit[1])};
}
