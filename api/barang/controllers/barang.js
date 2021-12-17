'use strict';

/**
 * Read the documentation (https://strapi.io/documentation/developer-docs/latest/development/backend-customization.html#core-controllers)
 * to customize this controller
 */

module.exports = {
  async create(ctx) {        
      let response = await strapi.services["barang"].create(ctx.request.body);
      const responseGudang = await strapi.services["gudang"].find();
      
      const gudangId = responseGudang.map(gudang => gudang.id)
      const gudangJSON = responseGudang.map(gudang=> ({
        id : gudang.id,
        stok_A : 0,
        stok_B : 0,
        stok_C : 0,
        stok_D : 0,
        stok_E : 0,
        stok_F : 0
      }))
      console.debug(gudangJSON)

      const payLoadStokGudang = {
        barang : response.id,
        gudangs : gudangId,
        detail : gudangJSON
      }
      response = await strapi.services["detail-stok-barang"].create(payLoadStokGudang);
      ctx.send(response)
  }
};
