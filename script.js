let scanner = null;
let scanLock = false;
let scannerMode = "LOOKUP";
let currentAsset = null;
let auditSession = null;
let masterData = {locations:[],users:[],status:[]};

document.addEventListener("DOMContentLoaded",function(){
  const saved = localStorage.getItem("asset_operator") || "";
  document.getElementById("operator").value = saved;
  document.getElementById("operator").addEventListener("change",saveOperator);

  document.getElementById("assetTag").addEventListener("keydown",function(e){
    if(e.key === "Enter"){
      e.preventDefault();
      manualScan();
    }
  });

  loadMasterData();
});

async function loadMasterData(){
  try{
    const res = await apiGetMasterData();
    if(res && res.ok) masterData = res.data;
  }catch(e){
    console.error(e);
  }
}

function saveOperator(){
  localStorage.setItem("asset_operator",value("operator").trim());
}

function getOperator(){
  const name = value("operator").trim();
  if(!name) throw new Error("กรุณากรอกชื่อผู้ทำรายการ");
  saveOperator();
  return name;
}

function openScanner(mode){
  scannerMode = mode || "LOOKUP";
  if(scanner) return;

  if(typeof Html5Qrcode === "undefined"){
    toast("โหลดระบบ QR ไม่สำเร็จ");
    return;
  }

  const card = document.getElementById("scannerCard");
  card.classList.remove("hidden");
  document.getElementById("scannerTitle").textContent = scannerTitle(scannerMode);

  scanLock = false;
  scanner = new Html5Qrcode("reader");

  scanner.start(
    {facingMode:"environment"},
    {
      fps:10,
      qrbox:function(width,height){
        let size = Math.floor(Math.min(width,height)*0.70);
        if(size > 280) size = 280;
        return {width:size,height:size};
      }
    },
    async function(decodedText){
      if(scanLock) return;
      scanLock = true;

      const tag = cleanQRValue(decodedText);
      document.getElementById("assetTag").value = tag;

      try{
        if(navigator.vibrate) navigator.vibrate(80);
      }catch(e){}

      await closeScanner();
      processAssetTag(tag);
    },
    function(){}
  ).catch(function(error){
    console.error(error);
    scanner = null;
    card.classList.add("hidden");
    toast("เปิดกล้องไม่ได้");
  });
}

async function closeScanner(){
  if(!scanner){
    document.getElementById("scannerCard").classList.add("hidden");
    return;
  }

  const old = scanner;
  scanner = null;

  try{ await old.stop(); }catch(e){}
  try{ old.clear(); }catch(e){}

  scanLock = false;
  document.getElementById("scannerCard").classList.add("hidden");
}

function scannerTitle(mode){
  const map = {
    LOOKUP:"📷 สแกน Asset",
    ISSUE:"📤 สแกน Asset ที่จะเบิก",
    RETURN:"📥 สแกน Asset ที่จะคืน",
    MOVE:"🔄 สแกน Asset ที่จะย้าย",
    REPAIR_OUT:"🔧 สแกน Asset ที่จะส่งซ่อม",
    AUDIT:"📋 สแกน Asset ตรวจนับ"
  };
  return map[mode] || "📷 สแกน Asset";
}

function manualScan(){
  const tag = cleanQRValue(value("assetTag"));
  if(!tag){
    toast("กรุณาระบุ Asset Tag");
    return;
  }
  processAssetTag(tag);
}

async function processAssetTag(tag){
  if(scannerMode === "AUDIT" && auditSession){
    await processAuditScan(tag);
    return;
  }
  await findAsset(tag);
}

async function findAsset(tag){
  loading("กำลังค้นหา " + tag);

  try{
    const res = await apiScanAsset(tag);

    if(!res || res.error){
      throw new Error(res ? res.error : "Server ไม่ตอบกลับ");
    }

    if(!res.exists){
      currentAsset = null;
      showNotFound(tag);
      scannerMode = "LOOKUP";
      return;
    }

    currentAsset = res.asset;
    renderAsset(res.asset,res.history || []);

    const mode = scannerMode;
    scannerMode = "LOOKUP";

    if(mode !== "LOOKUP"){
      setTimeout(function(){
        showTransaction(mode);
      },200);
    }

  }catch(e){
    showError(e.message || String(e));
  }
}

