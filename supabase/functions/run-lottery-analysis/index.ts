import { createClient } from "npm:@supabase/supabase-js@2.116.0";
const json=(body:unknown,status=200)=>new Response(JSON.stringify(body),{status,headers:{"Content-Type":"application/json"}});
Deno.serve(async(request)=>{
 if(request.method!=="POST")return json({ok:false,error:"METHOD_NOT_ALLOWED"},405);
 const admin=createClient(Deno.env.get("SUPABASE_URL")??"",Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")??"",{auth:{persistSession:false}});
 const token=(request.headers.get("Authorization")??"").replace(/^Bearer\s+/i,"");const {data:auth}=await admin.auth.getUser(token);if(!auth.user)return json({ok:false,error:"AUTH_REQUIRED"},401);
 const role=await admin.from("user_roles").select("role").eq("user_id",auth.user.id).eq("role","admin").maybeSingle();if(!role.data)return json({ok:false,error:"ADMIN_REQUIRED"},403);
 const target=await admin.from("lottery_draws").select("id,draw_date").eq("status","scheduled").order("draw_date").limit(1).maybeSingle();
 const history=await admin.from("lottery_draws").select("draw_date,lottery_prizes(prize_type,winning_number)").eq("status","verified").order("draw_date",{ascending:false}).limit(24);
 const model=await admin.from("analysis_model_versions").select("id").eq("status","active").eq("model_key","frequency_recency_gap_ensemble").single();
 if(!target.data||!model.data||!history.data||history.data.length<6)return json({ok:false,error:"INSUFFICIENT_DATA",sample_size:history.data?.length??0},422);
 const pairs=history.data.flatMap((d)=>{const p=d.lottery_prizes as {prize_type:string;winning_number:string}[];const first=p.find((x)=>x.prize_type==="first")?.winning_number;const bottom=p.find((x)=>x.prize_type==="last_two")?.winning_number;return first&&bottom?[first.slice(-2),bottom]:[];});
 const scores=Array.from({length:100},(_,i)=>String(i).padStart(2,"0")).map((value)=>{const frequency=pairs.filter((x)=>x===value).length;const gap=pairs.indexOf(value)<0?pairs.length:pairs.indexOf(value);const position=pairs.reduce((sum,p)=>sum+Number(p[0]===value[0])+Number(p[1]===value[1]),0);return{value,score:frequency/pairs.length*.5+position/(pairs.length*2)*.3+(frequency?1/(gap+1):0)*.2};}).sort((a,b)=>b.score-a.score||a.value.localeCompare(b.value)).slice(0,12);
 const checksum=history.data[0].draw_date+":"+history.data.at(-1)?.draw_date+":"+history.data.length;
 const run=await admin.from("analysis_runs").upsert({model_version_id:model.data.id,target_draw_id:target.data.id,training_start:history.data.at(-1)?.draw_date,training_end:history.data[0].draw_date,input_checksum:checksum,status:"completed",started_at:new Date().toISOString(),completed_at:new Date().toISOString()},{onConflict:"model_version_id,target_draw_id,input_checksum"}).select("id").single();
 if(run.error)return json({ok:false,error:"RUN_FAILED"},500);await admin.from("analysis_predictions").delete().eq("run_id",run.data.id);
 const rows=scores.map((x,i)=>({run_id:run.data.id,number_kind:"last_two",number_value:x.value,score:x.score,rank:i+1,explanation:{method:"frequency_recency_gap"}}));const saved=await admin.from("analysis_predictions").insert(rows);
 return saved.error?json({ok:false,error:"WRITE_FAILED"},500):json({ok:true,run_id:run.data.id,predictions:rows.length});
});
