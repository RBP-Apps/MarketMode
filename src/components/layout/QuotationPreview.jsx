
import { useState } from "react";
import {
  Eye,
  XCircle,
  Save,
  Download,
  Calendar,
  User,
  Phone,
  Mail,
  Building,
  MapPin,
  FileText,
  Percent,
  CreditCard,
  Zap,
  Clock,
  Grid,
  Home,
  Package,
  Fingerprint,
  Map,
} from "lucide-react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

export default function QuotationPreview({ formData, productDetails, onClose, onSubmit, isSubmitting }) {
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);

  const generatePDF = () => {
    setIsGeneratingPDF(true);
    
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    let yPos = 20;

    // Header with Gradient Effect
    doc.setFillColor(59, 130, 246);
    doc.rect(0, 0, pageWidth, 40, 'F');
    
    doc.setFontSize(24);
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.text('SOLAR QUOTATION', pageWidth / 2, 22, { align: 'center' });
    
    doc.setFontSize(10);
    doc.setTextColor(240, 240, 240);
    doc.text('Official Quotation Document', pageWidth / 2, 32, { align: 'center' });
    
    yPos = 50;
    
    // Quotation Info Box
    doc.setFillColor(245, 247, 250);
    doc.rect(14, yPos, pageWidth - 28, 35, 'F');
    doc.setDrawColor(200, 200, 200);
    doc.rect(14, yPos, pageWidth - 28, 35, 'S');
    
    doc.setFontSize(10);
    doc.setTextColor(0, 0, 0);
    doc.setFont('helvetica', 'normal');
    
    doc.text(`Quotation No: ${String(formData.quotationNo || 'N/A')}`, 20, yPos + 10);
    doc.text(`Date: ${String(formData.date || 'N/A')}`, 20, yPos + 18);
    doc.text(`Reference By: ${String(formData.referenceBy || 'N/A')}`, 20, yPos + 26);
    
    yPos += 45;
    
    // Customer Details Section
    doc.setFillColor(59, 130, 246);
    doc.rect(14, yPos, pageWidth - 28, 8, 'F');
    doc.setFontSize(12);
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.text('CUSTOMER DETAILS', 20, yPos + 6);
    
    yPos += 15;
    doc.setFontSize(9);
    doc.setTextColor(0, 0, 0);
    doc.setFont('helvetica', 'normal');
    
    const customerData = [
      ['Salesperson:', String(formData.salesperson || 'N/A'), 'Customer Name:', String(formData.customer || 'N/A')],
      ['Contact No:', String(formData.contactNo || 'N/A'), 'Email:', String(formData.email || 'N/A')],
      ['Dealer:', String(formData.dealer || 'N/A'), 'Alternate Phone:', String(formData.phoneNo || 'N/A')],
    ];
    
    customerData.forEach((row, idx) => {
      doc.text(String(row[0]), 20, yPos + (idx * 8));
      doc.text(String(row[1]), 55, yPos + (idx * 8));
      doc.text(String(row[2]), 120, yPos + (idx * 8));
      doc.text(String(row[3]), 155, yPos + (idx * 8));
    });
    
    yPos += 35;
    
    // Installation Details Section
    doc.setFillColor(59, 130, 246);
    doc.rect(14, yPos, pageWidth - 28, 8, 'F');
    doc.setFontSize(12);
    doc.setTextColor(255, 255, 255);
    doc.text('INSTALLATION DETAILS', 20, yPos + 6);
    
    yPos += 15;
    doc.setFontSize(9);
    doc.setTextColor(0, 0, 0);
    
    const installData = [
      ['Structure Type:', String(formData.structureType || 'N/A'), 'Place of Installation:', String(formData.placeOfInstallation || 'N/A')],
      ['Need Type:', String(formData.needType || 'N/A'), 'Load Details:', String(formData.loadDetails || 'N/A')],
      ['Hours of Failure:', String(formData.failureHours || 'N/A'), '', ''],
    ];
    
    installData.forEach((row, idx) => {
      doc.text(String(row[0]), 20, yPos + (idx * 8));
      doc.text(String(row[1]), 60, yPos + (idx * 8));
      doc.text(String(row[2]), 120, yPos + (idx * 8));
      doc.text(String(row[3]), 155, yPos + (idx * 8));
    });
    
    yPos += 35;
    
    // Product Details Section
    doc.setFillColor(34, 197, 94);
    doc.rect(14, yPos, pageWidth - 28, 8, 'F');
    doc.setFontSize(12);
    doc.setTextColor(255, 255, 255);
    doc.text('PRODUCT DETAILS', 20, yPos + 6);
    
    yPos += 15;
    
    // Product Table
    const productTableData = [
      ['Product Code', String(formData.rating || 'N/A')],
      ['Product Name', String(productDetails.productName || 'N/A')],
      ['BOM', String(productDetails.bom || 'N/A')],
      ['Size', String(productDetails.size || 'N/A')],
      ['Quantity', String(formData.qty || '0')],
      ['Rate (₹)', String(productDetails.rate || '0')],
      ['GST %', String(productDetails.gst || '0')],
      ['Amount (₹)', String(productDetails.amount || '0')],
    ];
    
    // Use autoTable with doc parameter
    autoTable(doc, {
      startY: yPos,
      head: [['Field', 'Value']],
      body: productTableData,
      theme: 'striped',
      headStyles: { fillColor: [34, 197, 94], textColor: [255, 255, 255], fontSize: 10 },
      bodyStyles: { fontSize: 9 },
      margin: { left: 14, right: 14 },
    });
    
    yPos = doc.lastAutoTable.finalY + 15;
    
    // Check if we need a new page
    if (yPos > pageHeight - 120) {
      doc.addPage();
      yPos = 20;
    }
    
    // Terms & Conditions Section
    doc.setFillColor(168, 85, 247);
    doc.rect(14, yPos, pageWidth - 28, 8, 'F');
    doc.setFontSize(12);
    doc.setTextColor(255, 255, 255);
    doc.text('TERMS & CONDITIONS', 20, yPos + 6);
    
    yPos += 15;
    doc.setFontSize(8);
    doc.setTextColor(0, 0, 0);
    
    const termsText = doc.splitTextToSize(String(formData.termsConditions || 'N/A'), pageWidth - 28);
    doc.text(termsText, 14, yPos);
    
    yPos += (termsText.length * 5) + 15;
    
    // Check if we need a new page
    if (yPos > pageHeight - 100) {
      doc.addPage();
      yPos = 20;
    }
    
    // General Terms & Conditions Section
    doc.setFillColor(168, 85, 247);
    doc.rect(14, yPos, pageWidth - 28, 8, 'F');
    doc.setFontSize(12);
    doc.setTextColor(255, 255, 255);
    doc.text('GENERAL TERMS & CONDITIONS', 20, yPos + 6);
    
    yPos += 15;
    doc.setFontSize(8);
    doc.setTextColor(0, 0, 0);
    
    const generalTermsText = doc.splitTextToSize(String(formData.generalTerms || 'N/A'), pageWidth - 28);
    doc.text(generalTermsText, 14, yPos);
    
    yPos += (generalTermsText.length * 5) + 15;
    
    // Bank Details
    if (formData.bankAccount || formData.accountNo) {
      if (yPos > pageHeight - 80) {
        doc.addPage();
        yPos = 20;
      }
      
      doc.setFillColor(245, 158, 11);
      doc.rect(14, yPos, pageWidth - 28, 8, 'F');
      doc.setFontSize(12);
      doc.setTextColor(255, 255, 255);
      doc.text('BANK DETAILS', 20, yPos + 6);
      
      yPos += 15;
      doc.setFontSize(9);
      doc.setTextColor(0, 0, 0);
      
      const bankDetails = [
        `Bank Name: ${String(formData.bankAccount || 'N/A')}`,
        `Account No.: ${String(formData.accountNo || 'N/A')}`,
        `IFSC Code: ${String(formData.ifscCode || 'N/A')}`,
        `Branch: ${String(formData.branch || 'N/A')}`,
      ];
      
      bankDetails.forEach((detail, idx) => {
        doc.text(String(detail), 20, yPos + (idx * 6));
      });
      
      yPos += 35;
    }
    
    // Footer
    doc.setFillColor(240, 240, 240);
    doc.rect(0, pageHeight - 20, pageWidth, 20, 'F');
    doc.setFontSize(8);
    doc.setTextColor(100, 100, 100);
    doc.text('This is a computer generated quotation. Valid for 15 days.', pageWidth / 2, pageHeight - 12, { align: 'center' });
    
    // Save PDF
    const fileName = `Quotation_${String(formData.quotationNo || 'New')}_${String(formData.customer || 'Customer')}.pdf`;
    doc.save(fileName);
    
    setIsGeneratingPDF(false);
  };

  const handleSubmit = () => {
    onSubmit();
  };


  // Add these calculation functions inside the QuotationPreview component
