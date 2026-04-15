const Brand = require('../models/Brand');
const User = require('../models/User');
const fs = require('fs').promises;
const mongoose = require('mongoose');

const Payment = require('../models/AccountDetails');

const createPayment = async (req, res) => {
    try {
      const { paymentType } = req.body;
      
      // Build the payment object based on the payment type
      const paymentData = {
        name: req.body.name,
        paymentType,
        phoneNumber: req.body.phoneNumber
      };
      
      // Add the specific payment details based on type
      if (paymentType === 'card') {
        paymentData.cardDetails = {
          cardNumber: req.body.cardNumber,
          cardType: req.body.cardType,
          expirationDate: req.body.expirationDate,
          cvv: req.body.cvv
        };
      } else if (paymentType === 'upi') {
        paymentData.upiDetails = {
          upiId: req.body.upiId,
          bankName: req.body.bankName,
          accountNumber: req.body.accountNumber,
          ifscCode: req.body.ifscCode
        };
      }
      
      // Create and save the payment
      const payment = new Payment(paymentData);
      await payment.save();
      
      res.status(201).json({
        success: true,
        message: 'Payment method saved successfully',
        data: payment
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        message: 'Error saving payment method',
        error: error.message
      });
    }
  }


  const getAllPayments = async (req, res) => {
    try {
      const payments = await Payment.find()
       .sort({ createdAt: -1 });
      res.status(200).json({
        success: true,
        count: payments.length,
        data: payments
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Error retrieving payment methods',
        error: error.message
      });
    }
  }

  const getPaymentById = async (req, res) => {
    try {
      const payment = await Payment.findById(req.params.id);
      
      if (!payment) {
        return res.status(404).json({
          success: false,
          message: 'Payment not found'
        });
      }
  
      res.status(200).json({
        success: true,
        data: payment
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Error retrieving payment',
        error: error.message
      });
    }
  };


  const updatePayment = async (req, res) => {
    try {
      const { id } = req.params;
      const { paymentType, name, phoneNumber, cardDetails, upiDetails } = req.body;
      
      // Build the payment object based on the payment type
      const paymentData = {
        name,
        paymentType,
        phoneNumber
      };
      
      // Add the specific payment details based on type and how they're structured in the request
      if (paymentType === 'card' && cardDetails) {
        paymentData.cardDetails = {
          cardNumber: cardDetails.cardNumber,
          cardType: cardDetails.cardType,
          expirationDate: cardDetails.expirationDate,
          cvv: cardDetails.cvv
        };
      } else if (paymentType === 'upi' && upiDetails) {
        paymentData.upiDetails = {
          upiId: upiDetails.upiId,
          bankName: upiDetails.bankName,
          accountNumber: upiDetails.accountNumber,
          ifscCode: upiDetails.ifscCode
        };
      }
      
     
      
      // Find and update the payment
      const payment = await Payment.findByIdAndUpdate(
        id,
        paymentData,
        { new: true, runValidators: true }
      );
      
      if (!payment) {
        return res.status(404).json({
          success: false,
          message: 'Payment method not found'
        });
      }
      
      res.status(200).json({
        success: true,
        message: 'Payment method updated successfully',
        data: payment
      });
    } catch (error) {
      console.error('Error updating payment:', error);
      res.status(400).json({
        success: false,
        message: 'Error updating payment method',
        error: error.message
      });
    }
  };


  const deletePayment = async (req, res) => {
    try {
      const { id } = req.params;
      
      // Find and delete the payment
      const payment = await Payment.findByIdAndDelete(id);
      
      if (!payment) {
        return res.status(404).json({
          success: false,
          message: 'Payment method not found'
        });
      }
      
      res.status(200).json({
        success: true,
        message: 'Payment method deleted successfully',
        data: payment
      });
    } catch (error) {
      console.error('Error deleting payment:', error);
      res.status(400).json({
        success: false,
        message: 'Error deleting payment method',
        error: error.message
      });
    }
  };

module.exports= {
    createPayment,
    getAllPayments,
    getPaymentById,
    updatePayment,
    deletePayment
  };