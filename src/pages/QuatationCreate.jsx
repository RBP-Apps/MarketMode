// src/pages/QuatationCreate.jsx
import { useState, useEffect, useCallback } from "react";
import QuotationPreview from "../components/layout/QuotationPreview";
import {
  Save,
  Calendar,
  User,
  Phone,
  Mail,
  Building,
  MapPin,
  FileText,
  Hash,
  Percent,
  CreditCard,
  UserCheck,
  CheckCircle,
  Zap,
  Clock,
  Grid,
  Home,
  ArrowRight,
  Package,
  PlusCircle,
  FileSignature,
  Copy,
  Download,
  Printer,
  Trash2,
  Eye,
  XCircle,
  Search,
  RefreshCw,
  ArrowLeft,
  // Add these two icons
  Fingerprint,
  Map,
  Send,
  MessageCircle,
} from "lucide-react";
import AdminLayout from "../components/layout/AdminLayout";

export default function QuatationCreate() {
  // State for list/view mode
  const [viewMode, setViewMode] = useState("list"); // "list" or "form"
  const [selectedEnquiry, setSelectedEnquiry] = useState(null);

  // State for list view
  const [activeTab, setActiveTab] = useState("pending");
  const [fmsData, setFmsData] = useState([]);
  const [filteredData, setFilteredData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  //   const [dealerBankMap, setDealerBankMap] = useState({});
  // Update the state declaration
  const [dealerBankMap, setDealerBankMap] = useState({});


  // Add these after other state declarations
const [showSendModal, setShowSendModal] = useState(false);
const [selectedQuotation, setSelectedQuotation] = useState(null);
const [isSending, setIsSending] = useState(false);


const [sendingWhatsApp, setSendingWhatsApp] = useState(false);
const [sendingEmail, setSendingEmail] = useState(false);
const [sendingBoth, setSendingBoth] = useState(false);

  // State for form view
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [customerMap, setCustomerMap] = useState({});
  const [successMessage, setSuccessMessage] = useState("");
  const [dropdownOptions, setDropdownOptions] = useState({
    salesperson: [],
    customer: [],
    dealer: [],
    structureType: [],
    placeOfInstallation: [],
    termsConditions: [],
    rating: [],
    referenceBy: [],
    bankAccount: [],
    needTypes: [],
  });

  const [showPreview, setShowPreview] = useState(false);
  const [isSubmittingToSheet, setIsSubmittingToSheet] = useState(false);

  // Add this new state for product details
  const [productDetails, setProductDetails] = useState({
    productName: "",
    bom: "",
    size: "",
    gst: "",
    rate: "",
    amount: "",
  });

  // Add this state for product data mapping
  const [productMap, setProductMap] = useState({});

  const [salespersons, setSalespersons] = useState(["S N Sahu"]);

 

  const [formData, setFormData] = useState({
    date: "",
    salesperson: "",
    customer: "",
    contactNo: "",
    email: "",
    dealer: "",
    phoneNo: "",
    structureType: "",
    placeOfInstallation: "",
    termsConditions:
      "On Grid:\n1. We will process for approval from competent authority for net metering. Any other approval is in your scope.\n2. Processing fee payable to CREDA/CSPDCL as applicable.\n3. Generation Guarantee of 1.5kWh/W per annum",
    rating: "",
    qty: "",
    subCentral: "",
    subState: "",
    disc: "",
    referenceBy: "",
    bankAccount: "",
    accountNo: "", // New field
    ifscCode: "", // New field
    branch: "", // New field
    loadDetails: "",
    failureHours: "",
    needType: "",
    enquiryNumber: "",
    generalTerms:
          "1. Power output from Control Panel will be in customers scope.\n2. Civil work other than Module Mounting Structure will be in customer's scope.\n3. Our offer is valid for 15 Days. Any custom specifications will be charged extra.\n4. Regular cleaning of Modules with plain water (soft) for desired generation guarantee in customer's scope.\n5. Detailed Quotation with engineering document will be provided on finalisation, for systems above 10KW.\n6. Subsidy (if any) is subject to government approval and will be directly credited in customer's account.\n7. Transportation inclusive. Insurance inclusive upto site and thereafter in customer's scope.\n8. Payment 50% advance on booking, Balance 50% against PI before dispatch of material.\n9. Delivery within 2 weeks from sanction and installation immediately thereafter.\n10. AMC inclusive for 5 years and chargeable thereafter.\n11. Structure height consider 5 feet, for additional height should charge extra.\n12. DC, AC, Earthing cable length considered 30 meter, for additional length should charge extra.",
  });

  // Google Apps Script URL
  const APPS_SCRIPT_URL =
    "https://script.google.com/macros/s/AKfycbzF4JjwpmtgsurRYkORyZvQPvRGc06VuBMCJM00wFbOOtVsSyFiUJx5xtb1J0P5ooyf/exec";

  // Format current date for default value
  const getCurrentDate = () => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, "0");
    const day = String(now.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  };

  // Fetch FMS Data for list view
  // const fetchFMSData = async () => {
  //   setLoading(true);
  //   try {
  //     const res = await fetch(`${APPS_SCRIPT_URL}?sheet=FMS&action=fetch`);
  //     const data = await res.json();
  //     const rows = data.table.rows;

  //     const formattedData = [];

  //     // Skip header rows (first 6 rows)
  //     rows.slice(6).forEach((row, index) => {
  //       if (row.c && row.c.length > 0) {
  //         const rowData = {
  //           id: index,
  //           enquiryNumber: row.c[1]?.v || "", // Column B
  //           beneficiaryName: row.c[2]?.v || "", // Column C
  //           address: row.c[3]?.v || "", // Column D
  //           villageBlock: row.c[4]?.v || "", // Column E
  //           district: row.c[5]?.v || "", // Column F
  //           contactNumber: row.c[6]?.v || "", // Column G
  //           presentLoad: row.c[7]?.v || "", // Column H
  //           bpNumber: row.c[8]?.v || "", // Column I
  //           cspdclContractDemand: row.c[9]?.v || "", // Column J
  //           avgElectricityBill: row.c[10]?.v || "", // Column K
  //           futureLoadRequirement: row.c[11]?.v || "", // Column L
  //           loadDetails: row.c[12]?.v || "", // Column M
  //           hoursOfFailure: row.c[13]?.v || "", // Column N
  //           structureType: row.c[14]?.v || "", // Column O
  //           roofType: row.c[15]?.v || "", // Column P
  //           systemType: row.c[16]?.v || "", // Column Q
  //           needType: row.c[17]?.v || "", // Column R
  //           projectMode: row.c[18]?.v || "", // Column S
  //           planned1: row.c[31]?.v || "", // Column T
  //           actual1: row.c[32]?.v || "", // Column U
  //         };

  //         // Only include rows where Planned1 is not null/empty
  //         if (rowData.planned1 && rowData.planned1.trim() !== "") {
  //           formattedData.push(rowData);
  //         }
  //       }
  //     });

  //     setFmsData(formattedData);
  //   } catch (err) {
  //     console.error("Error fetching FMS data:", err);
  //   } finally {
  //     setLoading(false);
  //   }
  // };.


  // Fetch FMS Data for list view
const fetchFMSData = async () => {
  setLoading(true);
  console.log("🔍 Starting fetchFMSData...");
  
  try {
    // First fetch quotation copy data
    console.log("📞 Calling fetchQuotationCopyData...");
    const quotationMap = await fetchQuotationCopyData();
    console.log("📞 Received quotationMap:", quotationMap);
    
    console.log("📞 Fetching FMS data...");
    const res = await fetch(`${APPS_SCRIPT_URL}?sheet=FMS&action=fetch`);
    console.log("📡 FMS Response status:", res.status);
    
    const data = await res.json();
    console.log("📊 Full FMS data:", data);
    console.log("📊 FMS rows count:", data.table?.rows?.length || 0);
    
    const rows = data.table.rows;
    const formattedData = [];

    // Log first few rows to see structure
    console.log("🔍 First 5 rows of FMS (raw):");
    for (let i = 0; i < Math.min(5, rows.length); i++) {
      console.log(`Row ${i}:`, rows[i]);
    }

    // Skip header rows (first 6 rows)
    rows.slice(6).forEach((row, index) => {
      if (row.c && row.c.length > 0) {
        const enquiryNumber = row.c[1]?.v || "";
        
        const rowData = {
          id: index,
          enquiryNumber: enquiryNumber,
          beneficiaryName: row.c[2]?.v || "", // Column C
          address: row.c[3]?.v || "", // Column D
          villageBlock: row.c[4]?.v || "", // Column E
          district: row.c[5]?.v || "", // Column F
          contactNumber: row.c[6]?.v || "", // Column G
          presentLoad: row.c[7]?.v || "", // Column H
          bpNumber: row.c[8]?.v || "", // Column I
          cspdclContractDemand: row.c[9]?.v || "", // Column J
          avgElectricityBill: row.c[10]?.v || "", // Column K
          futureLoadRequirement: row.c[11]?.v || "", // Column L
          loadDetails: row.c[12]?.v || "", // Column M
          hoursOfFailure: row.c[13]?.v || "", // Column N
          structureType: row.c[14]?.v || "", // Column O
          roofType: row.c[15]?.v || "", // Column P
          systemType: row.c[16]?.v || "", // Column Q
          needType: row.c[17]?.v || "", // Column R
          projectMode: row.c[18]?.v || "", // Column S
          planned1: row.c[31]?.v || "", // Column T
          actual1: row.c[32]?.v || "", // Column U
          quotationCopy: quotationMap[enquiryNumber] || "Not Generated", // Add quotation copy from map
        };

        console.log(`🔍 Row ${index}: Enquiry: ${enquiryNumber}, Quotation Copy from map: ${quotationMap[enquiryNumber] || "Not Found"}`);

        // Only include rows where Planned1 is not null/empty
        if (rowData.planned1 && rowData.planned1.trim() !== "") {
          formattedData.push(rowData);
        }
      }
    });

    console.log(`✅ Total formatted data: ${formattedData.length}`);
    console.log("📊 Sample formatted data (first 3):", formattedData.slice(0, 3));
    
    // Log history data specifically
    const historyData = formattedData.filter(item => item.actual1 && item.actual1.trim() !== "");
    console.log(`📊 History data count: ${historyData.length}`);
    console.log("📊 History data with quotation copies:", historyData.map(item => ({
      enquiry: item.enquiryNumber,
      quotationCopy: item.quotationCopy
    })));

    setFmsData(formattedData);
  } catch (err) {
    console.error("❌ Error fetching FMS data:", err);
  } finally {
    setLoading(false);
    console.log("🏁 fetchFMSData completed");
  }
};

  // Function to upload PDF to Google Drive
  const uploadPDFToDrive = async (pdfBlob, fileName) => {
    const DRIVE_FOLDER_ID = "1SUhoI00UZ8jkao8tXVCPAbyBZLoYp5ko";

    const formData = new FormData();
    formData.append("file", pdfBlob);
    formData.append("fileName", fileName);
    formData.append("folderId", DRIVE_FOLDER_ID);

    try {
      // You need to create a Google Apps Script endpoint for this
      const response = await fetch(`${APPS_SCRIPT_URL}?action=uploadPDF`, {
        method: "POST",
        body: formData,
        mode: "no-cors",
      });
      return true;
    } catch (error) {
      console.error("Error uploading to Drive:", error);
      return false;
    }
  };

  
// Function to call Google Apps Script for sending WhatsApp/Email
const handleSend = async (sendType, quotationData) => {
  // Set appropriate loading state
  if (sendType === 'whatsapp') setSendingWhatsApp(true);
  else if (sendType === 'email') setSendingEmail(true);
  
  try {
    console.log("📤 Sending:", sendType);
    
    // Prepare the data to send to Google Apps Script
    const formPayload = new FormData();
    formPayload.append("action", "sendQuotation");
    formPayload.append("sendType", sendType);
    formPayload.append("enquiryNumber", quotationData.enquiryNumber);
    
    // Call Google Apps Script
    await fetch(APPS_SCRIPT_URL, {
      method: "POST",
      body: formPayload,
      mode: "no-cors"
    });
    
    console.log("✅ Sent successfully to Google Apps Script");
    
    // Close modal and show success message
    setShowSendModal(false);
    setSelectedQuotation(null);
    
    alert(`${sendType === 'whatsapp' ? 'WhatsApp' : 'Email'} sent successfully! Status updated in sheet.`);
    
    // Refresh the data
    fetchFMSData();
    
  } catch (error) {
    console.error("❌ Error in handleSend:", error);
    alert("Error occurred. Please try again.");
  } finally {
    // Reset loading state
    if (sendType === 'whatsapp') setSendingWhatsApp(false);
    else if (sendType === 'email') setSendingEmail(false);
  }
};

// Handle multiple sends (WhatsApp and Email both)
// Handle multiple sends (WhatsApp and Email both)
const handleSendBoth = async (quotationData) => {
  setSendingBoth(true);
  
  try {
    console.log("📤 Sending BOTH WhatsApp and Email for Enquiry:", quotationData.enquiryNumber);
    
    // Send WhatsApp
    const whatsappPayload = new FormData();
    whatsappPayload.append("action", "sendQuotation");
    whatsappPayload.append("sendType", "whatsapp");
    whatsappPayload.append("enquiryNumber", quotationData.enquiryNumber);
    
    await fetch(APPS_SCRIPT_URL, {
      method: "POST",
      body: whatsappPayload,
      mode: "no-cors"
    });
    
    // Send Email
    const emailPayload = new FormData();
    emailPayload.append("action", "sendQuotation");
    emailPayload.append("sendType", "email");
    emailPayload.append("enquiryNumber", quotationData.enquiryNumber);
    
    await fetch(APPS_SCRIPT_URL, {
      method: "POST",
      body: emailPayload,
      mode: "no-cors"
    });
    
    // Send Both status update
    const bothPayload = new FormData();
    bothPayload.append("action", "sendQuotation");
    bothPayload.append("sendType", "both");
    bothPayload.append("enquiryNumber", quotationData.enquiryNumber);
    
    await fetch(APPS_SCRIPT_URL, {
      method: "POST",
      body: bothPayload,
      mode: "no-cors"
    });
    
    // Close modal
    setShowSendModal(false);
    setSelectedQuotation(null);
    
    alert("WhatsApp and Email both sent successfully! Status updated in sheet.");
    
    // Refresh the data
    fetchFMSData();
    
  } catch (error) {
    console.error("❌ Error in handleSendBoth:", error);
    alert("Error occurred while sending. Please try again.");
  } finally {
    setSendingBoth(false);
  }
};

// Handle View button click
const handleViewQuotation = (row) => {
  setSelectedQuotation(row);
  setShowSendModal(true);
};




  // Function to submit data to sheet
const submitToSheet = async (formDataToSubmit) => {
  const currentTimestamp = getCurrentTimestamp();

  const amount = parseFloat(productDetails.amount || 0);
const disc = parseFloat(formData.disc || 0);
const gst = parseFloat(productDetails.gst || 0);
const central = parseFloat(formData.subCentral || 0);
const state = parseFloat(formData.subState || 0);

const afterDiscount = amount - (amount * disc) / 100;

const gstAmount =
  gst < 1
    ? afterDiscount * gst
    : (afterDiscount * gst) / 100;

const afterGST = afterDiscount + gstAmount;

const netCost = afterGST - central - state;

  const rowData = [
    formDataToSubmit.quotationNo,
    formDataToSubmit.date,
    formDataToSubmit.salesperson,
    formDataToSubmit.customer,
    formDataToSubmit.contactNo,
    formDataToSubmit.email,
    formDataToSubmit.dealer,
    formDataToSubmit.phoneNo,
    formDataToSubmit.structureType,
    formDataToSubmit.placeOfInstallation,
    formDataToSubmit.termsConditions,
    formDataToSubmit.rating,
    formDataToSubmit.qty,
    formDataToSubmit.subCentral,
    formDataToSubmit.subState,
    formDataToSubmit.disc,
    formDataToSubmit.needType,
    formDataToSubmit.referenceBy,
    formDataToSubmit.bankAccount,
    formDataToSubmit.accountNo,
    formDataToSubmit.ifscCode,
    formDataToSubmit.branch,
    formDataToSubmit.generalTerms || "1. Power output from Control Panel will be in customers scope.\n2. Civil work other than Module Mounting Structure will be in customer's scope.\n3. Our offer is valid for 15 Days. Any custom specifications will be charged extra.\n4. Regular cleaning of Modules with plain water (soft) for desired generation guarantee in customer's scope.\n5. Detailed Quotation with engineering document will be provided on finalisation, for systems above 10KW.\n6. Subsidy (if any) is subject to government approval and will be directly credited in customer's account.\n7. Transportation inclusive. Insurance inclusive upto site and thereafter in customer's scope.\n8. Payment 50% advance on booking, Balance 50% against PI before dispatch of material.\n9. Delivery within 2 weeks from sanction and installation immediately thereafter.\n10. AMC inclusive for 5 years and chargeable thereafter.\n11. Structure height consider 5 feet, for additional height should charge extra.\n12. DC, AC, Earthing cable length considered 30 meter, for additional length should charge extra.",
    formDataToSubmit.failureHours,
    formDataToSubmit.loadDetails,
    productDetails.productName,
    productDetails.bom,
    productDetails.size,
    productDetails.gst,
    productDetails.rate,
    productDetails.amount,
    currentTimestamp,
    formDataToSubmit.enquiryNumber, // ✅ ADD THIS (AG column)
    "",
    "",
    "",
    netCost.toFixed(2) 

  ];

  console.log("rowData",rowData)

  const formPayload = new FormData();
  formPayload.append("sheetName", "Quotation_Create");
  formPayload.append("action", "insert");
  formPayload.append("rowData", JSON.stringify(rowData));

  await fetch(APPS_SCRIPT_URL, {
    method: "POST",
    body: formPayload,
    mode: "no-cors",
  });
};

  // Updated handlePreview function
  const handlePreview = (e) => {
    e.preventDefault();

    // Validate required fields
    const requiredFields = [
      "salesperson",
      "customer",
      "contactNo",
      "structureType",
      "rating",
      "qty",
    ];

    for (const field of requiredFields) {
      if (!formData[field]) {
        alert(
          `Please fill in ${field.replace(/([A-Z])/g, " $1").toLowerCase()}`,
        );
        return;
      }
    }

    setShowPreview(true);
  };

  // Updated handleSubmitWithPDF function
  const handleSubmitWithPDF = async () => {
    setIsSubmittingToSheet(true);

    try {
      // Submit to sheet
      await submitToSheet(formData);

      setSuccessMessage("Quotation created successfully! Data saved to sheet.");

      // Reset form after successful submission
      const newQuotationNo = await generateQuotationNumber();
      setFormData({
        date: getCurrentDate(),
        salesperson: "",
        customer: "",
        contactNo: "",
        email: "",
        dealer: "",
        phoneNo: "",
        structureType: "",
        placeOfInstallation: "",
        termsConditions:
          "On Grid:\n1. We will process for approval from competent authority for net metering. Any other approval is in your scope.\n2. Processing fee payable to CREDA/CSPDCL as applicable.\n3. Generation Guarantee of 1.5kWh/W per annum",
        generalTerms:
          "1. Power output from Control Panel will be in customers scope.\n2. Civil work other than Module Mounting Structure will be in customer's scope.\n3. Our offer is valid for 15 Days. Any custom specifications will be charged extra.\n4. Regular cleaning of Modules with plain water (soft) for desired generation guarantee in customer's scope.\n5. Detailed Quotation with engineering document will be provided on finalisation, for systems above 10KW.\n6. Subsidy (if any) is subject to government approval and will be directly credited in customer's account.\n7. Transportation inclusive. Insurance inclusive upto site and thereafter in customer's scope.\n8. Payment 50% advance on booking, Balance 50% against PI before dispatch of material.\n9. Delivery within 2 weeks from sanction and installation immediately thereafter.\n10. AMC inclusive for 5 years and chargeable thereafter.\n11. Structure height consider 5 feet, for additional height should charge extra.\n12. DC, AC, Earthing cable length considered 30 meter, for additional length should charge extra.",
        rating: "",
        qty: "",
        subCentral: "",
        subState: "",
        disc: "",
        referenceBy: "",
        bankAccount: "",
        accountNo: "",
        ifscCode: "",
        branch: "",
        loadDetails: "",
        failureHours: "",
        needType: "",
        quotationNo: newQuotationNo,
        enquiryNumber: "", // ✅ ADD THIS
      });
      setProductDetails({
        productName: "",
        bom: "",
        size: "",
        gst: "",
        rate: "",
        amount: "",
      });
      setShowPreview(false);

      setTimeout(() => {
        setSuccessMessage("");
      }, 5000);
    } catch (error) {
      console.error("Submission error:", error);
      alert("Error creating quotation. Please try again.");
    } finally {
      setIsSubmittingToSheet(false);
    }
  };



  // Add this function after fetchFMSData function
const fetchQuotationCopyData = async () => {
  console.log("🔍 Fetching Quotation Copy data from Quotation_Create sheet...");
  try {
    const res = await fetch(`${APPS_SCRIPT_URL}?sheet=Quotation_Create&action=fetch`);
    const data = await res.json();
    const rows = data.table.rows;
    
    if (!rows || rows.length === 0) {
      console.log("⚠️ No data in Quotation_Create sheet");
      return {};
    }
    
    // Get headers from first row
    const headers = rows[0]?.c || [];
    console.log("📋 Headers:", headers.map(h => h?.v));
    
    // Find column indices
    let enquiryNumberIndex = -1;
    let quotationCopyIndex = -1;
    
    headers.forEach((header, idx) => {
      const headerText = header?.v?.toString().toLowerCase() || "";
      if (headerText.includes("enquiry number") || headerText === "enquiry number") {
        enquiryNumberIndex = idx;
        console.log(`✅ Enquiry Number column at index: ${idx}`);
      }
      if (headerText.includes("quotation copy") || headerText.includes("quatation copy")) {
        quotationCopyIndex = idx;
        console.log(`✅ Quotation Copy column at index: ${idx}`);
      }
    });
    
    // Fallback to known indices if not found
    if (enquiryNumberIndex === -1) {
      console.log("⚠️ Enquiry Number column not found by header, using index 32");
      enquiryNumberIndex = 32;
    }
    if (quotationCopyIndex === -1) {
      console.log("⚠️ Quotation Copy column not found by header, using index 33");
      quotationCopyIndex = 33;
    }
    
    const quotationMap = {};
    
    // Start from row 1 (skip header)
    for (let i = 1; i < rows.length; i++) {
      const row = rows[i];
      if (row.c && row.c.length > 0) {
        const enquiryNumber = row.c[enquiryNumberIndex]?.v;
        const quotationCopy = row.c[quotationCopyIndex]?.v;
        
        console.log(`📝 Row ${i}: Enquiry Number: ${enquiryNumber}, Quotation Copy: ${quotationCopy}`);
        
        if (enquiryNumber && quotationCopy && enquiryNumber.toString().trim() !== "") {
          quotationMap[enquiryNumber.toString()] = quotationCopy.toString();
          console.log(`✅ Mapped: ${enquiryNumber} -> ${quotationCopy}`);
        }
      }
    }
    
    console.log(`🗺️ Final Quotation Map:`, quotationMap);
    console.log(`📊 Total mapped quotations: ${Object.keys(quotationMap).length}`);
    
    return quotationMap;
  } catch (err) {
    console.error("❌ Error fetching quotation copy data:", err);
    return {};
  }
};

  // Fetch product data from Product_list
  const fetchProductData = async () => {
    try {
      const res = await fetch(
        `${APPS_SCRIPT_URL}?sheet=Product_list&action=fetch`,
      );
      const data = await res.json();
      const rows = data.table.rows;

      const products = [];
      const productMap = {};

      // Skip first row (header) and get data
      for (let i = 1; i < rows.length; i++) {
        const row = rows[i];
        if (row.c && row.c.length > 1) {
          const productNumber = row.c[1]?.v; // Column B - Part Code
          const productName = row.c[2]?.v; // Column C - Product Name
          const bom = row.c[3]?.v; // Column D - BOM
          const size = row.c[4]?.v; // Column E - Size
          const rate = row.c[5]?.v; // Column F - Rate
          const gst = row.c[8]?.v; // Column I - GST %

          if (productNumber && productNumber.trim() !== "") {
            products.push(productNumber);
            productMap[productNumber] = {
              productName: productName || "",
              bom: bom || "",
              size: size || "",
              rate: rate || "",
              gst: gst || "",
            };
          }
        }
      }

      setDropdownOptions((prev) => ({
        ...prev,
        rating: products,
      }));

      setProductMap(productMap);
    } catch (err) {
      console.error("Error fetching product data:", err);
    }
  };

  // Handle product selection
  const handleProductChange = (e) => {
    const productCode = e.target.value;
    setFormData((prev) => ({ ...prev, rating: productCode }));

    const productData = productMap[productCode] || {};
    const qty = parseFloat(formData.qty) || 0;
    const rate = parseFloat(productData.rate) || 0;
    const amount = qty * rate;

    setProductDetails({
      productName: productData.productName || "",
      bom: productData.bom || "",
      size: productData.size || "",
      gst: productData.gst || "",
      rate: productData.rate || "",
      amount: amount.toFixed(2),
    });
  };

  // Handle quantity change to update amount
  const handleQuantityChange = (e) => {
    const qty = e.target.value;
    setFormData((prev) => ({ ...prev, qty }));

    const productData = productMap[formData.rating] || {};
    const rate = parseFloat(productData.rate) || 0;
    const amount = parseFloat(qty) * rate;

    setProductDetails((prev) => ({
      ...prev,
      amount: amount.toFixed(2),
    }));
  };

  // Fetch dropdown data for form
  const fetchFMSDataForForm = async () => {
    try {
      const res = await fetch(`${APPS_SCRIPT_URL}?sheet=FMS&action=fetch`);
      const data = await res.json();
      const rows = data.table.rows;

      const customers = [];
      const map = {};

      const installationPlaces = new Set();
      const structures = new Set();
      const loadDetails = new Set();
      const failureHours = new Set();
      const needTypes = new Set();

      rows.slice(6).forEach((row) => {
        const customer = row.c[2]?.v;
        const contact = row.c[6]?.v;
        const dealer = row.c[3]?.v;
        const email = row.c[8]?.v;
        const rating = row.c[9]?.v;
        const structure = row.c[14]?.v;
        const installation = row.c[3]?.v;
        const load = row.c[12]?.v;
        const failure = row.c[13]?.v;
        const needType = row.c[17]?.v; // Column R: Need Type

        if (customer) {
          customers.push(customer);
          map[customer] = {
            contactNo: contact || "",
            phoneNo: contact || "",
            dealer: dealer || "",
            email: email || "",
            rating: rating || "",
            qty: rating || "",
            structureType: structure || "",
            needType: needType || "",
          };
        }

        if (installation) installationPlaces.add(installation);
        if (structure) structures.add(structure);
        if (load) loadDetails.add(load);
        if (failure) failureHours.add(failure);
        if (needType) needTypes.add(needType);
      });

      setDropdownOptions((prev) => ({
        ...prev,
        customer: customers,
        placeOfInstallation: [...installationPlaces],
        structureType: [...structures],
        loadDetails: [...loadDetails],
        failureHours: [...failureHours],
        needTypes: [...needTypes],
      }));

      setCustomerMap(map);
    } catch (err) {
      console.log(err);
    }
  };

  // Fetch dealer data from Master2
  // Fetch dealer data from Master2
  // Fetch dealer data from Master2
  const fetchDealerData = async () => {
    try {
      const res = await fetch(`${APPS_SCRIPT_URL}?sheet=Master2&action=fetch`);
      const data = await res.json();
      const rows = data.table.rows;

      const dealers = [];
      const dealerBankMap = {};

      // Skip header row if needed
      rows.slice(1).forEach((row) => {
        const dealerName = row.c[0]?.v; // Column A
        const bankAccount = row.c[3]?.v; // Column D
        const accountNo = row.c[4]?.v; // Column E
        const ifscCode = row.c[5]?.v; // Column F
        const branch = row.c[6]?.v; // Column G

        if (dealerName && dealerName.trim() !== "") {
          dealers.push(dealerName);
          dealerBankMap[dealerName] = {
            bankAccount: bankAccount || "",
            accountNo: accountNo || "",
            ifscCode: ifscCode || "",
            branch: branch || "",
          };
        }
      });

      setDropdownOptions((prev) => ({
        ...prev,
        dealer: dealers,
      }));

      setDealerBankMap(dealerBankMap);
    } catch (err) {
      console.error("Error fetching dealer data:", err);
    }
  };

  // Generate next quotation number
const generateQuotationNumber = useCallback(async () => {
  try {
    const response = await fetch(
      `${APPS_SCRIPT_URL}?sheet=Quotation_Create&action=fetch`
    );

    if (!response.ok) {
      throw new Error(`Failed to fetch: ${response.status}`);
    }

    const text = await response.text();
    let data;

    try {
      data = JSON.parse(text);
    } catch (parseError) {
      const jsonStart = text.indexOf("{");
      const jsonEnd = text.lastIndexOf("}");
      if (jsonStart !== -1 && jsonEnd !== -1) {
        const jsonString = text.substring(jsonStart, jsonEnd + 1);
        data = JSON.parse(jsonString);
      } else {
        throw new Error("Invalid JSON response");
      }
    }

    let maxNumber = 0;

    if (data.table && data.table.rows) {
      // Skip header rows and find max quotation number
      for (let i = 1; i < data.table.rows.length; i++) {
        const row = data.table.rows[i];
        if (row.c && row.c[0] && row.c[0].v) {
          const value = row.c[0].v.toString();
          // Check for QUO- prefix or just number
          let num = 0;
          const match = value.match(/(?:QUO-)?(\d+)/);
          if (match) {
            num = parseInt(match[1], 10);
            if (num > maxNumber) {
              maxNumber = num;
            }
          }
        }
      }
    }

    // Start from 1000 if no existing numbers found
    const nextNumber = maxNumber === 0 ? 1001 : maxNumber + 1;
    return `${String(nextNumber).padStart(4, "0")}`; // Return as 1001, 1002, etc.
  } catch (error) {
    console.error("Error generating quotation number:", error);
    // Return a timestamp-based number as fallback
    return `${Date.now()}`;
  }
}, [APPS_SCRIPT_URL]);





  // Initial fetch for list view
  useEffect(() => {
    fetchFMSData();
  }, []);

  useEffect(() => {
    if (viewMode === "form") {
      const initializeForm = async () => {
        const quotationNo = await generateQuotationNumber();
        setFormData((prev) => ({
          ...prev,
          quotationNo,
          date: getCurrentDate(),
        }));
      };

      initializeForm();
      fetchFMSDataForForm();
      fetchDealerData();
      fetchProductData(); // Add this line
    }
  }, [viewMode, generateQuotationNumber]);

  // Filter data based on active tab and search term
 // Filter data based on active tab and search term
useEffect(() => {
  let filtered = fmsData.filter((item) => {
    // Tab filtering
    if (activeTab === "pending") {
      return item.planned1 && (!item.actual1 || item.actual1.trim() === "");
    } else {
      return item.planned1 && item.actual1 && item.actual1.trim() !== "";
    }
  });

  // Search filtering - FIX: convert to string before toLowerCase
  if (searchTerm.trim() !== "") {
    const term = searchTerm.toLowerCase();
    filtered = filtered.filter(
      (item) =>
        (item.enquiryNumber?.toString() || "").toLowerCase().includes(term) ||
        (item.beneficiaryName?.toString() || "").toLowerCase().includes(term) ||
        (item.contactNumber?.toString() || "").toLowerCase().includes(term) ||
        (item.district?.toString() || "").toLowerCase().includes(term) ||
        (item.bpNumber?.toString() || "").toLowerCase().includes(term)
    );
  }

  setFilteredData(filtered);
}, [fmsData, activeTab, searchTerm]);

  // Populate form with selected enquiry data
  useEffect(() => {
    if (selectedEnquiry && viewMode === "form") {
      setFormData((prev) => ({
        ...prev,
        customer: selectedEnquiry.beneficiaryName || "",
        contactNo: selectedEnquiry.contactNumber || "",
        structureType: selectedEnquiry.structureType || "",
        placeOfInstallation: selectedEnquiry.address || "",
        rating: selectedEnquiry.presentLoad || "",
        loadDetails: selectedEnquiry.loadDetails || "",
        failureHours: selectedEnquiry.hoursOfFailure || "",
        needType: selectedEnquiry.needType || "",
        enquiryNumber: selectedEnquiry.enquiryNumber || "",
      }));
    }
  }, [selectedEnquiry, viewMode]);

  const handleCustomerChange = (e) => {
    const value = e.target.value;
    const data = customerMap[value] || {};
    setFormData((prev) => ({
      ...prev,
      customer: value,
      contactNo: data.contactNo || "",
      phoneNo: data.phoneNo || "",
      dealer: data.dealer || "",
      email: data.email || "",
      rating: data.rating || "",
      qty: data.qty || "",
      structureType: data.structureType || "",
      needType: data.needType || "",
    }));
  };

  const handleDealerChange = (e) => {
    const dealerName = e.target.value;
    const dealerData = dealerBankMap[dealerName] || {};

    setFormData((prev) => ({
      ...prev,
      dealer: dealerName,
      bankAccount: dealerData.bankAccount || "",
      accountNo: dealerData.accountNo || "",
      ifscCode: dealerData.ifscCode || "",
      branch: dealerData.branch || "",
    }));
  };

  // const handleChange = (e) => {
  //   const { name, value } = e.target;
  //   setFormData((prev) => ({ ...prev, [name]: value }));
  // };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));

    // If quantity changes, update amount
    if (name === "qty") {
      const productData = productMap[formData.rating] || {};
      const rate = parseFloat(productData.rate) || 0;
      const amount = parseFloat(value) * rate;
      setProductDetails((prev) => ({
        ...prev,
        amount: amount.toFixed(2),
      }));
    }
  };

  const handleViewClick = (enquiry) => {
    setSelectedEnquiry(enquiry);
    setViewMode("form");
  };

  const handleBackToList = () => {
    setViewMode("list");
    setSelectedEnquiry(null);
    setFormData({
      date: "",
      salesperson: "",
      customer: "",
      contactNo: "",
      email: "",
      dealer: "",
      phoneNo: "",
      structureType: "",
      placeOfInstallation: "",
      termsConditions: "",
      rating: "",
      qty: "",
      subCentral: "",
      subState: "",
      disc: "",
      referenceBy: "",
      bankAccount: "",
      loadDetails: "",
      failureHours: "",
      needType: "",
      enquiryNumber: "", // ✅ ADD THIS
    });
  };

  const handleRefresh = () => {
    fetchFMSData();
  };

  // Add this function to get current timestamp
  const getCurrentTimestamp = () => {
    const now = new Date();
    const day = String(now.getDate()).padStart(2, "0");
    const month = String(now.getMonth() + 1).padStart(2, "0");
    const year = now.getFullYear();
    const hours = String(now.getHours()).padStart(2, "0");
    const minutes = String(now.getMinutes()).padStart(2, "0");
    const seconds = String(now.getSeconds()).padStart(2, "0");

    return `${day}/${month}/${year} ${hours}:${minutes}:${seconds}`;
  };



  const updateSendStatus = async (enquiryNumber, sendType) => {
  try {
    // First, fetch the Quotation_Create data to find the row
    const response = await fetch(`${APPS_SCRIPT_URL}?sheet=Quotation_Create&action=fetch`);
    const data = await response.json();
    const rows = data.table.rows;
    
    if (!rows || rows.length === 0) return;
    
    // Get headers
    const headers = rows[0]?.c || [];
    
    // Find column indices
    let enquiryNumberIndex = -1;
    let sendStatusIndex = -1;
    
    headers.forEach((header, idx) => {
      const headerText = header?.v?.toString().toLowerCase() || "";
      if (headerText.includes("enquiry number") || headerText === "enquiry number") {
        enquiryNumberIndex = idx;
      }
      if (headerText.includes("send status") || headerText === "send status") {
        sendStatusIndex = idx;
      }
    });
    
    // Fallback indices if not found (enquiry number is at index 32, send status at index 34)
    if (enquiryNumberIndex === -1) enquiryNumberIndex = 32;
    if (sendStatusIndex === -1) sendStatusIndex = 34;
    
    // Find the row with matching enquiry number
    let targetRowIndex = -1;
    let currentStatus = "";
    
    for (let i = 1; i < rows.length; i++) {
      const row = rows[i];
      if (row.c && row.c.length > enquiryNumberIndex) {
        const rowEnquiryNumber = row.c[enquiryNumberIndex]?.v?.toString();
        if (rowEnquiryNumber === enquiryNumber.toString()) {
          targetRowIndex = i;
          currentStatus = row.c[sendStatusIndex]?.v || "";
          break;
        }
      }
    }
    
    if (targetRowIndex === -1) {
      console.log("No matching enquiry number found");
      return;
    }
    
    // Update the status
    let newStatus = currentStatus;
    if (sendType === 'whatsapp') {
      newStatus = currentStatus ? `${currentStatus}, WhatsApp` : 'WhatsApp';
    } else if (sendType === 'email') {
      newStatus = currentStatus ? `${currentStatus}, Email` : 'Email';
    }
    
    // Prepare update data
    const updateData = {
      sheetName: "Quotation_Create",
      action: "update",
      rowIndex: targetRowIndex,
      columnIndex: sendStatusIndex,
      newValue: newStatus
    };
    
    const formPayload = new FormData();
    formPayload.append("sheetName", "Quotation_Create");
    formPayload.append("action", "update");
    formPayload.append("rowIndex", targetRowIndex);
    formPayload.append("columnIndex", sendStatusIndex);
    formPayload.append("newValue", newStatus);
    
    await fetch(APPS_SCRIPT_URL, {
      method: "POST",
      body: formPayload,
      mode: "no-cors"
    });
    
    console.log(`Updated Send Status for ${enquiryNumber} to: ${newStatus}`);
    
  } catch (error) {
    console.error("Error updating send status:", error);
  }
};


  const handleSubmit = async (e) => {
  e.preventDefault();
  setIsSubmitting(true);

  try {
    const requiredFields = [
      "salesperson",
      "customer",
      "contactNo",
      "structureType",
      "rating",
      "qty",
      "needType",
    ];
    for (const field of requiredFields) {
      if (!formData[field]) {
        alert(
          `Please fill in ${field.replace(/([A-Z])/g, " $1").toLowerCase()}`,
        );
        setIsSubmitting(false);
        return;
      }
    }


    

    const quotationNo = await generateQuotationNumber();
    const currentTimestamp = getCurrentTimestamp();

    // Prepare row data with all columns A to AF
    const rowData = [
      quotationNo, // A: Quotation No
      formData.date, // B: Date
      formData.salesperson, // C: Salesperson
      formData.customer, // D: Customer
      formData.contactNo, // E: Contact No
      formData.email, // F: Email
      formData.dealer, // G: Dealer
      formData.phoneNo, // H: Alternative Phone No
      formData.structureType, // I: Structure Type
      formData.placeOfInstallation, // J: Place of Installation
      formData.termsConditions, // K: Terms & Conditions
      formData.rating, // L: Product
      formData.qty, // M: Qty
      formData.subCentral, // N: Central Subsidy
      formData.subState, // O: State Subsidy
      formData.disc, // P: Discount
      formData.needType, // Q: Need Type
      formData.referenceBy, // R: Reference By
      formData.bankAccount, // S: Bank Name
      formData.accountNo, // T: Account No
      formData.ifscCode, // U: IFSC Code
      formData.branch, // V: Branch
      formData.generalTerms || "1. Power output from Control Panel will be in customers scope.\n2. Civil work other than Module Mounting Structure will be in customer's scope.\n3. Our offer is valid for 15 Days. Any custom specifications will be charged extra.\n4. Regular cleaning of Modules with plain water (soft) for desired generation guarantee in customer's scope.\n5. Detailed Quotation with engineering document will be provided on finalisation, for systems above 10KW.\n6. Subsidy (if any) is subject to government approval and will be directly credited in customer's account.\n7. Transportation inclusive. Insurance inclusive upto site and thereafter in customer's scope.\n8. Payment 50% advance on booking, Balance 50% against PI before dispatch of material.\n9. Delivery within 2 weeks from sanction and installation immediately thereafter.\n10. AMC inclusive for 5 years and chargeable thereafter.\n11. Structure height consider 5 feet, for additional height should charge extra.\n12. DC, AC, Earthing cable length considered 30 meter, for additional length should charge extra.", // W: General Terms & Conditions
      formData.failureHours, // X: Hours of Failures
      formData.loadDetails, // Y: Load Details
      productDetails.productName, // Z: Product Name
      productDetails.bom, // AA: Bill of Material
      productDetails.size, // AB: Size
      productDetails.gst, // AC: GST
      productDetails.rate, // AD: Rate
      productDetails.amount, // AE: Amount
      currentTimestamp, // AF: Actual
      formData.enquiryNumber,
    ];

    const formPayload = new FormData();
    formPayload.append("sheetName", "Quotation_Create");
    formPayload.append("action", "insert");
    formPayload.append("rowData", JSON.stringify(rowData));

    await fetch(APPS_SCRIPT_URL, {
      method: "POST",
      body: formPayload,
      mode: "no-cors",
    });

    setSuccessMessage("Quotation created successfully!");

    // Reset form after successful submission
    const newQuotationNo = await generateQuotationNumber();
    setFormData({
      date: getCurrentDate(),
      salesperson: "",
      customer: "",
      contactNo: "",
      email: "",
      dealer: "",
      phoneNo: "",
      structureType: "",
      placeOfInstallation: "",
      termsConditions:
        "On Grid:\n1. We will process for approval from competent authority for net metering. Any other approval is in your scope.\n2. Processing fee payable to CREDA/CSPDCL as applicable.\n3. Generation Guarantee of 1.5kWh/W per annum",
      generalTerms:
        "1. Power output from Control Panel will be in customers scope.\n2. Civil work other than Module Mounting Structure will be in customer's scope.\n3. Our offer is valid for 15 Days. Any custom specifications will be charged extra.\n4. Regular cleaning of Modules with plain water (soft) for desired generation guarantee in customer's scope.\n5. Detailed Quotation with engineering document will be provided on finalisation, for systems above 10KW.\n6. Subsidy (if any) is subject to government approval and will be directly credited in customer's account.\n7. Transportation inclusive. Insurance inclusive upto site and thereafter in customer's scope.\n8. Payment 50% advance on booking, Balance 50% against PI before dispatch of material.\n9. Delivery within 2 weeks from sanction and installation immediately thereafter.\n10. AMC inclusive for 5 years and chargeable thereafter.\n11. Structure height consider 5 feet, for additional height should charge extra.\n12. DC, AC, Earthing cable length considered 30 meter, for additional length should charge extra.",
      rating: "",
      qty: "",
      subCentral: "",
      subState: "",
      disc: "",
      referenceBy: "",
      bankAccount: "",
      accountNo: "",
      ifscCode: "",
      branch: "",
      loadDetails: "",
      failureHours: "",
      needType: "",
      quotationNo: newQuotationNo,
      enquiryNumber: "", // ✅ Reset enquiryNumber
    });
    
    setProductDetails({
      productName: "",
      bom: "",
      size: "",
      gst: "",
      rate: "",
      amount: "",
    });

    setTimeout(() => {
      setSuccessMessage("");
    }, 3000);
  } catch (error) {
    console.error("Submission error:", error);
    alert("Successfully submitted! (Data has been processed)");

    const newQuotationNo = await generateQuotationNumber();
    setFormData({
      quotationNo: newQuotationNo,
      date: getCurrentDate(),
      salesperson: "",
      customer: "",
      contactNo: "",
      email: "",
      dealer: "",
      phoneNo: "",
      structureType: "",
      placeOfInstallation: "",
      termsConditions:
        "On Grid:\n1. We will process for approval from competent authority for net metering. Any other approval is in your scope.\n2. Processing fee payable to CREDA/CSPDCL as applicable.\n3. Generation Guarantee of 1.5kWh/W per annum",
      generalTerms:
        "1. Power output from Control Panel will be in customers scope.\n2. Civil work other than Module Mounting Structure will be in customer's scope.\n3. Our offer is valid for 15 Days. Any custom specifications will be charged extra.\n4. Regular cleaning of Modules with plain water (soft) for desired generation guarantee in customer's scope.\n5. Detailed Quotation with engineering document will be provided on finalisation, for systems above 10KW.\n6. Subsidy (if any) is subject to government approval and will be directly credited in customer's account.\n7. Transportation inclusive. Insurance inclusive upto site and thereafter in customer's scope.\n8. Payment 50% advance on booking, Balance 50% against PI before dispatch of material.\n9. Delivery within 2 weeks from sanction and installation immediately thereafter.\n10. AMC inclusive for 5 years and chargeable thereafter.\n11. Structure height consider 5 feet, for additional height should charge extra.\n12. DC, AC, Earthing cable length considered 30 meter, for additional length should charge extra.",
      rating: "",
      qty: "",
      subCentral: "",
      subState: "",
      disc: "",
      referenceBy: "",
      bankAccount: "",
      accountNo: "",
      ifscCode: "",
      branch: "",
      loadDetails: "",
      failureHours: "",
      needType: "",
      enquiryNumber: "", // ✅ Reset enquiryNumber
    });
    setProductDetails({
      productName: "",
      bom: "",
      size: "",
      gst: "",
      rate: "",
      amount: "",
    });
  } finally {
    setIsSubmitting(false);
  }
};

  // Table columns for list view
  const tableColumns = [
    // { key: "quotationCopy", label: "Quotation Copy", icon: Copy }, 

    { key: "enquiryNumber", label: "Enquiry No.", icon: FileText },
    { key: "beneficiaryName", label: "Beneficiary Name", icon: User },
    { key: "address", label: "Address", icon: MapPin },
    { key: "villageBlock", label: "Village/Block", icon: MapPin },
    { key: "district", label: "District", icon: MapPin },
    { key: "contactNumber", label: "Contact No.", icon: Phone },
    { key: "presentLoad", label: "Present Load", icon: Zap },
    { key: "bpNumber", label: "BP No.", icon: FileText },
    { key: "cspdclContractDemand", label: "CSPDCL Demand", icon: Zap },
    {
      key: "avgElectricityBill",
      label: "Avg. Bill (6 Months)",
      icon: FileText,
    },
    { key: "futureLoadRequirement", label: "Future Load", icon: Zap },
    { key: "loadDetails", label: "Load Details", icon: FileText },
    { key: "hoursOfFailure", label: "Hours of Failure", icon: Clock },
    { key: "structureType", label: "Structure Type", icon: MapPin },
    { key: "roofType", label: "Roof Type", icon: MapPin },
    { key: "systemType", label: "System Type", icon: Zap },
    { key: "needType", label: "Need Type", icon: FileText },
    { key: "projectMode", label: "Project Mode", icon: FileText },
  ];

  // Enhanced styling classes
  const sectionClass =
    "bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden hover:shadow-xl transition-shadow duration-300";
  const sectionHeaderClass =
    "bg-gradient-to-r from-blue-600 to-indigo-600 px-6 py-4";
  const sectionTitleClass =
    "text-white font-semibold flex items-center text-lg";
  const labelClass = "block text-sm font-medium text-gray-600 mb-1.5";
  const inputClass =
    "w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 bg-gray-50 hover:bg-white focus:bg-white text-gray-700";
  const selectClass =
    "w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 bg-gray-50 hover:bg-white focus:bg-white text-gray-700 appearance-none cursor-pointer";

  return (
    <AdminLayout>
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50 p-6">
        <div className="max-w-7xl mx-auto space-y-6">
          {viewMode === "list" ? (
            /* ========== LIST VIEW ========== */
            <>
              {/* Header */}
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                  <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                    Enquiry Management
                  </h1>
                  <p className="text-gray-500 mt-1 flex items-center gap-2">
                    <FileText className="h-4 w-4" />
                    View and manage enquiries for quotation creation
                  </p>
                </div>

                {/* Refresh Button */}
                <button
                  onClick={handleRefresh}
                  className="px-4 py-2 bg-white border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-50 hover:border-gray-300 transition-all duration-200 flex items-center gap-2 shadow-sm"
                >
                  <RefreshCw
                    className={`h-4 w-4 ${loading ? "animate-spin" : ""}`}
                  />
                  Refresh
                </button>
              </div>

              {/* Tabs */}
              <div className="border-b border-gray-200">
                <div className="flex space-x-8">
                  <button
                    onClick={() => setActiveTab("pending")}
                    className={`py-4 px-1 border-b-2 font-medium text-sm flex items-center gap-2 transition-colors duration-200 ${
                      activeTab === "pending"
                        ? "border-blue-500 text-blue-600"
                        : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                    }`}
                  >
                    <Clock className="h-5 w-5" />
                    Pending
                    <span className="ml-2 bg-blue-100 text-blue-600 px-2 py-0.5 rounded-full text-xs">
                      {
                        fmsData.filter(
                          (item) =>
                            item.planned1 &&
                            (!item.actual1 || item.actual1.trim() === ""),
                        ).length
                      }
                    </span>
                  </button>
                  <button
                    onClick={() => setActiveTab("history")}
                    className={`py-4 px-1 border-b-2 font-medium text-sm flex items-center gap-2 transition-colors duration-200 ${
                      activeTab === "history"
                        ? "border-green-500 text-green-600"
                        : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                    }`}
                  >
                    <CheckCircle className="h-5 w-5" />
                    History
                    <span className="ml-2 bg-green-100 text-green-600 px-2 py-0.5 rounded-full text-xs">
                      {
                        fmsData.filter(
                          (item) =>
                            item.planned1 &&
                            item.actual1 &&
                            item.actual1.trim() !== "",
                        ).length
                      }
                    </span>
                  </button>
                </div>
              </div>

              {/* Search Bar */}
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search by Enquiry No., Beneficiary Name, Contact No., District, BP No...."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200"
                  />
                </div>
              </div>

              {/* Table with fixed header */}
              <div className="bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden">
                <div className="overflow-x-auto max-h-[500px] overflow-y-auto">
                  <table className="min-w-full divide-y divide-gray-200">
          



<thead className="bg-gradient-to-r from-gray-50 to-blue-50 sticky top-0 z-10">
  <tr>
    {/* Pending tab ke liye Action column */}
    {activeTab === "pending" && (
      <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-20 bg-gradient-to-r from-gray-50 to-blue-50">
        Action
      </th>
    )}
    
    {/* History tab ke liye Action column - ALAG SE */}
    {activeTab === "history" && (
      <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-28 bg-gradient-to-r from-gray-50 to-blue-50">
        Action
      </th>
      
    )}

        {activeTab === "history" && (
      <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-32 bg-gradient-to-r from-gray-50 to-blue-50">
        <div className="flex items-center gap-1">
          <Copy className="h-3 w-3" />
          Quotation Copy
        </div>
      </th>
    )}

    
    {/* Baaki saare columns */}
    {tableColumns.map((column) => (
      <th
        key={column.key}
        className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap bg-gradient-to-r from-gray-50 to-blue-50"
      >
        <div className="flex items-center gap-1">
          <column.icon className="h-3 w-3" />
          {column.label}
        </div>
      </th>
    ))}
  </tr>
</thead>




                    <tbody className="bg-white divide-y divide-gray-200">
  {loading ? (
    <tr>
      <td
        colSpan={
          (activeTab === "pending" || activeTab === "history") 
            ? tableColumns.length + 1 
            : tableColumns.length
        }
        className="px-6 py-12"
      >
        <div className="flex justify-center items-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <span className="ml-3 text-gray-500">Loading enquiries...</span>
        </div>
      </td>
    </tr>
  ) : filteredData.length === 0 ? (
    <tr>
      <td
        colSpan={
          (activeTab === "pending" || activeTab === "history") 
            ? tableColumns.length + 1 
            : tableColumns.length
        }
        className="px-6 py-12"
      >
        <div className="text-center">
          <XCircle className="h-12 w-12 text-gray-400 mx-auto mb-3" />
          <p className="text-gray-500 text-lg">No enquiries found</p>
          <p className="text-gray-400 text-sm mt-1">
            {activeTab === "pending"
              ? "No pending enquiries with Planned date"
              : "No history records found"}
          </p>
        </div>
      </td>
    </tr>
  ) : (
    filteredData.map((row) => (
      <tr key={row.id} className="hover:bg-gray-50 transition-colors duration-150">
        {/* Pending tab ka Action button */}
        {activeTab === "pending" && (
          <td className="px-6 py-4 whitespace-nowrap">
            <button
              onClick={() => handleViewClick(row)}
              className="inline-flex items-center px-3 py-1.5 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-colors duration-200 text-sm font-medium"
              title="Create Quotation"
            >
              <Eye className="h-4 w-4 mr-1" />
              View
            </button>
          </td>
        )}
        
        {/* History tab ka Action button - YEH NAYA HAI */}
        {activeTab === "history" && (
          <td className="px-6 py-4 whitespace-nowrap">
            <button
              onClick={() => handleViewQuotation(row)}
              className="inline-flex items-center px-3 py-1.5 bg-green-50 text-green-600 rounded-lg hover:bg-green-100 transition-colors duration-200 text-sm font-medium"
              title="Send Quotation"
            >
              <Eye className="h-4 w-4 mr-1" />
              Send
            </button>
          </td>
        )}

       
   {activeTab === "history" && (
          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
            {row.quotationCopy && row.quotationCopy !== "Not Generated" ? (
              <a 
                href={row.quotationCopy} 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-blue-600 hover:text-blue-800 underline flex items-center gap-1"
              >
                <Copy className="h-4 w-4" />
                View Quotation
              </a>
            ) : (
              <span className="text-gray-400">Not Generated</span>
            )}
          </td>
        )}
        
        {/* Baaki ke columns */}
        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
          {row.enquiryNumber || "N/A"}
        </td>
        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
          {row.beneficiaryName || "N/A"}
        </td>
        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
          {row.address || "N/A"}
        </td>
        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
          {row.villageBlock || "N/A"}
        </td>
        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
          {row.district || "N/A"}
        </td>
        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
          {row.contactNumber || "N/A"}
        </td>
        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
          {row.presentLoad || "N/A"}
        </td>
        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
          {row.bpNumber || "N/A"}
        </td>
        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
          {row.cspdclContractDemand || "N/A"}
        </td>
        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
          {row.avgElectricityBill || "N/A"}
        </td>
        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
          {row.futureLoadRequirement || "N/A"}
        </td>
        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
          {row.loadDetails || "N/A"}
        </td>
        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
          {row.hoursOfFailure || "N/A"}
        </td>
        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
          {row.structureType || "N/A"}
        </td>
        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
          {row.roofType || "N/A"}
        </td>
        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
          {row.systemType || "N/A"}
        </td>
        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
          {row.needType || "N/A"}
        </td>
        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
          {row.projectMode || "N/A"}
        </td>
      </tr>
    ))
  )}
</tbody>


                  </table>

                  {/* Send Modal */}
{/* Send Modal with Loading States */}
{/* Send Modal with separate loading states */}
{showSendModal && selectedQuotation && (
  <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
    <div className="bg-white rounded-xl shadow-2xl max-w-md w-full">
      <div className="bg-gradient-to-r from-blue-600 to-indigo-600 px-6 py-4 rounded-t-xl">
        <h3 className="text-white font-semibold text-lg flex items-center gap-2">
          <FileText className="h-5 w-5" />
          Send Quotation
        </h3>
      </div>
      
      <div className="p-6">
        <div className="mb-6 p-4 bg-gray-50 rounded-lg">
          <p className="text-sm mb-2"><strong>Quotation No:</strong> {selectedQuotation.enquiryNumber}</p>
          <p className="text-sm mb-2"><strong>Customer:</strong> {selectedQuotation.beneficiaryName}</p>
          <p className="text-sm"><strong>Contact:</strong> {selectedQuotation.contactNumber}</p>
        </div>
        
        <div className="flex flex-col gap-3">
          <button
            onClick={() => handleSend('whatsapp', selectedQuotation)}
            disabled={sendingWhatsApp || sendingEmail || sendingBoth}
            className="w-full px-4 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {sendingWhatsApp ? (
              <>
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                Sending...
              </>
            ) : (
              <>
                <MessageCircle className="h-5 w-5" />
                Send WhatsApp Only
              </>
            )}
          </button>
          
          <button
            onClick={() => handleSend('email', selectedQuotation)}
            disabled={sendingWhatsApp || sendingEmail || sendingBoth}
            className="w-full px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {sendingEmail ? (
              <>
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                Sending...
              </>
            ) : (
              <>
                <Mail className="h-5 w-5" />
                Send Email Only
              </>
            )}
          </button>
          
          <button
            onClick={() => handleSendBoth(selectedQuotation)}
            disabled={sendingWhatsApp || sendingEmail || sendingBoth}
            className="w-full px-4 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {sendingBoth ? (
              <>
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                Sending...
              </>
            ) : (
              <>
                <Send className="h-5 w-5" />
                Send Both
              </>
            )}
          </button>
        </div>
        
        <button
          onClick={() => setShowSendModal(false)}
          className="mt-4 w-full px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg"
        >
          Cancel
        </button>
      </div>
    </div>
  </div>
)}
                </div>

                {/* Table Footer with Count */}
                <div className="bg-gray-50 px-6 py-3 border-t border-gray-200">
                  <div className="flex justify-between items-center text-sm text-gray-500">
                    <span>
                      Showing {filteredData.length} of{" "}
                      {activeTab === "pending"
                        ? fmsData.filter(
                            (item) =>
                              item.planned1 &&
                              (!item.actual1 || item.actual1.trim() === ""),
                          ).length
                        : fmsData.filter(
                            (item) =>
                              item.planned1 &&
                              item.actual1 &&
                              item.actual1.trim() !== "",
                          ).length}{" "}
                      records
                    </span>
                    <div className="flex items-center gap-4">
                      <span className="flex items-center gap-1">
                        <Clock className="h-4 w-4 text-blue-500" />
                        Pending:{" "}
                        {
                          fmsData.filter(
                            (item) =>
                              item.planned1 &&
                              (!item.actual1 || item.actual1.trim() === ""),
                          ).length
                        }
                      </span>
                      <span className="flex items-center gap-1">
                        <CheckCircle className="h-4 w-4 text-green-500" />
                        History:{" "}
                        {
                          fmsData.filter(
                            (item) =>
                              item.planned1 &&
                              item.actual1 &&
                              item.actual1.trim() !== "",
                          ).length
                        }
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Export Button */}
              <div className="flex justify-end">
                <button className="px-4 py-2 bg-white border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-50 hover:border-gray-300 transition-all duration-200 flex items-center gap-2 shadow-sm">
                  <Download className="h-4 w-4" />
                  Export to Excel
                </button>
              </div>
            </>
          ) : (
            /* ========== FORM VIEW ========== */
            <>
              {/* Header with Back Button */}
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div className="flex items-center gap-4">
                  <button
                    type="button"
                    onClick={handleBackToList}
                    className="p-2 hover:bg-gray-100 rounded-lg transition-colors duration-200"
                    title="Back to list"
                  >
                    <ArrowLeft className="h-5 w-5 text-gray-600" />
                  </button>
                  <div>
                    <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                      {selectedEnquiry
                        ? `Create Quotation for ${selectedEnquiry.beneficiaryName}`
                        : "Create New Quotation"}
                    </h1>
                    <p className="text-gray-500 mt-1 flex items-center gap-2">
                      <FileSignature className="h-4 w-4" />
                      Fill in the details to generate a professional quotation
                    </p>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex gap-2">
                  <button className="px-4 py-2 bg-white border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-50 hover:border-gray-300 transition-all duration-200 flex items-center gap-2 shadow-sm">
                    <Printer className="h-4 w-4" />
                    Print
                  </button>
                  <button className="px-4 py-2 bg-white border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-50 hover:border-gray-300 transition-all duration-200 flex items-center gap-2 shadow-sm">
                    <Download className="h-4 w-4" />
                    Export
                  </button>
                </div>
              </div>

              {/* Success Message */}
              {successMessage && (
                <div className="bg-green-50 border-l-4 border-green-500 text-green-700 px-4 py-3 rounded-lg flex items-center shadow-md animate-pulse">
                  <CheckCircle className="h-5 w-5 mr-3 text-green-500" />
                  <span className="font-medium">{successMessage}</span>
                </div>
              )}

              {/* <form onSubmit={handleSubmit} className="space-y-6"> */}
              <form className="space-y-6">
                {/* Quotation Info Card */}
                <div className={sectionClass}>
                  <div className={sectionHeaderClass}>
                    <h2 className={sectionTitleClass}>
                      <FileText className="h-5 w-5 mr-2" />
                      Quotation Information
                    </h2>
                  </div>
                  <div className="p-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                      {/* Date */}
                      <div className="space-y-1">
                        <label className={labelClass}>
                          <Calendar className="inline h-4 w-4 mr-1 text-blue-500" />
                          Date
                        </label>
                        <input
                          type="date"
                          name="date"
                          value={formData.date}
                          onChange={handleChange}
                          className={inputClass}
                          required
                        />
                      </div>

                      {/* Reference By */}
                      <div className="space-y-1">
                        <label className={labelClass}>
                          <UserCheck className="inline h-4 w-4 mr-1 text-blue-500" />
                          Reference By
                        </label>
                        <input
                          type="text"
                          name="referenceBy"
                          value={formData.referenceBy}
                          onChange={handleChange}
                          className={inputClass}
                          placeholder="Enter reference"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Customer Details Card */}
                <div className={sectionClass}>
                  <div className="bg-gradient-to-r from-indigo-600 to-purple-600 px-6 py-4">
                    <h2 className={sectionTitleClass}>
                      <User className="h-5 w-5 mr-2" />
                      Customer Details
                    </h2>
                  </div>
                  <div className="p-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                      {/* Salesperson */}
                      <div className="space-y-1">
                        <label className={labelClass}>
                          <User className="inline h-4 w-4 mr-1 text-indigo-500" />
                          Salesperson *
                        </label>

                        {/* Input with dropdown suggestions */}
                        <input
                          type="text"
                          name="salesperson"
                          list="salesperson-list"
                          value={formData.salesperson}
                          onChange={handleChange}
                          className={inputClass}
                          placeholder="Select or type salesperson"
                        />

                        {/* Dropdown options */}
                        <datalist id="salesperson-list">
                          {salespersons.map((person, index) => (
                            <option key={index} value={person} />
                          ))}
                        </datalist>
                      </div>

                      {/* Customer */}
                      <div className="space-y-1">
                        <label className={labelClass}>
                          <User className="inline h-4 w-4 mr-1 text-indigo-500" />
                          Customer Name *
                        </label>
                        <select
                          name="customer"
                          value={formData.customer}
                          onChange={handleCustomerChange}
                          className={selectClass}
                          required
                          disabled
                        >
                          <option value="">Select Customer</option>
                          {dropdownOptions.customer.map((option) => (
                            <option key={option} value={option}>
                              {option}
                            </option>
                          ))}
                        </select>
                      </div>

                      {/* Contact No */}
                      <div className="space-y-1">
                        <label className={labelClass}>
                          <Phone className="inline h-4 w-4 mr-1 text-indigo-500" />
                          Contact Number *
                        </label>
                        <input
                          type="tel"
                          name="contactNo"
                          value={formData.contactNo}
                          onChange={handleChange}
                          className={inputClass}
                          placeholder="Enter contact number"
                          required
                        />
                      </div>

                      {/* Email */}
                      <div className="space-y-1">
                        <label className={labelClass}>
                          <Mail className="inline h-4 w-4 mr-1 text-indigo-500" />
                          Email Address
                        </label>
                        <input
                          type="email"
                          name="email"
                          value={formData.email}
                          onChange={handleChange}
                          className={inputClass}
                          placeholder="Enter email address"
                        />
                      </div>

                      {/* Dealer Field */}
                      <div className="space-y-1">
                        <label className={labelClass}>
                          <Building className="inline h-4 w-4 mr-1 text-indigo-500" />
                          Dealer
                        </label>
                        <select
                          name="dealer"
                          value={formData.dealer}
                          onChange={handleDealerChange}
                          className={selectClass}
                        >
                          <option value="">Select Dealer</option>
                          {dropdownOptions.dealer.map((option) => (
                            <option key={option} value={option}>
                              {option}
                            </option>
                          ))}
                        </select>
                      </div>

                      {/* Phone No */}
                      <div className="space-y-1">
                        <label className={labelClass}>
                          <Phone className="inline h-4 w-4 mr-1 text-indigo-500" />
                          Alternate Phone
                        </label>
                        <input
                          type="tel"
                          name="phoneNo"
                          value={formData.phoneNo}
                          onChange={handleChange}
                          className={inputClass}
                          placeholder="Enter alternate phone"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Installation Details Card */}
            {/* Installation Details Card */}
