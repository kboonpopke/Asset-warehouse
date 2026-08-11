let scanner = null;

let scanLock = false;

let scannerMode = "LOOKUP";

let currentAsset = null;

let masterData = {
  locations:[],
  users:[],
  status:[]
};

let auditSession = null;



/* ==========================================
   INIT
========================================== */

document.addEventListener(
  "DOMContentLoaded",
  function(){

    const op =
      localStorage.getItem(
        "asset_operator"
      ) || "";


    document
      .getElementById(
        "operator"
      )
      .value = op;


    const input =
      document.getElementById(
        "assetTag"
      );


    input.addEventListener(
      "keydown",
      function(e){

        if(e.key === "Enter"){

          e.preventDefault();

          manualScan();

        }

      }
    );


    loadMasterData();

  }
);



async function loadMasterData(){

  try{

    const res =
      await apiGetMasterData();


    if(
      res &&
      res.ok &&
      res.data
    ){

      masterData =
        res.data;

    }

  }
  catch(e){

    console.log(e);

  }

}



/* ==========================================
   OPERATOR
========================================== */

function saveOperator(){

  localStorage.setItem(
    "asset_operator",
    value("operator").trim()
  );

}


function getOperator(){

  const name =
    value(
      "operator"
    ).trim();


  if(!name){

    throw new Error(
      "กรุณากรอกชื่อผู้ทำรายการ"
    );

  }


  saveOperator();

  return name;

}



/* ==========================================
   CAMERA
========================================== */

function openScanner(mode){

  if(mode){
    scannerMode = mode;
  }


  if(scanner){
    return;
  }


  if(
    typeof Html5Qrcode ===
    "undefined"
  ){

    toast(
      "โหลดระบบ QR ไม่สำเร็จ"
    );

    return;

  }


  const card =
    document.getElementById(
      "scannerCard"
    );


  card.classList.remove(
    "hidden"
  );


  document
    .getElementById(
      "scannerTitle"
    )
    .textContent =
      scannerTitle(scannerMode);


  scanLock = false;


  scanner =
    new Html5Qrcode(
      "reader"
    );


  const config = {

    fps:10,

    qrbox:function(
      width,
      height
    ){

      let size =
        Math.min(
          width,
          height
        ) * .7;


      size =
        Math.floor(size);


      if(size > 280){
        size = 280;
      }


      return {
        width:size,
        height:size
      };

    }

  };


  scanner
    .start(

      {
        facingMode:
          "environment"
      },

      config,

      async function(decodedText){

        if(scanLock){
          return;
        }


        scanLock = true;


        const tag =
          cleanQRValue(
            decodedText
          );


        document
          .getElementById(
            "assetTag"
          )
          .value = tag;


        try{

          navigator.vibrate &&
          navigator.vibrate(80);

        }
        catch(e){}


        await closeScanner();


        processAssetTag(
          tag
        );

      },

      function(){}

    )

    .catch(function(e){

      console.log(e);

      scanner = null;

      scanLock = false;

      card.classList.add(
        "hidden"
      );

      toast(
        "เปิดกล้องไม่ได้"
      );

    });

}



function scannerTitle(mode){

  switch(mode){

    case "ISSUE":
      return "📤 สแกน Asset ที่ต้องการเบิก";

    case "RETURN":
      return "📥 สแกน Asset ที่ต้องการคืน";

    case "MOVE":
      return "🔄 สแกน Asset ที่ต้องการย้าย";

    case "REPAIR_OUT":
      return "🔧 สแกน Asset ที่จะส่งซ่อม";

    case "AUDIT":
      return "📋 สแกน Asset สำหรับตรวจนับ";

    default:
      return "📷 สแกน Asset QR";

  }

}



async function closeScanner(){

  if(!scanner){

    document
      .getElementById(
        "scannerCard"
      )
      .classList.add(
        "hidden"
      );

    return;

  }


  const old =
    scanner;


  scanner = null;


  try{
    await old.stop();
  }
  catch(e){}


  try{
    old.clear();
  }
  catch(e){}


  scanLock = false;


  document
    .getElementById(
      "scannerCard"
    )
    .classList.add(
      "hidden"
    );

}



/* ==========================================
   MANUAL SCAN
========================================== */

