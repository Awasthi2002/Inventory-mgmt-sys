const mongoose = require('mongoose');
const Bonus = require('../models/Bonus');
const BonusHistory = require('../models/BonusHistory');

async function updateBonus(id, updateData) {
  try {
    const bonus = await Bonus.findById(id);

    if (!bonus) {
      throw new Error('Bonus not found');
    }

    // Find the latest BonusHistory document for this bonus
    const latestHistory = await BonusHistory.findOne({ bonus_payout_id: id, bonus_end: null });

    if (latestHistory) {
      // Update the end date of the previous history entry
      latestHistory.bonus_end = new Date(updateData.bonus_start);
      await latestHistory.save();
    }

    // Create a new history entry
    const newHistory = new BonusHistory({
      bonus_payout_id: id,
      bonus_amount: updateData.bonus_amount,
      bonus_start: updateData.bonus_start,
      bonus_end: null
    });
    await newHistory.save();

    // Update the Bonus
    Object.assign(bonus, updateData);
    await bonus.save();

    return bonus;
  } catch (error) {
    console.error('Error in updateBonus:', error);
    throw error;
  }
}

async function updateBonusHistory(historyId, updateData) {
  try {
    const history = await BonusHistory.findById(historyId);

    if (!history) {
      throw new Error('Bonus history entry not found');
    }

    Object.assign(history, updateData);
    await history.save();

    return history;
  } catch (error) {
    console.error('Error in updateBonusHistory:', error);
    throw error;
  }
}

async function deleteBonusHistory(historyId) {
  try {
    const result = await BonusHistory.findByIdAndDelete(historyId);

    if (!result) {
      throw new Error('Bonus history entry not found');
    }

    return { message: 'Bonus history entry deleted successfully' };
  } catch (error) {
    console.error('Error in deleteBonusHistory:', error);
    throw error;
  }
}

module.exports = { updateBonus, updateBonusHistory, deleteBonusHistory };