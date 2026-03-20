/**
 * Export Service - Handles data export and report generation
 * Supports multiple formats (PDF, Excel, CSV) with customizable field selection
 */

import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import logger from '../utils/logger';

class ExportService {
  constructor() {
    this.supportedFormats = ['csv', 'excel', 'pdf'];
    this.exportQueue = new Map();
    this.exportHistory = [];
  }

  /**
   * Export data to specified format
   * @param {Object} options - Export configuration
   * @param {Array} options.data - Data to export
   * @param {string} options.format - Export format (csv, excel, pdf)
   * @param {Array} options.fields - Fields to include in export
   * @param {string} options.filename - Output filename
   * @param {Object} options.metadata - Additional metadata
   * @returns {Promise<Blob>} - Export file blob
   */
  async exportData(options) {
    const {
      data,
      format,
      fields = null,
      filename = `export_${Date.now()}`,
      metadata = {}
    } = options;

    // Validate format
    if (!this.supportedFormats.includes(format.toLowerCase())) {
      throw new Error(`Unsupported export format: ${format}`);
    }

    // Filter fields if specified
    const processedData = fields ? this.filterFields(data, fields) : data;

    // Generate export based on format
    let blob;
    switch (format.toLowerCase()) {
      case 'csv':
        blob = await this.exportToCSV(processedData, filename, metadata);
        break;
      case 'excel':
        blob = await this.exportToExcel(processedData, filename, metadata);
        break;
      case 'pdf':
        blob = await this.exportToPDF(processedData, filename, metadata);
        break;
      default:
        throw new Error(`Export format not implemented: ${format}`);
    }

    // Track export in history
    this.addToHistory({
      filename,
      format,
      recordCount: processedData.length,
      fields: fields || Object.keys(data[0] || {}),
      timestamp: new Date().toISOString(),
      size: blob.size
    });

    return blob;
  }

  /**
   * Export to CSV format
   */
  async exportToCSV(data, filename, metadata) {
    if (!data || data.length === 0) {
      throw new Error('No data to export');
    }

    const headers = Object.keys(data[0]);
    const csvContent = [
      // Add metadata as comments if provided
      ...(metadata.title ? [`# ${metadata.title}`] : []),
      ...(metadata.description ? [`# ${metadata.description}`] : []),
      ...(metadata.generatedAt ? [`# Generated: ${metadata.generatedAt}`] : []),
      '',
      // Headers
      headers.join(','),
      // Data rows
      ...data.map(row => 
        headers.map(header => {
          const value = row[header];
          // Escape commas and quotes in CSV
          if (typeof value === 'string' && (value.includes(',') || value.includes('"'))) {
            return `"${value.replace(/"/g, '""')}"`;
          }
          return value || '';
        }).join(',')
      )
    ].join('\n');

    return new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  }

  /**
   * Export to Excel format
   */
  async exportToExcel(data, filename, metadata) {
    if (!data || data.length === 0) {
      throw new Error('No data to export');
    }

    const workbook = XLSX.utils.book_new();
    
    // Create main data worksheet
    const worksheet = XLSX.utils.json_to_sheet(data);
    
    // Add metadata sheet if provided
    if (Object.keys(metadata).length > 0) {
      const metadataSheet = XLSX.utils.json_to_sheet([
        { Property: 'Title', Value: metadata.title || 'Data Export' },
        { Property: 'Description', Value: metadata.description || '' },
        { Property: 'Generated At', Value: metadata.generatedAt || new Date().toISOString() },
        { Property: 'Record Count', Value: data.length },
        { Property: 'Export Format', Value: 'Excel' }
      ]);
      XLSX.utils.book_append_sheet(workbook, metadataSheet, 'Metadata');
    }
    
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Data');
    
    // Generate Excel file
    const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
    return new Blob([excelBuffer], { 
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' 
    });
  }

