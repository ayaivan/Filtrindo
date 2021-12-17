'use strict';

/**
 * Read the documentation (https://strapi.io/documentation/developer-docs/latest/development/backend-customization.html#core-controllers)
 * to customize this controller
 */

module.exports = {
  async create(ctx) {
    const response = await strapi.services["akuntansi-mapping"].updateEntity(ctx.request.body.entity);
    ctx.send(response)
  }
};