const calculateAfterDiscount = () => {
  const amount = parseFloat(productDetails.amount || 0);
  const discountPercent = parseFloat(formData.disc || 0);
  const discountAmount = (amount * discountPercent) / 100;
  return amount - discountAmount;
};


const calculateGSTAmount = () => {
  const afterDiscount = calculateAfterDiscount();
  const gst = parseFloat(productDetails.gst || 0);

  // agar gst < 1 hai → decimal hai
  if (gst < 1) {
    return afterDiscount * gst;
  }

  // agar gst >= 1 hai → percentage hai
  return (afterDiscount * gst) / 100;
};


const calculateAfterGST = () => {
  return calculateAfterDiscount() + calculateGSTAmount();
};

const calculateNetCost = () => {
  const afterGST = calculateAfterGST();
  const centralSubsidy = parseFloat(formData.subCentral || 0);
  const stateSubsidy = parseFloat(formData.subState || 0);
  return afterGST - centralSubsidy - stateSubsidy;
};

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-xl shadow-2xl max-w-6xl w-full max-h-[90vh] overflow-y-auto">
        {/* Modal Header */}
        <div className="sticky top-0 bg-gradient-to-r from-blue-600 to-indigo-600 px-6 py-4 rounded-t-xl flex justify-between items-center z-10">
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <Eye className="h-5 w-5" />
            Quotation Preview
          </h2>
          <button
            onClick={onClose}
            className="text-white hover:bg-white hover:bg-opacity-20 rounded-lg p-1 transition-colors"
          >
            <XCircle className="h-6 w-6" />
          </button>
        </div>
        
        {/* Modal Content */}
        <div className="p-6 bg-gray-50">
          <div className="bg-white rounded-lg shadow-lg p-8 mb-6 max-h-[60vh] overflow-y-auto">
            {/* Quotation Header */}
            <div className="bg-gradient-to-r from-blue-600 to-indigo-600 -mx-8 -mt-8 px-8 py-6 mb-8 rounded-t-lg">
              <h1 className="text-3xl font-bold text-white text-center">SOLAR QUOTATION</h1>
              <p className="text-blue-100 text-center mt-2">Official Quotation Document</p>
            </div>
            
            {/* Quotation Info */}
            <div className="grid grid-cols-3 gap-4 mb-6 pb-4 border-b">
              <div>
                <p className="text-sm text-gray-500">Quotation No:</p>
                <p className="font-semibold">{String(formData.quotationNo || 'N/A')}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Date:</p>
                <p className="font-semibold">{String(formData.date || 'N/A')}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Reference By:</p>
                <p className="font-semibold">{String(formData.referenceBy || 'N/A')}</p>
              </div>
            </div>
            
            {/* Customer Details */}
            <div className="mb-6">
              <h3 className="text-lg font-semibold bg-blue-600 text-white px-3 py-1 rounded inline-block mb-3">CUSTOMER DETAILS</h3>
              <div className="grid grid-cols-2 gap-4">
                <div><span className="text-sm text-gray-500">Salesperson:</span> <span className="font-medium">{String(formData.salesperson || 'N/A')}</span></div>
                <div><span className="text-sm text-gray-500">Customer Name:</span> <span className="font-medium">{String(formData.customer || 'N/A')}</span></div>
                <div><span className="text-sm text-gray-500">Contact No:</span> <span className="font-medium">{String(formData.contactNo || 'N/A')}</span></div>
                <div><span className="text-sm text-gray-500">Email:</span> <span className="font-medium">{String(formData.email || 'N/A')}</span></div>
                <div><span className="text-sm text-gray-500">Dealer:</span> <span className="font-medium">{String(formData.dealer || 'N/A')}</span></div>
                <div><span className="text-sm text-gray-500">Alternate Phone:</span> <span className="font-medium">{String(formData.phoneNo || 'N/A')}</span></div>
              </div>
            </div>
            
            {/* Installation Details */}
            <div className="mb-6">
              <h3 className="text-lg font-semibold bg-blue-600 text-white px-3 py-1 rounded inline-block mb-3">INSTALLATION DETAILS</h3>
              <div className="grid grid-cols-2 gap-4">
                <div><span className="text-sm text-gray-500">Structure Type:</span> <span className="font-medium">{String(formData.structureType || 'N/A')}</span></div>
                <div><span className="text-sm text-gray-500">Place of Installation:</span> <span className="font-medium">{String(formData.placeOfInstallation || 'N/A')}</span></div>
                <div><span className="text-sm text-gray-500">Need Type:</span> <span className="font-medium">{String(formData.needType || 'N/A')}</span></div>
                <div><span className="text-sm text-gray-500">Load Details:</span> <span className="font-medium">{String(formData.loadDetails || 'N/A')}</span></div>
                <div><span className="text-sm text-gray-500">Hours of Failure:</span> <span className="font-medium">{String(formData.failureHours || 'N/A')}</span></div>
              </div>
            </div>
            
            {/* Product Details */}
            <div className="mb-6">
              <h3 className="text-lg font-semibold bg-green-600 text-white px-3 py-1 rounded inline-block mb-3">PRODUCT DETAILS</h3>
              <div className="border rounded-lg overflow-hidden">
                <table className="min-w-full divide-y divide-gray-200">
                  <tbody className="divide-y divide-gray-200">
                    <tr><td className="px-4 py-2 bg-gray-50 font-medium w-1/3">Product Code</td><td className="px-4 py-2">{String(formData.rating || 'N/A')}</td></tr>
                    <tr><td className="px-4 py-2 bg-gray-50 font-medium">Product Name</td><td className="px-4 py-2">{String(productDetails.productName || 'N/A')}</td></tr>
                    <tr><td className="px-4 py-2 bg-gray-50 font-medium">BOM</td><td className="px-4 py-2">{String(productDetails.bom || 'N/A')}</td></tr>
                    <tr><td className="px-4 py-2 bg-gray-50 font-medium">Size</td><td className="px-4 py-2">{String(productDetails.size || 'N/A')}</td></tr>
                    <tr><td className="px-4 py-2 bg-gray-50 font-medium">Quantity</td><td className="px-4 py-2">{String(formData.qty || '0')}</td></tr>
                    <tr><td className="px-4 py-2 bg-gray-50 font-medium">Rate (₹)</td><td className="px-4 py-2">{String(productDetails.rate || '0')}</td></tr>
                    <tr><td className="px-4 py-2 bg-gray-50 font-medium">GST %</td><td className="px-4 py-2">{String(productDetails.gst || '0')}</td></tr>
                    <tr><td className="px-4 py-2 bg-gray-50 font-medium font-bold">Amount (₹)</td><td className="px-4 py-2 font-bold text-green-600">{String(productDetails.amount || '0')}</td></tr>
                  </tbody>
                </table>
              </div>
            </div>

            {/* Calculation Section */}
{(formData.disc || productDetails.gst || formData.subCentral || formData.subState) && (
  <div className="mb-6">
    <h3 className="text-lg font-semibold bg-orange-600 text-white px-3 py-1 rounded inline-block mb-3">COST CALCULATION</h3>
    <div className="border rounded-lg overflow-hidden bg-gray-50">
      <table className="min-w-full divide-y divide-gray-200">
        <tbody className="divide-y divide-gray-200">
          {/* Original Amount */}
          <tr>
            <td className="px-4 py-3 bg-gray-50 font-medium w-1/3">Original Amount</td>
            <td className="px-4 py-3">₹ {parseFloat(productDetails.amount || 0).toFixed(2)}</td>
          </tr>
          
          {/* Discount */}
          <tr>
            <td className="px-4 py-3 bg-gray-50 font-medium">Discount ({formData.disc || 0}%)</td>
            <td className="px-4 py-3 text-red-600">
              - ₹ {((parseFloat(productDetails.amount || 0) * parseFloat(formData.disc || 0)) / 100).toFixed(2)}
            </td>
          </tr>
          
          {/* After Discount */}
          <tr className="bg-blue-50">
            <td className="px-4 py-3 bg-blue-100 font-medium">After Discount</td>
            <td className="px-4 py-3 font-semibold">₹ {calculateAfterDiscount().toFixed(2)}</td>
          </tr>
          
          {/* GST */}
          <tr>
            <td className="px-4 py-3 bg-gray-50 font-medium">GST ({productDetails.gst || 0}%)</td>
            <td className="px-4 py-3 text-green-600">
              + ₹ {calculateGSTAmount().toFixed(2)}
            </td>
          </tr>
          
          {/* After GST */}
          <tr className="bg-blue-50">
            <td className="px-4 py-3 bg-blue-100 font-medium">After GST</td>
            <td className="px-4 py-3 font-semibold">₹ {calculateAfterGST().toFixed(2)}</td>
          </tr>
          
          {/* Central Subsidy */}
          <tr>
            <td className="px-4 py-3 bg-gray-50 font-medium">Central Subsidy</td>
            <td className="px-4 py-3 text-green-600">
              - ₹ {parseFloat(formData.subCentral || 0).toFixed(2)}
            </td>
          </tr>
          
          {/* State Subsidy */}
          <tr>
            <td className="px-4 py-3 bg-gray-50 font-medium">State Subsidy</td>
            <td className="px-4 py-3 text-green-600">
              - ₹ {parseFloat(formData.subState || 0).toFixed(2)}
            </td>
          </tr>
          
          {/* Net Cost */}
          <tr className="bg-green-100">
            <td className="px-4 py-3 bg-green-200 font-bold text-lg">NET COST</td>
            <td className="px-4 py-3 font-bold text-xl text-green-700">₹ {calculateNetCost().toFixed(2)}</td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
)}
            
            {/* Terms & Conditions */}
            <div className="mb-6">
              <h3 className="text-lg font-semibold bg-purple-600 text-white px-3 py-1 rounded inline-block mb-3">TERMS & CONDITIONS</h3>
              <div className="bg-gray-50 p-4 rounded-lg whitespace-pre-wrap text-sm">
                {String(formData.termsConditions || 'N/A')}
              </div>
            </div>
            
            {/* General Terms & Conditions */}
            <div className="mb-6">
              <h3 className="text-lg font-semibold bg-purple-600 text-white px-3 py-1 rounded inline-block mb-3">GENERAL TERMS & CONDITIONS</h3>
              <div className="bg-gray-50 p-4 rounded-lg whitespace-pre-wrap text-sm">
                {String(formData.generalTerms || 'N/A')}
              </div>
            </div>
            
            {/* Bank Details */}
            {(formData.bankAccount || formData.accountNo) && (
              <div className="mb-6">
                <h3 className="text-lg font-semibold bg-yellow-600 text-white px-3 py-1 rounded inline-block mb-3">BANK DETAILS</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div><span className="text-sm text-gray-500">Bank Name:</span> <span className="font-medium">{String(formData.bankAccount || 'N/A')}</span></div>
                  <div><span className="text-sm text-gray-500">Account No.:</span> <span className="font-medium">{String(formData.accountNo || 'N/A')}</span></div>
                  <div><span className="text-sm text-gray-500">IFSC Code:</span> <span className="font-medium">{String(formData.ifscCode || 'N/A')}</span></div>
                  <div><span className="text-sm text-gray-500">Branch:</span> <span className="font-medium">{String(formData.branch || 'N/A')}</span></div>
                </div>
              </div>
            )}
          </div>
        </div>
        
        {/* Modal Footer */}
        <div className="sticky bottom-0 bg-gray-50 px-6 py-4 rounded-b-xl border-t flex justify-end gap-3">
          {/* <button
            onClick={generatePDF}
            disabled={isGeneratingPDF}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2 disabled:opacity-50"
          >
            <Download className="h-4 w-4" />
            {isGeneratingPDF ? 'Generating...' : 'Download PDF'}
          </button> */}
          <button
            onClick={onClose}
            className="px-6 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors flex items-center gap-2"
          >
            <XCircle className="h-4 w-4" />
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="px-6 py-2 bg-gradient-to-r from-green-600 to-green-700 text-white rounded-lg hover:from-green-700 hover:to-green-800 transition-colors flex items-center gap-2 disabled:opacity-50"
          >
            {isSubmitting ? (
              <>
                <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                Submitting...
              </>
            ) : (
              <>
                <Save className="h-4 w-4" />
                Submit & Save to Sheet
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}