<div className={sectionClass}>
  <div className="bg-gradient-to-r from-purple-600 to-pink-600 px-6 py-4">
    <h2 className={sectionTitleClass}>
      <Home className="h-5 w-5 mr-2" />
      Installation Details
    </h2>
  </div>
  <div className="p-6">
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {/* Structure Type */}
      <div className="space-y-1">
        <label className={labelClass}>
          <Building className="inline h-4 w-4 mr-1 text-purple-500" />
          Structure Type *
        </label>
        <input
          list="structureList"
          name="structureType"
          value={formData.structureType}
          onChange={handleChange}
          className={inputClass}
          placeholder="Select or type structure"
        />
        <datalist id="structureList">
          {dropdownOptions.structureType.map((item) => (
            <option key={item} value={item} />
          ))}
        </datalist>
      </div>

      {/* Place of installation */}
      <div className="space-y-1">
        <label className={labelClass}>
          <MapPin className="inline h-4 w-4 mr-1 text-purple-500" />
          Installation Place
        </label>
        <input
          list="installationList"
          name="placeOfInstallation"
          value={formData.placeOfInstallation}
          onChange={handleChange}
          className={inputClass}
          placeholder="Select or type installation place"
        />
        <datalist id="installationList">
          {dropdownOptions.placeOfInstallation.map((item) => (
            <option key={item} value={item} />
          ))}
        </datalist>
      </div>

      {/* Terms & Conditions - Always visible */}
      <div className="space-y-1 col-span-full">
        <label className={labelClass}>
          <FileText className="inline h-4 w-4 mr-1 text-purple-500" />
          Terms & Conditions (Click to edit)
        </label>
        <textarea
          name="termsConditions"
          value={formData.termsConditions}
          onChange={handleChange}
          className={`${inputClass} min-h-[120px] resize-y`}
          placeholder="Enter terms & conditions"
        />
      </div>

      {/* General Terms & Conditions - Always visible */}
      <div className="space-y-1 col-span-full mt-4">
        <label className={labelClass}>
          <FileText className="inline h-4 w-4 mr-1 text-purple-500" />
          General Terms & Conditions (Click to edit)
        </label>
        <textarea
          name="generalTerms"
          value={formData.generalTerms || "1. Power output from Control Panel will be in customers scope.\n2. Civil work other than Module Mounting Structure will be in customer's scope.\n3. Our offer is valid for 15 Days. Any custom specifications will be charged extra.\n4. Regular cleaning of Modules with plain water (soft) for desired generation guarantee in customer's scope.\n5. Detailed Quotation with engineering document will be provided on finalisation, for systems above 10KW.\n6. Subsidy (if any) is subject to government approval and will be directly credited in customer's account.\n7. Transportation inclusive. Insurance inclusive upto site and thereafter in customer's scope.\n8. Payment 50% advance on booking, Balance 50% against PI before dispatch of material.\n9. Delivery within 2 weeks from sanction and installation immediately thereafter.\n10. AMC inclusive for 5 years and chargeable thereafter.\n11. Structure height consider 5 feet, for additional height should charge extra.\n12. DC, AC, Earthing cable length considered 30 meter, for additional length should charge extra."}
          onChange={handleChange}
          className={`${inputClass} min-h-[200px] resize-y`}
          placeholder="Enter general terms & conditions"
        />
      </div>
    </div>
  </div>
