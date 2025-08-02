const { S3Client, PutObjectCommand, GetObjectCommand } = require('@aws-sdk/client-s3');
const { createClient } = require('@supabase/supabase-js');
const crypto = require('crypto');
const { cloudflareR2, supabase, errorCodes } = require('../../config');

/**
 * Report service
 * Handles all business logic related to reports
 */
class ReportService {
  constructor() {
    // Initialize R2 client (compatible with S3 API)
    this.r2Client = new S3Client({
      region: cloudflareR2.region,
      endpoint: cloudflareR2.endpoint,
      credentials: {
        accessKeyId: cloudflareR2.accessKeyId,
        secretAccessKey: cloudflareR2.secretAccessKey,
      },
    });

    // Initialize Supabase client with error handling for missing configuration
    if (!supabase.url || !supabase.anonKey) {
      console.warn('Supabase configuration missing. Some features may not work properly.');
      this.supabaseClient = null;
    } else {
      this.supabaseClient = createClient(supabase.url, supabase.anonKey, supabase.options);
    }
  }

  /**
   * Upload quality inspection report
   * @param {Object} file - Multer file object
   * @param {Object} uploaderInfo - Uploader information
   * @returns {Promise<Object>} Upload result
   */
  async uploadReport(file, uploaderInfo) {
    try {
      if (!file || !file.buffer) {
        throw new Error(`${errorCodes.VALIDATION_ERROR}: File cannot be empty`);
      }

      // Validate file type
      const allowedTypes = ['application/pdf', 'image/jpeg', 'image/png', 'image/jpg'];
      if (!allowedTypes.includes(file.mimetype)) {
        throw new Error(`${errorCodes.VALIDATION_ERROR}: Unsupported file type: ${file.mimetype}`);
      }

      // Validate file size (5MB)
      const maxSize = 5 * 1024 * 1024;
      if (file.size > maxSize) {
        throw new Error(`${errorCodes.VALIDATION_ERROR}: File size cannot exceed 5MB`);
      }

      console.log(`Start uploading report: ${file.originalname}`);

      // Calculate file hash
      const fileHash = this._calculateFileHash(file.buffer);
      console.log(`File hash calculation completed: ${fileHash.substring(0, 16)}...`);

      // Generate unique file name
      const fileKey = this._generateFileKey(file.originalname, fileHash);

      // Upload to R2
      await this._uploadToR2(fileKey, file.buffer, file.mimetype);
      console.log(`File uploaded to R2: ${fileKey}`);

      // Generate access URL
      const fileUrl = `https://pub-${cloudflareR2.accountId}.r2.dev/${fileKey}`;

      // Save metadata to Supabase (if configured)
      if (!this.supabaseClient) {
        console.warn('Supabase not configured, skipping database save');
        return {
          success: true,
          reportId: `temp_${Date.now()}`,
          fileHash: fileHash,
          fileUrl: fileUrl,
          status: 'PENDING',
          message: 'Quality inspection report uploaded successfully (database not configured)'
        };
      }

      const reportData = {
        file_hash: fileHash,
        file_name: file.originalname,
        file_url: fileUrl,
        file_key: fileKey,
        status: 'PENDING', // Initial status is pending review
        uploaded_by: uploaderInfo.role || 'unknown',
        uploader_id: uploaderInfo.userId || null,
        content_type: file.mimetype,
        file_size: file.size
      };

      const { data, error } = await this.supabaseClient
        .from('quality_reports')
        .insert(reportData)
        .select()
        .single();

      if (error) {
        console.error('Supabase insertion failed:', error);
        throw new Error(`${errorCodes.INTERNAL_ERROR}: Database save failed: ${error.message}`);
      }

      console.log(`Report uploaded successfully, ID: ${data.id}`);

      return {
        success: true,
        reportId: data.id,
        fileHash: fileHash,
        fileUrl: fileUrl,
        status: data.status,
        message: 'Quality inspection report uploaded successfully, waiting for review'
      };

    } catch (error) {
      console.error('Report upload failed:', error.message);
      throw error;
    }
  }

