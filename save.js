/* ==========================================
   ASSET WAREHOUSE API
   GitHub Pages -> Google Apps Script
========================================== */


/*
  เอา URL /exec ของ Apps Script
  มาใส่ตรงนี้
*/

const API_URL =
  "https://script.google.com/macros/s/AKfycbwl0_8C5OC4KfrpMrkUXZCq9IsgxwnUgCBu1vZiL4GOgoU9sEDfb2w2VTYKv3fU7NQO/exec";



/* ==========================================
   JSONP REQUEST
========================================== */

function apiRequest(
  action,
  params
) {

  return new Promise(
    function(resolve, reject) {

      params =
        params || {};


      const callbackName =
        "assetApi_" +
        Date.now() +
        "_" +
        Math.floor(
          Math.random() * 100000
        );


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


      Object.keys(
        params
      ).forEach(
        function(key) {

          let value =
            params[key];


          if (
            value === undefined ||
            value === null
          ) {

            value = "";

          }


          query.set(
            key,
            String(value)
          );

        }
      );


      const script =
        document.createElement(
          "script"
        );


      let timer;


      function cleanup() {

        clearTimeout(
          timer
        );


        try {

          delete window[
            callbackName
          ];

        }
        catch(e) {}


        if (
          script.parentNode
        ) {

          script.parentNode
            .removeChild(
              script
            );

        }

      }



      window[
        callbackName
      ] =
        function(data) {

          cleanup();

          resolve(
            data
          );

        };


      script.onerror =
        function() {

          cleanup();


          reject(
            new Error(
              "เชื่อมต่อ Apps Script ไม่สำเร็จ"
            )
          );

        };


      timer =
        setTimeout(
          function() {

            cleanup();


            reject(
              new Error(
                "Apps Script ตอบกลับช้าเกินไป"
              )
            );

          },

          15000
        );


      script.src =
        API_URL +
        "?" +
        query.toString();


      document.body
        .appendChild(
          script
        );

    }
  );

}



/* ==========================================
   CONNECTION TEST
========================================== */

async function testAPI() {

  return await apiRequest(
    "ping"
  );

}



/* ==========================================
   ASSET SCAN
========================================== */

async function apiScanAsset(
  assetTag
) {

  return await apiRequest(
    "scanAsset",
    {
      assetTag:
        assetTag
    }
  );

}



/* ==========================================
   SEARCH
========================================== */

async function apiSearchAssets(
  keyword
) {

  return await apiRequest(
    "searchAssets",
    {
      keyword:
        keyword
    }
  );

}



/* ==========================================
   MASTER DATA
========================================== */

async function apiGetMasterData() {

  return await apiRequest(
    "getMasterData"
  );

}



/* ==========================================
   DASHBOARD
========================================== */

async function apiDashboard() {

  return await apiRequest(
    "dashboard"
  );

}



/* ==========================================
   NEW ASSET
========================================== */

async function apiNewAsset(
  data
) {

  data =
    data || {};


  return await apiRequest(
    "newAsset",
    {

      assetTag:
        data.assetTag || "",

      assetType:
        data.assetType || "",

      itemName:
        data.itemName || "",

      brand:
        data.brand || "",

      model:
        data.model || "",

      serialNo:
        data.serialNo || "",

      department:
        data.department || "",

      user:
        data.user || "",

      location:
        data.location || "",

      condition:
        data.condition || "",

      receiveDate:
        data.receiveDate || "",

      warrantyEnd:
        data.warrantyEnd || "",

      vendor:
        data.vendor || "",

      remark:
        data.remark || "",

      operator:
        data.operator || ""

    }
  );

}



/* ==========================================
   ASSET TRANSACTION
========================================== */

async function apiAssetTransaction(
  data
) {

  data =
    data || {};


  return await apiRequest(
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



/* ==========================================
   AUDIT START
========================================== */

async function apiStartAudit(
  data
) {

  data =
    data || {};


  return await apiRequest(
    "startAudit",
    {

      auditName:
        data.auditName || "",

      location:
        data.location || "",

      operator:
        data.operator || ""

    }
  );

}



/* ==========================================
   AUDIT SCAN
========================================== */

async function apiAuditScan(
  data
) {

  data =
    data || {};


  return await apiRequest(
    "auditScan",
    {

      sessionId:
        data.sessionId || "",

      assetTag:
        data.assetTag || "",

      operator:
        data.operator || "",

      remark:
        data.remark || ""

    }
  );

}



/* ==========================================
   AUDIT SUMMARY
========================================== */

async function apiAuditSummary(
  sessionId
) {

  return await apiRequest(
    "auditSummary",
    {
      sessionId:
        sessionId
    }
  );

}



/* ==========================================
   FINISH AUDIT
========================================== */

async function apiFinishAudit(
  data
) {

  data =
    data || {};


  return await apiRequest(
    "finishAudit",
    {

      sessionId:
        data.sessionId || "",

      operator:
        data.operator || ""

    }
  );

}
