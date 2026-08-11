const API_URL =
  "https://script.google.com/macros/s/AKfycbwl0_8C5OC4KfrpMrkUXZCq9IsgxwnUgCBu1vZiL4GOgoU9sEDfb2w2VTYKv3fU7NQO/exec";


function apiRequest(action, params){

  params = params || {};


  return new Promise(function(resolve,reject){

    const callbackName =
      "assetCallback_" +
      Date.now() +
      "_" +
      Math.floor(Math.random()*100000);


    const query =
      new URLSearchParams();


    query.set(
      "action",
      action
    );


    query.set(
      "callback",
      callbackName
    );


    Object.keys(params)
      .forEach(function(key){

        let value =
          params[key];

        if(
          value === undefined ||
          value === null
        ){
          value = "";
        }

        query.set(
          key,
          String(value)
        );

      });


    const tag =
      document.createElement(
        "script"
      );


    let timeout;


    function cleanup(){

      clearTimeout(timeout);

      try{
        delete window[callbackName];
      }
      catch(e){}

      if(tag.parentNode){
        tag.parentNode.removeChild(tag);
      }

    }


    window[callbackName] =
      function(data){

        cleanup();

        resolve(data);

      };


    tag.onerror =
      function(){

        cleanup();

        reject(
          new Error(
            "เชื่อมต่อ Apps Script ไม่สำเร็จ"
          )
        );

      };


    timeout =
      setTimeout(function(){

        cleanup();

        reject(
          new Error(
            "Apps Script ตอบกลับช้าเกินไป"
          )
        );

      },20000);


    tag.src =
      API_URL +
      "?" +
      query.toString();


    document.body.appendChild(tag);

  });

}


/* PING */

function testAPI(){

  return apiRequest(
    "ping"
  );

}


/* ASSET */

function apiScanAsset(assetTag){

  return apiRequest(
    "scanAsset",
    {
      assetTag:assetTag
    }
  );

}


function apiSearchAssets(keyword){

  return apiRequest(
    "searchAssets",
    {
      keyword:keyword
    }
  );

}


function apiGetMasterData(){

  return apiRequest(
    "getMasterData"
  );

}


function apiDashboard(){

  return apiRequest(
    "dashboard"
  );

}


/* NEW ASSET */

function apiNewAsset(data){

  data = data || {};

  return apiRequest(
    "newAsset",
    data
  );

}


/* TRANSACTION */

function apiAssetTransaction(data){

  data = data || {};

  return apiRequest(
    "assetTransaction",
    {

      txnType:
        data.action || "",

      assetTag:
        data.assetTag || "",

      user:
        data.user || "",

      department:
        data.department || "",

      location:
        data.location || "",

      condition:
        data.condition || "",

      remark:
        data.remark || "",

      returnToStatus:
        data.returnToStatus || "",

      operator:
        data.operator || ""

    }
  );

}


/* AUDIT */

function apiStartAudit(data){

  return apiRequest(
    "startAudit",
    data || {}
  );

}


function apiAuditScan(data){

  return apiRequest(
    "auditScan",
    data || {}
  );

}


function apiAuditSummary(sessionId){

  return apiRequest(
    "auditSummary",
    {
      sessionId:sessionId
    }
  );

}


function apiFinishAudit(data){

  return apiRequest(
    "finishAudit",
    data || {}
  );

}
