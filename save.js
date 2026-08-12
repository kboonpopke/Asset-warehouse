const API_URL =
  "https://script.google.com/macros/s/AKfycbwl0_8C5OC4KfrpMrkUXZCq9IsgxwnUgCBu1vZiL4GOgoU9sEDfb2w2VTYKv3fU7NQO/exec";
function apiRequest(action, params){
  params = params || {};
  return new Promise(function(resolve,reject){
    const callbackName = "assetApi_" + Date.now() + "_" + Math.floor(Math.random()*100000);
    const query = new URLSearchParams();
    query.set("action",action);
    query.set("callback",callbackName);

    Object.keys(params).forEach(function(key){
      let val = params[key];
      if(val === undefined || val === null) val = "";
      query.set(key,String(val));
    });

    const script = document.createElement("script");
    let timer;

    function cleanup(){
      clearTimeout(timer);
      try{ delete window[callbackName]; }catch(e){}
      if(script.parentNode) script.parentNode.removeChild(script);
    }

    window[callbackName] = function(data){
      cleanup();
      resolve(data);
    };

    script.onerror = function(){
      cleanup();
      reject(new Error("เชื่อมต่อ Apps Script ไม่สำเร็จ"));
    };

    timer = setTimeout(function(){
      cleanup();
      reject(new Error("Server ตอบกลับช้าเกินไป"));
    },20000);

    script.src = API_URL + "?" + query.toString();
    document.body.appendChild(script);
  });
}

function apiGetMasterData(){ return apiRequest("getMasterData"); }
function apiScanAsset(assetTag){ return apiRequest("scanAsset",{assetTag:assetTag}); }
function apiSearchAssets(keyword){ return apiRequest("searchAssets",{keyword:keyword}); }
function apiDashboard(){ return apiRequest("dashboard"); }
function apiNewAsset(data){ return apiRequest("newAsset",data||{}); }

function apiAssetTransaction(data){
  data = data || {};
  return apiRequest("assetTransaction",{
    txnType:data.action||"",
    assetTag:data.assetTag||"",
    user:data.user||"",
    department:data.department||"",
    location:data.location||"",
    condition:data.condition||"",
    remark:data.remark||"",
    returnToStatus:data.returnToStatus||"",
    operator:data.operator||""
  });
}

function apiStartAudit(data){ return apiRequest("startAudit",data||{}); }
function apiAuditScan(data){ return apiRequest("auditScan",data||{}); }
function apiAuditSummary(sessionId){ return apiRequest("auditSummary",{sessionId:sessionId}); }
function apiFinishAudit(data){ return apiRequest("finishAudit",data||{}); }

function apiUploadAssetPhoto(file, assetTag){
  return new Promise(async function(resolve,reject){
    try{
      const base64 = await compressPhoto(file);
      const frameName = "assetUpload_" + Date.now();

      const iframe = document.createElement("iframe");
      iframe.name = frameName;
      iframe.style.display = "none";
      document.body.appendChild(iframe);

      const form = document.createElement("form");
      form.method = "POST";
      form.action = API_URL;
      form.target = frameName;
      form.style.display = "none";

      const fields = {
        action:"uploadAssetPhoto",
        assetTag:assetTag,
        imageBase64:base64
      };

      Object.keys(fields).forEach(function(key){
        const input = document.createElement("input");
        input.type = "hidden";
        input.name = key;
        input.value = fields[key];
        form.appendChild(input);
      });

      document.body.appendChild(form);
      let timer;

      function cleanup(){
        clearTimeout(timer);
        window.removeEventListener("message",receiveMessage);
        try{form.remove();}catch(e){}
        try{iframe.remove();}catch(e){}
      }

      function receiveMessage(event){
        const data = event.data;
        if(!data || data.type !== "assetPhotoUpload") return;
        cleanup();
        if(data.ok) resolve(data.url);
        else reject(new Error(data.error || "อัปโหลดรูปไม่สำเร็จ"));
      }

      window.addEventListener("message",receiveMessage);

      timer = setTimeout(function(){
        cleanup();
        reject(new Error("Upload รูปช้าเกินไป"));
      },30000);

      form.submit();
    }catch(error){
      reject(error);
    }
  });
}

function compressPhoto(file){
  return new Promise(function(resolve,reject){
    const reader = new FileReader();

    reader.onload = function(event){
      const img = new Image();

      img.onload = function(){
        let width = img.width;
        let height = img.height;
        const MAX = 1280;

        if(width > MAX || height > MAX){
          const scale = Math.min(MAX/width,MAX/height);
          width = Math.round(width*scale);
          height = Math.round(height*scale);
        }

        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext("2d");
        ctx.drawImage(img,0,0,width,height);

        resolve(canvas.toDataURL("image/jpeg",0.75));
      };

      img.onerror = reject;
      img.src = event.target.result;
    };

    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}
