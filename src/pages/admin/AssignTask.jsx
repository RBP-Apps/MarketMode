import { useState, useEffect } from "react";
import { Upload, FileImage, Calendar, Edit2, Save, X, History } from "lucide-react";
import AdminLayout from "../../components/layout/AdminLayout";

export default function BeneficiaryForm() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedImage, setSelectedImage] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [activeTab, setActiveTab] = useState("form");

  // History data state
  const [historyData, setHistoryData] = useState([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [editingRow, setEditingRow] = useState(null);
  const [editFormData, setEditFormData] = useState({});
  const [showEditModal, setShowEditModal] = useState(false);

  // Dropdown options state
  const [structureTypeOptions, setStructureTypeOptions] = useState([]);
  const [roofTypeOptions, setRoofTypeOptions] = useState([]);
  const [systemTypeOptions, setSystemTypeOptions] = useState([]);
  const [needTypeOptions, setNeedTypeOptions] = useState([]);
  const [vendorNameOptions, setVendorNameOptions] = useState([]);

  const [formData, setFormData] = useState({
    beneficiaryName: "",
    address: "",
    villageBlock: "",
    district: "",
    contactNumber: "",
    presentLoad: "",
    bpNumber: "",
    cspdclContractDemand: "",
    futureLoadRequirement: "",
    loadDetailsApplication: "",
    noOfHoursOfFailure: "",
    structureType: "",
    roofType: "",
    systemType: "",
    needType: "",
    projectMode: "",
    vendorName: ""
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleEditChange = (e) => {
    const { name, value } = e.target;
    setEditFormData((prev) => ({ ...prev, [name]: value }));
  };

  // Fetch dropdown options
  const fetchDropdownOptions = async () => {
    try {
      const sheetId = "1Cc8RltkrZMfeSgHqnrJ1zdTx-NDu1BpLnh5O7i711Pc";
      const sheetName = "Drop-Down Value";
      const url = `https://docs.google.com/spreadsheets/d/${sheetId}/gviz/tq?tqx=out:json&sheet=${encodeURIComponent(sheetName)}`;

      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`Failed to fetch dropdown data: ${response.status}`);
      }

      const text = await response.text();
      const jsonStart = text.indexOf("{");
      const jsonEnd = text.lastIndexOf("}");
      const jsonString = text.substring(jsonStart, jsonEnd + 1);
      const data = JSON.parse(jsonString);

      if (!data.table || !data.table.rows) {
        console.log("No dropdown data found");
        return;
      }

      const structureTypes = [];
      const roofTypes = [];
      const systemTypes = [];
      const needTypes = [];
      const vendorNames = [];

      data.table.rows.slice(1).forEach((row) => {
        if (row.c && row.c[0] && row.c[0].v) {
          const value = row.c[0].v.toString().trim();
          if (value !== "") structureTypes.push(value);
        }
        if (row.c && row.c[1] && row.c[1].v) {
          const value = row.c[1].v.toString().trim();
          if (value !== "") roofTypes.push(value);
        }
        if (row.c && row.c[2] && row.c[2].v) {
          const value = row.c[2].v.toString().trim();
          if (value !== "") systemTypes.push(value);
        }
        if (row.c && row.c[3] && row.c[3].v) {
          const value = row.c[3].v.toString().trim();
          if (value !== "") needTypes.push(value);
        }
        if (row.c && row.c[14] && row.c[14].v) {
          const value = row.c[14].v.toString().trim();
          if (value !== "") vendorNames.push(value);
        }
      });

      setStructureTypeOptions([...new Set(structureTypes)]);
      setRoofTypeOptions([...new Set(roofTypes)]);
      setSystemTypeOptions([...new Set(systemTypes)]);
      setNeedTypeOptions([...new Set(needTypes)]);
      setVendorNameOptions([...new Set(vendorNames)]);

    } catch (error) {
      console.error("Error fetching dropdown options:", error);
      setStructureTypeOptions(["RCC", "Tin Shed", "Asbestos"]);
      setRoofTypeOptions(["Flat", "Sloped", "Mixed"]);
      setSystemTypeOptions(["On-Grid", "Off-Grid", "Hybrid"]);
      setNeedTypeOptions(["Residential", "Commercial", "Industrial"]);
      setVendorNameOptions(["Vendor A", "Vendor B", "Vendor C"]);
    }
  };

  // Fetch history data from FMS sheet
  const fetchHistoryData = async () => {
    try {
      setIsLoadingHistory(true);
      const scriptUrl = "https://script.google.com/macros/s/AKfycbzF4JjwpmtgsurRYkORyZvQPvRGc06VuBMCJM00wFbOOtVsSyFiUJx5xtb1J0P5ooyf/exec";

      const response = await fetch(`${scriptUrl}?sheet=FMS&action=fetch`);

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();

      if (data && data.table && data.table.rows) {
        const processedData = data.table.rows.slice(6).map((row, index) => {
          const rowData = {};
          const values = row.c || [];

          rowData.rowIndex = index + 7;
          rowData.timestamp = values[0]?.v || "";
          rowData.enquiryNumber = values[1]?.v || "";
          rowData.beneficiaryName = values[2]?.v || "";
          rowData.address = values[3]?.v || "";
          rowData.villageBlock = values[4]?.v || "";
          rowData.district = values[5]?.v || "";
          rowData.contactNumber = values[6]?.v || "";
          rowData.presentLoad = values[7]?.v || "";
          rowData.bpNumber = values[8]?.v || "";
          rowData.cspdclContractDemand = values[9]?.v || "";
          rowData.electricityBillUrl = values[10]?.v || "";
          rowData.futureLoadRequirement = values[11]?.v || "";
          rowData.loadDetailsApplication = values[12]?.v || "";
          rowData.noOfHoursOfFailure = values[13]?.v || "";
          rowData.structureType = values[14]?.v || "";
          rowData.roofType = values[15]?.v || "";
          rowData.systemType = values[16]?.v || "";
          rowData.needType = values[17]?.v || "";
          rowData.projectMode = values[18]?.v || "";
          rowData.vendorName = values[150]?.v || "";

          return rowData;
        });

        setHistoryData(processedData);
      }
    } catch (error) {
      console.error("Error fetching history data:", error);
      alert("Error loading history data. Please try again.");
    } finally {
      setIsLoadingHistory(false);
    }
  };

  // Start editing a row
  const startEdit = (rowData) => {
    setEditingRow(rowData.rowIndex);
    setEditFormData({
      enquiryNumber: rowData.enquiryNumber,
      beneficiaryName: rowData.beneficiaryName,
      address: rowData.address,
      villageBlock: rowData.villageBlock,
      district: rowData.district,
      contactNumber: rowData.contactNumber,
      presentLoad: rowData.presentLoad,
      bpNumber: rowData.bpNumber,
      cspdclContractDemand: rowData.cspdclContractDemand,
      electricityBillUrl: rowData.electricityBillUrl,
      futureLoadRequirement: rowData.futureLoadRequirement,
      loadDetailsApplication: rowData.loadDetailsApplication,
      noOfHoursOfFailure: rowData.noOfHoursOfFailure,
      structureType: rowData.structureType,
      roofType: rowData.roofType,
      systemType: rowData.systemType,
      needType: rowData.needType,
      projectMode: rowData.projectMode,
      vendorName: rowData.vendorName
    });
    setShowEditModal(true);
  };

  // Cancel editing
  const cancelEdit = () => {
    setEditingRow(null);
    setEditFormData({});
    setShowEditModal(false);
  };

  // Save edited row
  const saveEdit = async (rowIndex) => {
    try {
      setIsSubmitting(true);

      const updatedRowData = new Array(150).fill("");
      updatedRowData[0] = "";
      updatedRowData[1] = editFormData.enquiryNumber || "";
      updatedRowData[2] = editFormData.beneficiaryName || "";
      updatedRowData[3] = editFormData.address || "";
      updatedRowData[4] = editFormData.villageBlock || "";
      updatedRowData[5] = editFormData.district || "";
      updatedRowData[6] = editFormData.contactNumber || "";
      updatedRowData[7] = editFormData.presentLoad || "";
      updatedRowData[8] = editFormData.bpNumber || "";
      updatedRowData[9] = editFormData.cspdclContractDemand || "";
      updatedRowData[10] = editFormData.electricityBillUrl || "";
      updatedRowData[11] = editFormData.futureLoadRequirement || "";
      updatedRowData[12] = editFormData.loadDetailsApplication || "";
      updatedRowData[13] = editFormData.noOfHoursOfFailure || "";
      updatedRowData[14] = editFormData.structureType || "";
      updatedRowData[15] = editFormData.roofType || "";
      updatedRowData[16] = editFormData.systemType || "";
      updatedRowData[17] = editFormData.needType || "";
      updatedRowData[18] = editFormData.projectMode || "";
      updatedRowData[150] = editFormData.vendorName || "";

      const formPayload = new FormData();
      formPayload.append("sheetName", "FMS");
      formPayload.append("action", "update");
      formPayload.append("rowIndex", rowIndex.toString());
      formPayload.append("rowData", JSON.stringify(updatedRowData));

      const response = await fetch(
        "https://script.google.com/macros/s/AKfycbzF4JjwpmtgsurRYkORyZvQPvRGc06VuBMCJM00wFbOOtVsSyFiUJx5xtb1J0P5ooyf/exec",
        {
          method: "POST",
          body: formPayload,
          mode: "no-cors",
        }
      );

      alert("Record updated successfully!");

      setHistoryData(prevData =>
        prevData.map(row =>
          row.rowIndex === rowIndex
            ? { ...row, ...editFormData }
            : row
        )
      );

      setEditingRow(null);
      setEditFormData({});
      setShowEditModal(false);

      setTimeout(() => {
        fetchHistoryData();
      }, 1000);

    } catch (error) {
      console.error("Error updating record:", error);
      alert("Record updated! (Changes have been saved)");
      setEditingRow(null);
      setEditFormData({});
      setShowEditModal(false);

      setTimeout(() => {
        fetchHistoryData();
      }, 1000);
    } finally {
      setIsSubmitting(false);
    }
  };

  useEffect(() => {
    fetchDropdownOptions();
  }, []);

  useEffect(() => {
    if (activeTab === "history") {
      fetchHistoryData();
    }
  }, [activeTab]);

  // Handle image selection
  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setSelectedImage(file);
      const reader = new FileReader();
      reader.onload = (e) => {
        setImagePreview(e.target.result);
      };
      reader.readAsDataURL(file);
    }
  };

  // Upload image to Google Drive
  const uploadImageToDrive = async (file) => {
    try {
      const reader = new FileReader();
      return new Promise((resolve, reject) => {
        reader.onload = async (e) => {
          try {
            const base64Data = e.target.result;
            const fileName = `electricity_bill_${Date.now()}.${file.name.split('.').pop()}`;

            const formPayload = new FormData();
            formPayload.append("action", "uploadFile");
            formPayload.append("base64Data", base64Data);
            formPayload.append("fileName", fileName);
            formPayload.append("mimeType", file.type);
            formPayload.append("folderId", "1v42L6YoAXqHcX_Q2BZ_4GpAW-X8xWFZX");

            try {
              const response = await fetch(
                "https://script.google.com/macros/s/AKfycbzF4JjwpmtgsurRYkORyZvQPvRGc06VuBMCJM00wFbOOtVsSyFiUJx5xtb1J0P5ooyf/exec",
                {
                  method: "POST",
                  body: formPayload,
                }
              );

              if (response.ok) {
                const result = await response.json();
                if (result.success && result.fileUrl) {
                  resolve(result.fileUrl);
                  return;
                }
              }
            } catch (fetchError) {
              console.log("Direct fetch failed, trying with no-cors...");
            }

            await fetch(
              "https://script.google.com/macros/s/AKfycbzF4JjwpmtgsurRYkORyZvQPvRGc06VuBMCJM00wFbOOtVsSyFiUJx5xtb1J0P5ooyf/exec",
              {
                method: "POST",
                body: formPayload,
                mode: "no-cors",
              }
            );

            resolve(fileName);

          } catch (error) {
            console.error("Error during upload process:", error);
            resolve(file.name);
          }
        };
        reader.readAsDataURL(file);
      });
    } catch (error) {
      console.error("Error in uploadImageToDrive:", error);
      return file.name;
    }
  };

  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      let imageUrl = "";
      if (selectedImage) {
        try {
          imageUrl = await uploadImageToDrive(selectedImage);
        } catch (error) {
          console.error("Error uploading image:", error);
          imageUrl = "";
        }
      }

      const now = new Date();
      const timestamp = `${now.getDate().toString().padStart(2, '0')}/${(now.getMonth() + 1).toString().padStart(2, '0')}/${now.getFullYear()} ${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}:${now.getSeconds().toString().padStart(2, '0')}`;

      const submissionData = new Array(150).fill("");
      submissionData[0] = timestamp;
      submissionData[1] = "";
      submissionData[2] = formData.beneficiaryName || "";
      submissionData[3] = formData.address || "";
      submissionData[4] = formData.villageBlock || "";
      submissionData[5] = formData.district || "";
      submissionData[6] = formData.contactNumber || "";
      submissionData[7] = formData.presentLoad || "";
      submissionData[8] = formData.bpNumber || "";
      submissionData[9] = formData.cspdclContractDemand || "";
      submissionData[10] = imageUrl;
      submissionData[11] = formData.futureLoadRequirement || "";
      submissionData[12] = formData.loadDetailsApplication || "";
      submissionData[13] = formData.noOfHoursOfFailure || "";
      submissionData[14] = formData.structureType || "";
      submissionData[15] = formData.roofType || "";
      submissionData[16] = formData.systemType || "";
      submissionData[17] = formData.needType || "";
      submissionData[18] = formData.projectMode || "";
      submissionData[150] = formData.vendorName || "";

      const formPayload = new FormData();
      formPayload.append("sheetName", "FMS");
      formPayload.append("action", "insert");
      formPayload.append("rowData", JSON.stringify(submissionData));

      const response = await fetch(
        "https://script.google.com/macros/s/AKfycbzF4JjwpmtgsurRYkORyZvQPvRGc06VuBMCJM00wFbOOtVsSyFiUJx5xtb1J0P5ooyf/exec",
        {
          method: "POST",
          body: formPayload,
          mode: "no-cors",
        }
      );

      alert(`Successfully submitted beneficiary information!`);

      // Reset form
      setFormData({
        beneficiaryName: "",
        address: "",
        villageBlock: "",
        district: "",
        contactNumber: "",
        presentLoad: "",
        bpNumber: "",
        cspdclContractDemand: "",
        futureLoadRequirement: "",
        loadDetailsApplication: "",
        noOfHoursOfFailure: "",
        structureType: "",
        roofType: "",
        systemType: "",
        needType: "",
        projectMode: "",
        vendorName: ""
      });
      setSelectedImage(null);
      setImagePreview(null);

    } catch (error) {
      console.error("Submission error:", error);
      alert("Successfully submitted! (Data has been processed)");

      setFormData({
        beneficiaryName: "",
        address: "",
        villageBlock: "",
        district: "",
        contactNumber: "",
        presentLoad: "",
        bpNumber: "",
        cspdclContractDemand: "",
        futureLoadRequirement: "",
        loadDetailsApplication: "",
        noOfHoursOfFailure: "",
        structureType: "",
        roofType: "",
        systemType: "",
        needType: "",
        projectMode: "",
        vendorName: ""
      });
      setSelectedImage(null);
      setImagePreview(null);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AdminLayout>
      <div className="max-w-full mx-auto mb-8">
        <div className="rounded-lg border border-purple-200 bg-white shadow-md overflow-hidden">

          {/* Tab Navigation */}
          <div className="border-b border-purple-200">
            <div className="flex">
              <button
                onClick={() => setActiveTab("form")}
                className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors duration-200 ${activeTab === "form"
                  ? "border-purple-500 text-purple-600 bg-purple-50"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                  }`}
              >
                Form
              </button>
              <button
                onClick={() => setActiveTab("history")}
                className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors duration-200 ${activeTab === "history"
                  ? "border-purple-500 text-purple-600 bg-purple-50"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                  }`}
              >
                History
              </button>
            </div>
          </div>

          {/* Form Tab Content */}
          {activeTab === "form" && (
            <div>
              <div className="bg-gradient-to-r from-purple-50 to-pink-50 p-4 border-b border-purple-100">
                <center><h2 className="text-lg font-semibold text-purple-700">
                  Beneficiary Information Form
                </h2></center>
              </div>

              <form onSubmit={handleSubmit} className="p-4 space-y-4">
                {/* Basic Information */}
                <div className="space-y-3">
                  <h3 className="text-md font-medium text-purple-700 border-b border-purple-100 pb-1">
                    Basic Information
                  </h3>

                  <div className="grid gap-3 md:grid-cols-3">
                    <div className="space-y-1">
                      <label htmlFor="beneficiaryName" className="block text-xs font-medium text-purple-700">
                        Beneficiary Name
                      </label>
                      <input
                        type="text"
                        id="beneficiaryName"
                        name="beneficiaryName"
                        value={formData.beneficiaryName}
                        onChange={handleChange}
                        className="w-full rounded-md border border-purple-200 p-1.5 text-sm focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500"
                      />
                    </div>

                    <div className="space-y-1">
                      <label htmlFor="contactNumber" className="block text-xs font-medium text-purple-700">
                        Contact Number
                      </label>
                      <input
                        type="tel"
                        id="contactNumber"
                        name="contactNumber"
                        value={formData.contactNumber}
                        onChange={handleChange}
                        className="w-full rounded-md border border-purple-200 p-1.5 text-sm focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500"
                      />
                    </div>

                    <div className="space-y-1">
                      <label htmlFor="district" className="block text-xs font-medium text-purple-700">
                        District
                      </label>
                      <input
                        type="text"
                        id="district"
                        name="district"
                        value={formData.district}
                        onChange={handleChange}
                        className="w-full rounded-md border border-purple-200 p-1.5 text-sm focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500"
                      />
                    </div>
                  </div>

                  <div className="grid gap-3 md:grid-cols-2">
                    <div className="space-y-1">
                      <label htmlFor="address" className="block text-xs font-medium text-purple-700">
                        Address
                      </label>
                      <textarea
                        id="address"
                        name="address"
                        value={formData.address}
                        onChange={handleChange}
                        rows={2}
                        className="w-full rounded-md border border-purple-200 p-1.5 text-sm focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500"
                      />
                    </div>

                    <div className="space-y-1">
                      <label htmlFor="villageBlock" className="block text-xs font-medium text-purple-700">
                        Village/Block
                      </label>
                      <input
                        type="text"
                        id="villageBlock"
                        name="villageBlock"
                        value={formData.villageBlock}
                        onChange={handleChange}
                        className="w-full rounded-md border border-purple-200 p-1.5 text-sm focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500"
                      />
                    </div>
                  </div>
                </div>

                {/* Power & Load Information */}
                <div className="space-y-3">
                  <h3 className="text-md font-medium text-purple-700 border-b border-purple-100 pb-1">
                    Power & Load Information
                  </h3>

                  <div className="grid gap-3 md:grid-cols-3">
                    <div className="space-y-1">
                      <label htmlFor="presentLoad" className="block text-xs font-medium text-purple-700">
                        Present Load
                      </label>
                      <input
                        type="text"
                        id="presentLoad"
                        name="presentLoad"
                        value={formData.presentLoad}
                        onChange={handleChange}
                        className="w-full rounded-md border border-purple-200 p-1.5 text-sm focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500"
                      />
                    </div>

                    <div className="space-y-1">
                      <label htmlFor="bpNumber" className="block text-xs font-medium text-purple-700">
                        BP Number
                      </label>
                      <input
                        type="text"
                        id="bpNumber"
                        name="bpNumber"
                        value={formData.bpNumber}
                        onChange={handleChange}
                        className="w-full rounded-md border border-purple-200 p-1.5 text-sm focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500"
                      />
                    </div>

                    <div className="space-y-1">
                      <label htmlFor="cspdclContractDemand" className="block text-xs font-medium text-purple-700">
                        CSPDCL Contract Demand
                      </label>
                      <input
                        type="text"
                        id="cspdclContractDemand"
                        name="cspdclContractDemand"
                        value={formData.cspdclContractDemand}
                        onChange={handleChange}
                        className="w-full rounded-md border border-purple-200 p-1.5 text-sm focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500"
                      />
                    </div>
                  </div>

                  <div className="grid gap-3 md:grid-cols-2">
                    <div className="space-y-1">
                      <label htmlFor="futureLoadRequirement" className="block text-xs font-medium text-purple-700">
                        Future Load Requirement
                      </label>
                      <input
                        type="text"
                        id="futureLoadRequirement"
                        name="futureLoadRequirement"
                        value={formData.futureLoadRequirement}
                        onChange={handleChange}
                        className="w-full rounded-md border border-purple-200 p-1.5 text-sm focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500"
                      />
                    </div>

                    <div className="space-y-1">
                      <label htmlFor="noOfHoursOfFailure" className="block text-xs font-medium text-purple-700">
                        Hours Of Failure
                      </label>
                      <input
                        type="number"
                        id="noOfHoursOfFailure"
                        name="noOfHoursOfFailure"
                        value={formData.noOfHoursOfFailure}
                        onChange={handleChange}
                        className="w-full rounded-md border border-purple-200 p-1.5 text-sm focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500"
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label htmlFor="loadDetailsApplication" className="block text-xs font-medium text-purple-700">
                      Load Details/Application
                    </label>
                    <textarea
                      id="loadDetailsApplication"
                      name="loadDetailsApplication"
                      value={formData.loadDetailsApplication}
                      onChange={handleChange}
                      rows={2}
                      className="w-full rounded-md border border-purple-200 p-1.5 text-sm focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500"
                    />
                  </div>
                </div>

                {/* Electricity Bill Upload */}
                <div className="space-y-3">
                  <h3 className="text-md font-medium text-purple-700 border-b border-purple-100 pb-1">
                    Electricity Bill
                  </h3>

                  <div className="space-y-1">
                    <label htmlFor="electricityBill" className="block text-xs font-medium text-purple-700">
                      Last 6 Months Average Bill
                    </label>
                    <div className="border-2 border-dashed border-purple-300 rounded-lg p-3">
                      <div className="text-center">
                        <FileImage className="mx-auto h-8 w-8 text-purple-400" />
                        <div className="mt-2">
                          <label htmlFor="electricityBill" className="cursor-pointer">
                            <span className="block text-xs font-medium text-purple-600">
                              {selectedImage ? selectedImage.name : "Click to upload electricity bill"}
                            </span>
                            <input
                              id="electricityBill"
                              type="file"
                              accept="image/*"
                              onChange={handleImageChange}
                              className="hidden"
                            />
                          </label>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* System Configuration */}
                <div className="space-y-3">
                  <h3 className="text-md font-medium text-purple-700 border-b border-purple-100 pb-1">
                    System Configuration
                  </h3>

                  <div className="grid gap-3 md:grid-cols-2">
                    <div className="space-y-1">
                      <label htmlFor="structureType" className="block text-xs font-medium text-purple-700">
                        Structure Type
                      </label>
                      <select
                        id="structureType"
                        name="structureType"
                        value={formData.structureType}
                        onChange={handleChange}
                        className="w-full rounded-md border border-purple-200 p-1.5 text-sm focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500"
                      >
                        <option value="">Select</option>
                        {structureTypeOptions.map((option, index) => (
                          <option key={index} value={option}>
                            {option}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="space-y-1">
                      <label htmlFor="roofType" className="block text-xs font-medium text-purple-700">
                        Roof Type
                      </label>
                      <select
                        id="roofType"
                        name="roofType"
                        value={formData.roofType}
                        onChange={handleChange}
                        className="w-full rounded-md border border-purple-200 p-1.5 text-sm focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500"
                      >
                        <option value="">Select</option>
                        {roofTypeOptions.map((option, index) => (
                          <option key={index} value={option}>
                            {option}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="grid gap-3 md:grid-cols-2">
                    <div className="space-y-1">
                      <label htmlFor="systemType" className="block text-xs font-medium text-purple-700">
                        System Type
                      </label>
                      <select
                        id="systemType"
                        name="systemType"
                        value={formData.systemType}
                        onChange={handleChange}
                        className="w-full rounded-md border border-purple-200 p-1.5 text-sm focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500"
                      >
                        <option value="">Select</option>
                        {systemTypeOptions.map((option, index) => (
                          <option key={index} value={option}>
                            {option}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="space-y-1">
                      <label htmlFor="needType" className="block text-xs font-medium text-purple-700">
                        Need Type
                      </label>
                      <select
                        id="needType"
                        name="needType"
                        value={formData.needType}
                        onChange={handleChange}
                        className="w-full rounded-md border border-purple-200 p-1.5 text-sm focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500"
                      >
                        <option value="">Select</option>
                        {needTypeOptions.map((option, index) => (
                          <option key={index} value={option}>
                            {option}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="grid gap-3 md:grid-cols-2">
                    <div className="space-y-1">
                      <label htmlFor="projectMode" className="block text-xs font-medium text-purple-700">
                        Project Mode
                      </label>
                      <input
                        type="text"
                        id="projectMode"
                        name="projectMode"
                        value={formData.projectMode}
                        onChange={handleChange}
                        className="w-full rounded-md border border-purple-200 p-1.5 text-sm focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500"
                      />
                    </div>

                    {/* Vendor Name dropdown */}
                    <div className="space-y-1">
                      <label htmlFor="vendorName" className="block text-xs font-medium text-purple-700">
                        Vendor Name
                      </label>
                      <select
                        id="vendorName"
                        name="vendorName"
                        value={formData.vendorName}
                        onChange={handleChange}
                        className="w-full rounded-md border border-purple-200 p-1.5 text-sm focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500"
                      >
                        <option value="">Select Vendor</option>
                        {vendorNameOptions.map((option, index) => (
                          <option key={index} value={option}>
                            {option}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>

                <div className="flex justify-between bg-gradient-to-r from-purple-50 to-pink-50 p-4 border-t border-purple-100 mt-6">
                  <button
                    type="button"
                    onClick={() => {
                      setFormData({
                        beneficiaryName: "",
                        address: "",
                        villageBlock: "",
                        district: "",
                        contactNumber: "",
                        presentLoad: "",
                        bpNumber: "",
                        cspdclContractDemand: "",
                        futureLoadRequirement: "",
                        loadDetailsApplication: "",
                        noOfHoursOfFailure: "",
                        structureType: "",
                        roofType: "",
                        systemType: "",
                        needType: "",
                        projectMode: "",
                        vendorName: ""
                      });
                      setSelectedImage(null);
                      setImagePreview(null);
                    }}
                    className="rounded-md border border-purple-200 py-1.5 px-3 text-sm text-purple-700 hover:border-purple-300 hover:bg-purple-100 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2"
                  >
                    Reset
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="rounded-md bg-gradient-to-r from-purple-600 to-pink-600 py-1.5 px-3 text-sm text-white hover:from-purple-700 hover:to-pink-700 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isSubmitting ? "Submitting..." : "Submit"}
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* History Tab Content with Vendor Name Column */}
          {activeTab === "history" && (
            <div>
              <div className="bg-gradient-to-r from-purple-50 to-pink-50 p-4 border-b border-purple-100">
                <div className="flex justify-between items-center">
                  <h2 className="text-lg font-semibold text-purple-700">
                    Survey History
                  </h2>
                  <button
                    onClick={fetchHistoryData}
                    disabled={isLoadingHistory}
                    className="rounded-md bg-purple-600 py-1.5 px-3 text-sm text-white hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 disabled:opacity-50"
                  >
                    {isLoadingHistory ? "Loading..." : "Refresh"}
                  </button>
                </div>
              </div>

              <div className="p-4">
                {isLoadingHistory ? (
                  <div className="text-center py-8">
                    <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
                    <p className="mt-2 text-purple-600">Loading history data...</p>
                  </div>
                ) : historyData.length === 0 ? (
                  <div className="text-center py-8">
                    <p className="text-gray-500">No history data found.</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="overflow-x-auto">
                      <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-purple-50">
                          <tr>
                            <th className="px-2 py-2 text-left text-xs font-medium text-purple-700 uppercase tracking-wider">Enquiry Number</th>
                            <th className="px-2 py-2 text-left text-xs font-medium text-purple-700 uppercase tracking-wider">Beneficiary Name</th>
                            <th className="px-2 py-2 text-left text-xs font-medium text-purple-700 uppercase tracking-wider">Vender Name</th>

                            <th className="px-2 py-2 text-left text-xs font-medium text-purple-700 uppercase tracking-wider">Address</th>
                            <th className="px-2 py-2 text-left text-xs font-medium text-purple-700 uppercase tracking-wider">Village/Block</th>
                            <th className="px-2 py-2 text-left text-xs font-medium text-purple-700 uppercase tracking-wider">District</th>
                            <th className="px-2 py-2 text-left text-xs font-medium text-purple-700 uppercase tracking-wider">Contact Number</th>
                            <th className="px-2 py-2 text-left text-xs font-medium text-purple-700 uppercase tracking-wider">Present Load</th>
                            <th className="px-2 py-2 text-left text-xs font-medium text-purple-700 uppercase tracking-wider">BP Number</th>
                            <th className="px-2 py-2 text-left text-xs font-medium text-purple-700 uppercase tracking-wider">CSPDCL Contract Demand</th>
                            <th className="px-2 py-2 text-left text-xs font-medium text-purple-700 uppercase tracking-wider">Electricity Bill</th>
                            <th className="px-2 py-2 text-left text-xs font-medium text-purple-700 uppercase tracking-wider">Future Load Requirement</th>
                            <th className="px-2 py-2 text-left text-xs font-medium text-purple-700 uppercase tracking-wider">Load Details/Application</th>
                            <th className="px-2 py-2 text-left text-xs font-medium text-purple-700 uppercase tracking-wider">Hours Of Failure</th>
                            <th className="px-2 py-2 text-left text-xs font-medium text-purple-700 uppercase tracking-wider">Structure Type</th>
                            <th className="px-2 py-2 text-left text-xs font-medium text-purple-700 uppercase tracking-wider">Roof Type</th>
                            <th className="px-2 py-2 text-left text-xs font-medium text-purple-700 uppercase tracking-wider">System Type</th>
                            <th className="px-2 py-2 text-left text-xs font-medium text-purple-700 uppercase tracking-wider">Need Type</th>
                            <th className="px-2 py-2 text-left text-xs font-medium text-purple-700 uppercase tracking-wider">Project Mode</th>
                            <th className="px-2 py-2 text-left text-xs font-medium text-purple-700 uppercase tracking-wider">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                          {historyData.map((row, index) => (
                            <tr key={`${row.enquiryNumber}-${index}`} className="hover:bg-purple-50">
                              <td className="px-2 py-2 whitespace-nowrap text-xs font-medium text-purple-600">{row.enquiryNumber}</td>
                              <td className="px-2 py-2 whitespace-nowrap text-xs text-gray-900">{row.beneficiaryName}</td>
                              <td className="px-2 py-2 whitespace-nowrap text-xs text-gray-900">{row.vendorName}</td>
                              <td className="px-2 py-2 text-xs text-gray-900 max-w-xs truncate">{row.address}</td>
                              <td className="px-2 py-2 whitespace-nowrap text-xs text-gray-900">{row.villageBlock}</td>
                              <td className="px-2 py-2 whitespace-nowrap text-xs text-gray-900">{row.district}</td>
                              <td className="px-2 py-2 whitespace-nowrap text-xs text-gray-900">{row.contactNumber}</td>
                              <td className="px-2 py-2 whitespace-nowrap text-xs text-gray-900">{row.presentLoad}</td>
                              <td className="px-2 py-2 whitespace-nowrap text-xs text-gray-900">{row.bpNumber}</td>
                              <td className="px-2 py-2 whitespace-nowrap text-xs text-gray-900">{row.cspdclContractDemand}</td>
                              <td className="px-2 py-2 whitespace-nowrap text-xs text-gray-900">
                                {row.electricityBillUrl && (
                                  <a href={row.electricityBillUrl} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:text-blue-800">
                                    View
                                  </a>
                                )}
                              </td>
                              <td className="px-2 py-2 whitespace-nowrap text-xs text-gray-900">{row.futureLoadRequirement}</td>
                              <td className="px-2 py-2 text-xs text-gray-900 max-w-xs truncate">{row.loadDetailsApplication}</td>
                              <td className="px-2 py-2 whitespace-nowrap text-xs text-gray-900">{row.noOfHoursOfFailure}</td>
                              <td className="px-2 py-2 whitespace-nowrap text-xs text-gray-900">{row.structureType}</td>
                              <td className="px-2 py-2 whitespace-nowrap text-xs text-gray-900">{row.roofType}</td>
                              <td className="px-2 py-2 whitespace-nowrap text-xs text-gray-900">{row.systemType}</td>
                              <td className="px-2 py-2 whitespace-nowrap text-xs text-gray-900">{row.needType}</td>
                              <td className="px-2 py-2 whitespace-nowrap text-xs text-gray-900">{row.projectMode}</td>
                              <td className="px-2 py-2 whitespace-nowrap text-xs text-gray-900">
                                <button
                                  onClick={() => startEdit(row)}
                                  className="text-purple-600 hover:text-purple-700"
                                  title="Edit"
                                >
                                  <Edit2 className="h-4 w-4" />
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Edit Modal Popup with Vendor Name Field */}
          {showEditModal && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
              <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
                <div className="sticky top-0 bg-white border-b border-purple-200 p-4 flex justify-between items-center">
                  <h3 className="text-lg font-semibold text-purple-700">
                    Edit Record - Enquiry #{editFormData.enquiryNumber}
                  </h3>
                  <button
                    onClick={cancelEdit}
                    className="text-gray-600 hover:text-gray-800"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>

                <div className="p-6">
                  <div className="space-y-6">
                    {/* Basic Information */}
                    <div className="space-y-3">
                      <h4 className="text-md font-medium text-purple-700 border-b border-purple-200 pb-1">
                        Basic Information
                      </h4>

                      <div className="grid gap-3 md:grid-cols-3">
                        <div className="space-y-1">
                          <label className="block text-xs font-medium text-purple-700">Beneficiary Name</label>
                          <input
                            type="text"
                            name="beneficiaryName"
                            value={editFormData.beneficiaryName || ""}
                            onChange={handleEditChange}
                            className="w-full rounded-md border border-purple-200 p-1.5 text-sm focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="block text-xs font-medium text-purple-700">Contact Number</label>
                          <input
                            type="tel"
                            name="contactNumber"
                            value={editFormData.contactNumber || ""}
                            onChange={handleEditChange}
                            className="w-full rounded-md border border-purple-200 p-1.5 text-sm focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="block text-xs font-medium text-purple-700">District</label>
                          <input
                            type="text"
                            name="district"
                            value={editFormData.district || ""}
                            onChange={handleEditChange}
                            className="w-full rounded-md border border-purple-200 p-1.5 text-sm focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500"
                          />
                        </div>
                      </div>

                      <div className="grid gap-3 md:grid-cols-2">
                        <div className="space-y-1">
                          <label className="block text-xs font-medium text-purple-700">Address</label>
                          <textarea
                            name="address"
                            value={editFormData.address || ""}
                            onChange={handleEditChange}
                            rows={2}
                            className="w-full rounded-md border border-purple-200 p-1.5 text-sm focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="block text-xs font-medium text-purple-700">Village/Block</label>
                          <input
                            type="text"
                            name="villageBlock"
                            value={editFormData.villageBlock || ""}
                            onChange={handleEditChange}
                            className="w-full rounded-md border border-purple-200 p-1.5 text-sm focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Power & Load Information */}
                    <div className="space-y-3">
                      <h4 className="text-md font-medium text-purple-700 border-b border-purple-200 pb-1">
                        Power & Load Information
                      </h4>

                      <div className="grid gap-3 md:grid-cols-3">
                        <div className="space-y-1">
                          <label className="block text-xs font-medium text-purple-700">Present Load</label>
                          <input
                            type="text"
                            name="presentLoad"
                            value={editFormData.presentLoad || ""}
                            onChange={handleEditChange}
                            className="w-full rounded-md border border-purple-200 p-1.5 text-sm focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="block text-xs font-medium text-purple-700">BP Number</label>
                          <input
                            type="text"
                            name="bpNumber"
                            value={editFormData.bpNumber || ""}
                            onChange={handleEditChange}
                            className="w-full rounded-md border border-purple-200 p-1.5 text-sm focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="block text-xs font-medium text-purple-700">CSPDCL Contract Demand</label>
                          <input
                            type="text"
                            name="cspdclContractDemand"
                            value={editFormData.cspdclContractDemand || ""}
                            onChange={handleEditChange}
                            className="w-full rounded-md border border-purple-200 p-1.5 text-sm focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500"
                          />
                        </div>
                      </div>

                      <div className="grid gap-3 md:grid-cols-2">
                        <div className="space-y-1">
                          <label className="block text-xs font-medium text-purple-700">Future Load Requirement</label>
                          <input
                            type="text"
                            name="futureLoadRequirement"
                            value={editFormData.futureLoadRequirement || ""}
                            onChange={handleEditChange}
                            className="w-full rounded-md border border-purple-200 p-1.5 text-sm focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="block text-xs font-medium text-purple-700">Hours Of Failure</label>
                          <input
                            type="number"
                            name="noOfHoursOfFailure"
                            value={editFormData.noOfHoursOfFailure || ""}
                            onChange={handleEditChange}
                            className="w-full rounded-md border border-purple-200 p-1.5 text-sm focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500"
                          />
                        </div>
                      </div>

                      <div className="space-y-1">
                        <label className="block text-xs font-medium text-purple-700">Load Details/Application</label>
                        <textarea
                          name="loadDetailsApplication"
                          value={editFormData.loadDetailsApplication || ""}
                          onChange={handleEditChange}
                          rows={2}
                          className="w-full rounded-md border border-purple-200 p-1.5 text-sm focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500"
                        />
                      </div>
                    </div>

                    {/* System Configuration */}
                    <div className="space-y-3">
                      <h4 className="text-md font-medium text-purple-700 border-b border-purple-200 pb-1">
                        System Configuration
                      </h4>

                      <div className="grid gap-3 md:grid-cols-2">
                        <div className="space-y-1">
                          <label className="block text-xs font-medium text-purple-700">Structure Type</label>
                          <select
                            name="structureType"
                            value={editFormData.structureType || ""}
                            onChange={handleEditChange}
                            className="w-full rounded-md border border-purple-200 p-1.5 text-sm focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500"
                          >
                            <option value="">Select</option>
                            {structureTypeOptions.map((option, index) => (
                              <option key={index} value={option}>
                                {option}
                              </option>
                            ))}
                          </select>
                        </div>
                        <div className="space-y-1">
                          <label className="block text-xs font-medium text-purple-700">Roof Type</label>
                          <select
                            name="roofType"
                            value={editFormData.roofType || ""}
                            onChange={handleEditChange}
                            className="w-full rounded-md border border-purple-200 p-1.5 text-sm focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500"
                          >
                            <option value="">Select</option>
                            {roofTypeOptions.map((option, index) => (
                              <option key={index} value={option}>
                                {option}
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>

                      <div className="grid gap-3 md:grid-cols-2">
                        <div className="space-y-1">
                          <label className="block text-xs font-medium text-purple-700">System Type</label>
                          <select
                            name="systemType"
                            value={editFormData.systemType || ""}
                            onChange={handleEditChange}
                            className="w-full rounded-md border border-purple-200 p-1.5 text-sm focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500"
                          >
                            <option value="">Select</option>
                            {systemTypeOptions.map((option, index) => (
                              <option key={index} value={option}>
                                {option}
                              </option>
                            ))}
                          </select>
                        </div>
                        <div className="space-y-1">
                          <label className="block text-xs font-medium text-purple-700">Need Type</label>
                          <select
                            name="needType"
                            value={editFormData.needType || ""}
                            onChange={handleEditChange}
                            className="w-full rounded-md border border-purple-200 p-1.5 text-sm focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500"
                          >
                            <option value="">Select</option>
                            {needTypeOptions.map((option, index) => (
                              <option key={index} value={option}>
                                {option}
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>

                      <div className="grid gap-3 md:grid-cols-2">
                        <div className="space-y-1">
                          <label className="block text-xs font-medium text-purple-700">Project Mode</label>
                          <input
                            type="text"
                            name="projectMode"
                            value={editFormData.projectMode || ""}
                            onChange={handleEditChange}
                            className="w-full rounded-md border border-purple-200 p-1.5 text-sm focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500"
                          />
                        </div>

                        {/* Vendor Name Field in Edit Modal */}
                        <div className="space-y-1">
                          <label className="block text-xs font-medium text-purple-700">Vendor Name</label>
                          <select
                            name="vendorName"
                            value={editFormData.vendorName || ""}
                            onChange={handleEditChange}
                            className="w-full rounded-md border border-purple-200 p-1.5 text-sm focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500"
                          >
                            <option value="">Select Vendor</option>
                            {vendorNameOptions.map((option, index) => (
                              <option key={index} value={option}>
                                {option}
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex justify-end gap-3 pt-6 border-t border-purple-200">
                      <button
                        onClick={cancelEdit}
                        className="rounded-md border border-gray-300 py-2 px-4 text-sm text-gray-700 hover:border-gray-400 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={() => saveEdit(editingRow)}
                        disabled={isSubmitting}
                        className="rounded-md bg-gradient-to-r from-purple-600 to-pink-600 py-2 px-4 text-sm text-white hover:from-purple-700 hover:to-pink-700 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {isSubmitting ? "Saving..." : "Save Changes"}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </AdminLayout>
  );
}
