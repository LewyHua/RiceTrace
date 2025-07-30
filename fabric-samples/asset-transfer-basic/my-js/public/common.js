const baseURL = "http://localhost:3000/api";

// 统一的API请求处理函数
async function apiRequest(method, endpoint, data = null, role = 'consumer') {
  const options = {
    method,
    headers: {
      'Content-Type': 'application/json',
      'X-User-Role': role
    }
  };
  
  if (data) {
    options.body = JSON.stringify(data);
  }

  try {
    const response = await fetch(`${baseURL}${endpoint}`, options);
    const result = await response.json();
    
    if (!response.ok) {
      throw new Error(result.message || result.error || `HTTP ${response.status}`);
    }
    
    return result;
  } catch (error) {
    console.error('API Request failed:', error);
    throw error;
  }
}

// 显示通用错误信息
function showError(elementId, error) {
  const errorMsg = error.message || error.toString();
  document.getElementById(elementId).innerHTML = `<div class="error">❌ ${errorMsg}</div>`;
}

// 显示加载状态
function showLoading(elementId, message = '加载中...') {
  document.getElementById(elementId).innerHTML = `<div class="loading">⏳ ${message}</div>`;
}

function renderTable(data) {
  if (!data || data.length === 0) return "<p>暂无批次数据</p>";
  let rows = data.map(batch => `
    <tr>
      <td><a href="detail.html?batchId=${batch.batchId}">${batch.batchId}</a></td>
      <td>${batch.origin || '-'}</td>
      <td>${batch.variety || '-'}</td>
      <td>${batch.harvestDate || '-'}</td>
      <td>${batch.currentOwner || '-'}</td>
      <td>${batch.processingStep || '-'}</td>
    </tr>
  `).join("");
  return `
    <table>
      <thead>
        <tr>
          <th>批次ID</th>
          <th>产地</th>
          <th>品种</th>
          <th>收获日期</th>
          <th>当前所有者</th>
          <th>当前步骤</th>
        </tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>
  `;
}

async function getAllBatches(role = 'farmer') {
  const container = document.getElementById("batchTableContainer");
  if (!container) return;
  
  try {
    showLoading("batchTableContainer", "获取批次列表...");
    const result = await apiRequest('GET', '/batch', null, role);
    
    // 新的API返回格式：{ success: true, data: [...], count: N }
    const batches = result.data || [];
    container.innerHTML = renderTable(batches);
    
    // 显示统计信息
    if (result.count !== undefined) {
      const statsDiv = document.createElement('div');
      statsDiv.className = 'stats';
      statsDiv.innerHTML = `<p>共找到 ${result.count} 个批次</p>`;
      container.insertBefore(statsDiv, container.firstChild);
    }
    
  } catch (err) {
    showError("batchTableContainer", err);
  }
}

