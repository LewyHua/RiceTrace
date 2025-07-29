const { S3Client, PutObjectCommand, GetObjectCommand } = require('@aws-sdk/client-s3');
const { createClient } = require('@supabase/supabase-js');
const crypto = require('crypto');
const { cloudflareR2, supabase, errorCodes } = require('../../config');

/**
 * 质检报告服务
 * 负责报告文件的上传、存储和验证
 */
class ReportService {
  constructor() {
    // 初始化 R2 客户端 (兼容 S3 API)
    this.r2Client = new S3Client({
      region: cloudflareR2.region,
      endpoint: cloudflareR2.endpoint,
      credentials: {
        accessKeyId: cloudflareR2.accessKeyId,
        secretAccessKey: cloudflareR2.secretAccessKey,
      },
    });

    // 初始化 Supabase 客户端
    this.supabaseClient = createClient(supabase.url, supabase.anonKey, supabase.options);
  }

  /**
   * 上传质检报告
   * @param {Object} file - Multer文件对象
   * @param {Object} uploaderInfo - 上传者信息
   * @returns {Promise<Object>} 上传结果
   */
  async uploadReport(file, uploaderInfo) {
    try {
      if (!file || !file.buffer) {
        throw new Error(`${errorCodes.VALIDATION_ERROR}: 文件不能为空`);
      }

      // 验证文件类型
      const allowedTypes = ['application/pdf', 'image/jpeg', 'image/png', 'image/jpg'];
      if (!allowedTypes.includes(file.mimetype)) {
        throw new Error(`${errorCodes.VALIDATION_ERROR}: 不支持的文件类型: ${file.mimetype}`);
      }

      // 验证文件大小 (5MB)
      const maxSize = 5 * 1024 * 1024;
      if (file.size > maxSize) {
        throw new Error(`${errorCodes.VALIDATION_ERROR}: 文件大小不能超过5MB`);
      }

      console.log(`📤 开始上传报告: ${file.originalname}`);

      // 计算文件哈希
      const fileHash = this._calculateFileHash(file.buffer);
      console.log(`🔐 文件哈希计算完成: ${fileHash.substring(0, 16)}...`);

      // 生成唯一的文件名
      const fileKey = this._generateFileKey(file.originalname, fileHash);

      // 上传到 R2
      await this._uploadToR2(fileKey, file.buffer, file.mimetype);
      console.log(`☁️  文件已上传到R2: ${fileKey}`);

      // 生成访问URL
      const fileUrl = `https://pub-${cloudflareR2.accountId}.r2.dev/${fileKey}`;

      // 保存元数据到 Supabase
      const reportData = {
        file_hash: fileHash,
        file_name: file.originalname,
        file_url: fileUrl,
        file_key: fileKey,
        status: 'PENDING', // 初始状态为待审核
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
        console.error('❌ Supabase插入失败:', error);
        throw new Error(`${errorCodes.INTERNAL_ERROR}: 数据库保存失败: ${error.message}`);
      }

      console.log(`✅ 报告上传成功，ID: ${data.id}`);

      return {
        success: true,
        reportId: data.id,
        fileHash: fileHash,
        fileUrl: fileUrl,
        status: data.status,
        message: '质检报告上传成功，等待审核'
      };

    } catch (error) {
      console.error('❌ 报告上传失败:', error.message);
      throw error;
    }
  }

  /**
   * 验证质检报告
   * @param {string} reportId - 报告ID
   * @returns {Promise<Object>} 验证结果
   */
  async verifyReport(reportId) {
    try {
      if (!reportId) {
        throw new Error(`${errorCodes.VALIDATION_ERROR}: 报告ID不能为空`);
      }

      console.log(`🔍 验证报告: ${reportId}`);

      // 从 Supabase 查询报告信息
      const { data, error } = await this.supabaseClient
        .from('quality_reports')
        .select('*')
        .eq('id', reportId)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          throw new Error(`${errorCodes.NOT_FOUND}: 报告不存在: ${reportId}`);
        }
        throw new Error(`${errorCodes.INTERNAL_ERROR}: 数据库查询失败: ${error.message}`);
      }