function manualScan(){

  const tag =
    cleanQRValue(
      value("assetTag")
    );


  if(!tag){

    toast(
      "กรุณาระบุ Asset Tag"
    );

    return;

  }


  processAssetTag(
    tag
  );

}



/* ==========================================
   PROCESS TAG
========================================== */

async function processAssetTag(tag){

  if(
    scannerMode === "AUDIT" &&
    auditSession
  ){

    await processAuditScan(
      tag
    );

    return;

  }


  await findAsset(
    tag
  );

}



/* ==========================================
   FIND ASSET
========================================== */

async function findAsset(tag){

  showLoading(
    "กำลังค้นหา " + tag
  );


  try{

    const res =
      await apiScanAsset(
        tag
      );


    if(
      !res ||
      res.error
    ){

      showError(
        res
        ? res.error
        : "ไม่ได้รับข้อมูลจาก Server"
      );

      return;

    }


    if(
      !res.exists
    ){

      currentAsset = null;

      showNotFound(
        tag
      );

      return;

    }


    currentAsset =
      res.asset;


    renderAsset(
      res.asset,
      res.history || []
    );


    const mode =
      scannerMode;


    scannerMode =
      "LOOKUP";


    if(
      mode !== "LOOKUP"
    ){

      setTimeout(
        function(){

          showTransaction(
            mode
          );

        },
        250
      );

    }

  }
  catch(e){

    showError(
      e.message ||
      String(e)
    );

  }

}



/* ==========================================
   RENDER ASSET
========================================== */

function renderAsset(
  asset,
  history
){

  const statusClass =
    statusClassName(
      asset.Status
    );


  let historyHtml = "";


  history.forEach(
    function(h){

      historyHtml +=

        '<div class="history-item">' +

          '<b>' +
            esc(
              h.Type || ""
            ) +
          '</b>' +

          ' · ' +

          esc(
            h.Timestamp || ""
          ) +

          '<br>' +

          esc(
            h[
              "From Location"
            ] || ""
          ) +

          ' → ' +

          esc(
            h[
              "To Location"
            ] || ""
          ) +

          (
            h[
              "To User"
            ]

            ? " · " +
              esc(
                h[
                  "To User"
                ]
              )

            : ""
          ) +

        '</div>';

    }
  );


  setContent(

    '<div class="asset-header">' +

      '<div>' +

        '<div class="asset-tag">' +
          esc(
            asset[
              "Asset Tag"
            ]
          ) +
        '</div>' +

        '<div class="asset-name">' +
          esc(
            asset[
              "Item Name"
            ] ||
            asset[
              "Asset Type"
            ]
          ) +
        '</div>' +

      '</div>' +

      '<span class="badge ' +
        statusClass +
      '">' +

        esc(
          asset.Status
        ) +

      '</span>' +

    '</div>' +


    '<div class="asset-grid">' +

      info(
        "Asset Type",
        asset[
          "Asset Type"
        ]
      ) +

      info(
        "Brand",
        asset.Brand
      ) +

      info(
        "Model",
        asset.Model
      ) +

      info(
        "Serial No.",
        asset[
          "Serial No."
        ]
      ) +

      info(
        "User",
        asset.User
      ) +

      info(
        "Department",
        asset.Department
      ) +

      info(
        "Location",
        asset.Location
      ) +

      info(
        "Condition",
        asset.Condition
      ) +

    '</div>' +


    '<div class="asset-actions">' +

      '<button class="blue" onclick="showTransaction(\'ISSUE\')">' +
        '📤 เบิก' +
      '</button>' +

      '<button class="green" onclick="showTransaction(\'RETURN\')">' +
        '📥 คืน' +
      '</button>' +

      '<button onclick="showTransaction(\'MOVE\')">' +
        '🔄 ย้าย' +
      '</button>' +

      '<button class="orange" onclick="showTransaction(\'REPAIR_OUT\')">' +
        '🔧 ส่งซ่อม' +
      '</button>' +

      '<button onclick="showTransaction(\'REPAIR_IN\')">' +
        '✅ รับกลับซ่อม' +
      '</button>' +

      '<button class="red" onclick="showTransaction(\'DAMAGED\')">' +
        '⚠ ชำรุด' +
      '</button>' +

      '<button class="red" onclick="showTransaction(\'LOST\')">' +
        '❌ สูญหาย' +
      '</button>' +

      '<button onclick="openScanner(\'LOOKUP\')">' +
        '📷 สแกนต่อ' +
      '</button>' +

    '</div>' +


    '<div class="history">' +

      '<b>📜 ประวัติล่าสุด</b>' +

      (
        historyHtml ||
        '<div class="history-item">ยังไม่มีประวัติ</div>'
      ) +

    '</div>'

  );

}



