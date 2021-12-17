'use strict';

/**
 * Read the documentation (https://strapi.io/documentation/developer-docs/latest/development/backend-customization.html#core-controllers)
 * to customize this controller
 */

module.exports = {
  async create(ctx) {
    const result = await strapi.services["purchase-lpb"].create(ctx.request.body.header);
    await strapi.services["purchase-lpb"].updateLPB(ctx.request.body.detail, ctx.request.body.header, result, 'post');
  
    return result;
  },
  async update(ctx) {
    const result = await strapi.services["purchase-lpb"].update({id:ctx.params.id},ctx.request.body.header);
    await strapi.services["purchase-lpb"].updateLPB(ctx.request.body.detail, ctx.request.body.header, result, 'put');
    return result;
  },
  async saveOrder(ctx) {
    // await strapi.services["purchase-lpb"].insertLPB(ctx.request.body.header)
    let responseOrder = 
    ctx.send("sukses");
  },
};
