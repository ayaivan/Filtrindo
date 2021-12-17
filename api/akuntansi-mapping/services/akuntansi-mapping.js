'use strict';

/**
 * Read the documentation (https://strapi.io/documentation/developer-docs/latest/development/backend-customization.html#core-services)
 * to customize this service
 */

module.exports = {
  async updateEntity(entity) {
    console.debug(entity)
    entity.forEach(async element => {
      if(element.akunting !== null && element.akunting.id !== undefined)
        await strapi.services["akuntansi-mapping"].update({id:element.id}, {akunting : element.akunting.id})
      else await strapi.services["akuntansi-mapping"].update({id:element.id}, {akunting : null})
    });
    return JSON.stringify("sukses");
  }
};