/* ==========================================
   TRANSACTION
========================================== */

function showTransaction(action){

  if(!currentAsset){

    toast(
      "กรุณาสแกน Asset ก่อน"
    );

    return;

  }


  let extra = "";


  if(action === "ISSUE"){

    extra =

      field(
        "ผู้ใช้งาน / ผู้เบิก",
        '<input id="txnUser">'
      ) +

      field(
        "Department",
        '<input id="txnDepartment">'
      ) +

      field(
        "Location",
        '<select id="txnLocation">' +
        locationOptions(
          currentAsset.Location
        ) +
        '</select>'
      );

  }


  if(
    action === "RETURN" ||
    action === "MOVE" ||
    action === "REPAIR_OUT" ||
    action === "REPAIR_IN"
  ){

    let loc =
      currentAsset.Location;


    if(
      action ===
      "REPAIR_OUT"
    ){

      loc =
        "Repair Area";

    }


    extra =

      field(
        "Location ปลายทาง",
        '<select id="txnLocation">' +
        locationOptions(loc) +
        '</select>'
      );

  }


  openModal(

    '<h2>' +
      actionName(action) +
    '</h2>' +

    '<div class="asset-tag">' +
      esc(
        currentAsset[
          "Asset Tag"
        ]
      ) +
    '</div>' +

    '<div class="asset-name">' +
      esc(
        currentAsset[
          "Item Name"
        ] ||
        currentAsset[
          "Asset Type"
        ]
      ) +
    '</div>' +

    '<br>' +

    '<div class="form-grid">' +

      extra +

      field(
        "Condition",
        '<input id="txnCondition" value="' +
        esc(
          currentAsset.Condition ||
          ""
        ) +
        '">'
      ) +

      '<div class="full">' +

        '<label>หมายเหตุ</label>' +

        '<textarea id="txnRemark"></textarea>' +

      '</div>' +

      '<div class="full">' +

        '<button class="btn-primary" style="width:100%" onclick="submitTransaction(\'' +
        action +
        '\')">' +

          'ยืนยันรายการ' +

        '</button>' +

      '</div>' +

    '</div>'

  );

}



async function submitTransaction(
  action
){

  try{

    const operator =
      getOperator();


    showModalLoading();


    const res =
      await apiAssetTransaction({

        action:
          action,

        assetTag:
          currentAsset[
            "Asset Tag"
          ],

        user:
          value(
            "txnUser"
          ),

        department:
          value(
            "txnDepartment"
          ),

        location:
          value(
            "txnLocation"
          ),

        condition:
          value(
            "txnCondition"
          ),

        remark:
          value(
            "txnRemark"
          ),

        operator:
          operator

      });


    if(
      !res ||
      res.error
    ){

      throw new Error(
        res
        ? res.error
        : "บันทึกไม่สำเร็จ"
      );

    }


    closeModal();


    currentAsset =
      res.asset;


    renderAsset(
      res.asset,
      res.history || []
    );


    toast(
      "บันทึกเรียบร้อย ✅"
    );

  }
  catch(e){

    closeModal();

    toast(
      e.message ||
      String(e)
    );

  }

}



/* ==========================================
   NEW ASSET
========================================== */

