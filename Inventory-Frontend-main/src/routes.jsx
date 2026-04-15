import React, { useState, useCallback, useEffect } from 'react';

import {
  HomeIcon,
  DocumentTextIcon,
  TableCellsIcon,
  InformationCircleIcon,
  ServerStackIcon,
  RectangleStackIcon,
  CreditCardIcon,
  GiftIcon,
  UserIcon,
  UserGroupIcon,
  BriefcaseIcon,
  UsersIcon,
  UserCircleIcon,
} from "@heroicons/react/24/solid";
import { PackageCheck } from 'lucide-react';
import { Layers } from "lucide-react";
import { Store   } from "lucide-react";
import InventoryIcon from '@mui/icons-material/Inventory';
import { Truck } from 'lucide-react';
import { Utensils, Package,CreditCard  } from 'lucide-react';
import {  Assessment as AssessmentIcon } from '@mui/icons-material';
import {
  Home,
   AddEmployees,
  EmployeeManage,
  EmployeeDetails,
  InventoryList,
  AddInventoryOffer,
  EditInventoryOffer,
  OrderForm,
  OrderTable,
  ProductDeliveryForm,
  ProductDeliveryTable,
  ConsumedProductForm,
  ConsumedProductsTable,
  ProductOrderEdit,
  ProductDeliveredEdit,
  ProductConsumeForm,
  ProductConsumptionEdit,
  AccountDetailsTracker,
  PaymentAccountsTable,
  AccountDetailsEdit,
  AddClient,
  ClientsManage,
  AddOperator,
  OperatorManage,
  PlatformList,
  EntryPanelTable,
  EntryPanelForm,
  EntryPanelEdit,
  AssignWorkTable,
  AssignWorkForm,
  AssignWorkEdit,
  AllEmpEnteredData
} from "@/pages/admin";


import{
  HomeEmployee,
  EmpProductOrderEdit,
  EmpOrderForm,
  EmpOrderTable,
  EmpProductDeliveryTable,
  EmpProductDeliveryForm,
  EmpProductDeliveredEdit,
  EmpPaymentAccountsTable,
  EmpAssignWorkTable
} from "@/pages/EmployeePage";

import{
HomeClient,
ClientinventoryList,
ClientproductDeliveredTable,
ClientStockOrderedTable,
ClientAllEmpEnteredData
} from "@/pages/ClientPages";

import{
HomeOperator,
OpAccountDetailsTable,
OpProductDeliveredEdit,OpProductDeliveredTable,
OpProductOrderEdit, OpStockOrderedTable,
OpConsumedProductEdit, OpConsumedProductTable,
OpAddInventoryOffer, OpInventoryList,
OpAddAccountDetails,
OpProductDeliveredForm,
OpSecondProductConsumedForm

} from "@/pages/OperatorPages";

import { SignIn, SignUp, Register, Forgotpassword, ResetPassword } from "@/pages/auth";




const icon = {
  className: "w-5 h-5 text-inherit",
};

