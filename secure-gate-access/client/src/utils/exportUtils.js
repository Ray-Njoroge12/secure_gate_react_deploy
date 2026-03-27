/**
 * @file exportUtils.js
 * @description Export utilities for PDF and CSV generation
 * E3 Enhancement: Analytics Dashboard Export Functionality
 *
 * Features:
 * - PDF export with jsPDF and autoTable
 * - CSV export with papaparse
 * - Formatted reports with branding
 * - Support for charts and data tables
 */

import jsPDF from 'jspdf';
import 'jspdf-autotable';
import Papa from 'papaparse';

/**
 * Format date for file names and reports
 */
const formatDate = (date = new Date()) => {
  return date.toISOString().split('T')[0];
};

/**
 * Format date and time for report headers
 */
const formatDateTime = (date = new Date()) => {
  return date.toLocaleString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
};

/**
 * Export analytics data to PDF
 *
 * @param {Object} options - Export options
 * @param {Object} options.data - Analytics data to export
 * @param {string} options.dateRange - Date range label (e.g., "7 Days", "30 Days")
 * @param {string} options.estateName - Estate name for branding
 * @param {Object} options.stats - Statistics data
 * @param {Array} options.visitorData - Detailed visitor data
 */
export const exportToPDF = ({
  data = {},
  dateRange = '7 Days',
  estateName = 'Secure Gate Access',
  stats = {},
  visitorData = []
}) => {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();

  // Colors matching the brand
  const primaryColor = [16, 185, 129]; // #10b981 green
  const textColor = [31, 41, 55]; // gray-800

  let yPos = 20;

  // Header with branding
  doc.setFillColor(...primaryColor);
  doc.rect(0, 0, pageWidth, 30, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(20);
  doc.setFont('helvetica', 'bold');
  doc.text('Analytics Report', 15, 15);

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(estateName, 15, 22);

  // Report metadata (right-aligned)
  const reportDate = formatDateTime();
  const metaX = pageWidth - 15;
  doc.setFontSize(9);
  doc.text(`Generated: ${reportDate}`, metaX, 15, { align: 'right' });
  doc.text(`Period: ${dateRange}`, metaX, 20, { align: 'right' });

  yPos = 45;

  // Reset text color for body
  doc.setTextColor(...textColor);

  // Summary Statistics Section
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('Summary Statistics', 15, yPos);
  yPos += 10;

  // Create stats grid
  const statsData = [
    ['Total Visitors', stats.totalVisitors || 'N/A'],
    ['Today\'s Check-ins', stats.todayCheckins || 'N/A'],
    ['Pending Approvals', stats.pendingApprovals || 'N/A'],
    ['Avg. Check-in Time', stats.avgCheckInTime || 'N/A'],
  ];

  doc.autoTable({
    startY: yPos,
    head: [['Metric', 'Value']],
    body: statsData,
    theme: 'grid',
    headStyles: {
      fillColor: primaryColor,
      textColor: [255, 255, 255],
      fontStyle: 'bold'
    },
    styles: {
      fontSize: 10,
      cellPadding: 5
    },
    columnStyles: {
      0: { fontStyle: 'bold', cellWidth: 80 },
      1: { cellWidth: 50 }
    }
  });

  yPos = doc.lastAutoTable.finalY + 15;

  // Hourly Activity Section (if data exists)
  if (data.hourlyData && data.hourlyLabels) {
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('Hourly Activity', 15, yPos);
    yPos += 10;

    const hourlyTableData = data.hourlyLabels.map((label, index) => [
      label,
      data.hourlyData[index] || 0
    ]);

    doc.autoTable({
      startY: yPos,
      head: [['Time', 'Visitors']],
      body: hourlyTableData,
      theme: 'grid',
      headStyles: {
        fillColor: primaryColor,
        textColor: [255, 255, 255]
      },
      styles: {
        fontSize: 9,
        cellPadding: 3
      },
      columnStyles: {
        0: { cellWidth: 40 },
        1: { cellWidth: 30, halign: 'right' }
      },
      pageBreak: 'auto'
    });

    yPos = doc.lastAutoTable.finalY + 15;
  }

  // Visitor Purpose Distribution Section
  if (data.purposeData && data.purposeLabels) {
    // Check if we need a new page
    if (yPos > pageHeight - 60) {
      doc.addPage();
      yPos = 20;
    }

    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('Visitor Purpose Distribution', 15, yPos);
    yPos += 10;

    const total = data.purposeData.reduce((sum, val) => sum + val, 0);
    const purposeTableData = data.purposeLabels.map((label, index) => {
      const value = data.purposeData[index] || 0;
      const percentage = total > 0 ? ((value / total) * 100).toFixed(1) : '0.0';
      return [label, value, `${percentage}%`];
    });

    doc.autoTable({
      startY: yPos,
      head: [['Purpose', 'Count', 'Percentage']],
      body: purposeTableData,
      theme: 'grid',
      headStyles: {
        fillColor: primaryColor,
        textColor: [255, 255, 255]
      },
      styles: {
        fontSize: 10,
        cellPadding: 4
      },
      columnStyles: {
        0: { cellWidth: 70 },
        1: { cellWidth: 30, halign: 'right' },
        2: { cellWidth: 35, halign: 'right' }
      }
    });

    yPos = doc.lastAutoTable.finalY + 15;
  }

  // Detailed Visitor Data Section (if provided)
  if (visitorData && visitorData.length > 0) {
    // Check if we need a new page
    if (yPos > pageHeight - 60) {
      doc.addPage();
      yPos = 20;
    }

    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('Detailed Visitor Log', 15, yPos);
    yPos += 10;

    const visitorTableData = visitorData.slice(0, 50).map(visitor => [
      visitor.name || 'N/A',
      visitor.purpose || 'N/A',
      visitor.checkIn ? new Date(visitor.checkIn).toLocaleString('en-US', {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      }) : 'Pending',
      visitor.status || 'N/A'
    ]);

    doc.autoTable({
      startY: yPos,
      head: [['Visitor Name', 'Purpose', 'Check-in Time', 'Status']],
      body: visitorTableData,
      theme: 'striped',
      headStyles: {
        fillColor: primaryColor,
        textColor: [255, 255, 255]
      },
      styles: {
        fontSize: 8,
        cellPadding: 3
      },
      columnStyles: {
        0: { cellWidth: 45 },
        1: { cellWidth: 40 },
        2: { cellWidth: 45 },
        3: { cellWidth: 30 }
      },
      pageBreak: 'auto'
    });

    if (visitorData.length > 50) {
      doc.setFontSize(9);
      doc.setTextColor(100, 100, 100);
      doc.text(`Showing first 50 of ${visitorData.length} visitors. Export to CSV for complete data.`,
        15, doc.lastAutoTable.finalY + 10);
    }
  }

  // Footer on every page
  const pageCount = doc.internal.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(150, 150, 150);
    doc.text(
      `Page ${i} of ${pageCount}`,
      pageWidth / 2,
      pageHeight - 10,
      { align: 'center' }
    );
    doc.text(
      `${estateName} - Secure Gate Access System`,
      pageWidth - 15,
      pageHeight - 10,
      { align: 'right' }
    );
  }

  // Save the PDF
  const fileName = `analytics-report-${formatDate()}.pdf`;
  doc.save(fileName);

  return fileName;
};