function showNewAsset(
  tag
){

  tag = tag || "";


  openModal(

    '<h2>➕ รับ Asset ใหม่</h2>' +

    '<div class="form-grid">' +

      field(
        "Asset Tag",
        '<input id="newTag" value="' +
        esc(tag) +
        '">'
      ) +

      field(
        "Asset Type",
        '<input id="newType" placeholder="PC / Monitor / PDA">'
      ) +

      field(
        "Item Name",
        '<input id="newName">'
      ) +

      field(
        "Brand",
        '<input id="newBrand">'
      ) +

      field(
        "Model",
        '<input id="newModel">'
      ) +

      field(
        "Serial No.",
        '<input id="newSerial">'
      ) +

      field(
        "Location",
        '<select id="newLocation">' +
        locationOptions(
          "IT Stock"
        ) +
        '</select>'
      ) +

      field(
        "Condition",
        '<input id="newCondition" value="Normal">'
      ) +

      field(
        "Receive Date",
        '<input id="newReceive" type="date">'
      ) +

      field(
        "Warranty End",
        '<input id="newWarranty" type="date">'
      ) +

      field(
        "Vendor",
        '<input id="newVendor">'
      ) +

      '<div class="full">' +

        '<label>Remark</label>' +

        '<textarea id="newRemark"></textarea>' +

      '</div>' +

      '<div class="full">' +

        '<button class="btn-primary" style="width:100%" onclick="submitNewAsset()">' +

          'บันทึกรับเข้า' +

        '</button>' +

      '</div>' +

    '</div>'

  );

}



async function submitNewAsset(){

  try{

    const operator =
      getOperator();


    showModalLoading();


    const res =
      await apiNewAsset({

        assetTag:
          value(
            "newTag"
          ),

        assetType:
          value(
            "newType"
          ),

        itemName:
          value(
            "newName"
          ),

        brand:
          value(
            "newBrand"
          ),

        model:
          value(
            "newModel"
          ),

        serialNo:
          value(
            "newSerial"
          ),

        location:
          value(
            "newLocation"
          ),

        condition:
          value(
            "newCondition"
          ),

        receiveDate:
          value(
            "newReceive"
          ),

        warrantyEnd:
          value(
            "newWarranty"
          ),

        vendor:
          value(
            "newVendor"
          ),

        remark:
          value(
            "newRemark"
          ),

        operator:
          operator

      });


    if(
      !res ||
      res.error
    ){

      throw new Error(
        res
        ? res.error
        : "บันทึกไม่สำเร็จ"
      );

    }


    closeModal();


    currentAsset =
      res.asset;


    renderAsset(
      res.asset,
      res.history || []
    );


    toast(
      "รับ Asset เข้าระบบแล้ว ✅"
    );

  }
  catch(e){

    closeModal();

    toast(
      e.message ||
      String(e)
    );

  }

}



/* ==========================================
   SEARCH
========================================== */

function showSearch(){

  openModal(

    '<h2>🔎 ค้นหา Asset</h2>' +

    '<div class="scan-input-row">' +

      '<input id="searchText" placeholder="Asset Tag / Serial / User / Location">' +

      '<button class="btn-primary" onclick="runSearch()">' +
        'ค้นหา' +
      '</button>' +

    '</div>' +

    '<div id="searchResults" class="table-wrap" style="margin-top:15px"></div>'

  );

}



async function runSearch(){

  const keyword =
    value(
      "searchText"
    );


  const box =
    document.getElementById(
      "searchResults"
    );


  box.innerHTML =
    "กำลังค้นหา...";


  try{

    const res =
      await apiSearchAssets(
        keyword
      );


    const list =
      res.assets || [];


    let rows = "";


    list.forEach(
      function(a){

        rows +=

          '<tr class="clickable" onclick="selectSearchAsset(\'' +
          escJs(
            a[
              "Asset Tag"
            ]
          ) +
          '\')">' +

            '<td><b>' +
              esc(
                a[
                  "Asset Tag"
                ]
              ) +
            '</b></td>' +

            '<td>' +
              esc(
                a[
                  "Item Name"
                ] || ""
              ) +
            '</td>' +

            '<td>' +
              esc(
                a.User || ""
              ) +
            '</td>' +

            '<td>' +
              esc(
                a.Location || ""
              ) +
            '</td>' +

          '</tr>';

      }
    );


    box.innerHTML =

      '<table>' +

        '<thead>' +

          '<tr>' +
            '<th>Asset</th>' +
            '<th>Item</th>' +
            '<th>User</th>' +
            '<th>Location</th>' +
          '</tr>' +

        '</thead>' +

        '<tbody>' +
          rows +
        '</tbody>' +

      '</table>';

  }
  catch(e){

    box.innerHTML =
      esc(
        e.message ||
        String(e)
      );

  }

}



function selectSearchAsset(
  tag
){

  closeModal();

  document
    .getElementById(
      "assetTag"
    )
    .value = tag;


  scannerMode =
    "LOOKUP";


  processAssetTag(
    tag
  );

}



