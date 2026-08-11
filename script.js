let scanner = null;
let scanLock = false;


/* =========================
   INIT
========================= */

document.addEventListener("DOMContentLoaded", function () {
  console.log("Asset Warehouse Ready");
});


/* =========================
   OPEN CAMERA
========================= */

function openScanner() {

  if (scanner) {
    return;
  }

  if (typeof Html5Qrcode === "undefined") {
    alert("โหลดระบบ QR ไม่สำเร็จ");
    return;
  }

  document
    .getElementById("readerBox")
    .classList.remove("hidden");

  document
    .getElementById("openBtn")
    .classList.add("hidden");

  document
    .getElementById("closeBtn")
    .classList.remove("hidden");


  scanLock = false;


  scanner = new Html5Qrcode("reader");


  const config = {

    fps: 10,

    qrbox: function (width, height) {

      let size =
        Math.min(width, height) * 0.7;

      size =
        Math.floor(size);

      if (size > 280) {
        size = 280;
      }

      return {
        width: size,
        height: size
      };

    }

  };


  scanner
    .start(

      {
        facingMode: "environment"
      },

      config,

      onScanSuccess,

      function () {
        // ไม่ต้องแสดง error ตอนยังหา QR ไม่เจอ
      }

    )

    .then(function () {

      console.log("Camera started");

    })

    .catch(function (error) {

      console.error(error);

      alert(
        "เปิดกล้องไม่ได้\n" +
        error
      );

      scanner = null;

      resetScannerUI();

    });

}


/* =========================
   SCAN SUCCESS
========================= */

async function onScanSuccess(decodedText) {

  if (scanLock) {
    return;
  }

  scanLock = true;


  let assetTag =
    String(decodedText || "").trim();


  assetTag =
    cleanQRValue(assetTag);


  document
    .getElementById("assetTag")
    .value = assetTag;


  document
    .getElementById("result")
    .innerHTML =
      "อ่าน QR ได้<br><b>" +
      escapeHtml(assetTag) +
      "</b>";


  try {

    if (navigator.vibrate) {
      navigator.vibrate(100);
    }

  } catch (e) {}


  await closeScanner();


  findAsset(assetTag);

}


/* =========================
   CLEAN QR
========================= */

function cleanQRValue(value) {

  let v =
    String(value || "").trim();


  try {

    if (
      v.startsWith("http://") ||
      v.startsWith("https://")
    ) {

      const url =
        new URL(v);


      const tag =
        url.searchParams.get("asset") ||
        url.searchParams.get("tag") ||
        url.searchParams.get("assetTag");


      if (tag) {
        return tag.trim();
      }

    }

  } catch (e) {}


  return v;

}


/* =========================
   FIND ASSET FROM SHEET
========================= */

async function findAsset(assetTag) {

  if (!assetTag) {
    return;
  }


  showLoading(assetTag);


  try {

    const res =
      await apiScanAsset(assetTag);


    console.log(
      "API Response:",
      res
    );


    if (!res) {

      showError(
        "Apps Script ไม่ตอบกลับ"
      );

      return;

    }


    if (res.error) {

      showError(
        res.error
      );

      return;

    }


    if (
      res.exists === false
    ) {

      showNotFound(assetTag);

      return;

    }


    if (
      res.exists === true &&
      res.asset
    ) {

      showAsset(
        res.asset,
        res.history || []
      );

      return;

    }


    showNotFound(assetTag);

  }

  catch (error) {

    console.error(error);

    showError(
      error.message ||
      String(error)
    );

  }

}


/* =========================
   LOADING
========================= */

function showLoading(assetTag) {

  document
    .getElementById("result")
    .innerHTML =

      '<div style="font-size:18px">' +

        'กำลังค้นหา Asset...' +

        '<br><br>' +

        '<b style="font-size:25px">' +
          escapeHtml(assetTag) +
        '</b>' +

      '</div>';

}


/* =========================
   ASSET FOUND
========================= */

