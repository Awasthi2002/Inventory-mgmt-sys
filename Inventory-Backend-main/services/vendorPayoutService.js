// services/vendorPayoutService.js
const mongoose = require('mongoose');
const VendorPayout = require('../models/VendorPayout');


const VendorPayoutHistory = require('../models/PayoutHistory');


async function updateVendorPayout(id, updateData) {
    try {
      const vendorPayout = await VendorPayout.findById(id);
  
      if (!vendorPayout) {
        throw new Error('VendorPayout not found');
      }
  
      // Find the latest VendorPayoutHistory document for this payout
      const latestHistory = await VendorPayoutHistory.findOne({ payout_id: id, payout_end: null });
  
      if (latestHistory) {
        // Update the end date of the previous history entry
        latestHistory.payout_end = new Date(updateData.payout_start);
        await latestHistory.save();
      }
  
      // Create a new history entry
      const newHistory = new VendorPayoutHistory({
        payout_id: id,
        payout: updateData.payout,
        payout_start: updateData.payout_start,
        payout_end: null,
        isOverRevenue: updateData.isOverRevenue,
        overRevenueAmount: updateData.overRevenueAmount
      });
      await newHistory.save();
  
      // Update the VendorPayout
      Object.assign(vendorPayout, updateData);
      await vendorPayout.save();
  
      return vendorPayout;
    } catch (error) {
      console.error('Error in updateVendorPayout:', error);
      throw error;
    }
  };

  async function updateVendorPayoutHistory(historyId, updateData) {
    try {
      const history = await VendorPayoutHistory.findById(historyId);
  
      if (!history) {
        throw new Error('Payout history entry not found');
      }
  
      Object.assign(history, updateData);
      await history.save();
  
      return history;
    } catch (error) {
      console.error('Error in updateVendorPayoutHistory:', error);
      throw error;
    }
  }
  
  async function deleteVendorPayoutHistory(historyId) {
    try {
      const result = await VendorPayoutHistory.findByIdAndDelete(historyId);
  
      if (!result) {
        throw new Error('Payout history entry not found');
      }
  
      return { message: 'Payout history entry deleted successfully' };
    } catch (error) {
      console.error('Error in deleteVendorPayoutHistory:', error);
      throw error;
    }
  }
  
  

module.exports = { updateVendorPayout ,
  updateVendorPayoutHistory,
  deleteVendorPayoutHistory
};