const express = require('express');
const router = express.Router();
const {GetAllEmployees,
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
}= require('../../controllers/AdminPage/Employees');


router.get('/employees', GetAllEmployees);

///approve the employee status
router.put('/employees/:id/approve',ApproveEmployeeStatus);

router.put('/employees/:id/cancel',IncactiveEmployeeStatus);

//ban employee
router.put('/employees/:id/ban',BanEmployee);

//delete employee
router.delete('/employees/:id',DeleteEmployee);

//update Employee
router.put('/employees/:id',UpdateEmployee);

//get employee by id
router.get('/employees/:id',GetEmployeeById);

//get all saled person
router.get('/sales-employees',GetAllSalesPersons);

//get all delivery persons
router.get('/delivery-persons',GetAllDeliveryPersons);

router.get('/clients', GetAllClients);

router.get('/operators', GetAllOperators);

module.exports = router;