/**
 * Export analytics data to CSV
 *
 * @param {Object} options - Export options
 * @param {Array} options.visitorData - Visitor data array
 * @param {Object} options.stats - Statistics object
 * @param {string} options.dateRange - Date range label
 * @param {string} options.type - Type of export ('visitors', 'hourly', 'purpose', 'full')
 * @param {Object} options.data - Additional analytics data
 */
export const exportToCSV = ({
  visitorData = [],
  stats = {},
  dateRange = '7 Days',
  type = 'visitors',
  data = {}
}) => {
  let csvData = [];
  let fileName = '';

  switch (type) {
    case 'visitors':
      // Export detailed visitor log
      csvData = visitorData.map(visitor => ({
        'Visitor Name': visitor.name || '',
        'Phone': visitor.phone || '',
        'Email': visitor.email || '',
        'Purpose': visitor.purpose || '',
        'Host Resident': visitor.residentName || '',
        'Check-in Time': visitor.checkIn ? new Date(visitor.checkIn).toLocaleString() : '',
        'Check-out Time': visitor.checkOut ? new Date(visitor.checkOut).toLocaleString() : '',
        'Status': visitor.status || '',
        'Vehicle Plate': visitor.vehiclePlate || '',
        'Date Created': visitor.createdAt ? new Date(visitor.createdAt).toLocaleString() : ''
      }));
      fileName = `visitor-log-${formatDate()}.csv`;
      break;

    case 'hourly':
      // Export hourly activity data
      csvData = (data.hourlyLabels || []).map((label, index) => ({
        'Time': label,
        'Visitor Count': data.hourlyData?.[index] || 0
      }));
      fileName = `hourly-activity-${formatDate()}.csv`;
      break;

    case 'purpose':
      // Export purpose distribution
      const total = (data.purposeData || []).reduce((sum, val) => sum + val, 0);
      csvData = (data.purposeLabels || []).map((label, index) => {
        const value = data.purposeData?.[index] || 0;
        const percentage = total > 0 ? ((value / total) * 100).toFixed(1) : '0.0';
        return {
          'Purpose': label,
          'Count': value,
          'Percentage': `${percentage}%`
        };
      });
      fileName = `purpose-distribution-${formatDate()}.csv`;
      break;

    case 'full':
      // Export comprehensive analytics summary
      csvData = [
        { 'Report Type': 'Analytics Summary', 'Date Range': dateRange, 'Generated': formatDateTime() },
        {},
        { 'Metric': 'Total Visitors', 'Value': stats.totalVisitors || 'N/A' },
        { 'Metric': 'Today\'s Check-ins', 'Value': stats.todayCheckins || 'N/A' },
        { 'Metric': 'Pending Approvals', 'Value': stats.pendingApprovals || 'N/A' },
        { 'Metric': 'Avg. Check-in Time', 'Value': stats.avgCheckInTime || 'N/A' },
      ];
      fileName = `analytics-full-${formatDate()}.csv`;
      break;

    default:
      csvData = [];
      fileName = `export-${formatDate()}.csv`;
  }

  // Convert to CSV using papaparse
  const csv = Papa.unparse(csvData);

  // Create blob and download
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');

  if (navigator.msSaveBlob) {
    // IE 10+
    navigator.msSaveBlob(blob, fileName);
  } else {
    link.href = URL.createObjectURL(blob);
    link.download = fileName;
    link.style.display = 'none';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  return fileName;
};

/**
 * Export current view/chart as image (future enhancement)
 * This can be used to embed charts in reports
 */
export const exportChartAsImage = async (_chartElement) => {
  // Future: Use html2canvas or similar to capture chart
  console.warn('Chart image export not yet implemented');
  return null;
};

export default {
  exportToPDF,
  exportToCSV,
  exportChartAsImage
};
