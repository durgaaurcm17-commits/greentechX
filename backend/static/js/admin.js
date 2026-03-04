const API_BASE = "/api";

async function loadReports() {
    try {
        const res = await fetch(`${API_BASE}/reports`);
        const reportsData = await res.json();

        const container = document.querySelector("#reports-container");
        container.innerHTML = "";

        if (!reportsData) {
            container.innerHTML = "<p>No reports found.</p>";
            return;
        }

        Object.keys(reportsData).forEach(key => {
            const report = reportsData[key];
            const card = document.createElement('div');
            card.className = 'report-card';

            const timestamp = report.timestamp || Date.now();
            const date = new Date(timestamp).toLocaleDateString();

            let reportHtml = '';
            if (report.image_url) {
                reportHtml += `
                    <img 
                        src="${report.image_url}" 
                        class="report-image" 
                        onclick="openImageModal('${report.image_url}')"
                    />
                `;
            } else {
                reportHtml += `<div class="report-img" style="display:flex;align-items:center;justify-content:center;color:#64748b;height:100px;">No image provided</div>`;
            }

            reportHtml += `
                <div class="report-body">
                    <span class="status-tag status-${report.status}">${report.status}</span>
                    <p class="report-desc">${report.description}</p>
                    <div class="report-meta">
                        <span>${date}</span>
                        <span>Lat: ${report.lat ? report.lat.toFixed(4) : 'N/A'}</span>
                    </div>
                    ${report.status === 'pending' ? `<button class="btn-resolve" onclick="resolveReport('${key}')">Mark as Resolved</button>` : ''}
                </div>
            `;
            card.innerHTML = reportHtml;
            container.appendChild(card);
        });
    } catch (err) {
        console.error("Error loading reports:", err);
        document.querySelector("#reports-container").innerHTML = "<p style='color:#ef4444'>Error loading reports. Check backend.</p>";
    }
}

async function resolveReport(reportId) {
    try {
        const res = await fetch(`${API_BASE}/reports/update/${reportId}`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ status: "resolved" })
        });
        const data = await res.json();
        if (data.success) {
            loadReports();
        }
    } catch (err) {
        console.error("Error updating report:", err);
    }
}

function openImageModal(imageUrl) {
    document.getElementById("imageModal").style.display = "flex";
    document.getElementById("modalImage").src = imageUrl;
}

function closeImageModal() {
    document.getElementById("imageModal").style.display = "none";
}

// Global exposure for onclick handlers
window.resolveReport = resolveReport;
window.openImageModal = openImageModal;
window.closeImageModal = closeImageModal;

loadReports();