  /**
   * Export to PDF format
   */
  async exportToPDF(data, filename, metadata) {
    if (!data || data.length === 0) {
      throw new Error('No data to export');
    }

    const doc = new jsPDF();
    
    // Add title and metadata
    if (metadata.title) {
      doc.setFontSize(16);
      doc.text(metadata.title, 20, 20);
    }
    
    if (metadata.description) {
      doc.setFontSize(10);
      doc.text(metadata.description, 20, 30);
    }
    
    // Add generation info
    doc.setFontSize(8);
    doc.text(`Generated: ${metadata.generatedAt || new Date().toLocaleString()}`, 20, 40);
    doc.text(`Records: ${data.length}`, 20, 45);
    
    // Prepare table data
    const headers = Object.keys(data[0]);
    const tableData = data.map(row => headers.map(header => row[header] || ''));
    
    // Add table
    doc.autoTable({
      head: [headers],
      body: tableData,
      startY: 55,
      styles: { fontSize: 8 },
      headStyles: { fillColor: [41, 128, 185] },
      alternateRowStyles: { fillColor: [245, 245, 245] }
    });
    
    return new Blob([doc.output('blob')], { type: 'application/pdf' });
  }

  /**
   * Filter data fields based on selection
   */
  filterFields(data, fields) {
    return data.map(row => {
      const filteredRow = {};
      fields.forEach(field => {
        if (row.hasOwnProperty(field)) {
          filteredRow[field] = row[field];
        }
      });
      return filteredRow;
    });
  }

  /**
   * Download blob as file
   */
  downloadBlob(blob, filename) {
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  }

  /**
   * Queue large export for background processing
   */
  async queueExport(options) {
    const exportId = `export_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    this.exportQueue.set(exportId, {
      ...options,
      status: 'queued',
      createdAt: new Date().toISOString()
    });

    // Process in background
    setTimeout(async () => {
      try {
        this.exportQueue.set(exportId, {
          ...this.exportQueue.get(exportId),
          status: 'processing'
        });

        const blob = await this.exportData(options);
        
        this.exportQueue.set(exportId, {
          ...this.exportQueue.get(exportId),
          status: 'completed',
          blob,
          completedAt: new Date().toISOString()
        });

        // Notify completion (could integrate with notification system)
        this.notifyExportComplete(exportId, options.filename);
        
      } catch (error) {
        this.exportQueue.set(exportId, {
          ...this.exportQueue.get(exportId),
          status: 'failed',
          error: error.message,
          failedAt: new Date().toISOString()
        });
      }
    }, 100);

    return exportId;
  }

  /**
   * Get export status
   */
  getExportStatus(exportId) {
    return this.exportQueue.get(exportId);
  }

  /**
   * Download completed export
   */
  downloadExport(exportId) {
    const exportInfo = this.exportQueue.get(exportId);
    if (!exportInfo || exportInfo.status !== 'completed') {
      throw new Error('Export not ready for download');
    }

    this.downloadBlob(exportInfo.blob, exportInfo.filename);
    return true;
  }

  /**
   * Add export to history
   */
  addToHistory(exportInfo) {
    this.exportHistory.unshift(exportInfo);
    // Keep only last 50 exports
    if (this.exportHistory.length > 50) {
      this.exportHistory = this.exportHistory.slice(0, 50);
    }
  }

  /**
   * Get export history
   */
  getExportHistory() {
    return this.exportHistory;
  }

  /**
   * Notify export completion (placeholder for integration)
   */
  notifyExportComplete(exportId, filename) {
    // This could integrate with the notification system
    logger.info(`Export completed: ${filename} (ID: ${exportId})`);
  }

  /**
   * Get available export formats
   */
  getSupportedFormats() {
    return this.supportedFormats.map(format => ({
      value: format,
      label: format.toUpperCase(),
      description: this.getFormatDescription(format)
    }));
  }

  /**
   * Get format description
   */
  getFormatDescription(format) {
    const descriptions = {
      csv: 'Comma-separated values - Compatible with Excel and other spreadsheet applications',
      excel: 'Microsoft Excel format - Preserves formatting and supports multiple sheets',
      pdf: 'Portable Document Format - Read-only format suitable for reports and documentation'
    };
    return descriptions[format] || '';
  }
}

export default new ExportService();