</div>

                {/* Power & Load Information */}
                <div className={sectionClass}>
                  <div className="bg-gradient-to-r from-amber-500 to-orange-500 px-6 py-4">
                    <h2 className={sectionTitleClass}>
                      <Zap className="h-5 w-5 mr-2" />
                      Power & Load Information
                    </h2>
                  </div>
                  <div className="p-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                      {/* Rating */}
                      <div className="space-y-1">
                        <label className={labelClass}>
                          <Zap className="inline h-4 w-4 mr-1 text-amber-500" />
                          Product *
                        </label>
                        <input
                          list="ratingList"
                          name="rating"
                          value={formData.rating}
                          onChange={handleProductChange}
                          className={inputClass}
                          placeholder="Select product"
                        />
                        <datalist id="ratingList">
                          {dropdownOptions.rating &&
                          dropdownOptions.rating.length > 0 ? (
                            dropdownOptions.rating.map((product, index) => (
                              <option key={index} value={product} />
                            ))
                          ) : (
                            <option value="">Loading products...</option>
                          )}
                        </datalist>
                      </div>

                      {/* Qty */}
                      <div className="space-y-1">
                        <label className={labelClass}>
                          <Package className="inline h-4 w-4 mr-1 text-amber-500" />
                          Quantity *
                        </label>
                        <input
                          type="number"
                          name="qty"
                          value={formData.qty}
                          onChange={handleQuantityChange}
                          className={inputClass}
                          placeholder="Enter quantity"
                          required
                        />
                      </div>

                      {/* Sub(Central) */}
                      <div className="space-y-1">
                        <label className={labelClass}>
                          <Grid className="inline h-4 w-4 mr-1 text-amber-500" />
                          Central Subsidy
                        </label>
                        <input
                          type="text"
                          name="subCentral"
                          value={formData.subCentral}
                          onChange={handleChange}
                          className={inputClass}
                          placeholder="Enter central sub"
                        />
                      </div>

                      {/* Sub(State) */}
                      <div className="space-y-1">
                        <label className={labelClass}>
                          <Grid className="inline h-4 w-4 mr-1 text-amber-500" />
                          State Subsidy
                        </label>
                        <input
                          type="text"
                          name="subState"
                          value={formData.subState}
                          onChange={handleChange}
                          className={inputClass}
                          placeholder="Enter state sub"
                        />
                      </div>

                      {/* Disc */}
                      <div className="space-y-1">
                        <label className={labelClass}>
                          <Percent className="inline h-4 w-4 mr-1 text-amber-500" />
                          Discount
                        </label>
                        <input
                          type="text"
                          name="disc"
                          value={formData.disc}
                          onChange={handleChange}
                          className={inputClass}
                          placeholder="Enter discount"
                        />
                      </div>

                      {/* Need Type - New Field */}
                      <div className="space-y-1">
                        <label className={labelClass}>
                          <FileText className="inline h-4 w-4 mr-1 text-amber-500" />
                          Need Type *
                        </label>
                        <input
                          list="needTypeList"
                          name="needType"
                          value={formData.needType}
                          onChange={handleChange}
                          className={inputClass}
                          placeholder="Select need type"
                          required
                        />
                        <datalist id="needTypeList">
                          {dropdownOptions.needTypes?.map((item) => (
                            <option key={item} value={item} />
                          ))}
                        </datalist>
                      </div>

                      {/* Bank Account */}
                      {/* Bank Account */}
                      <div className="space-y-1">
                        <label className={labelClass}>
                          <CreditCard className="inline h-4 w-4 mr-1 text-amber-500" />
                          Bank Name
                        </label>
                        <input
                          type="text"
                          name="bankAccount"
                          value={formData.bankAccount}
                          onChange={handleChange}
                          className={inputClass}
                          placeholder="Bank name"
                          readOnly
                        />
                      </div>

                      {/* Account No - New Field */}
                      <div className="space-y-1">
                        <label className={labelClass}>
                          <CreditCard className="inline h-4 w-4 mr-1 text-amber-500" />
                          Account No.
                        </label>
                        <input
                          type="text"
                          name="accountNo"
                          value={formData.accountNo}
                          onChange={handleChange}
                          className={inputClass}
                          placeholder="Account number"
                          readOnly
                        />
                      </div>

                      {/* IFSC Code - New Field */}
                      <div className="space-y-1">
                        <label className={labelClass}>
                          <Fingerprint className="inline h-4 w-4 mr-1 text-amber-500" />
                          IFSC Code
                        </label>
                        <input
                          type="text"
                          name="ifscCode"
                          value={formData.ifscCode}
                          onChange={handleChange}
                          className={inputClass}
                          placeholder="IFSC code"
                          readOnly
                        />
                      </div>

                      {/* Branch - New Field */}
                      <div className="space-y-1">
                        <label className={labelClass}>
                          <Map className="inline h-4 w-4 mr-1 text-amber-500" />
                          Branch
                        </label>
                        <input
                          type="text"
                          name="branch"
                          value={formData.branch}
                          onChange={handleChange}
                          className={inputClass}
                          placeholder="Branch"
                          readOnly
                        />
                      </div>
                    </div>

                    {/* Additional Fields Row - Hours of Failure and Load Details */}
                    <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-6 pt-6 border-t border-gray-100">
                      <div className="bg-amber-50 p-4 rounded-lg border border-amber-100">
                        <label className="block text-sm font-semibold text-amber-700 mb-2 flex items-center">
                          <Clock className="h-4 w-4 mr-2" />
                          Hours Of Failure
                        </label>
                        <input
                          list="failureList"
                          name="failureHours"
                          value={formData.failureHours || ""}
                          onChange={handleChange}
                          className={inputClass}
                          placeholder="Select failure hours"
                        />
                        <datalist id="failureList">
                          {dropdownOptions.failureHours?.map((item) => (
                            <option key={item} value={item} />
                          ))}
                        </datalist>
                      </div>

                      <div className="bg-blue-50 p-4 rounded-lg border border-blue-100">
                        <label className="block text-sm font-semibold text-blue-700 mb-2 flex items-center">
                          <FileText className="h-4 w-4 mr-2" />
                          Load Details/Application
                        </label>
                        <input
                          list="loadList"
                          name="loadDetails"
                          value={formData.loadDetails || ""}
                          onChange={handleChange}
                          className={inputClass}
                          placeholder="Select load details"
                        />
                        <datalist id="loadList">
                          {dropdownOptions.loadDetails?.map((item) => (
                            <option key={item} value={item} />
                          ))}
                        </datalist>
                      </div>
                    </div>

                    {/* Product Details Section - NEW */}
                    <div className="mt-8 border-t border-gray-200 pt-8">
                      <h3 className="text-xl font-semibold bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent mb-6 flex items-center">
                        <Package className="h-6 w-6 mr-2 text-green-600" />
                        Product Details
                      </h3>

                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                        {/* Product Name */}
                        {/* Product Name */}
                        <div className="space-y-1 col-span-2 lg:col-span-4">
                          <label className={labelClass}>
                            <Package className="inline h-4 w-4 mr-1 text-green-500" />
                            Product Name
                          </label>
                          <input
                            type="text"
                            value={productDetails.productName}
                            className={`${inputClass} bg-gray-100 h-[60px] text-base`}
                            placeholder="Auto-fetched"
                          />
                        </div>

                        {/* BOM */}
                        <div className="space-y-1 col-span-4">
                          <label className={labelClass}>
                            <FileText className="inline h-4 w-4 mr-1 text-green-500" />
                            BILL OF MATERIAL (BOM)
                          </label>
                          <textarea
                            value={productDetails.bom}
                            className={`${inputClass} bg-gray-100 min-h-[180px] text-sm leading-relaxed`}
                            placeholder="Auto-fetched BOM"
                          />
                        </div>

                        {/* Size */}
                        <div className="space-y-1">
                          <label className={labelClass}>
                            <Zap className="inline h-4 w-4 mr-1 text-green-500" />
                            Size
                          </label>
                          <input
                            type="text"
                            value={productDetails.size}
                            className={`${inputClass} bg-gray-100 `}
                            placeholder="Auto-fetched"
                          />
                        </div>

                        {/* GST % */}
                        <div className="space-y-1">
                          <label className={labelClass}>
                            <Percent className="inline h-4 w-4 mr-1 text-green-500" />
                            GST %
                          </label>
                          <input
                            type="text"
                            value={productDetails.gst}
                            className={`${inputClass} bg-gray-100 `}
                            placeholder="Auto-fetched"
                          />
                        </div>

                        {/* Rate */}
                        <div className="space-y-1">
                          <label className={labelClass}>
                            <CreditCard className="inline h-4 w-4 mr-1 text-green-500" />
                            Rate (₹)
                          </label>
                          <input
                            type="text"
                            value={productDetails.rate}
                            className={`${inputClass} bg-gray-100 `}
                            placeholder="Auto-fetched"
                          />
                        </div>

                        {/* Amount */}
                        <div className="space-y-1">
                          <label className={labelClass}>
                            <Save className="inline h-4 w-4 mr-1 text-green-500" />
                            Amount (₹)
                          </label>
                          <input
                            type="text"
                            value={productDetails.amount}
                            className={`${inputClass} bg-green-50 font-semibold text-green-700 border-green-200`}
                            placeholder="Rate × Quantity"
                          />
                        </div>
                      </div>
                    </div>

                    
                  </div>
                  {/* Cost Calculation Section - Always Visible */}