function renderDetail(batch) {
  if (!batch || !batch.batchId) return "<p>未找到该批次</p>";
  
  // 统一表格样式
  function renderTableHeader(cols) {
    return `<thead><tr>${cols.map(c => `<th>${c}</th>`).join('')}</tr></thead>`;
  }
  function renderTableRows(rows, keys) {
    return `<tbody>${rows.map(row => `<tr>${keys.map(k => {
      let value = row[k] || '-';
      // 对于特定字段进行格式化
      if (k === 'report' && value.length > 30) {
        // 报告内容过长时截断并显示省略号
        value = value.substring(0, 30) + '...';
      } else if (k === 'testId' && value.length > 20) {
        // 测试ID过长时截断
        value = value.substring(0, 20) + '...';
      } else if (k === 'timestamp' && value !== '-') {
        // 时间格式化
        try {
          value = new Date(value).toLocaleString('zh-CN');
        } catch (e) {
          // 如果时间格式无效，保持原值
        }
      }
      return `<td style="max-width: 150px; word-wrap: break-word; overflow-wrap: break-word;">${value}</td>`;
    }).join('')}</tr>`).join('')}</tbody>`;
  }
  
  // 批次详情表格
  const detailTable = `
    <h3 style='margin-top:0;'>批次详情</h3>
    <table>
      ${renderTableHeader(['字段', '内容'])}
      <tbody>
        <tr><td>批次ID</td><td>${batch.batchId}</td></tr>
        <tr><td>产地</td><td>${batch.origin || '-'}</td></tr>
        <tr><td>品种</td><td>${batch.variety || '-'}</td></tr>
        <tr><td>收获日期</td><td>${batch.harvestDate || '-'}</td></tr>
        <tr><td>当前所有者</td><td>${batch.currentOwner || '-'}</td></tr>
        <tr><td>当前步骤</td><td>${batch.processingStep || '-'}</td></tr>
      </tbody>
    </table>
  `;
  
  // 质检记录表格
  const inspections = batch.testResults || [];
  let inspectionTable = '';
  if (inspections.length > 0) {
    inspectionTable = `<h3 style='margin-top:32px;'>质检记录</h3>`;
    inspections.slice().sort((a, b) => (b.timestamp || '').localeCompare(a.timestamp || '')).forEach((inspection, index) => {
      const time = inspection.timestamp ? new Date(inspection.timestamp).toLocaleString('zh-CN') : '-';
      const reportId = inspection.reportId || '-';
      const reportHash = inspection.reportHash ? inspection.reportHash.substring(0, 16) + '...' : '-';
      const isVerified = inspection.isVerified ? '✅ 已验证' : '❌ 未验证';
      
      inspectionTable += `
        <div style="border: 1px solid #ddd; margin: 10px 0; padding: 15px; border-radius: 5px; background: #f9f9f9;">
          <table style="width: 100%; border: none;">
            <tr><td style="border: none; width: 100px;"><strong>测试ID</strong></td><td style="border: none;">${inspection.testId || '-'}</td></tr>
            <tr><td style="border: none;"><strong>测试员</strong></td><td style="border: none;">${inspection.testerId || '-'}</td></tr>
            <tr><td style="border: none;"><strong>温度</strong></td><td style="border: none;">${inspection.temperature || '-'}</td></tr>
            <tr><td style="border: none;"><strong>结果</strong></td><td style="border: none;"><span style="color: ${inspection.result === 'PASSED' ? '#4caf50' : '#f44336'}">${inspection.result || '-'}</span></td></tr>
            <tr><td style="border: none;"><strong>时间</strong></td><td style="border: none;">${time}</td></tr>
            <tr><td style="border: none;"><strong>验证状态</strong></td><td style="border: none;">${isVerified}</td></tr>
            <tr><td style="border: none;"><strong>报告ID</strong></td><td style="border: none; font-family: monospace; font-size: 12px;">${reportId}</td></tr>
            <tr><td style="border: none;"><strong>文件哈希</strong></td><td style="border: none; font-family: monospace; font-size: 12px;">${reportHash}</td></tr>
          </table>
        </div>
      `;
    });
  } else {
    inspectionTable = `<h3 style='margin-top:32px;'>质检记录</h3><p>暂无质检记录</p>`;
  }
  
  // 加工记录表格，时间倒序
  const processHistory = (batch.processHistory || []).slice().sort((a, b) => (b.timestamp || '').localeCompare(a.timestamp || ''));
  let processTable = '';
  if (processHistory.length > 0) {
    processTable = `<h3 style='margin-top:32px;'>加工记录</h3><table>
      ${renderTableHeader(['操作人', '时间', '步骤'])}
      ${renderTableRows(processHistory, ['operator', 'timestamp', 'step'])}
    </table>`;
  } else {
    processTable = `<h3 style='margin-top:32px;'>加工记录</h3><p>暂无加工记录</p>`;
  }
  
  // 转移记录箭头可视化（从上到下，按时间顺序）
  const ownerHistory = (batch.ownerHistory || []).slice().sort((a, b) => (a.timestamp || '').localeCompare(b.timestamp || ''));
  let ownerChain = '';
  if (ownerHistory.length > 0) {
    ownerChain = ownerHistory.map((h, i) => {
      const to = h.to || '';
      const time = h.timestamp ? `(${new Date(h.timestamp).toLocaleString()})` : '';
      return `<div style='text-align:center; margin: 10px 0;'>
        <div style='font-weight:500; color:#2c3e50;'>${to}</div>
        <div style='color:#7f8c8d; font-size:0.9em;'>${time}</div>
        ${i < ownerHistory.length - 1 ? "<div style='font-size:1.5em; color:#e67e22; margin: 5px 0;'>↓</div>" : ''}
      </div>`;
    }).join('');
    ownerChain = `<div style='margin-top:32px;'><h3>转移记录</h3><div style='border: 1px solid #ecf0f1; padding: 15px; border-radius: 5px; background: #fafafa;'>${ownerChain}</div></div>`;
  } else {
    ownerChain = `<div style='margin-top:32px;'><h3>转移记录</h3><p>暂无转移记录</p></div>`;
  }
  
  return detailTable + inspectionTable + processTable + ownerChain;
}