function renderAsset(a,history){
  let historyHtml = "";

  history.forEach(function(h){
    historyHtml +=
      '<div class="history-row">' +
      '<b>' + esc(h.Type) + '</b> · ' + esc(h.Timestamp) + '<br>' +
      esc(h["From Location"] || "") + ' → ' + esc(h["To Location"] || "") +
      '</div>';
  });

  let photoHtml = "";

  if(a["Photo URL"]){
    photoHtml =
      '<div style="margin-top:15px">' +
      '<a class="primary" style="display:block;text-align:center;text-decoration:none;padding:13px;border-radius:12px" target="_blank" href="' +
      esc(a["Photo URL"]) + '">' +
      '🖼️ เปิดรูปอุปกรณ์' +
      '</a>' +
      '</div>';
  }

  setContent(
    '<div class="asset-header">' +
      '<div>' +
        '<div class="asset-tag">' + esc(a["Asset Tag"]) + '</div>' +
        '<div class="asset-name">' + esc(a["Item Name"] || a["Asset Type"]) + '</div>' +
      '</div>' +
      '<span class="badge">' + esc(a.Status) + '</span>' +
    '</div>' +

    '<div class="asset-grid">' +
      info("Asset Type",a["Asset Type"]) +
      info("Brand",a.Brand) +
      info("Model",a.Model) +
      info("Serial No.",a["Serial No."]) +
      info("User",a.User) +
      info("Department",a.Department) +
      info("Location",a.Location) +
      info("Condition",a.Condition) +
    '</div>' +

    photoHtml +

    '<div class="asset-actions">' +
      '<button class="blue" onclick="showTransaction(\'ISSUE\')">📤 เบิก</button>' +
      '<button class="green" onclick="showTransaction(\'RETURN\')">📥 คืน</button>' +
      '<button onclick="showTransaction(\'MOVE\')">🔄 ย้าย</button>' +
      '<button class="orange" onclick="showTransaction(\'REPAIR_OUT\')">🔧 ส่งซ่อม</button>' +
      '<button onclick="showTransaction(\'REPAIR_IN\')">✅ รับกลับ</button>' +
      '<button class="red" onclick="showTransaction(\'DAMAGED\')">⚠ ชำรุด</button>' +
      '<button class="red" onclick="showTransaction(\'LOST\')">❌ สูญหาย</button>' +
      '<button onclick="openScanner(\'LOOKUP\')">📷 สแกนต่อ</button>' +
    '</div>' +

    '<div class="history">' +
      '<b>📜 ประวัติล่าสุด</b>' +
      (historyHtml || '<div class="history-row">ยังไม่มีประวัติ</div>') +
    '</div>'
  );
}

function showNewAsset(tag){
  tag = tag || "";

  openModal(
    '<h2>➕ รับ Asset ใหม่</h2>' +

    '<div class="form-grid">' +

      field("Asset Tag",
        '<input id="newTag" value="' + esc(tag) + '">') +

      field("Asset Type",
        '<input id="newType" placeholder="PC / Monitor / PDA">') +

      field("Item Name",
        '<input id="newName">') +

      field("Brand",
        '<input id="newBrand">') +

      field("Model",
        '<input id="newModel">') +

      field("Serial No.",
        '<input id="newSerial">') +

      field("Location",
        '<select id="newLocation">' +
        locationOptions("IT Stock") +
        '</select>') +

      field("Condition",
        '<input id="newCondition" value="Normal">') +

      field("Receive Date",
        '<input id="newReceive" type="date">') +

      field("Warranty End",
        '<input id="newWarranty" type="date">') +

      field("Vendor",
        '<input id="newVendor">') +

      '<div class="full">' +
        '<label>📷 รูปอุปกรณ์</label>' +
        '<input id="newPhoto" type="file" accept="image/*" capture="environment" onchange="previewPhoto(this)">' +
        '<img id="photoPreview" class="photo-preview">' +
      '</div>' +

      '<div class="full">' +
        '<label>Remark</label>' +
        '<textarea id="newRemark"></textarea>' +
      '</div>' +

      '<div class="full">' +
        '<button class="primary" style="width:100%" onclick="submitNewAsset()">บันทึกรับเข้า</button>' +
      '</div>' +

    '</div>'
  );
}