/* ==========================================
   DASHBOARD
========================================== */

async function showDashboard(){

  closeScanner();


  showLoading(
    "กำลังโหลด Dashboard..."
  );


  try{

    const res =
      await apiDashboard();


    if(
      !res ||
      res.error
    ){

      throw new Error(
        res
        ? res.error
        : "โหลด Dashboard ไม่สำเร็จ"
      );

    }


    const d =
      res.data;


    const c =
      d.counts;


    let locRows = "";


    Object.keys(
      d.byLocation || {}
    ).forEach(
      function(loc){

        locRows +=

          '<tr>' +

            '<td>' +
              esc(loc) +
            '</td>' +

            '<td><b>' +
              d.byLocation[loc] +
            '</b></td>' +

          '</tr>';

      }
    );


    setContent(

      '<h2>📊 Dashboard</h2>' +

      '<div class="kpi-grid">' +

        kpi(
          "Asset ทั้งหมด",
          c.total
        ) +

        kpi(
          "Available",
          c.available
        ) +

        kpi(
          "In Use",
          c.inUse
        ) +

        kpi(
          "Repair",
          c.repair
        ) +

        kpi(
          "Damaged",
          c.damaged
        ) +

        kpi(
          "Lost",
          c.lost
        ) +

        kpi(
          "Retired",
          c.retired
        ) +

      '</div>' +

      '<h3>ตาม Location</h3>' +

      '<div class="table-wrap">' +

        '<table>' +

          '<tbody>' +
            locRows +
          '</tbody>' +

        '</table>' +

      '</div>'

    );

  }
  catch(e){

    showError(
      e.message ||
      String(e)
    );

  }

}



/* ==========================================
   AUDIT
========================================== */

function showAuditStart(){

  openModal(

    '<h2>📋 เริ่มตรวจนับ</h2>' +

    '<div class="form-grid">' +

      field(
        "ชื่อรอบตรวจนับ",
        '<input id="auditName" placeholder="Audit August 2026">'
      ) +

      field(
        "Location",
        '<select id="auditLocation">' +
        locationOptions("") +
        '</select>'
      ) +

      '<div class="full">' +

        '<button class="btn-primary" style="width:100%" onclick="startAudit()">' +

          'เริ่มตรวจนับ' +

        '</button>' +

      '</div>' +

    '</div>'

  );

}



async function startAudit(){

  try{

    const operator =
      getOperator();


    const res =
      await apiStartAudit({

        auditName:
          value(
            "auditName"
          ),

        location:
          value(
            "auditLocation"
          ),

        operator:
          operator

      });


    if(
      !res ||
      res.error
    ){

      throw new Error(
        res
        ? res.error
        : "เริ่ม Audit ไม่สำเร็จ"
      );

    }


    auditSession =
      res;


    closeModal();


    scannerMode =
      "AUDIT";


    setContent(

      '<div class="audit-box">' +

        '<b>กำลังตรวจนับ: ' +
          esc(
            res.location
          ) +
        '</b>' +

        '<br>' +

        'ควรมี ' +
        res.expectedCount +
        ' รายการ' +

      '</div>' +

      '<div class="empty">' +

        '<div class="empty-icon">▦</div>' +

        '<b>พร้อมตรวจนับ</b>' +

        '<span>เปิดกล้องแล้วสแกน QR ต่อเนื่อง</span>' +

        '<br><br>' +

        '<button class="btn-primary" onclick="openScanner(\'AUDIT\')">' +

          '📷 เริ่มสแกน' +

        '</button>' +

      '</div>'

    );

  }
  catch(e){

    toast(
      e.message ||
      String(e)
    );

  }

}