      // 检查报告状态，提供用户友好的错误信息
      if (data.status !== 'APPROVED') {
        let statusMessage = '';
        switch (data.status) {
          case 'PENDING':
            statusMessage = '报告正在等待审核，请耐心等待管理员审批';
            break;
          case 'REJECTED':
            statusMessage = '报告已被拒绝，请重新上传符合要求的质检报告';
            break;
          default:
            statusMessage = `报告状态异常: ${data.status}`;
        }
        throw new Error(`${errorCodes.ORACLE_VERIFICATION_FAILED}: ${statusMessage} (报告ID: ${reportId})`);
      }

      console.log(`✅ 报告验证通过: ${reportId}`);

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
      console.error('❌ 报告验证失败:', error.message);
      throw error;
    }
  }

  /**
   * 获取报告列表（按上传者）
   * @param {string} uploaderRole - 上传者角色
   * @returns {Promise<Array>} 报告列表
   */
  async getReportsByUploader(uploaderRole) {
    try {
      const { data, error } = await this.supabaseClient
        .from('quality_reports')
        .select('id, file_name, status, created_at, uploaded_by')
        .eq('uploaded_by', uploaderRole)
        .order('created_at', { ascending: false });

      if (error) {
        throw new Error(`${errorCodes.INTERNAL_ERROR}: 数据库查询失败: ${error.message}`);
      }

      return data || [];
    } catch (error) {
      throw new Error(`获取报告列表失败: ${error.message}`);
    }
  }

  /**
   * 计算文件哈希
   * @param {Buffer} fileBuffer - 文件缓冲区
   * @returns {string} SHA-256哈希
   * @private
   */
  _calculateFileHash(fileBuffer) {
    return crypto.createHash('sha256').update(fileBuffer).digest('hex');
  }

  /**
   * 生成文件键
   * @param {string} originalName - 原始文件名
   * @param {string} fileHash - 文件哈希
   * @returns {string} 文件键
   * @private
   */
  _generateFileKey(originalName, fileHash) {
    const timestamp = Date.now();
    const extension = originalName.split('.').pop();
    return `reports/${timestamp}-${fileHash.substring(0, 16)}.${extension}`;
  }

  /**
   * 上传文件到 R2
   * @param {string} key - 文件键
   * @param {Buffer} buffer - 文件缓冲区
   * @param {string} contentType - 内容类型
   * @private
   */
  async _uploadToR2(key, buffer, contentType) {
    const command = new PutObjectCommand({
      Bucket: cloudflareR2.bucketName,
      Key: key,
      Body: buffer,
      ContentType: contentType,
      // 设置公开可读
      // ACL: 'public-read' // R2可能不支持ACL，通过bucket设置
    });

    await this.r2Client.send(command);
  }

  /**
   * 更新报告状态 (管理员功能，用于开发测试)
   * @param {string} reportId 报告ID
   * @param {string} status 新状态 (APPROVED, REJECTED, PENDING)
   * @returns {Promise<Object>} 更新结果
   */
  async updateReportStatus(reportId, status) {
    try {
      if (!reportId || !status) {
        throw new Error(`${errorCodes.VALIDATION_ERROR}: 报告ID和状态不能为空`);
      }

      console.log(`📝 更新报告状态: ${reportId} -> ${status}`);

      // 更新 Supabase 中的报告状态
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
          throw new Error(`${errorCodes.NOT_FOUND}: 报告不存在: ${reportId}`);
        }
        throw new Error(`${errorCodes.INTERNAL_ERROR}: 数据库更新失败: ${error.message}`);
      }

      console.log(`✅ 报告状态更新成功: ${reportId} -> ${status}`);

      return {
        reportId: data.id,
        oldStatus: 'unknown', // 我们没有保存旧状态
        newStatus: data.status,
        updatedAt: new Date().toISOString()
      };

    } catch (error) {
      console.error(`❌ 更新报告状态失败: ${error.message}`);
      throw error;
    }
  }

  /**
   * 获取服务状态
   * @returns {Object} 服务状态
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

// 导出单例实例
const reportService = new ReportService();
module.exports = reportService; 