  /**
   * Verify quality inspection report
   * @param {string} reportId - Report ID
   * @returns {Promise<Object>} Verification result
   */
  async verifyReport(reportId) {
    try {
      if (!reportId) {
        throw new Error(`${errorCodes.VALIDATION_ERROR}: Report ID cannot be empty`);
      }

      console.log(`Verify report: ${reportId}`);

      // Check if Supabase is configured
      if (!this.supabaseClient) {
        console.warn('Supabase not configured, cannot verify report');
        throw new Error(`${errorCodes.INTERNAL_ERROR}: Database not configured`);
      }

      // Query report information from Supabase
      const { data, error } = await this.supabaseClient
        .from('quality_reports')
        .select('*')
        .eq('id', reportId)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          throw new Error(`Report not found: Report ID ${reportId} does not exist`);
        }
        throw new Error(`Database query failed: ${error.message}`);
      }

      // Check report status and provide user-friendly error messages
      if (data.status !== 'APPROVED') {
        let statusMessage = '';
        switch (data.status) {
          case 'PENDING':
            statusMessage = 'Report is pending review, please wait for admin approval';
            break;
          case 'REJECTED':
            statusMessage = 'Report has been rejected, please upload a compliant quality report';
            break;
          default:
            statusMessage = `Report status is invalid: ${data.status}`;
        }
        throw new Error(`Oracle verification failed: ${statusMessage} (Report ID: ${reportId})`);
      }

      console.log(`Report verification passed: ${reportId}`);

