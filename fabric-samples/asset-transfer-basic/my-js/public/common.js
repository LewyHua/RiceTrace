const baseURL = "http://localhost:3000/api";

function renderTable(data) {
  if (!data || data.length === 0) return "<p>暂无批次数据</p>";
  let rows = data.map(batch => `
    <tr>
      <td><a href="detail.html?batchId=${batch.batchId}">${batch.batchId}</a></td>
      <td>${batch.origin}</td>
      <td>${batch.variety}</td>
      <td>${batch.harvestDate}</td>
      <td>${batch.currentOwner}</td>
      <td>${batch.processingStep}</td>
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

async function getAllBatches() {
  try {
    const res = await fetch(`${baseURL}/batch`, { headers: { "X-User-Role": "farmer" } });
    const data = await res.json();
    document.getElementById("batchTableContainer").innerHTML = renderTable(data);
  } catch (err) {
    document.getElementById("batchTableContainer").innerHTML = `<p style="color:red;">${err}</p>`;
  }
}

function renderDetail(batch) {
  if (!batch || !batch.batchId) return "<p>未找到该批次</p>";
  // 统一表格样式
  function renderTableHeader(cols) {
    return `<thead><tr>${cols.map(c => `<th>${c}</th>`).join('')}</tr></thead>`;
  }
  function renderTableRows(rows, keys) {
    return `<tbody>${rows.map(row => `<tr>${keys.map(k => `<td>${row[k] || ''}</td>`).join('')}</tr>`).join('')}</tbody>`;
  }
  // 批次详情表格
  const detailTable = `
    <h3 style='margin-top:0;'>批次详情</h3>
    <table>
      ${renderTableHeader(['字段', '内容'])}
      <tbody>
        <tr><td>批次ID</td><td>${batch.batchId}</td></tr>
        <tr><td>产地</td><td>${batch.origin}</td></tr>
        <tr><td>品种</td><td>${batch.variety}</td></tr>
        <tr><td>收获日期</td><td>${batch.harvestDate}</td></tr>
        <tr><td>当前所有者</td><td>${batch.currentOwner}</td></tr>
        <tr><td>当前步骤</td><td>${batch.processingStep}</td></tr>
      </tbody>
    </table>
  `;
  // 质检记录表格（直接渲染 testResults）
  const inspections = batch.testResults || [];
  const inspectionTable = `
    <h3 style='margin-top:32px;'>质检记录</h3>
    ${inspections.length > 0 ? `<table>
      ${renderTableHeader(['测试ID', '测试员', '温度', '报告', '结果', '时间'])}
      ${renderTableRows(inspections.slice().sort((a, b) => (b.timestamp || '').localeCompare(a.timestamp || '')), ['testId', 'testerId', 'temperature', 'report', 'result', 'timestamp'])}
    </table>` : '<p>暂无记录</p>'}
  `;
  // 加工记录表格，时间倒序
  const processHistory = (batch.processHistory || []).slice().sort((a, b) => (b.timestamp || '').localeCompare(a.timestamp || ''));
  let processTable = '';
  if (processHistory.length > 0) {
    processTable = `<h3 style='margin-top:32px;'>加工记录</h3><table>
      ${renderTableHeader(['操作人', '时间', '步骤'])}
      ${renderTableRows(processHistory, ['operator', 'timestamp', 'step'])}
    </table>`;
  } else {
    processTable = `<h3 style='margin-top:32px;'>加工记录</h3><p>暂无记录</p>`;
  }
  // 转移记录箭头可视化（从上到下，按时间顺序）
  const ownerHistory = (batch.ownerHistory || []).slice().sort((a, b) => (a.timestamp || '').localeCompare(b.timestamp || ''));
  let ownerChain = '';
  if (ownerHistory.length > 0) {
    ownerChain = ownerHistory.map((h, i) => {
      const to = h.to || '';
      const time = h.timestamp ? `(${h.timestamp})` : '';
      return `<div style='text-align:center;'>
        <div style='font-weight:500;'>${to}</div>
        <div style='color:#888;font-size:0.95em;'>${time}</div>
        ${i < ownerHistory.length - 1 ? "<div style='font-size:2em; color:#ff6f00;'>&#8595;</div>" : ''}
      </div>`;
    }).join('');
    ownerChain = `<div style='margin-top:32px;'><h3>转移记录</h3>${ownerChain}</div>`;
  } else {
    ownerChain = `<div style='margin-top:32px;'><h3>转移记录</h3><p>暂无记录</p></div>`;
  }
  return detailTable + inspectionTable + processTable + ownerChain;
}

async function getBatch() {
  const params = new URLSearchParams(window.location.search);
  const batchIdInput = document.getElementById("queryBatchId");
  const batchId = batchIdInput ? batchIdInput.value : params.get("batchId");
  if (!batchId) return;
  try {
    const res = await fetch(`${baseURL}/batch/${batchId}`, { headers: { "X-User-Role": "consumer" } });
    const data = await res.json();
    document.getElementById("batchDetail").innerHTML = renderDetail(data);
  } catch (err) {
    document.getElementById("batchDetail").innerHTML = `<p style="color:red;">${err}</p>`;
  }
}