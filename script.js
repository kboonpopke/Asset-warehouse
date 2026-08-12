async function submitNewAsset(){

  try{

    const operator =
      getOperator();


    const assetTag =
      value("newTag").trim();


    if(!assetTag){

      toast(
        "กรุณาระบุ Asset Tag"
      );

      return;

    }


    showModalLoading();


    let photoUrl = "";


    /* =========================
       PHOTO
       รูปมีปัญหาก็ไม่หยุดการบันทึก
    ========================= */

    const photoInput =
      document.getElementById(
        "newPhoto"
      );


    if(
      photoInput &&
      photoInput.files &&
      photoInput.files.length > 0
    ){

      try{

        photoUrl =
          await apiUploadAssetPhoto(
            photoInput.files[0],
            assetTag
          );

      }

      catch(photoError){

        console.error(
          "Photo upload error:",
          photoError
        );


        /*
          ไม่ throw
          เพื่อให้ Asset ยังบันทึกต่อได้
        */

        photoUrl = "";

      }

    }


    /* =========================
       SAVE ASSET
    ========================= */

    const res =
      await apiNewAsset({

        assetTag:
          assetTag,

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

        department:
          "",

        user:
          "",

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

        photoUrl:
          photoUrl,

        remark:
          value(
            "newRemark"
          ),

        operator:
          operator

      });


    if(!res){

      throw new Error(
        "Server ไม่ตอบกลับ"
      );

    }


    if(res.error){

      throw new Error(
        res.error
      );

    }


    if(res.ok === false){

      throw new Error(
        res.message ||
        "บันทึก Asset ไม่สำเร็จ"
      );

    }


    closeModal();


    currentAsset =
      res.asset;


    renderAsset(
      res.asset,
      res.history || []
    );


    if(photoInput &&
       photoInput.files &&
       photoInput.files.length > 0 &&
       !photoUrl){

      toast(
        "บันทึก Asset สำเร็จ ✅ แต่รูปยังอัปโหลดไม่ได้"
      );

    }

    else{

      toast(
        "บันทึก Asset สำเร็จ ✅"
      );

    }

  }

  catch(e){

    closeModal();


    console.error(
      "SAVE ERROR:",
      e
    );


    toast(
      "บันทึกไม่ได้: " +
      (
        e.message ||
        String(e)
      )
    );

  }

}