export const routes = [
  {
    title: "Menu",
    layout: "admin",
    pages: [
      {
        icon: <HomeIcon {...icon} />,
        name: "dashboard",
        path: "/home",
        element: <Home />,
        
      },
            {
              icon: <CreditCard {...icon} />,
              name: "Account details",
              path: "/account-details",
              subroutes: [
                {
                  name: "add",
                  path: "add",
                  element: <AccountDetailsTracker />,
                  visible: false,
                },
                {
                  name: "Edit Account",
                  path: "edit/:id",
                  element: <AccountDetailsEdit />,
                  visible: false,
                },
                {
                  name: "Manage Accounts",
                  path: "manage-accounts",
                  element: <PaymentAccountsTable />,
                  
                }
              ],
      
            },
            {
              icon: <InventoryIcon {...icon} />,
              name: "Inventory list",
              path: "/inventory_list",
              subroutes: [
                {                       
                 name: "add offer",
                 path: "add_offer",
                 element: <AddInventoryOffer />,
                 visible: false,
                },
                {
                name: "edit offer",
                path: "edit_offer/:id",
                element: <EditInventoryOffer />,
                visible: false,
                },
                {
                  name: "Manage ",
                  path: "manage",
                  element: <InventoryList />,
                },
                {
                  name: "Platform table",
                  path: "platform_table",
                  element: <PlatformList />,
                 
                },
              ],
      
            },
      {
        icon: <HomeIcon {...icon} />,
        name: "product form",
        path: "/order_product",
        element: <OrderForm />,
        visible: false,
        
      },
      {
        icon: <Package />,
        name: "product ordered",
        path: "/order_table",
        element: <OrderTable />,
        
      },
      {
        icon: <Package />,
        name: "Product order editPage",
        path: "/product-ordered_editpage/:id",
        element: <ProductOrderEdit />,
        visible: false,
        
      },
      {
        icon: <Truck/>,
        name: "product delivered form",
        path: "/add_delivered_product",
        element: <ProductDeliveryForm />,
        visible: false,
        
      },
      {
        icon: <Truck/>,
        name: "product delivered",
        path: "/product_delivered",
        element: <ProductDeliveryTable />,
        
      },
      {
        icon: <Truck/>,
        name: "product delivered edit",
        path: "/edit_delivered_product/:id",
        element: <ProductDeliveredEdit />,
        visible: false, 
        
      },
      {
        icon: <Truck/>,
        name: "product consumed",
        path: "/second_consumed_prod_form",
        element: <ProductConsumeForm />,
        visible: false,
       
      },
      {
        icon: <PackageCheck/>,
        name: "product consumed",
        path: "/consumed_products",
        element: <ConsumedProductsTable />,
        
      },
      {
        icon: <PackageCheck/>,
        name: "product consumed edit",
        path: "/consumed_products_edit/:id",
        element: <ProductConsumptionEdit />,
        visible: false,
        
      }, 



    ],

  },

      {
    title: "Punching Panel",
    layout: "admin",
    pages: [
 
      {
        icon: <HomeIcon {...icon} />,
        name: "Entry Panel Form ",
        path: "/EntryPanelForm",
        element: <EntryPanelForm />,
        visible: false,
        
      },
      {
        icon: <Package />,
        name: "Offer Table ",
        path: "/EntryPanelTable",
        element: <EntryPanelTable />,
        
      },
      {
        icon: <PackageCheck/>,
        name: " Entry Panel Edit ",
        path: "/EntryPanelEdit/:id",
        element: <EntryPanelEdit />,
        visible: false,
        
      }, 

        {
        icon: <HomeIcon {...icon} />,
        name: "Assign Work Form ",
        path: "/AssignWorkForm",
        element: <AssignWorkForm />,
        visible: false,
        
      },
      {
        icon: <Package />,
        name: "Assign Work Table",
        path: "/AssignWorkTable",
        element: <AssignWorkTable />,
        
      },
      {
        icon: <PackageCheck/>,
        name: " Assign Work Edit",
        path: "/AssignWorkEdit/:id",
        element: <AssignWorkEdit />,
        visible: false,
        
      }, 

          {
        icon: <Package />,
        name: "All Emp Entered Table ",
        path: "/AllEmpEnteredData",
        element: <AllEmpEnteredData />,
        
      },



    ],

  },

  {
    title: "User",
    layout: "admin",

    pages: [
      {
        icon: <UsersIcon {...icon} />,
        name: "employees",
        path: "/employees",
        // element: <TablesVendor />,
        subroutes: [
          {
            name: "add",
            path: "addEnployees",
            element: <AddEmployees />,
            visible: false,
          },
          {
            name: "manage",
            path: "manageEnployees",
            element: <EmployeeManage />,

          },
          {
            name: "link",
            path: "link/:id",
            element: <EmployeeDetails />,
            visible: false,

          },
        ],

      },
      {
        icon: <UsersIcon {...icon} />,
        name: "clients",
        path: "/clients",
        // element: <TablesVendor />,
        subroutes: [
          {
            name: "add",
            path: "addClients",
            element: <AddClient />,
            visible: false,
          },
          {
            name: "manage",
            path: "manageClients",
            element: <ClientsManage/>,

          },
          {
            name: "link",
            path: "link/:id",
            element: <EmployeeDetails />,
            visible: false,

          },
        ],

      },
            {
        icon: <UsersIcon {...icon} />,
        name: "Operators",
        path: "/operators",
  
        subroutes: [
          {
            name: "add",
            path: "addOperators",
            element: <AddOperator />,
            visible: false,
          },
          {
            name: "manage",
            path: "manageOperators",
            element: <OperatorManage/>,

          },
          {
            name: "link",
            path: "link/:id",
            element: <EmployeeDetails />,
            visible: false,

          },
        ],

      },

    ],
  },



 


  {
    title: "auth pages",
    layout: "auth",
    pages: [
      {
        icon: <ServerStackIcon {...icon} />,
        name: "sign in",
        path: "/sign-in",
        element: <SignIn />,
      },
      {
        icon: <RectangleStackIcon {...icon} />,
        name: "sign up",
        path: "/sign-up",
        element: <SignUp />,
      },
      {
        icon: <RectangleStackIcon {...icon} />,
        name: "sign up",
        path: "/register",
        element: <Register />,
      },
      {
        icon: <RectangleStackIcon {...icon} />,
        name: "Forgote Password",
        path: "/forgot_password",
        element: <Forgotpassword />,
      },
      {
        icon: <RectangleStackIcon {...icon} />,
        name: "reset Password",
        path: "/reset-password/:id/:token",
        element: <ResetPassword />,
      },

    ],
  },


  {
    title: "menu",
    layout: "employee",
    pages: [
      {
        icon: <HomeIcon {...icon} />,
        name: "dashboard",
        path: "/home",
        element: <HomeEmployee />,
      },
      {
        icon: <HomeIcon {...icon} />,
        name: "product form",
        path: "/order_product",
        element: <EmpOrderForm />,
        visible: false,
        
      },
      {
        icon: <Package />,
        name: "product ordered",
        path: "/order_table",
        element: <EmpOrderTable />,
        
      },
      {
        icon: <Truck />,
        name: "product Delivered",
        path: "/product_delivered",
        element: <EmpProductDeliveryTable />,
        
      },
      {
        icon: <Package />,
        name: "product Delivered Form",
        path: "/product_delivered_form",
        element: <EmpProductDeliveryForm />,
        visible: false,
      },
      {
        icon: <Package />,
        name: "product Delivered Edit",
        path: "/product_delivered_edit/:id",
        element: <EmpProductDeliveredEdit />,
        visible: false,
      },
      {
        icon: <Package />,
        name: "Product order editPage",
        path: "/product-ordered_editpage/:id",
        element: <EmpProductOrderEdit />,
        visible: false,
        
      },
      {
        icon: <CreditCard />,
        name: "Account Details",
        path: "/account_details",
        element: <EmpPaymentAccountsTable />,
      },
       {
        icon: <Package />,
        name: "Assign Work Table",
        path: "/EmpAssignWorkTable",
        element: <EmpAssignWorkTable />,
        
      },
    ],
  },
    {
    title: "menu",
    layout: "client",
    pages: [
      {
        icon: <HomeIcon {...icon} />,
        name: "dashboard",
        path: "/home",
        element: <HomeClient />,
      },
        {
        icon: <Package />,
        name: "Inventory List ",
        path: "/ClientinventoryList",
        element: <ClientinventoryList />,
        
      },
       {
        icon: <Package />,
        name: "Product Ordered ",
        path: "/ClientStockOrderedTable",
        element: <ClientStockOrderedTable />,
      },
      {
        icon: <Truck />,
        name: "Product Delivered",
        path: "/ClientproductDeliveredTable",
        element: <ClientproductDeliveredTable />,
        
      },
       {
        icon: <Package />,
        name: "All Emp Entered Data ",
        path: "/ClientAllEmpEnteredData",
        element: <ClientAllEmpEnteredData />,
        
      },
     


    ],
  },


    {
    title: "menu",
    layout: "operator",
    pages: [
      {
        icon: <HomeIcon {...icon} />,
        name: "dashboard",
        path: "/home",
        element: <HomeOperator />,
      },

           {
              icon: <InventoryIcon {...icon} />,
              name: "Inventory list",
              path: "/inventory_list",
              subroutes: [
                {                       
                 name: "add offer",
                 path: "OpAddInventoryOffer",
                 element: <OpAddInventoryOffer />,
                 visible: false,
                },
             
                {
                  name: "Manage ",
                  path: "OpInventoryList",
                  element: <OpInventoryList />,
                },
              
              ],
      
            },

         {
        icon: <Package />,
        name: "product ordered",
        path: "/OpStockOrderedTable",
        element: <OpStockOrderedTable />,
        
      },
      {
        icon: <Package />,
        name: "Product order editPage",
        path: "/OpProductOrderEdit/:id",
        element: <OpProductOrderEdit />,
        visible: false,
        
      },
         {
        icon: <Truck/>,
        name: "product delivered",
        path: "/OpProductDeliveredTable",
        element: <OpProductDeliveredTable />,
        
      },
      {
        icon: <Truck/>,
        name: "product delivered edit",
        path: "/OpProductDeliveredEdit/:id",
        element: <OpProductDeliveredEdit />,
        visible: false, 
        
      },
         {
        icon: <Truck/>,
        name: "product delivered form",
        path: "/OpProductDeliveredForm",
        element: <OpProductDeliveredForm />,
        visible: false,
        
      },
       {
        icon: <PackageCheck/>,
        name: "product consumed",
        path: "/OpConsumedProductTable",
        element: <OpConsumedProductTable />,
        
      },
      {
        icon: <PackageCheck/>,
        name: "product consumed edit",
        path: "/OpConsumedProductEdit/:id",
        element: <OpConsumedProductEdit />,
        visible: false,
        
      }, 
          {
        icon: <Truck/>,
        name: "product consumed Add Form",
        path: "/OpSecondProductConsumedForm",
        element: <OpSecondProductConsumedForm />,
        visible: false,
       
      },
    
            {
              icon: <CreditCard {...icon} />,
              name: "Account details",
              path: "/account-details",
              subroutes: [
                {
                  name: "add account",
                  path: "OpAddAccountDetails",
                  element: <OpAddAccountDetails />,
                  visible: false,
                },
           
                {
                  name: "Account Details",
                  path: "OpAccountDetailsTable",
                  element: <OpAccountDetailsTable />,
                  
                }
              ],
      
            },

    ],
  },
];

export default routes;
