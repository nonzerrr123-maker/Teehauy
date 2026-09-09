import { createClient } from "npm:@supabase/supabase-js@2.116.0";
const json=(body:unknown,status=200)=>new Response(JSON.stringify(body),{status,headers:{"Content-Type":"application/json"}});
Deno.serve(async(request)=>{
 if(request.method!=="POST")return json({ok:false,error:"METHOD_NOT_ALLOWED"},405);
 const admin=createClient(Deno.env.get("SUPABASE_URL")??"",Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")??"",{auth:{persistSession:false}});
 const token=(request.headers.get("Authorization")??"").replace(/^Bearer\s+/i,"");
 const {data:auth}=await admin.auth.getUser(token);if(!auth.user)return json({ok:false,error:"AUTH_REQUIRED"},401);
 const role=await admin.from("user_roles").select("role").eq("user_id",auth.user.id).eq("role","admin").maybeSingle();if(!role.data)return json({ok:false,error:"ADMIN_REQUIRED"},403);
 const payload=await request.json();const prizes=Array.isArray(payload.prizes)?payload.prizes:[];if(!/^\d{4}-\d{2}-\d{2}$/.test(payload.draw_date)||prizes.length!==173)return json({ok:false,error:"INVALID_OFFICIAL_PAYLOAD"},422);
 const raw=JSON.stringify(payload);const digest=await crypto.subtle.digest("SHA-256",new TextEncoder().encode(raw));const checksum=Array.from(new Uint8Array(digest)).map((b)=>b.toString(16).padStart(2,"0")).join("");
 const result=await admin.rpc("ingest_official_lottery_draw",{p_draw_date:payload.draw_date,p_source_url:payload.source_url??"https://www.glo.or.th/",p_source_checksum:checksum,p_raw_payload:payload,p_prizes:prizes,p_actor:auth.user.id});
 return result.error?json({ok:false,error:"IMPORT_FAILED",message:result.error.message},422):json({ok:true,draw_id:result.data,checksum});
});
