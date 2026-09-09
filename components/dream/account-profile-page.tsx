"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ProfilePage } from "@/components/dream/profile-page";
import { createClient } from "@/lib/supabase/client";
type Profile={display_name:string;account_kind:"guest"|"google"};
export function AccountProfilePage({userId,historyCount,favoriteCount}:{userId:string;historyCount:number;favoriteCount:number}){
 const router=useRouter();const[profile,setProfile]=useState<Profile|null>(null);const[open,setOpen]=useState(false);const[message,setMessage]=useState<string|null>(null);
 useEffect(()=>{let active=true;void createClient().from("profiles").select("display_name,account_kind").eq("id",userId).single().then(({data})=>{if(active&&data)setProfile(data as Profile);});return()=>{active=false;};},[userId]);
 const connect=async()=>{const r=await createClient().auth.linkIdentity({provider:"google",options:{redirectTo:window.location.origin+"/auth/callback"}});if(r.error)setMessage(r.error.message);};
 const logout=async()=>{await createClient().auth.signOut();router.replace("/login");router.refresh();};
 return <div className="relative h-full"><ProfilePage historyCount={historyCount} favoriteCount={favoriteCount}/><button type="button" onClick={()=>setOpen(true)} className="absolute right-5 top-8 z-30 rounded-xl border border-[#c9a84c55] bg-[#13131fee] px-3 py-2 text-[11px] text-[#e1c96f]">{profile?.account_kind==="google"?"Google ✓":"Guest"}</button>{open?<div className="absolute inset-0 z-50 flex items-end bg-[#06060ccc]" onClick={()=>setOpen(false)}><div className="w-full rounded-t-[28px] bg-[#0d0d18] p-5" onClick={(e)=>e.stopPropagation()}><h2 className="text-xl font-bold text-[#f0c040]">{profile?.display_name??"กำลังโหลด..."}</h2><p className="mt-1 text-xs text-[#626b7c]">User ID · {userId.slice(0,8)}</p>{profile?.account_kind==="guest"?<div className="mt-4 rounded-2xl border border-[#80d0c033] p-3 text-xs text-[#91cfc2]">Guest เก็บข้อมูลเหมือน Google ทุกอย่าง<button type="button" onClick={()=>void connect()} className="mt-3 w-full rounded-xl bg-white py-2 text-black">เชื่อม Google โดยคงข้อมูลเดิม</button></div>:null}{message?<p className="mt-3 text-xs text-[#ff9d88]">{message}</p>:null}<button type="button" onClick={()=>void logout()} className="mt-5 w-full rounded-xl border border-[#ff806044] py-3 text-[#ff987f]">ออกจากระบบ</button></div></div>:null}</div>;
}