function showAsset(asset, history) {

  let html = "";


  html +=
    '<div style="text-align:left">';


  html +=
    '<div style="' +
      'font-size:28px;' +
      'font-weight:800;' +
      'margin-bottom:5px;' +
    '">' +

      escapeHtml(
        asset["Asset Tag"] || ""
      ) +

    '</div>';


  html +=
    '<div style="' +
      'font-size:19px;' +
      'font-weight:700;' +
      'margin-bottom:18px;' +
    '">' +

      escapeHtml(
        asset["Item Name"] ||
        asset["Asset Type"] ||
        "-"
      ) +

    '</div>';


  html +=
    infoRow(
      "Asset Type",
      asset["Asset Type"]
    );


  html +=
    infoRow(
      "Brand",
      asset["Brand"]
    );


  html +=
    infoRow(
      "Model",
      asset["Model"]
    );


  html +=
    infoRow(
      "Serial No.",
      asset["Serial No."]
    );


  html +=
    infoRow(
      "User",
      asset["User"]
    );


  html +=
    infoRow(
      "Department",
      asset["Department"]
    );


  html +=
    infoRow(
      "Location",
      asset["Location"]
    );


  html +=
    infoRow(
      "Status",
      asset["Status"]
    );


  html +=
    infoRow(
      "Condition",
      asset["Condition"]
    );


  if (
    history &&
    history.length > 0
  ) {

    html +=
      '<div style="' +
        'margin-top:20px;' +
        'font-size:16px;' +
        'font-weight:700;' +
      '">' +

        'ประวัติล่าสุด' +

      '</div>';


    for (
      let i = 0;
      i < history.length;
      i++
    ) {

      const h =
        history[i];


      html +=
        '<div style="' +
          'padding:10px 0;' +
          'border-bottom:1px solid #ddd;' +
          'font-size:13px;' +
        '">' +


          '<b>' +
            escapeHtml(
              h["Type"] || ""
            ) +
          '</b>' +


          ' · ' +


          escapeHtml(
            h["Timestamp"] || ""
          ) +


          '<br>' +


          escapeHtml(
            h["From Location"] || ""
          ) +


          ' → ' +


          escapeHtml(
            h["To Location"] || ""
          ) +


        '</div>';

    }

  }


  html +=
    '<button ' +
      'onclick="openScanner()" ' +
      'style="' +
        'width:100%;' +
        'margin-top:20px;' +
        'padding:15px;' +
        'border:0;' +
        'border-radius:12px;' +
        'background:#1769aa;' +
        'color:white;' +
        'font-size:16px;' +
        'font-weight:700;' +
      '">' +

      '📷 สแกน Asset ตัวต่อไป' +

    '</button>';


  html +=
    '</div>';


  document
    .getElementById("result")
    .innerHTML = html;

}


/* =========================
   INFO ROW
========================= */

function infoRow(label, value) {

  if (
    value === undefined ||
    value === null ||
    value === ""
  ) {

    value = "-";

  }


  return (

    '<div style="' +
      'display:flex;' +
      'justify-content:space-between;' +
      'gap:20px;' +
      'padding:10px 0;' +
      'border-bottom:1px solid #e3e7ea;' +
      'font-size:15px;' +
    '">' +

      '<span style="' +
        'color:#6b7680;' +
      '">' +

        escapeHtml(label) +

      '</span>' +

      '<b style="' +
        'text-align:right;' +
      '">' +

        escapeHtml(value) +

      '</b>' +

    '</div>'

  );

}


/* =========================
   NOT FOUND
========================= */

function showNotFound(assetTag) {

  document
    .getElementById("result")
    .innerHTML =

      '<div style="' +
        'color:#c0392b;' +
        'font-size:22px;' +
        'font-weight:700;' +
      '">' +

        'ไม่พบ Asset' +

      '</div>' +


      '<div style="' +
        'font-size:28px;' +
        'font-weight:800;' +
        'margin-top:10px;' +
      '">' +

        escapeHtml(assetTag) +

      '</div>' +


      '<div style="' +
        'color:#6b7680;' +
        'font-size:14px;' +
        'margin-top:10px;' +
      '">' +

        'ไม่พบ Asset Tag นี้ใน Assets_Master' +

      '</div>' +


      '<button ' +
        'onclick="openScanner()" ' +
        'style="' +
          'width:100%;' +
          'margin-top:20px;' +
          'padding:15px;' +
          'border:0;' +
          'border-radius:12px;' +
          'background:#1769aa;' +
          'color:white;' +
          'font-size:16px;' +
          'font-weight:700;' +
        '">' +

        '📷 สแกนใหม่' +

      '</button>';

}


/* =========================
   ERROR
========================= */

function showError(message) {

  document
    .getElementById("result")
    .innerHTML =

      '<div style="' +
        'color:#c0392b;' +
        'font-size:22px;' +
        'font-weight:700;' +
      '">' +

        'เกิดข้อผิดพลาด' +

      '</div>' +


      '<div style="' +
        'font-size:14px;' +
        'margin-top:10px;' +
        'word-break:break-word;' +
      '">' +

        escapeHtml(message) +

      '</div>' +


      '<button ' +
        'onclick="openScanner()" ' +
        'style="' +
          'width:100%;' +
          'margin-top:20px;' +
          'padding:15px;' +
          'border:0;' +
          'border-radius:12px;' +
          'background:#1769aa;' +
          'color:white;' +
          'font-size:16px;' +
          'font-weight:700;' +
        '">' +

        'ลองสแกนใหม่' +

      '</button>';

}


/* =========================
   CLOSE SCANNER
========================= */

async function closeScanner() {

  if (!scanner) {

    resetScannerUI();

    return;

  }


  const oldScanner =
    scanner;


  scanner =
    null;


  try {

    await oldScanner.stop();

  }

  catch (e) {

    console.log(e);

  }


  try {

    oldScanner.clear();

  }

  catch (e) {}


  resetScannerUI();

}


/* =========================
   RESET UI
========================= */

function resetScannerUI() {

  document
    .getElementById("readerBox")
    .classList.add("hidden");


  document
    .getElementById("openBtn")
    .classList.remove("hidden");


  document
    .getElementById("closeBtn")
    .classList.add("hidden");


  scanLock = false;

}


/* =========================
   HTML ESCAPE
========================= */

function escapeHtml(value) {

  return String(
    value == null
      ? ""
      : value
  )
  .replace(
    /[&<>"']/g,
    function (c) {

      const map = {

        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;"

      };


      return map[c];

    }
  );

}