function previewPhoto(input){
  const img = document.getElementById("photoPreview");

  if(!input.files || !input.files[0]){
    img.style.display = "none";
    return;
  }

  const reader = new FileReader();

  reader.onload = function(e){
    img.src = e.target.result;
    img.style.display = "block";
  };

  reader.readAsDataURL(input.files[0]);
}

async function submitNewAsset(){
  try{
    const operator = getOperator();
    const assetTag = value("newTag").trim();

    if(!assetTag) throw new Error("กรุณาระบุ Asset Tag");

    const photoInput = document.getElementById("newPhoto");

    const formData = {
      assetTag:assetTag,
      assetType:value("newType"),
      itemName:value("newName"),
      brand:value("newBrand"),
      model:value("newModel"),
      serialNo:value("newSerial"),
      location:value("newLocation"),
      condition:value("newCondition"),
      receiveDate:value("newReceive"),
      warrantyEnd:value("newWarranty"),
      vendor:value("newVendor"),
      remark:value("newRemark"),
      operator:operator
    };

    showModalLoading("กำลังบันทึก...");

    let photoUrl = "";

    if(photoInput && photoInput.files && photoInput.files[0]){
      try{
        showModalLoading("กำลังอัปโหลดรูป...");
        photoUrl = await apiUploadAssetPhoto(photoInput.files[0],assetTag);
      }catch(photoError){
        console.error(photoError);
        photoUrl = "";
      }
    }

    formData.photoUrl = photoUrl;

    showModalLoading("กำลังบันทึกข้อมูล...");

    const res = await apiNewAsset(formData);

    if(!res || res.error){
      throw new Error(res ? res.error : "บันทึกไม่สำเร็จ");
    }

    closeModal();

    currentAsset = res.asset;
    renderAsset(res.asset,res.history || []);

    if(photoInput && photoInput.files && photoInput.files[0] && !photoUrl){
      toast("บันทึก Asset สำเร็จ แต่รูป Upload ไม่สำเร็จ");
    }else{
      toast("บันทึก Asset สำเร็จ ✅");
    }

  }catch(e){
    closeModal();
    toast(e.message || String(e));
  }
}

function showTransaction(action){
  if(!currentAsset){
    toast("กรุณาสแกน Asset ก่อน");
    return;
  }

  let extra = "";

  if(action === "ISSUE"){
    extra =
      field("ผู้ใช้งาน / ผู้เบิก",'<input id="txnUser">') +
      field("Department",'<input id="txnDepartment">') +
      field("Location",
        '<select id="txnLocation">' +
        locationOptions(currentAsset.Location) +
        '</select>');
  }

  else if(
    action === "RETURN" ||
    action === "MOVE" ||
    action === "REPAIR_OUT" ||
    action === "REPAIR_IN"
  ){
    let loc = currentAsset.Location;
    if(action === "REPAIR_OUT") loc = "Repair Area";

    extra =
      field("Location ปลายทาง",
        '<select id="txnLocation">' +
        locationOptions(loc) +
        '</select>');
  }

  openModal(
    '<h2>' + actionName(action) + '</h2>' +
    '<div class="asset-tag">' + esc(currentAsset["Asset Tag"]) + '</div>' +
    '<div class="asset-name">' + esc(currentAsset["Item Name"] || currentAsset["Asset Type"]) + '</div>' +
    '<br>' +

    '<div class="form-grid">' +

      extra +

      field("Condition",
        '<input id="txnCondition" value="' +
        esc(currentAsset.Condition || "") +
        '">') +

      '<div class="full">' +
        '<label>Remark</label>' +
        '<textarea id="txnRemark"></textarea>' +
      '</div>' +

      '<div class="full">' +
        '<button class="primary" style="width:100%" onclick="submitTransaction(\'' +
        action +
        '\')">ยืนยันรายการ</button>' +
      '</div>' +

    '</div>'
  );
}

