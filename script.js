let scanner = null;
let scanLock = false;


function openScanner(){

  if(scanner){
    return;
  }

  if(typeof Html5Qrcode === "undefined"){

    alert("โหลดระบบ QR ไม่สำเร็จ");

    return;
  }


  document
    .getElementById("readerBox")
    .classList
    .remove("hidden");


  document
    .getElementById("openBtn")
    .classList
    .add("hidden");


  document
    .getElementById("closeBtn")
    .classList
    .remove("hidden");


  scanLock = false;


  scanner =
    new Html5Qrcode(
      "reader"
    );


  const config = {

    fps: 10,

    qrbox: function(
      width,
      height
    ){

      let size =
        Math.min(
          width,
          height
        ) * 0.7;


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

      onScanSuccess,

      function(error){

        // ตอนยังหา QR ไม่เจอ
        // ไม่ต้องทำอะไร

      }

    )

    .then(function(){

      console.log(
        "Camera started"
      );

    })

    .catch(function(error){

      console.error(error);

      alert(
        "เปิดกล้องไม่ได้: " +
        error
      );

      resetScannerUI();

      scanner = null;

    });

}



function onScanSuccess(
  decodedText,
  decodedResult
){

  if(scanLock){
    return;
  }


  scanLock = true;


  let value =
    String(
      decodedText || ""
    ).trim();


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


  closeScanner();

}



function closeScanner(){

  if(!scanner){

    resetScannerUI();

    return;

  }


  const oldScanner =
    scanner;


  scanner = null;


  oldScanner
    .stop()

    .then(function(){

      try{

        oldScanner.clear();

      }
      catch(e){}


      resetScannerUI();

    })

    .catch(function(error){

      console.log(error);

      try{

        oldScanner.clear();

      }
      catch(e){}


      resetScannerUI();

    });

}



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


  scanLock = false;

}