<div className={sectionClass}>
  <div className="bg-gradient-to-r from-orange-600 to-red-600 px-6 py-4">
    <h2 className={sectionTitleClass}>
      <Percent className="h-5 w-5 mr-2" />
      Cost Calculation
    </h2>
  </div>

  <div className="p-6">
    {(() => {
      const amount = parseFloat(productDetails.amount || 0);
      const disc = parseFloat(formData.disc || 0);
      const gst = parseFloat(productDetails.gst || 0);
      const central = parseFloat(formData.subCentral || 0);
      const state = parseFloat(formData.subState || 0);

      const discountAmount = (amount * disc) / 100;
      const afterDiscount = amount - discountAmount;

      const gstAmount =
        gst < 1
          ? afterDiscount * gst // decimal case (0.18)
          : (afterDiscount * gst) / 100; // percentage case (18)

      const afterGST = afterDiscount + gstAmount;
      const netCost = afterGST - central - state;

      const displayGST = gst < 1 ? gst * 100 : gst;

      return (
        <>
          <div className="bg-gray-50 rounded-lg border border-gray-200 overflow-hidden">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4">

              {/* Original Amount */}
              <div className="flex justify-between items-center p-3 bg-white rounded-lg shadow-sm">
                <span className="text-gray-600 font-medium">Original Amount:</span>
                <span className="text-lg font-semibold text-gray-800">
                  ₹ {amount.toFixed(2)}
                </span>
              </div>

              {/* Discount */}
              <div className="flex justify-between items-center p-3 bg-white rounded-lg shadow-sm">
                <span className="text-gray-600 font-medium">
                  Discount ({disc}%):
                </span>
                <span className="text-lg font-semibold text-red-600">
                  - ₹ {discountAmount.toFixed(2)}
                </span>
              </div>

              {/* After Discount */}
              <div className="flex justify-between items-center p-3 bg-blue-50 rounded-lg shadow-sm col-span-1 md:col-span-2">
                <span className="text-blue-700 font-semibold">After Discount:</span>
                <span className="text-xl font-bold text-blue-700">
                  ₹ {afterDiscount.toFixed(2)}
                </span>
              </div>

              {/* GST */}
              <div className="flex justify-between items-center p-3 bg-white rounded-lg shadow-sm">
                <span className="text-gray-600 font-medium">
                  GST ({displayGST.toFixed(2)}%):
                </span>
                <span className="text-lg font-semibold text-green-600">
                  + ₹ {gstAmount.toFixed(2)}
                </span>
              </div>

              {/* After GST */}
              <div className="flex justify-between items-center p-3 bg-blue-50 rounded-lg shadow-sm col-span-1 md:col-span-2">
                <span className="text-blue-700 font-semibold">After GST:</span>
                <span className="text-xl font-bold text-blue-700">
                  ₹ {afterGST.toFixed(2)}
                </span>
              </div>

              {/* Central Subsidy */}
              <div className="flex justify-between items-center p-3 bg-white rounded-lg shadow-sm">
                <span className="text-gray-600 font-medium">Central Subsidy:</span>
                <span className="text-lg font-semibold text-green-600">
                  - ₹ {central.toFixed(2)}
                </span>
              </div>

              {/* State Subsidy */}
              <div className="flex justify-between items-center p-3 bg-white rounded-lg shadow-sm">
                <span className="text-gray-600 font-medium">State Subsidy:</span>
                <span className="text-lg font-semibold text-green-600">
                  - ₹ {state.toFixed(2)}
                </span>
              </div>

              {/* NET COST */}
              <div className="flex justify-between items-center p-4 bg-gradient-to-r from-green-600 to-emerald-600 rounded-lg shadow-md col-span-1 md:col-span-2">
                <span className="text-white font-bold text-lg">NET COST:</span>
                <span className="text-white font-bold text-2xl">
                  ₹ {netCost.toFixed(2)}
                </span>
              </div>

            </div>
          </div>

          {/* Formula */}
          <div className="mt-4 text-xs text-gray-500 bg-gray-50 p-3 rounded-lg">
            <p className="font-semibold mb-1">Calculation Formula:</p>
            <p>
              Net Cost = (Amount - Discount) + GST - (Central Subsidy + State Subsidy)
            </p>
            <p className="mt-1">
              Where: Discount = Amount × {disc}%,
              GST = (Amount - Discount) × {displayGST}%
            </p>
          </div>
        </>
      );
    })()}
  </div>
