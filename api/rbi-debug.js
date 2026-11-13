module.exports=async function handler(req,res){
 res.setHeader("Cache-Control","no-store");
 if(req.method!=="GET")return res.status(405).end();
 const urls=["https://www.rbi.org.in/?id=10395","https://www.rbi.org.in/home.aspx/webservice/home.aspx/scripts/Scripts/BS_PressReleaseDisplay.aspx","https://www.rbi.org.in/"];
 const results=[];
 for(const url of urls){
  try{
   const r=await fetch(url,{headers:{"User-Agent":"Mozilla/5.0 FundLens research prototype","Accept":"text/html"},signal:AbortSignal.timeout(9000)});
   const html=await r.text();
   const plain=html.replace(/<script[\s\S]*?<\/script>/gi," ").replace(/<style[\s\S]*?<\/style>/gi," ").replace(/<[^>]+>/g," ").replace(/&nbsp;/gi," ").replace(/&amp;/gi,"&").replace(/\s+/g," ");
   const markers=[...plain.matchAll(/Government Securities Market/gi)].map(m=>m.index);
   const snippets=markers.map(pos=>{
    const block=plain.slice(pos,pos+1100);
    return {snippet:block.slice(0,600),rows:[...block.matchAll(/6\.94\s*%?\s*GS\s*2036[\s|:]*([0-9]+\.[0-9]{2,4})/gi)].map(m=>m[1]),dates:[...block.matchAll(/#\s*as on\s+([A-Za-z]+\s+\d{1,2},\s+\d{4})/gi)].map(m=>m[1])};
   });
   results.push({url,status:r.status,bytes:html.length,markers:snippets});
  }catch(e){results.push({url,error:e.message})}
 }
 return res.status(200).json({results});
};