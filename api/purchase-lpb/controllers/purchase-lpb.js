'use strict';

/**
 * Read the documentation (https://strapi.io/documentation/developer-docs/latest/development/backend-customization.html#core-controllers)
 * to customize this controller
 */

module.exports = {
  async create(ctx) {
    const result = await strapi.services["purchase-lpb"].create(ctx.request.body.header);
    await strapi.services["purchase-lpb"].updatePO(ctx.request.body.detail);
  
    return result;
  },
  async saveOrder(ctx) {
    // await strapi.services["purchase-lpb"].insertLPB(ctx.request.body.header)
    let responseOrder = 
    ctx.send("sukses");
  },
};
