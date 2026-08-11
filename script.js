let scanner = null;
let scanLock = false;


/* =========================
   INIT
========================= */

document.addEventListener(
  "DOMContentLoaded",
  function(){

    testConnection();

  }
);



/* =========================
   TEST API
========================= */

async function testConnection(){

  try{

    const res =
      await testAPI();

    console.log(
      "API:",
      res
    );

    if(
      res &&
      res.ok
    ){

      console.log(
        "Asset Warehouse API Online"
      );

    }

  }
  catch(e){

    console.error(
      "API ERROR:",
      e
    );

  }

}



/* =========================
   OPEN QR SCANNER
========================= */

function openScanner(){

  if(scanner){
    return;
  }


  if(
    typeof Html5Qrcode ===
    "undefined"
  ){

    alert(
      "โหลดระบบ QR ไม่สำเร็จ"
    );

    return;

  }


  document
    .getElementById(
      "readerBox"
    )
    .classList
    .remove(
      "hidden"
    );


  document
    .getElementById(
      "openBtn"
    )
    .classList
    .add(
      "hidden"
    );


  document
    .getElementById(
      "closeBtn"
    )
    .classList
    .remove(
      "hidden"
    );


  scanLock =
    false;


  scanner =
    new Html5Qrcode(
      "reader"
    );


  const config = {

    fps: 10,

    qrbox:
      function(
        width,
        height
      ){

        let size =
          Math.min(
            width,
            height
          ) * 0.7;


        size =
          Math.floor(
            size
          );


        if(
          size > 280
        ){

          size =
            280;

        }


        return {

          width:
            size,

          height:
            size

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

      onScanSuccess,

      function(error){

        // ไม่ต้องแสดง error
        // ตอนกล้องกำลังหา QR

      }

    )

    .then(
      function(){

        console.log(
          "Camera started"
        );

      }
    )

    .catch(
      function(error){

        console.error(
          error
        );


        alert(
          "เปิดกล้องไม่ได้: " +
          error
        );


        resetScannerUI();


        scanner =
          null;

      }
    );

}



/* =========================
   SCAN SUCCESS
========================= */

async function onScanSuccess(
  decodedText,
  decodedResult
){

  if(
    scanLock
  ){

    return;

  }


  scanLock =
    true;


  let value =
    String(
      decodedText || ""
    )
    .trim();


  value =
    cleanQRValue(
      value
    );


  document
    .getElementById(
      "result"
    )
    .textContent =
      value;


  document
    .getElementById(
      "assetTag"
    )
    .value =
      value;


  try{

    if(
      navigator.vibrate
    ){

      navigator.vibrate(
        100
      );

    }

  }
  catch(e){}


  await closeScanner();


  await findAsset(
    value
  );

}



/* =========================
   CLEAN QR
========================= */

function cleanQRValue(
  value
){

  let v =
    String(
      value || ""
    )
    .trim();


  try{

    if(
      v.startsWith(
        "http://"
      ) ||
      v.startsWith(
        "https://"
      )
    ){

      const url =
        new URL(v);


      const tag =
        url.searchParams.get(
          "asset"
        )
        ||
        url.searchParams.get(
          "tag"
        )
        ||
        url.searchParams.get(
          "assetTag"
        );


      if(tag){

        return tag.trim();

      }

    }

  }
  catch(e){}


  return v;

}



/* =========================
   FIND ASSET
========================= */

async function findAsset(
  assetTag
){

  if(
    !assetTag
  ){

    return;

  }


  showLoading(
    assetTag
  );


  try{

    const res =
      await apiScanAsset(
        assetTag
      );


    console.log(
      "Asset Response:",
      res
    );


    if(
      !res
    ){

      showError(
        "Apps Script ไม่ตอบกลับ"
      );

      return;

    }


    if(
      res.ok === false &&
      res.exists === false
    ){

      showNotFound(
        assetTag
      );

      return;

    }


    if(
      res.error
    ){

      showError(
        res.error
      );

      return;

    }


    if(
      res.exists &&
      res.asset
    ){

      showAsset(
        res.asset,
        res.history || []
      );

      return;

    }


    showNotFound(
      assetTag
    );

  }
  catch(e){

    console.error(
      e
    );


    showError(
      e.message ||
      String(e)
    );

  }

}



/* =========================
   LOADING
========================= */

function showLoading(
  assetTag
){

  const result =
    document.getElementById(
      "result"
    );


  result.innerHTML =

    '<div style="font-size:18px;">' +

      'กำลังค้นหา' +

      '<br>' +

      '<b>' +
        escapeHtml(
          assetTag
        ) +
      '</b>' +

    '</div>';

}



/* =========================
   ASSET FOUND
========================= */

function showAsset(
  asset,
  history
){

  const result =
    document.getElementById(
      "result"
    );


  let historyHtml =
    "";


  for(
    let i = 0;
    i < history.length;
    i++
  ){

    const h =
      history[i];


    historyHtml +=

      '<div style="' +
        'padding:9px 0;' +
        'border-bottom:1px solid #dfe5e9;' +
        'font-size:13px;' +
        'text-align:left;' +
      '">' +

        '<b>' +
          escapeHtml(
            h.Type || ""
          ) +
        '</b>' +

        ' · ' +

        escapeHtml(
          h.Timestamp || ""
        ) +

        '<br>' +

        escapeHtml(
          h[
            "From Location"
          ] || ""
        ) +

        ' → ' +

        escapeHtml(
          h[
            "To Location"
          ] || ""
        ) +

      '</div>';

  }


  result.innerHTML =

    '<div style="text-align:left;">' +

      '<div style="' +
        'font-size:28px;' +
        'font-weight:800;' +
        'margin-bottom:5px;' +
      '">' +

        escapeHtml(
          asset[
            "Asset Tag"
          ] || ""
        ) +

      '</div>' +


      '<div style="' +
        'font-size:18px;' +
        'font-weight:700;' +
        'margin-bottom:15px;' +
      '">' +

        escapeHtml(
          asset[
            "Item Name"
          ]
          ||
          asset[
            "Asset Type"
          ]
          ||
          "-"
        ) +

      '</div>' +


      infoRow(
        "Asset Type",
        asset[
          "Asset Type"
        ]
      ) +

      infoRow(
        "Brand",
        asset.Brand
      ) +

      infoRow(
        "Model",
        asset.Model
      ) +

      infoRow(
        "Serial No.",
        asset[
          "Serial No."
        ]
      ) +

      infoRow(
        "User",
        asset.User
      ) +

      infoRow(
        "Department",
        asset.Department
      ) +

      infoRow(
        "Location",
        asset.Location
      ) +

      infoRow(
        "Status",
        asset.Status
      ) +

      infoRow(
        "Condition",
        asset.Condition
      ) +


      (
        historyHtml
        ?
        '<div style="' +
          'margin-top:18px;' +
          'font-weight:700;' +
        '">' +
          'ประวัติล่าสุด' +
        '</div>' +

        historyHtml

        :
        ''
      ) +


      '<button ' +
        'onclick="openScanner()" ' +
        'style="' +
          'width:100%;' +
          'margin-top:18px;' +
          'padding:14px;' +
          'border:0;' +
          'border-radius:12px;' +
          'background:#1769aa;' +
          'color:white;' +
          'font-size:16px;' +
          'font-weight:700;' +
        '">' +

        '📷 สแกน Asset ตัวต่อไป' +

      '</button>' +

    '</div>';

}



/* =========================
   INFO ROW
========================= */

function infoRow(
  label,
  value
){

  if(
    value === undefined ||
    value === null ||
    value === ""
  ){

    value =
      "-";

  }


  return (

    '<div style="' +
      'display:flex;' +
      'justify-content:space-between;' +
      'gap:15px;' +
      'padding:9px 0;' +
      'border-bottom:1px solid #e7ebee;' +
      'font-size:15px;' +
    '">' +

      '<span style="' +
        'color:#6b7680;' +
      '">' +

        escapeHtml(
          label
        ) +

      '</span>' +

      '<b style="' +
        'text-align:right;' +
      '">' +

        escapeHtml(
          value
        ) +

      '</b>' +

    '</div>'

  );

}



/* =========================
   NOT FOUND
========================= */

function showNotFound(
  assetTag
){

  const result =
    document.getElementById(
      "result"
    );


  result.innerHTML =

    '<div style="' +
      'color:#c0392b;' +
      'font-size:21px;' +
      'font-weight:700;' +
    '">' +

      'ไม่พบ Asset' +

    '</div>' +

    '<div style="' +
      'font-size:26px;' +
      'font-weight:800;' +
      'margin-top:8px;' +
    '">' +

      escapeHtml(
        assetTag
      ) +

    '</div>' +

    '<div style="' +
      'font-size:14px;' +
      'margin-top:10px;' +
      'color:#6b7680;' +
    '">' +

      'Asset Tag นี้ยังไม่มีใน Assets_Master' +

    '</div>' +

    '<button ' +
      'onclick="openScanner()" ' +
      'style="' +
        'width:100%;' +
        'margin-top:18px;' +
        'padding:14px;' +
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

function showError(
  message
){

  const result =
    document.getElementById(
      "result"
    );


  result.innerHTML =

    '<div style="' +
      'color:#c0392b;' +
      'font-size:20px;' +
      'font-weight:700;' +
    '">' +

      'เกิดข้อผิดพลาด' +

    '</div>' +

    '<div style="' +
      'margin-top:10px;' +
      'font-size:14px;' +
    '">' +

      escapeHtml(
        message
      ) +

    '</div>' +

    '<button ' +
      'onclick="openScanner()" ' +
      'style="' +
        'width:100%;' +
        'margin-top:18px;' +
        'padding:14px;' +
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

async function closeScanner(){

  if(
    !scanner
  ){

    resetScannerUI();

    return;

  }


  const oldScanner =
    scanner;


  scanner =
    null;


  try{

    await oldScanner.stop();

  }
  catch(e){

    console.log(e);

  }


  try{

    oldScanner.clear();

  }
  catch(e){}


  resetScannerUI();

}



/* =========================
   RESET UI
========================= */

function resetScannerUI(){

  document
    .getElementById(
      "readerBox"
    )
    .classList
    .add(
      "hidden"
    );


  document
    .getElementById(
      "openBtn"
    )
    .classList
    .remove(
      "hidden"
    );


  document
    .getElementById(
      "closeBtn"
    )
    .classList
    .add(
      "hidden"
    );


  scanLock =
    false;

}



/* =========================
   ESCAPE HTML
========================= */

function escapeHtml(
  value
){

  return String(
    value == null
      ? ""
      : value
  )
  .replace(
    /[&<>"']/g,
    function(c){

      const map = {

        "&":
          "&amp;",

        "<":
          "&lt;",

        ">":
          "&gt;",

        '"':
          "&quot;",

        "'":
          "&#39;"

      };


      return map[c];

    }
  );

}
