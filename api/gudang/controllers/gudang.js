'use strict';

/**
 * Read the documentation (https://strapi.io/documentation/developer-docs/latest/development/backend-customization.html#core-controllers)
 * to customize this controller
 */

module.exports = {
  async create(ctx) {
    let response = await strapi.services["gudang"].create(ctx.request.body);
    const detailStok = await strapi.services["detail-stok-barang"].find();
    for (let index = 0; index < detailStok.length; index++) {
      const element = detailStok[index];
      if (index === 0)
      console.debug(element)
      element.gudangs.push(response.id)
      element.detail.push({
          id : response.id,
          stok_A : 0,
          stok_B : 0,
          stok_C : 0,
          stok_D : 0,
          stok_E : 0,
          stok_F : 0
      })    
      await strapi.services["detail-stok-barang"].update({id : element.id}, {gudangs: element.gudangs, detail : element.detail});
    }
    ctx.send(response)
  }
};