</div>
                </div>


                {/* Form Actions */}
                <div className="flex justify-between items-center pt-4">
                  <div className="flex gap-3">
                    <button
                      type="button"
                      onClick={() => {
                        setFormData({
                          date: getCurrentDate(),
                          salesperson: "",
                          customer: "",
                          contactNo: "",
                          email: "",
                          dealer: "",
                          phoneNo: "",
                          structureType: "",
                          placeOfInstallation: "",
                          termsConditions:
                            "On Grid:\n1. We will process for approval from competent authority for net metering. Any other approval is in your scope.\n2. Processing fee payable to CREDA/CSPDCL as applicable.\n3. Generation Guarantee of 1.5kWh/W per annum",
                          generalTerms:
                            "1. Power output from Control Panel will be in customers scope.\n2. Civil work other than Module Mounting Structure will be in customer's scope.\n3. Our offer is valid for 15 Days. Any custom specifications will be charged extra.\n4. Regular cleaning of Modules with plain water (soft) for desired generation guarantee in customer's scope.\n5. Detailed Quotation with engineering document will be provided on finalisation, for systems above 10KW.\n6. Subsidy (if any) is subject to government approval and will be directly credited in customer's account.\n7. Transportation inclusive. Insurance inclusive upto site and thereafter in customer's scope.\n8. Payment 50% advance on booking, Balance 50% against PI before dispatch of material.\n9. Delivery within 2 weeks from sanction and installation immediately thereafter.\n10. AMC inclusive for 5 years and chargeable thereafter.\n11. Structure height consider 5 feet, for additional height should charge extra.\n12. DC, AC, Earthing cable length considered 30 meter, for additional length should charge extra.",
                          rating: "",
                          qty: "",
                          subCentral: "",
                          subState: "",
                          disc: "",
                          referenceBy: "",
                          bankAccount: "",
                          accountNo: "",
                          ifscCode: "",
                          branch: "",
                          loadDetails: "",
                          failureHours: "",
                          needType: "",
                        });
                        setProductDetails({
                          productName: "",
                          bom: "",
                          size: "",
                          gst: "",
                          rate: "",
                          amount: "",
                        });
                      }}
                      className="px-6 py-3 bg-white border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-50 hover:border-gray-300 transition-all duration-200 flex items-center gap-2 shadow-sm"
                    >
                      <Trash2 className="h-4 w-4" />
                      Clear Form
                    </button>
                  </div>

                  <div className="flex gap-3">
                    <button
                      type="button"
                      onClick={handlePreview}
                      className="px-8 py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-lg hover:from-purple-700 hover:to-pink-700 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 transition-all duration-200 flex items-center gap-2 shadow-lg hover:shadow-xl text-base font-medium"
                    >
                      <Eye className="h-5 w-5" />
                      Preview & Submit
                    </button>
                  </div>
                </div>
              </form>
            </>
          )}
        </div>
        {/* Preview Modal */}
        {showPreview && (
          <QuotationPreview
            formData={formData}
            productDetails={productDetails}
            onClose={() => setShowPreview(false)}
            onSubmit={handleSubmitWithPDF}
            isSubmitting={isSubmittingToSheet}
          />
        )}
      </div>
    </AdminLayout>
  );
}