async function processAuditScan(
  tag
){

  try{

    const res =
      await apiAuditScan({

        sessionId:
          auditSession.sessionId,

        assetTag:
          tag,

        operator:
          getOperator()

      });


    if(res.duplicate){

      toast(
        "สแกนซ้ำ: " +
        tag
      );


      openScanner(
        "AUDIT"
      );

      return;

    }


    let css =
      "good";


    let text =
      "✓ พบถูก Location";


    if(
      res.result ===
      "WRONG_LOCATION"
    ){

      css =
        "warn";

      text =
        "⚠ พบ แต่ Location ไม่ตรง";

    }


    if(
      res.result ===
      "UNKNOWN"
    ){

      css =
        "bad";

      text =
        "✕ ไม่มีใน Master";

    }


    setContent(

      '<div class="audit-box">' +

        '<b>กำลังตรวจนับ: ' +
          esc(
            auditSession.location
          ) +
        '</b>' +

      '</div>' +

      '<div class="audit-result ' +
        css +
      '">' +

        text +

      '</div>' +

      '<div class="asset-tag">' +
        esc(tag) +
      '</div>' +

      (
        res.asset

        ? '<div class="asset-name">' +
            esc(
              res.asset[
                "Item Name"
              ] ||
              res.asset[
                "Asset Type"
              ]
            ) +
          '</div>'

        : ""
      ) +

      '<div class="asset-actions">' +

        '<button class="blue" onclick="openScanner(\'AUDIT\')">' +
          '📷 สแกนต่อ' +
        '</button>' +

        '<button onclick="showAuditSummary()">' +
          '📊 ดูสรุป' +
        '</button>' +

        '<button class="red" onclick="finishAudit()">' +
          'ปิดรอบ' +
        '</button>' +

      '</div>'

    );

  }
  catch(e){

    toast(
      e.message ||
      String(e)
    );

  }

}



async function showAuditSummary(){

  if(!auditSession){
    return;
  }


  try{

    const res =
      await apiAuditSummary(
        auditSession.sessionId
      );


    const t =
      res.totals;


    let missingRows = "";


    (
      res.missingAssets ||
      []
    ).forEach(
      function(a){

        missingRows +=

          '<tr>' +

            '<td>' +
              esc(
                a[
                  "Asset Tag"
                ]
              ) +
            '</td>' +

            '<td>' +
              esc(
                a[
                  "Item Name"
                ] || ""
              ) +
            '</td>' +

          '</tr>';

      }
    );


    setContent(

      '<h2>📋 Audit Summary</h2>' +

      '<div class="kpi-grid">' +

        kpi(
          "ควรมี",
          t.expected
        ) +

        kpi(
          "พบถูกที่",
          t.found
        ) +

        kpi(
          "ผิด Location",
          t.wrongLocation
        ) +

        kpi(
          "ไม่พบ",
          t.missing
        ) +

      '</div>' +

      '<h3>Missing Asset</h3>' +

      '<div class="table-wrap">' +

        '<table>' +

          '<thead>' +
            '<tr>' +
              '<th>Asset Tag</th>' +
              '<th>Item</th>' +
            '</tr>' +
          '</thead>' +

          '<tbody>' +
            missingRows +
          '</tbody>' +

        '</table>' +

      '</div>' +

      '<div class="asset-actions">' +

        '<button class="blue" onclick="openScanner(\'AUDIT\')">' +
          '📷 สแกนต่อ' +
        '</button>' +

        '<button class="red" onclick="finishAudit()">' +
          'ปิดรอบตรวจนับ' +
        '</button>' +

      '</div>'

    );

  }
  catch(e){

    toast(
      e.message ||
      String(e)
    );

  }

}



async function finishAudit(){

  if(!auditSession){
    return;
  }


  try{

    await apiFinishAudit({

      sessionId:
        auditSession.sessionId,

      operator:
        getOperator()

    });


    auditSession =
      null;


    scannerMode =
      "LOOKUP";


    toast(
      "ปิดรอบตรวจนับแล้ว ✅"
    );


    showDashboard();

  }
  catch(e){

    toast(
      e.message ||
      String(e)
    );

  }

}



/* ==========================================
   HELPERS
========================================== */

function cleanQRValue(v){

  v =
    String(
      v || ""
    ).trim();


  try{

    if(
      v.startsWith("http://") ||
      v.startsWith("https://")
    ){

      const url =
        new URL(v);


      const tag =
        url.searchParams.get("asset") ||
        url.searchParams.get("tag") ||
        url.searchParams.get("assetTag");


      if(tag){
        return tag.trim();
      }

    }

  }
  catch(e){}


  return v;

}



function value(id){

  const el =
    document.getElementById(
      id
    );


  return el
    ? el.value || ""
    : "";

}



function setContent(html){

  document
    .getElementById(
      "content"
    )
    .innerHTML =
      html;

}



