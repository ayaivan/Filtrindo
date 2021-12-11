'use strict';

const knex = require("strapi-connector-bookshelf/lib/knex");

/**
 * Read the documentation (https://strapi.io/documentation/developer-docs/latest/development/backend-customization.html#core-services)
 * to customize this service
 */

module.exports = {
  async updatePO(listOrder){
    for (let index = 0; index < listOrder.length; index++) {
      const order = listOrder[index];
      if(order.idPO !== null) {
        // find PO on table PO
        const listOrderPO = await strapi.services["h-purchase-order"].findOne({id : order.idPO});
        console.debug(listOrderPO)
  
        // find selected item
        let selectedItem = listOrderPO.listOrder.filter(item=> item.id === order.item.id)
        if(selectedItem.length > 0 )
        {
          selectedItem[0].realisasi += parseInt(order.item.jumlah)
          if(selectedItem[0].realisasi > selectedItem[0].jumlah) selectedItem[0].realisasi = selectedItem[0].jumlah
        }
      
        // determine if realisasi - jumlah <= 0 then isEmpty = true
        const diffCount = listOrderPO.listOrder.map(order => order.jumlah - order.realisasi).reduce((prev,curr) => prev+curr)
        
        let isEmpty 
        if(diffCount <= 0) isEmpty = true
        else isEmpty = false
    
        await strapi.services["h-purchase-order"].update({id : order.idPO},{listOrder :listOrderPO.listOrder, isEmpty });
      }
    }
    return JSON.stringify("sukses");
  },
};

// const rawBuilder = strapi.connections.default.raw(`SELECT * FROM h_purchase_orders WHERE id = ${order.idPO}`)
// const resp = await rawBuilder.then();
// const listOrderPO = JSON.parse(resp[0][0].listOrder)