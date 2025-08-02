const baseURL = "http://localhost:3000/api";

// Role management
const ROLES = {
  farmer: 'farmer',
  processor: 'processor', 
  consumer: 'consumer',
  admin: 'admin'
};

const ROLE_NAMES = {
  farmer: 'Farmer',
  processor: 'Processor',
  consumer: 'Consumer',
  admin: 'Admin'
};

// Get current role from localStorage or default to consumer
function getCurrentRole() {
  return localStorage.getItem('userRole') || 'consumer';
}

// Set current role in localStorage
function setCurrentRole(role) {
  if (!ROLES[role]) {
    console.error('Invalid role:', role);
    return false;
  }
  localStorage.setItem('userRole', role);
  return true;
}

// Initialize role switching UI
function initRoleSwitcher() {
  const currentRole = getCurrentRole();
  
  // Create role switcher HTML if not exists
  if (!document.getElementById('role-switcher')) {
    const roleSwitcherHTML = `
      <div id="role-switcher" style="position: fixed; top: 10px; right: 10px; z-index: 1000; background: white; padding: 10px; border: 1px solid #ccc; border-radius: 5px;">
        <label for="role-select">Role: </label>
        <select id="role-select">
          <option value="farmer" ${currentRole === 'farmer' ? 'selected' : ''}>Farmer</option>
          <option value="processor" ${currentRole === 'processor' ? 'selected' : ''}>Processor</option>
          <option value="consumer" ${currentRole === 'consumer' ? 'selected' : ''}>Consumer</option>
          <option value="admin" ${currentRole === 'admin' ? 'selected' : ''}>Admin</option>
        </select>
      </div>
    `;
    
    document.body.insertAdjacentHTML('afterbegin', roleSwitcherHTML);
    
    // Add change event listener
    document.getElementById('role-select').addEventListener('change', function(e) {
      const newRole = e.target.value;
      setCurrentRole(newRole);
      location.reload(); // Refresh page to apply new role
    });
  }
  
  // Apply role-based visibility
  applyRoleBasedVisibility(currentRole);
}

// Apply role-based visibility to elements with data-role attribute
function applyRoleBasedVisibility(currentRole) {
  const elementsWithRoles = document.querySelectorAll('[data-role]');
  
  elementsWithRoles.forEach(element => {
    const allowedRoles = element.getAttribute('data-role').split(' ');
    if (allowedRoles.includes(currentRole) || allowedRoles.includes('all')) {
      element.classList.remove('hidden');
    } else {
      element.classList.add('hidden');
    }
  });
}

