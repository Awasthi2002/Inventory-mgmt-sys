const User = require('../../models/User');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { jwtSecret } = require('../../config/config');
const nodemailer = require('nodemailer');



  const GetAllEmployees = async(req,res)=>{
    try {
        const employees = await User.find({
          role: { $in: ['User','Employee'] }
        }).select('-password'); // Exclude the password field from the results
    
        res.json(employees);
      } catch (error) {
        console.error('Error fetching employees:', error);
        res.status(500).json({ message: 'Server error' });
      }
  };

  const GetAllSalesPersons = async (req, res) => {
    try {
      const salesPersons = await User.find({ role: 'Sales Person' }).select('-password'); // Exclude the password field from the results
      
      res.json(salesPersons);
    } catch (error) {
      console.error('Error fetching sales persons:', error);
      res.status(500).json({ message: 'Server error' });
    }
  };

  const GetAllDeliveryPersons = async (req, res) => {
    try {
      const deliveryPersons = await User.find({ role: 'Delivery Person' }).select('-password'); // Exclude the password field from the results
      
      res.json(deliveryPersons);
    } catch (error) {
      console.error('Error fetching delivery persons:', error);
      res.status(500).json({ message: 'Server error' });
    }
  };
  
  

  const ApproveEmployeeStatus = async(req,res)=>{
    try {
        const employee = await User.findByIdAndUpdate(
          req.params.id,
          { status: 1 },
          { new: true }
        );
    
        if (!employee) {
          return res.status(404).json({ message: 'Employee not found' });
        }
    
        res.json(employee);
      } catch (error) {
        console.error('Error approving employee:', error);
        res.status(500).json({ message: 'Server error' });
      }
  };


  const IncactiveEmployeeStatus = async(req,res)=>{
    try {
        const employee = await User.findByIdAndUpdate(
          req.params.id,
          { status: 0 },
          { new: true }
        );
    
        if (!employee) {
          return res.status(404).json({ message: 'Employee not found' });
        }
    
        res.json(employee);
      } catch (error) {
        console.error('Error cancelling employee:', error);
        res.status(500).json({ message: 'Server error' });
      }
  }

  const BanEmployee = async(req,res)=>{
    try {
        const employee = await User.findByIdAndUpdate(
          req.params.id,
          { status: 3 },
          { new: true }
        );
    
        if (!employee) {
          return res.status(404).json({ message: 'Employee not found' });
        }
    
        res.json(employee);
      } catch (error) {
        console.error('Error banning employee:', error);
        res.status(500).json({ message: 'Server error' });
      }
  }



  const DeleteEmployee= async(req,res)=>{
    try {
        const { id } = req.params;
        const deletedEmployee = await User.findByIdAndDelete(id);
        
        if (!deletedEmployee) {
          return res.status(404).json({ message: 'Employee not found' });
        }
        
        res.status(200).json({ message: 'Employee deleted successfully', employee: deletedEmployee });
      } catch (error) {
        console.error('Error deleting employee:', error);
        res.status(500).json({ message: 'Server error', error: error.message });
      }
  }

  const UpdateEmployee = async(req,res)=>{
    try {
        const { fullName, email, phone, role } = req.body;
        const updatedEmployee = await User.findByIdAndUpdate(
          req.params.id,
          { fullName, email, phone, role },
          { new: true }
        );
        if (!updatedEmployee) {
          return res.status(404).json({ message: 'Employee not found' });
        }
        res.json(updatedEmployee);
      } catch (error) {
        res.status(500).json({ message: 'Server error' });
      }
  };


  const GetEmployeeById = async(req,res)=>{
    try {
        const employee = await User.findById(req.params.id);
        if (!employee) {
          return res.status(404).json({ message: 'Employee not found' });
        }
        res.json(employee);
      } catch (error) {
        res.status(500).json({ message: 'Server error' });
      }
  };

const GetAllClients = async (req, res) => {
  try {
    console.log('Fetching all clients with role "Client"');
    
    const clients = await User.find({
      role: 'client'
    }).select('-password'); // Exclude the password field from the results

    console.log(`Successfully retrieved ${clients.length} client(s)`);
    res.json(clients);
  } catch (error) {
    console.error('Error fetching clients:', {
      message: error.message,
      stack: error.stack,
      query: { role: 'Client' }
    });
    res.status(500).json({ message: 'Server error' });
  }
};


const GetAllOperators = async (req, res) => {
  try {
    console.log('Fetching all operator with role "operator"');
    
    const clients = await User.find({
      role: 'operator'
    }).select('-password'); // Exclude the password field from the results

    console.log(`Successfully retrieved ${clients.length} operator(s)`);
    res.json(clients);
  } catch (error) {
    console.error('Error fetching operator:', {
      message: error.message,
      stack: error.stack,
      query: { role: 'operator' }
    });
    res.status(500).json({ message: 'Server error' });
  }
};

module.exports = { GetAllEmployees,
    ApproveEmployeeStatus,
    IncactiveEmployeeStatus,
    BanEmployee,
    DeleteEmployee,
    UpdateEmployee,
    GetEmployeeById,
    GetAllSalesPersons,
    GetAllDeliveryPersons,
    GetAllClients,
    GetAllOperators
};