async function submitTransaction(action){
  try{
    const res = await apiAssetTransaction({
      action:action,
      assetTag:currentAsset["Asset Tag"],
      user:value("txnUser"),
      department:value("txnDepartment"),
      location:value("txnLocation"),
      condition:value("txnCondition"),
      remark:value("txnRemark"),
      operator:getOperator()
    });

    if(!res || res.error){
      throw new Error(res ? res.error : "บันทึกไม่สำเร็จ");
    }

    closeModal();

    currentAsset = res.asset;
    renderAsset(res.asset,res.history || []);

    toast("บันทึกเรียบร้อย ✅");

  }catch(e){
    toast(e.message || String(e));
  }
}

function showSearch(){
  openModal(
    '<h2>🔎 ค้นหา Asset</h2>' +
    '<div class="input-action">' +
      '<input id="searchKeyword" placeholder="Asset Tag / Serial / User / Location">' +
      '<button class="primary" onclick="runSearch()">ค้นหา</button>' +
    '</div>' +
    '<div id="searchResult" class="table" style="margin-top:15px"></div>'
  );
}

async function runSearch(){
  const box = document.getElementById("searchResult");
  box.innerHTML = "กำลังค้นหา...";

  try{
    const res = await apiSearchAssets(value("searchKeyword"));
    const assets = res.assets || [];
    let rows = "";

    assets.forEach(function(a){
      rows +=
        '<tr onclick="pickAsset(\'' +
        escJs(a["Asset Tag"]) +
        '\')">' +
          '<td><b>' + esc(a["Asset Tag"]) + '</b></td>' +
          '<td>' + esc(a["Item Name"] || "") + '</td>' +
          '<td>' + esc(a.Location || "") + '</td>' +
        '</tr>';
    });

    box.innerHTML =
      '<table>' +
        '<thead><tr><th>Asset Tag</th><th>Item</th><th>Location</th></tr></thead>' +
        '<tbody>' + rows + '</tbody>' +
      '</table>';

  }catch(e){
    box.innerHTML = esc(e.message || String(e));
  }
}

function pickAsset(tag){
  closeModal();
  scannerMode = "LOOKUP";
  document.getElementById("assetTag").value = tag;
  processAssetTag(tag);
}

async function showDashboard(){
  loading("กำลังโหลด Dashboard");

  try{
    const res = await apiDashboard();

    if(!res || res.error){
      throw new Error(res ? res.error : "โหลด Dashboard ไม่สำเร็จ");
    }

    const d = res.data;
    const c = d.counts;
    let locRows = "";

    Object.keys(d.byLocation).forEach(function(loc){
      locRows +=
        '<tr>' +
          '<td>' + esc(loc) + '</td>' +
          '<td><b>' + d.byLocation[loc] + '</b></td>' +
        '</tr>';
    });

    setContent(
      '<h2>📊 Dashboard</h2>' +

      '<div class="kpis">' +
        kpi("ทั้งหมด",c.total) +
        kpi("Available",c.available) +
        kpi("In Use",c.inUse) +
        kpi("Repair",c.repair) +
        kpi("Damaged",c.damaged) +
        kpi("Lost",c.lost) +
        kpi("Retired",c.retired) +
      '</div>' +

      '<h3>ตาม Location</h3>' +

      '<div class="table">' +
        '<table><tbody>' +
          locRows +
        '</tbody></table>' +
      '</div>'
    );

  }catch(e){
    showError(e.message || String(e));
  }
}

function showAuditStart(){
  openModal(
    '<h2>📋 เริ่มตรวจนับ</h2>' +

    '<div class="form-grid">' +

      field("ชื่อรอบ",
        '<input id="auditName" placeholder="Audit August 2026">') +

      field("Location",
        '<select id="auditLocation">' +
        locationOptions("") +
        '</select>') +

      '<div class="full">' +
        '<button class="primary" style="width:100%" onclick="startAudit()">เริ่มตรวจนับ</button>' +
      '</div>' +

    '</div>'
  );
}