async function getBatch() {
  const params = new URLSearchParams(window.location.search);
  const batchIdInput = document.getElementById("queryBatchId");
  const batchId = batchIdInput ? batchIdInput.value : params.get("batchId");
  
  if (!batchId) {
    document.getElementById("batchDetail").innerHTML = "<p>请提供批次ID</p>";
    return;
  }
  
  try {
    showLoading("batchDetail", "获取批次详情...");
    const result = await apiRequest('GET', `/batch/${batchId}`, null, 'consumer');
    
    // 新的API返回格式：{ success: true, data: {...} }
    const batch = result.data;
    document.getElementById("batchDetail").innerHTML = renderDetail(batch);
  } catch (err) {
    showError("batchDetail", err);
  }
}

// 创建批次的辅助函数
async function createBatch(batchData, resultElementId) {
  try {
    showLoading(resultElementId, "创建批次中...");
    const result = await apiRequest('POST', '/batch', batchData, 'farmer');
    
    document.getElementById(resultElementId).innerHTML = `
      <div class="success">
        ✅ 批次创建成功！<br>
        批次ID: ${result.data.batchId}<br>
        报告ID: ${result.data.reportId}<br>
        报告哈希: ${result.data.reportHash ? result.data.reportHash.substring(0, 16) + '...' : '未知'}<br>
        <a href="detail.html?batchId=${result.data.batchId}">查看详情</a>
      </div>
    `;
    
    return result.data.batchId;
  } catch (err) {
    showError(resultElementId, err);
    throw err;
  }
}

// 转移批次所有权的辅助函数
async function transferBatch(batchId, transferData, resultElementId) {
  try {
    showLoading(resultElementId, "转移中...");
    const result = await apiRequest('PUT', `/batch/${batchId}/transfer`, transferData, 'processor');
    
    document.getElementById(resultElementId).innerHTML = `
      <div class="success">
        ✅ ${result.message}<br>
        新所有者: ${result.newOwner}<br>
        报告ID: ${result.reportId}<br>
        报告哈希: ${result.reportHash ? result.reportHash.substring(0, 16) + '...' : '未知'}
      </div>
    `;
    
    return result;
  } catch (err) {
    showError(resultElementId, err);
    throw err;
  }
}

// 添加质检结果的辅助函数
async function addTestResult(batchId, testData, resultElementId) {
  try {
    showLoading(resultElementId, "添加质检结果中...");
    const result = await apiRequest('POST', `/batch/${batchId}/test`, testData, 'processor');
    
    document.getElementById(resultElementId).innerHTML = `
      <div class="success">
        ✅ ${result.message}<br>
        测试ID: ${result.testId}
      </div>
    `;
    
    return result;
  } catch (err) {
    showError(resultElementId, err);
    throw err;
  }
}