function showLoading(text){

  setContent(

    '<div class="empty">' +

      '<div class="empty-icon">⌛</div>' +

      '<b>' +
        esc(text) +
      '</b>' +

    '</div>'

  );

}



function showError(message){

  setContent(

    '<div class="empty">' +

      '<div class="empty-icon">⚠</div>' +

      '<b style="color:#c0392b">เกิดข้อผิดพลาด</b>' +

      '<span>' +
        esc(message) +
      '</span>' +

    '</div>'

  );

}



function showNotFound(tag){

  setContent(

    '<div class="empty">' +

      '<div class="empty-icon">⚠</div>' +

      '<b style="color:#c0392b">' +

        'ไม่พบ ' +
        esc(tag) +

      '</b>' +

      '<span>' +
        'Asset Tag นี้ไม่มีใน Assets_Master' +
      '</span>' +

      '<br>' +

      '<button class="btn-primary" onclick="showNewAsset(\'' +
        escJs(tag) +
      '\')">' +

        '➕ รับ Asset นี้เข้าระบบ' +

      '</button>' +

    '</div>'

  );

}



function info(label,value){

  return (

    '<div class="info">' +

      '<span>' +
        esc(label) +
      '</span>' +

      '<b>' +
        esc(
          value ||
          "-"
        ) +
      '</b>' +

    '</div>'

  );

}



function kpi(label,value){

  return (

    '<div class="kpi">' +

      '<span>' +
        esc(label) +
      '</span>' +

      '<strong>' +
        esc(value) +
      '</strong>' +

    '</div>'

  );

}



function field(
  label,
  html
){

  return (

    '<div>' +

      '<label>' +
        label +
      '</label>' +

      html +

    '</div>'

  );

}



function locationOptions(
  selected
){

  let html =
    '<option value="">-- เลือก Location --</option>';


  (
    masterData.locations ||
    []
  ).forEach(
    function(item){

      const name =
        item[
          "Location Name"
        ] || "";


      html +=

        '<option value="' +
          esc(name) +
        '"' +

        (
          name === selected
          ? " selected"
          : ""
        )

        +

        '>' +

          esc(name) +

        '</option>';

    }
  );


  return html;

}



function statusClassName(status){

  return String(
    status || ""
  )
  .toLowerCase()
  .replace(
    /\s+/g,
    "-"
  );

}



function actionName(action){

  const map = {

    ISSUE:
      "📤 เบิก / จ่าย Asset",

    RETURN:
      "📥 คืน Asset",

    MOVE:
      "🔄 ย้าย Location",

    REPAIR_OUT:
      "🔧 ส่งซ่อม",

    REPAIR_IN:
      "✅ รับกลับจากซ่อม",

    DAMAGED:
      "⚠ แจ้งชำรุด",

    LOST:
      "❌ แจ้งสูญหาย"

  };


  return (
    map[action] ||
    action
  );

}



function openModal(html){

  document
    .getElementById(
      "modalBody"
    )
    .innerHTML =
      html;


  document
    .getElementById(
      "modal"
    )
    .classList.remove(
      "hidden"
    );

}



function closeModal(){

  document
    .getElementById(
      "modal"
    )
    .classList.add(
      "hidden"
    );

}



function showModalLoading(){

  document
    .getElementById(
      "modalBody"
    )
    .innerHTML =

      '<div class="empty">' +

        '<div class="empty-icon">⌛</div>' +

        '<b>กำลังบันทึก...</b>' +

      '</div>';

}



function toast(message){

  const el =
    document.getElementById(
      "toast"
    );


  el.textContent =
    message;


  el.style.display =
    "block";


  clearTimeout(
    window.toastTimer
  );


  window.toastTimer =
    setTimeout(
      function(){

        el.style.display =
          "none";

      },
      2600
    );

}



function esc(value){

  return String(
    value == null
    ? ""
    : value
  )
  .replace(
    /[&<>"']/g,
    function(c){

      return {

        "&":"&amp;",
        "<":"&lt;",
        ">":"&gt;",
        '"':"&quot;",
        "'":"&#39;"

      }[c];

    }
  );

}



function escJs(value){

  return String(
    value == null
    ? ""
    : value
  )
  .replace(
    /\\/g,
    "\\\\"
  )
  .replace(
    /'/g,
    "\\'"
  );

}
