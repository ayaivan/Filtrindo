"use strict";

const knex = require("strapi-connector-bookshelf/lib/knex");

/**
 * Read the documentation (https://strapi.io/documentation/developer-docs/latest/development/backend-customization.html#core-services)
 * to customize this service
 */

module.exports = {
  async updatePOInsert(listOrder, headerLPB, newLPB) {
    const updatedListOrder = [];
    for (let index = 0; index < listOrder.length; index++) {
      const order = listOrder[index];
      // update PO
      if (order.idPO !== null) {
        // find PO on table PO
        const listOrderPO = await strapi.services["h-purchase-order"].findOne({
          id: order.idPO,
        });

        // find selected item
        let selectedItem = listOrderPO.listOrder.filter(
          (item) => item.id === order.item.id
        );
        if (selectedItem.length > 0) {
          selectedItem[0].realisasi += parseFloat(order.item.jumlah);
          // if(selectedItem[0].realisasi > selectedItem[0].jumlah) selectedItem[0].realisasi = selectedItem[0].jumlah
        }

        // determine if realisasi - jumlah <= 0 then isEmpty = true
        const diffCount = listOrderPO.listOrder
          .map((order) => order.jumlah - order.realisasi)
          .reduce((prev, curr) => prev + curr);

        let isEmpty;
        if (diffCount <= 0) isEmpty = true;
        else isEmpty = false;

        await strapi.services["h-purchase-order"].update(
          { id: order.idPO },
          { listOrder: listOrderPO.listOrder, isEmpty }
        );
      }

      // mutasi stok
      const payLoad = {
        barang: order.item.id,
        tanggal: headerLPB.tanggal_lpb,
        asal: "PBeli",
        masuk: order.item.jumlah,
        keluar: 0,
        hargaDolar: order.item.harga_dolar,
        hargaRupiah: order.item.harga_rupiah,
        kurs: headerLPB.kurs,
        gudang: headerLPB.gudang.id,
        surat: headerLPB.nota,
        createdBy: headerLPB.createdBy,
        updatedBy: headerLPB.updatedBy,
      };
      const mutasiResponse = await strapi.services["mutasi-stok"].create(
        payLoad
      );
      order.idMutasiStok = mutasiResponse.id;

      // detail stok
      const objItem = await strapi.services["detail-stok-barang"].findOne({
        barang: order.item.id,
      });
      const stokGudang = objItem.detail.filter(
        (item) => item.id === headerLPB.gudang.id
      );
      if (stokGudang.length > 0)
        stokGudang[0].stok_A += parseFloat(order.item.jumlah);
      const stokResponse = await strapi.services["detail-stok-barang"].update(
        { barang: order.item.id },
        { detail: objItem.detail }
      );
      order.idStokDetail = stokResponse.id;

      // buku besar
      let purchaseCode = await strapi.services["akuntansi-mapping"].findOne({
        nama: "Pembelian",
      });
      purchaseCode = purchaseCode.akunting;
      let debtCode = await strapi.services["akuntansi-mapping"].findOne({
        nama: "Hutang dagang pembelian",
      });
      debtCode = debtCode.akunting;
      let hppCode = await strapi.services["akuntansi-mapping"].findOne({
        nama: "HPP",
      });
      hppCode = hppCode.akunting;
      const warehouseCode = headerLPB.gudang.akunting;
      const bukuBesarResponse = [];
      const pembelianBukuBesar = {
        akunting: purchaseCode.id,
        customer: null,
        supplier: headerLPB.supplier,
        tanggal: headerLPB.tanggal_lpb,
        debet: order.item.harga_rupiah * order.item.jumlah,
        kredit: 0,
        surat: headerLPB.nota,
        kode_bank: null,
        jenis: "PBeli",
        keterangan: null,
        createdBy: headerLPB.createdBy,
        updatedBy: headerLPB.updatedBy,
      };
      bukuBesarResponse.push(
        await strapi.services["buku-besar"].create(pembelianBukuBesar)
      );
      const hutangBukuBesar = {
        akunting: debtCode.id,
        customer: null,
        supplier: headerLPB.supplier,
        tanggal: headerLPB.tanggal_lpb,
        debet: 0,
        kredit: order.item.harga_rupiah * order.item.jumlah,
        surat: headerLPB.nota,
        kode_bank: null,
        jenis: "PBeli",
        keterangan: null,
        createdBy: headerLPB.createdBy,
        updatedBy: headerLPB.updatedBy,
      };
      bukuBesarResponse.push(
        await strapi.services["buku-besar"].create(hutangBukuBesar)
      );
      const hppBukuBesar = {
        akunting: hppCode.id,
        customer: null,
        supplier: headerLPB.supplier,
        tanggal: headerLPB.tanggal_lpb,
        debet: 0,
        kredit: order.item.harga_rupiah * order.item.jumlah,
        surat: headerLPB.nota,
        kode_bank: null,
        jenis: "PBeli",
        keterangan: null,
        createdBy: headerLPB.createdBy,
        updatedBy: headerLPB.updatedBy,
      };
      bukuBesarResponse.push(
        await strapi.services["buku-besar"].create(hppBukuBesar)
      );
      const persediaanBukuBesar = {
        akunting: warehouseCode,
        customer: null,
        supplier: headerLPB.supplier,
        tanggal: headerLPB.tanggal_lpb,
        debet: order.item.harga_rupiah * order.item.jumlah,
        kredit: 0,
        surat: headerLPB.nota,
        kode_bank: null,
        jenis: "PBeli",
        keterangan: null,
        createdBy: headerLPB.createdBy,
        updatedBy: headerLPB.updatedBy,
      };
      bukuBesarResponse.push(
        await strapi.services["buku-besar"].create(persediaanBukuBesar)
      );
      order.idBukuBesar = bukuBesarResponse.map((bukuBesar) => bukuBesar.id);
      updatedListOrder.push(order);
    }
    const orderPayLoad = updatedListOrder.map((order) => ({
      idPO: order.idPO,
      item: order.item,
      idMutasiStok: order.idMutasiStok,
      idStokDetail: order.idStokDetail,
      idBukuBesar: order.idBukuBesar,
    }));
    const updateResponse = await strapi.services["purchase-lpb"].update(
      { id: newLPB.id },
      { order_list: orderPayLoad }
    );
    return JSON.stringify(updateResponse);
  },

  async updatePOUpdate(listOrder, headerLPB, idLPB) {
    const updatedListOrder = [];
    for (let index = 0; index < listOrder.length; index++) {
      const order = listOrder[index];
      // update PO
      if (order.idPO !== null) {
        // find PO on table PO
        const listOrderPO = await strapi.services["h-purchase-order"].findOne({
          id: order.idPO,
        });

        // find selected item
        let selectedItem = listOrderPO.listOrder.filter(
          (item) => item.id === order.item.id
        );
        if (selectedItem.length > 0) {
          if (!order.isDeleted) {
            if (order.oldData.jumlah > order.item.jumlah)
              selectedItem[0].realisasi -= parseFloat(
                order.oldData.jumlah - order.item.jumlah
              );
            else if (order.oldData.jumlah < order.item.jumlah)
              selectedItem[0].realisasi += parseFloat(
                order.item.jumlah - order.oldData.jumlah
              );
          } else selectedItem[0].realisasi -= parseFloat(order.oldData.jumlah);
          // if(selectedItem[0].realisasi > selectedItem[0].jumlah) selectedItem[0].realisasi = selectedItem[0].jumlah
        }

        // determine if realisasi - jumlah <= 0 then isEmpty = true
        const diffCount = listOrderPO.listOrder
          .map((order) => order.jumlah - order.realisasi)
          .reduce((prev, curr) => prev + curr);

        let isEmpty;
        if (diffCount <= 0) isEmpty = true;
        else isEmpty = false;

        await strapi.services["h-purchase-order"].update(
          { id: order.idPO },
          { listOrder: listOrderPO.listOrder, isEmpty }
        );
      }

      // mutasi stok
      if (!order.isNew && !order.isDeleted)
        await strapi.services["mutasi-stok"].update(
          { id: order.idMutasiStok },
          {
            tanggal: headerLPB.tanggal_lpb,
            masuk: order.item.jumlah,
            hargaDolar: order.item.harga_dolar,
            hargaRupiah: order.item.harga_rupiah,
            kurs: headerLPB.kurs,
            gudang: headerLPB.gudang.id,
            surat: headerLPB.nota,
            updatedBy: headerLPB.updatedBy,
          }
        );
      else if (order.isDeleted) {
        await strapi.services["mutasi-stok"].delete({ id: order.idMutasiStok });
        order.idMutasiStok = null;
      } else if (order.isNew) {
        const payLoad = {
          barang: order.item.id,
          tanggal: headerLPB.tanggal_lpb,
          asal: "PBeli",
          masuk: order.item.jumlah,
          keluar: 0,
          hargaDolar: order.item.harga_dolar,
          hargaRupiah: order.item.harga_rupiah,
          kurs: headerLPB.kurs,
          gudang: headerLPB.gudang.id,
          surat: headerLPB.nota,
          createdBy: headerLPB.createdBy,
          updatedBy: headerLPB.updatedBy,
        };
        const mutasiResponse = await strapi.services["mutasi-stok"].create(
          payLoad
        );
        order.idMutasiStok = mutasiResponse.id;
      }

      // detail stok
      const objItem = await strapi.services["detail-stok-barang"].findOne({
        barang: order.item.id,
      });
      const stokGudang = objItem.detail.filter(
        (item) => item.id === headerLPB.gudang.id
      );
      if (stokGudang.length > 0) {
        if (!order.isDeleted) {
          if (order.oldData.jumlah > order.item.jumlah)
            stokGudang[0].stok_A -= parseFloat(
              order.oldData.jumlah - order.item.jumlah
            );
          else if (order.oldData.jumlah < order.item.jumlah)
            stokGudang[0].stok_A += parseFloat(
              order.item.jumlah - order.oldData.jumlah
            );
        } else stokGudang[0].stok_A -= parseFloat(order.oldData.jumlah);
      }
      const stokResponse = await strapi.services["detail-stok-barang"].update(
        { barang: order.item.id },
        { detail: objItem.detail }
      );
      order.idStokDetail = stokResponse.id;

      // buku besar
      if (!order.isDeleted && !order.isNew) {
        await strapi.services["buku-besar"].update(
          { id: order.idBukuBesar[0] },
          {
            supplier: headerLPB.supplier,
            tanggal: headerLPB.tanggal_lpb,
            debet: order.item.harga_rupiah * order.item.jumlah,
            surat: headerLPB.nota,
            updatedBy: headerLPB.updatedBy,
          }
        );
        await strapi.services["buku-besar"].update(
          { id: order.idBukuBesar[1] },
          {
            supplier: headerLPB.supplier,
            tanggal: headerLPB.tanggal_lpb,
            kredit: order.item.harga_rupiah * order.item.jumlah,
            surat: headerLPB.nota,
            updatedBy: headerLPB.updatedBy,
          }
        );
        await strapi.services["buku-besar"].update(
          { id: order.idBukuBesar[2] },
          {
            supplier: headerLPB.supplier,
            tanggal: headerLPB.tanggal_lpb,
            kredit: order.item.harga_rupiah * order.item.jumlah,
            surat: headerLPB.nota,
            updatedBy: headerLPB.updatedBy,
          }
        );
        await strapi.services["buku-besar"].update(
          { id: order.idBukuBesar[3] },
          {
            supplier: headerLPB.supplier,
            tanggal: headerLPB.tanggal_lpb,
            debet: order.item.harga_rupiah * order.item.jumlah,
            surat: headerLPB.nota,
            updatedBy: headerLPB.updatedBy,
          }
        );
      } else if (order.isDeleted) {
        await strapi.services["buku-besar"].delete({
          id: order.idBukuBesar[0],
        });
        await strapi.services["buku-besar"].delete({
          id: order.idBukuBesar[1],
        });
        await strapi.services["buku-besar"].delete({
          id: order.idBukuBesar[2],
        });
        await strapi.services["buku-besar"].delete({
          id: order.idBukuBesar[3],
        });
        order.idBukuBesar = null;
      } else if (order.isNew) {
        // buku besar
        let purchaseCode = await strapi.services["akuntansi-mapping"].findOne({
          nama: "Pembelian",
        });
        purchaseCode = purchaseCode.akunting;
        let debtCode = await strapi.services["akuntansi-mapping"].findOne({
          nama: "Hutang dagang pembelian",
        });
        debtCode = debtCode.akunting;
        let hppCode = await strapi.services["akuntansi-mapping"].findOne({
          nama: "HPP",
        });
        hppCode = hppCode.akunting;
        console.log(headerLPB.gudang);
        const warehouseCode = headerLPB.gudang.akunting;
        const bukuBesarResponse = [];
        const pembelianBukuBesar = {
          akunting: purchaseCode.id,
          customer: null,
          supplier: headerLPB.supplier,
          tanggal: headerLPB.tanggal_lpb,
          debet: order.item.harga_rupiah * order.item.jumlah,
          kredit: 0,
          surat: headerLPB.nota,
          kode_bank: null,
          jenis: "PBeli",
          keterangan: null,
          createdBy: headerLPB.createdBy,
          updatedBy: headerLPB.updatedBy,
        };
        bukuBesarResponse.push(
          await strapi.services["buku-besar"].create(pembelianBukuBesar)
        );
        const hutangBukuBesar = {
          akunting: debtCode.id,
          customer: null,
          supplier: headerLPB.supplier,
          tanggal: headerLPB.tanggal_lpb,
          debet: 0,
          kredit: order.item.harga_rupiah * order.item.jumlah,
          surat: headerLPB.nota,
          kode_bank: null,
          jenis: "PBeli",
          keterangan: null,
          createdBy: headerLPB.createdBy,
          updatedBy: headerLPB.updatedBy,
        };
        bukuBesarResponse.push(
          await strapi.services["buku-besar"].create(hutangBukuBesar)
        );
        const hppBukuBesar = {
          akunting: hppCode.id,
          customer: null,
          supplier: headerLPB.supplier,
          tanggal: headerLPB.tanggal_lpb,
          debet: 0,
          kredit: order.item.harga_rupiah * order.item.jumlah,
          surat: headerLPB.nota,
          kode_bank: null,
          jenis: "PBeli",
          keterangan: null,
          createdBy: headerLPB.createdBy,
          updatedBy: headerLPB.updatedBy,
        };
        bukuBesarResponse.push(
          await strapi.services["buku-besar"].create(hppBukuBesar)
        );
        const persediaanBukuBesar = {
          akunting: warehouseCode,
          customer: null,
          supplier: headerLPB.supplier,
          tanggal: headerLPB.tanggal_lpb,
          debet: order.item.harga_rupiah * order.item.jumlah,
          kredit: 0,
          surat: headerLPB.nota,
          kode_bank: null,
          jenis: "PBeli",
          keterangan: null,
          createdBy: headerLPB.createdBy,
          updatedBy: headerLPB.updatedBy,
        };
        bukuBesarResponse.push(
          await strapi.services["buku-besar"].create(persediaanBukuBesar)
        );
        order.idBukuBesar = bukuBesarResponse.map((bukuBesar) => bukuBesar.id);
      }

      if (!order.isDeleted) updatedListOrder.push(order);
    }
    const orderPayLoad = updatedListOrder.map((order) => ({
      idPO: order.idPO,
      item: order.item,
      idMutasiStok: order.idMutasiStok,
      idStokDetail: order.idStokDetail,
      idBukuBesar: order.idBukuBesar,
    }));
    const updateResponse = await strapi.services["purchase-lpb"].update(
      { id: idLPB },
      { order_list: orderPayLoad }
    );
    return JSON.stringify("sukses");
  },

  async updateLPB(listOrder, headerLPB, purchase, mode) {
    const updatedListOrder = [];
    const mutasiBarangDetails = [];
    const bukuBesarDetails = [];

    // buku besar
    let purchaseCode = await strapi.services["akuntansi-mapping"].findOne({
      nama: "Pembelian",
    });
    purchaseCode = purchaseCode.akunting;
    let debtCode = await strapi.services["akuntansi-mapping"].findOne({
      nama: "Hutang dagang pembelian",
    });
    debtCode = debtCode.akunting;
    let hppCode = await strapi.services["akuntansi-mapping"].findOne({
      nama: "HPP",
    });
    hppCode = hppCode.akunting;
    const warehouseCode = headerLPB.gudang.akunting;
    const accountingListCode = [
      purchaseCode.id,
      debtCode.id,
      warehouseCode,
      hppCode.id,
    ];

    for (let index = 0; index < listOrder.length; index++) {
      const order = listOrder[index];
      // update PO
      if (order.idPO !== null) {
        // find PO on table PO
        const listOrderPO = await strapi.services["h-purchase-order"].findOne({
          id: order.idPO,
        });

        // find selected item
        let selectedItem = listOrderPO.listOrder.filter(
          (item) => item.id === order.item.id
        );
        if (selectedItem.length > 0) {
          if (!order.isDeleted) {
            if (order.oldData.jumlah > order.item.jumlah)
              selectedItem[0].realisasi -= parseFloat(
                order.oldData.jumlah - order.item.jumlah
              );
            else if (order.oldData.jumlah < order.item.jumlah)
              selectedItem[0].realisasi += parseFloat(
                order.item.jumlah - order.oldData.jumlah
              );
          } else selectedItem[0].realisasi -= parseFloat(order.oldData.jumlah);
        }

        // determine if realisasi - jumlah <= 0 then isEmpty = true
        const diffCount = listOrderPO.listOrder
          .map((order) => order.jumlah - order.realisasi)
          .reduce((prev, curr) => prev + curr);

        let isEmpty;
        if (diffCount <= 0) isEmpty = true;
        else isEmpty = false;

        await strapi.services["h-purchase-order"].update(
          { id: order.idPO },
          { listOrder: listOrderPO.listOrder, isEmpty }
        );
      }
      // preparing detail for mutasi barang
      if (!order.isDeleted)
        mutasiBarangDetails.push({
          idBarang: order.item.id,
          masuk: order.item.jumlah,
          keluar: 0,
          hargaDolar: order.item.harga_dolar,
          hargaRupiah: order.item.harga_rupiah,
        });

      // detail stok
      const objItem = await strapi.services["detail-stok-barang"].findOne({
        barang: order.item.id,
      });
      const stokGudang = objItem.detail.filter(
        (item) => item.id === headerLPB.gudang.id
      );
      if (stokGudang.length > 0)
        stokGudang[0].stok_A += parseFloat(order.item.jumlah);
      const stokResponse = await strapi.services["detail-stok-barang"].update(
        { barang: order.item.id },
        { detail: objItem.detail }
      );

      // preparing detail buku besar
      if (!order.isDeleted) {
        bukuBesarDetails.push({
          entity_1: {
            idAkunting: purchaseCode.id,
            idBarang: order.item.id,
            debet: order.item.harga_rupiah * order.item.jumlah,
            kredit: 0,
          },
          entity_2: {
            idAkunting: debtCode.id,
            idBarang: order.item.id,
            debet: 0,
            kredit: order.item.harga_rupiah * order.item.jumlah,
          },
          entity_3: {
            idAkunting: warehouseCode.id,
            idBarang: order.item.id,
            debet: order.item.harga_rupiah * order.item.jumlah,
            kredit: 0,
          },
          entity_4: {
            idAkunting: hppCode.id,
            idBarang: order.item.id,
            debet: 0,
            kredit: order.item.harga_rupiah * order.item.jumlah,
          },
        });
      }
    }
    // mutasi stok
    const payLoadMutasi = {
      barangs: headerLPB.barangs,
      tanggal: headerLPB.tanggal_lpb,
      kurs: headerLPB.kurs,
      asal: "PBeli",
      gudang: headerLPB.gudang.id,
      surat: headerLPB.nota,
      createdBy: headerLPB.createdBy,
      updatedBy: headerLPB.updatedBy,
      purchase_lpb: purchase.id,
      details: mutasiBarangDetails,
    };
    if (mode === "put")
      await strapi.services["mutasi-barang"].update(
        { id: purchase.mutasi_barang.id },
        payLoadMutasi
      );
    else if (mode === "post")
      await strapi.services["mutasi-barang"].create(payLoadMutasi);

    // buku besar
    const payLoadBukuBesar = {
      tanggal: headerLPB.tanggal_lpb,
      surat: headerLPB.nota,
      kode_bank: null,
      jenis: "PBeli",
      keterangan: null,
      createdBy: headerLPB.createdBy,
      updatedBy: headerLPB.updatedBy,
      akuntings: accountingListCode,
      purchase_lpb: purchase.id,
      customer: null,
      supplier: headerLPB.supplier,
      details: bukuBesarDetails,
    };
    if (mode === "put")
      await strapi.services["akunting-buku-besar"].update(
        { id: purchase.akunting_buku_besar.id },
        payLoadBukuBesar
      );
    else if (mode === "post")
      await strapi.services["akunting-buku-besar"].create(payLoadBukuBesar);

    return JSON.stringify("sukses");
  },
};

// const rawBuilder = strapi.connections.default.raw(`SELECT * FROM h_purchase_orders WHERE id = ${order.idPO}`)
// const resp = await rawBuilder.then();
// const listOrderPO = JSON.parse(resp[0][0].listOrder)