async function startAudit(){
  try{
    const res = await apiStartAudit({
      auditName:value("auditName"),
      location:value("auditLocation"),
      operator:getOperator()
    });

    if(!res || res.error){
      throw new Error(res ? res.error : "เริ่ม Audit ไม่สำเร็จ");
    }

    auditSession = res;
    scannerMode = "AUDIT";

    closeModal();

    setContent(
      '<div class="empty">' +
        '<div class="empty-icon">📋</div>' +
        '<b>' + esc(res.location) + '</b>' +
        '<span>ควรมี ' + res.expectedCount + ' รายการ</span>' +
        '<br><br>' +
        '<button class="primary" onclick="openScanner(\'AUDIT\')">📷 เริ่มสแกน</button>' +
      '</div>'
    );

  }catch(e){
    toast(e.message || String(e));
  }
}

async function processAuditScan(tag){
  try{
    const res = await apiAuditScan({
      sessionId:auditSession.sessionId,
      assetTag:tag,
      operator:getOperator()
    });

    if(res.duplicate){
      toast("สแกนซ้ำ " + tag);
      openScanner("AUDIT");
      return;
    }

    let css = "good";
    let message = "✓ พบถูก Location";

    if(res.result === "WRONG_LOCATION"){
      css = "warn";
      message = "⚠ Location ไม่ตรง";
    }
    else if(res.result === "UNKNOWN"){
      css = "bad";
      message = "✕ ไม่มีใน Master";
    }

    setContent(
      '<div class="audit-result ' + css + '">' + message + '</div>' +
      '<div class="asset-tag">' + esc(tag) + '</div>' +

      '<div class="asset-actions">' +
        '<button class="blue" onclick="openScanner(\'AUDIT\')">📷 สแกนต่อ</button>' +
        '<button onclick="showAuditSummary()">📊 ดูสรุป</button>' +
        '<button class="red" onclick="finishAudit()">ปิดรอบ</button>' +
      '</div>'
    );

  }catch(e){
    toast(e.message || String(e));
  }
}

async function showAuditSummary(){
  if(!auditSession) return;

  try{
    const res = await apiAuditSummary(auditSession.sessionId);
    const t = res.totals;
    let rows = "";

    res.missingAssets.forEach(function(a){
      rows +=
        '<tr>' +
          '<td>' + esc(a["Asset Tag"]) + '</td>' +
          '<td>' + esc(a["Item Name"] || "") + '</td>' +
        '</tr>';
    });

    setContent(
      '<h2>📋 Audit Summary</h2>' +

      '<div class="kpis">' +
        kpi("ควรมี",t.expected) +
        kpi("พบถูกที่",t.found) +
        kpi("ผิด Location",t.wrongLocation) +
        kpi("ไม่พบ",t.missing) +
      '</div>' +

      '<h3>Missing Asset</h3>' +

      '<div class="table">' +
        '<table>' +
          '<thead><tr><th>Asset Tag</th><th>Item</th></tr></thead>' +
          '<tbody>' + rows + '</tbody>' +
        '</table>' +
      '</div>' +

      '<div class="asset-actions">' +
        '<button class="blue" onclick="openScanner(\'AUDIT\')">📷 สแกนต่อ</button>' +
        '<button class="red" onclick="finishAudit()">ปิดรอบ</button>' +
      '</div>'
    );

  }catch(e){
    toast(e.message || String(e));
  }
}

async function finishAudit(){
  if(!auditSession) return;

  try{
    await apiFinishAudit({
      sessionId:auditSession.sessionId,
      operator:getOperator()
    });

    auditSession = null;
    scannerMode = "LOOKUP";

    toast("ปิดรอบเรียบร้อย ✅");
    showDashboard();

  }catch(e){
    toast(e.message || String(e));
  }
}