// Unified API request function
async function apiRequest(method, endpoint, data = null, role = null) {
  const userRole = role || getCurrentRole();
  
  const options = {
    method,
    headers: {
      'Content-Type': 'application/json',
      'X-User-Role': userRole
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

// Display common error information
function showError(elementId, error) {
  const errorMsg = error.message || error.toString();
  document.getElementById(elementId).innerHTML = `<div class="error">❌ ${errorMsg}</div>`;
}

// Display loading status
function showLoading(elementId, message = 'Loading...') {
  document.getElementById(elementId).innerHTML = `<div class="loading">⏳ ${message}</div>`;
}

function renderTable(data) {
  if (!data || data.length === 0) return "<p>No batch data</p>";
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
    showLoading("batchTableContainer", "Getting batch list...");
    const result = await apiRequest('GET', '/batch', null, role);
    
    // New API return format: { success: true, data: [...], count: N }
    const batches = result.data || [];
    container.innerHTML = renderTable(batches);
    
    // Display statistics
    if (result.count !== undefined) {
      const statsDiv = document.createElement('div');
      statsDiv.className = 'stats';
      statsDiv.innerHTML = `<p>Found ${result.count} batches</p>`;
      container.insertBefore(statsDiv, container.firstChild);
    }
    
  } catch (err) {
    showError("batchTableContainer", err);
  }
}

function renderDetail(batch) {
  if (!batch || !batch.batchId) return "<p>Batch not found</p>";
  
  // Unified table style
  function renderTableHeader(cols) {
    return `<thead><tr>${cols.map(c => `<th>${c}</th>`).join('')}</tr></thead>`;
  }
  function renderTableRows(rows, keys) {
    return `<tbody>${rows.map(row => `<tr>${keys.map(k => {
      let value = row[k] || '-';
      // Format specific fields
      if (k === 'report' && value.length > 30) {
        // Truncate report content and display ellipsis
        value = value.substring(0, 30) + '...';
      } else if (k === 'testId' && value.length > 20) {
        // Truncate test ID
        value = value.substring(0, 20) + '...';
      } else if (k === 'timestamp' && value !== '-') {
        // Time formatting
        try {
          value = new Date(value).toLocaleString('zh-CN');
        } catch (e) {
          // If time format is invalid, keep original value
        }
      }
      return `<td style="max-width: 150px; word-wrap: break-word; overflow-wrap: break-word;">${value}</td>`;
    }).join('')}</tr>`).join('')}</tbody>`;
  }
  
  // Batch detail table
  const detailTable = `
    <h3 style='margin-top:0;'>Batch detail</h3>
    <table>
      ${renderTableHeader(['Field', 'Content'])}
      <tbody>
        <tr><td>Batch ID</td><td>${batch.batchId}</td></tr>
        <tr><td>Origin</td><td>${batch.origin || '-'}</td></tr>
        <tr><td>Variety</td><td>${batch.variety || '-'}</td></tr>
        <tr><td>Harvest Date</td><td>${batch.harvestDate || '-'}</td></tr>
        <tr><td>Current Owner</td><td>${batch.currentOwner || '-'}</td></tr>
        <tr><td>Current Step</td><td>${batch.processingStep || '-'}</td></tr>
      </tbody>
    </table>
  `;
  
  // Quality inspection record table
  const inspections = batch.testResults || [];
  let inspectionTable = '';
  if (inspections.length > 0) {
    inspectionTable = `<h3 style='margin-top:32px;'>Quality inspection record</h3>`;
    inspections.slice().sort((a, b) => (b.timestamp || '').localeCompare(a.timestamp || '')).forEach((inspection, index) => {
      const time = inspection.timestamp ? new Date(inspection.timestamp).toLocaleString('zh-CN') : '-';
      const reportId = inspection.reportId || '-';
      const reportHash = inspection.reportHash ? inspection.reportHash.substring(0, 16) + '...' : '-';
      const isVerified = inspection.isVerified ? '✅ Verified' : '❌ Not verified';
      
      inspectionTable += `
        <div style="border: 1px solid #ddd; margin: 10px 0; padding: 15px; border-radius: 5px; background: #f9f9f9;">
          <table style="width: 100%; border: none;">
            <tr><td style="border: none; width: 100px;"><strong>Test ID</strong></td><td style="border: none;">${inspection.testId || '-'}</td></tr>
            <tr><td style="border: none;"><strong>Tester</strong></td><td style="border: none;">${inspection.testerId || '-'}</td></tr>
            <tr><td style="border: none;"><strong>Temperature</strong></td><td style="border: none;">${inspection.temperature || '-'}</td></tr>
            <tr><td style="border: none;"><strong>Result</strong></td><td style="border: none;"><span style="color: ${inspection.result === 'PASSED' ? '#4caf50' : '#f44336'}">${inspection.result || '-'}</span></td></tr>
            <tr><td style="border: none;"><strong>Time</strong></td><td style="border: none;">${time}</td></tr>
            <tr><td style="border: none;"><strong>Verification Status</strong></td><td style="border: none;">${isVerified}</td></tr>
            <tr><td style="border: none;"><strong>Report ID</strong></td><td style="border: none; font-family: monospace; font-size: 12px;">${reportId}</td></tr>
            <tr><td style="border: none;"><strong>File Hash</strong></td><td style="border: none; font-family: monospace; font-size: 12px;">${reportHash}</td></tr>
          </table>
        </div>
      `;
    });
  } else {
    inspectionTable = `<h3 style='margin-top:32px;'>Quality inspection record</h3><p>No quality inspection record</p>`;
  }
  
  // Processing record table, time descending
  const processHistory = (batch.processHistory || []).slice().sort((a, b) => (b.timestamp || '').localeCompare(a.timestamp || ''));
  let processTable = '';
  if (processHistory.length > 0) {
    processTable = `<h3 style='margin-top:32px;'>Processing record</h3><table>
      ${renderTableHeader(['Operator', 'Time', 'Step'])}
      ${renderTableRows(processHistory, ['operator', 'timestamp', 'step'])}
    </table>`;
  } else {
    processTable = `<h3 style='margin-top:32px;'>Processing record</h3><p>No processing record</p>`;
  }
  
  // Transfer record arrow visualization (from top to bottom, in chronological order)
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
    ownerChain = `<div style='margin-top:32px;'><h3>Transfer record</h3><div style='border: 1px solid #ecf0f1; padding: 15px; border-radius: 5px; background: #fafafa;'>${ownerChain}</div></div>`;
  } else {
    ownerChain = `<div style='margin-top:32px;'><h3>Transfer record</h3><p>No transfer record</p></div>`;
  }
  
  return detailTable + inspectionTable + processTable + ownerChain;
}

async function getBatch() {
  const params = new URLSearchParams(window.location.search);
  const batchIdInput = document.getElementById("queryBatchId");
  const batchId = batchIdInput ? batchIdInput.value : params.get("batchId");
  
  if (!batchId) {
    document.getElementById("batchDetail").innerHTML = "<p>Please provide batch ID</p>";
    return;
  }
  
  try {
    showLoading("batchDetail", "Getting batch details...");
    const result = await apiRequest('GET', `/batch/${batchId}`, null, 'consumer');
    
    // New API return format: { success: true, data: {...} }
    const batch = result.data;
    document.getElementById("batchDetail").innerHTML = renderDetail(batch);
  } catch (err) {
    showError("batchDetail", err);
  }
}

// Create batch auxiliary function
async function createBatch(batchData, resultElementId) {
  try {
    showLoading(resultElementId, "Creating batch...");
    const result = await apiRequest('POST', '/batch', batchData, 'farmer');
    
    document.getElementById(resultElementId).innerHTML = `
      <div class="success">
        ✅ Batch created successfully!<br>
        Batch ID: ${result.data.batchId}<br>
        Report ID: ${result.data.reportId}<br>
        Report Hash: ${result.data.reportHash ? result.data.reportHash.substring(0, 16) + '...' : 'Unknown'}<br>
      </div>
    `;
    
    return result.data.batchId;
  } catch (err) {
    showError(resultElementId, err);
    throw err;
  }
}

// Transfer batch ownership auxiliary function
async function transferBatch(batchId, transferData, resultElementId) {
  try {
    showLoading(resultElementId, "Transferring...");
    const result = await apiRequest('PUT', `/batch/${batchId}/transfer`, transferData, 'processor');
    
    document.getElementById(resultElementId).innerHTML = `
      <div class="success">
        ✅ ${result.message}<br>
        New owner: ${result.newOwner}<br>
        Report ID: ${result.reportId}<br>
        Report hash: ${result.reportHash ? result.reportHash.substring(0, 16) + '...' : 'Unknown'}
      </div>
    `;
    
    return result;
  } catch (err) {
    showError(resultElementId, err);
    throw err;
  }
}

// Add quality inspection result auxiliary function
async function addTestResult(batchId, testData, resultElementId) {
  try {
    showLoading(resultElementId, "Adding quality inspection result...");
    const result = await apiRequest('POST', `/batch/${batchId}/test`, testData, 'processor');
    
    document.getElementById(resultElementId).innerHTML = `
      <div class="success">
        ✅ ${result.message}<br>
        Test ID: ${result.testId}
      </div>
    `;
    
    return result;
  } catch (err) {
    showError(resultElementId, err);
    throw err;
  }
}