      return {
        success: true,
        data: {
          reportId: data.id,
          fileHash: data.file_hash,
          fileName: data.file_name,
          fileUrl: data.file_url,
          status: data.status,
          uploadedBy: data.uploaded_by,
          createdAt: data.created_at,
          contentType: data.content_type
        }
      };

    } catch (error) {
      console.error('Report verification failed:', error.message);
      throw error;
    }
  }

  /**
   * Get report list (by uploader)
   * @param {string} uploaderRole - Uploader role
   * @returns {Promise<Array>} Report list
   */
  async getReportsByUploader(uploaderRole) {
    try {
      const { data, error } = await this.supabaseClient
        .from('quality_reports')
        .select('id, file_name, status, created_at, uploaded_by')
        .eq('uploaded_by', uploaderRole)
        .order('created_at', { ascending: false });

      if (error) {
        throw new Error(`${errorCodes.INTERNAL_ERROR}: Database query failed: ${error.message}`);
      }

      return data || [];
    } catch (error) {
      throw new Error(`Failed to get report list: ${error.message}`);
    }
  }

  /**
   * Calculate file hash
   * @param {Buffer} fileBuffer - File buffer
   * @returns {string} SHA-256 hash
   * @private
   */
  _calculateFileHash(fileBuffer) {
    return crypto.createHash('sha256').update(fileBuffer).digest('hex');
  }

  /**
   * Generate file key
   * @param {string} originalName - Original file name
   * @param {string} fileHash - File hash
   * @returns {string} File key
   * @private
   */
  _generateFileKey(originalName, fileHash) {
    const timestamp = Date.now();
    const extension = originalName.split('.').pop();
    return `reports/${timestamp}-${fileHash.substring(0, 16)}.${extension}`;
  }

  /**
   * Upload file to R2
   * @param {string} key - File key
   * @param {Buffer} buffer - File buffer
   * @param {string} contentType - Content type
   * @private
   */
  async _uploadToR2(key, buffer, contentType) {
    // Check if R2 is configured
    if (!cloudflareR2.accountId || !cloudflareR2.accessKeyId || !cloudflareR2.secretAccessKey) {
      console.warn('Cloudflare R2 not configured, skipping file upload');
      return;
    }

    const command = new PutObjectCommand({
      Bucket: cloudflareR2.bucketName,
      Key: key,
      Body: buffer,
      ContentType: contentType,
      // Set public read
      // ACL: 'public-read' // R2 may not support ACL, set through bucket
    });

    await this.r2Client.send(command);
  }

  /**
   * Update report status (admin function, for development testing)
   * @param {string} reportId - Report ID
   * @param {string} status - New status (APPROVED, REJECTED, PENDING)
   * @returns {Promise<Object>} Update result
   */
  async updateReportStatus(reportId, status) {
    try {
      if (!reportId || !status) {
        throw new Error(`${errorCodes.VALIDATION_ERROR}: Report ID and status cannot be empty`);
      }

      console.log(`Update report status: ${reportId} -> ${status}`);

      // Update report status in Supabase
      if (!this.supabaseClient) {
        console.warn('Supabase not configured, cannot update report status');
        throw new Error(`${errorCodes.INTERNAL_ERROR}: Database not configured`);
      }

      const { data, error } = await this.supabaseClient
        .from('quality_reports')
        .update({ 
          status: status
        })
        .eq('id', reportId)
        .select()
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          throw new Error(`${errorCodes.NOT_FOUND}: Report does not exist: ${reportId}`);
        }
        throw new Error(`${errorCodes.INTERNAL_ERROR}: Database update failed: ${error.message}`);
      }

      console.log(`Report status updated successfully: ${reportId} -> ${status}`);

      return {
        reportId: data.id,
        oldStatus: 'unknown', // We don't save old status
        newStatus: data.status,
        updatedAt: new Date().toISOString()
      };

    } catch (error) {
      console.error(`Update report status failed: ${error.message}`);
      throw error;
    }
  }

  /**
   * Verify report and fetch as ReportDetail format for blockchain
   * @param {string} reportId - Report ID
   * @returns {Promise<Object>} ReportDetail formatted object
   */
  async verifyAndFetchReportDetail(reportId) {
    try {
      // Use existing verify method to get verified report
      const verifyResult = await this.verifyReport(reportId);
      const reportData = verifyResult.data;

      // Convert to ReportDetail format for smart contract
      const reportDetail = {
        reportId: reportData.reportId,
        reportType: this._determineReportType(reportData.fileName, reportData.contentType),
        reportHash: reportData.fileHash,
        summary: `Report ${reportData.fileName} - Verified by Oracle`,
        isVerified: true,
        verificationSource: 'RiceTrace-Oracle',
        verificationTimestamp: new Date().toISOString(),
        notes: `Uploaded by ${reportData.uploadedBy} at ${reportData.createdAt}`
      };

      return reportDetail;

    } catch (error) {
      console.error('Failed to verify and fetch report detail:', error.message);
      throw error;
    }
  }

  /**
   * Determine report type based on filename and content
   * @param {string} fileName - Original filename
   * @param {string} contentType - File content type
   * @returns {string} Report type
   * @private
   */
  _determineReportType(fileName, contentType) {
    const lowerName = fileName.toLowerCase();
    
    if (lowerName.includes('harvest')) return 'HarvestLog';
    if (lowerName.includes('transport') || lowerName.includes('shipping')) return 'ShippingManifest';
    if (lowerName.includes('quality') || lowerName.includes('test')) return 'QualityTest';
    if (lowerName.includes('process') || lowerName.includes('mill')) return 'ProcessingRecord';
    if (lowerName.includes('storage') || lowerName.includes('warehouse')) return 'StorageLog';
    if (lowerName.includes('package') || lowerName.includes('pack')) return 'PackagingRecord';
    
    // Default based on content type
    if (contentType.includes('pdf')) return 'InspectionReport';
    if (contentType.includes('image')) return 'PhotoEvidence';
    
    return 'GeneralReport';
  }

  /**
   * Get service status
   * @returns {Object} Service status
   */
  getServiceStatus() {
    return {
      r2: {
        endpoint: cloudflareR2.endpoint,
        bucket: cloudflareR2.bucketName,
        configured: !!(cloudflareR2.accessKeyId && cloudflareR2.secretAccessKey)
      },
      supabase: {
        url: supabase.url,
        configured: !!(supabase.url && supabase.anonKey)
      }
    };
  }
}

// Export singleton instance
const reportService = new ReportService();
module.exports = reportService; 