function cleanQRValue(input){
  let v = String(input || "").trim();

  try{
    if(
      v.indexOf("http://") === 0 ||
      v.indexOf("https://") === 0
    ){
      const url = new URL(v);
      const tag =
        url.searchParams.get("asset") ||
        url.searchParams.get("tag") ||
        url.searchParams.get("assetTag");

      if(tag) return tag.trim();
    }
  }catch(e){}

  return v;
}

function value(id){
  const element = document.getElementById(id);
  return element ? element.value || "" : "";
}

function setContent(html){
  document.getElementById("content").innerHTML = html;
}

function loading(text){
  setContent(
    '<div class="empty">' +
      '<div class="empty-icon">⌛</div>' +
      '<b>' + esc(text) + '</b>' +
    '</div>'
  );
}

function showError(message){
  setContent(
    '<div class="empty">' +
      '<div class="empty-icon">⚠</div>' +
      '<b style="color:#c0392b">เกิดข้อผิดพลาด</b>' +
      '<span>' + esc(message) + '</span>' +
    '</div>'
  );
}

function showNotFound(tag){
  setContent(
    '<div class="empty">' +
      '<div class="empty-icon">⚠</div>' +
      '<b style="color:#c0392b">ไม่พบ ' + esc(tag) + '</b>' +
      '<span>Asset Tag นี้ยังไม่มีในระบบ</span>' +
      '<br>' +
      '<button class="primary" onclick="showNewAsset(\'' +
      escJs(tag) +
      '\')">➕ รับ Asset เข้าระบบ</button>' +
    '</div>'
  );
}

function locationOptions(selected){
  let html = '<option value="">-- เลือก Location --</option>';

  masterData.locations.forEach(function(item){
    const name = item["Location Name"] || "";

    html +=
      '<option value="' +
      esc(name) +
      '"' +
      (name === selected ? ' selected' : '') +
      '>' +
      esc(name) +
      '</option>';
  });

  return html;
}

function info(label,val){
  return (
    '<div class="info">' +
      '<span>' + esc(label) + '</span>' +
      '<b>' + esc(val || "-") + '</b>' +
    '</div>'
  );
}

function kpi(label,val){
  return (
    '<div class="kpi">' +
      '<span>' + esc(label) + '</span>' +
      '<strong>' + esc(val) + '</strong>' +
    '</div>'
  );
}

function field(label,html){
  return (
    '<div>' +
      '<label>' + label + '</label>' +
      html +
    '</div>'
  );
}

function actionName(action){
  const map = {
    ISSUE:"📤 เบิก / จ่าย Asset",
    RETURN:"📥 คืน Asset",
    MOVE:"🔄 ย้าย Location",
    REPAIR_OUT:"🔧 ส่งซ่อม",
    REPAIR_IN:"✅ รับกลับจากซ่อม",
    DAMAGED:"⚠ ชำรุด",
    LOST:"❌ สูญหาย"
  };

  return map[action] || action;
}

function openModal(html){
  document.getElementById("modalBody").innerHTML = html;
  document.getElementById("modal").classList.remove("hidden");
}

function closeModal(){
  document.getElementById("modal").classList.add("hidden");
}

function showModalLoading(text){
  document.getElementById("modalBody").innerHTML =
    '<div class="empty">' +
      '<div class="empty-icon">⌛</div>' +
      '<b>' + esc(text || "กำลังบันทึก...") + '</b>' +
    '</div>';
}

function toast(message){
  const element = document.getElementById("toast");

  element.textContent = message;
  element.style.display = "block";

  clearTimeout(window.toastTimer);

  window.toastTimer = setTimeout(function(){
    element.style.display = "none";
  },2800);
}

function esc(value){
  return String(value == null ? "" : value)
    .replace(/[&<>"']/g,function(c){
      const map = {
        "&":"&amp;",
        "<":"&lt;",
        ">":"&gt;",
        '"':"&quot;",
        "'":"&#39;"
      };
      return map[c];
    });
}

function escJs(value){
  return String(value == null ? "" : value)
    .replace(/\\/g,"\\\\")
    .replace(/'/g,"\\'");
}
