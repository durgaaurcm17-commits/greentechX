const API_BASE = "/api";
const TOMTOM_KEY = "IcOngI16Mupy2rv8kAW9bGxbp9JXRv5N";
let map;

document.addEventListener("DOMContentLoaded", function () {
    // Initialize TomTom Map
    map = tt.map({
        key: TOMTOM_KEY,
        container: "map",
        center: [78.1198, 9.9252], // Madurai
        zoom: 12
    });

    map.addControl(new tt.NavigationControl());

    map.on("load", function () {
        console.log("Admin Map loaded ✅");
        loadAllData();
    });
});

async function loadAllData() {
    await loadBins();
    await loadReports();
}

async function loadBins() {
    try {
        const res = await fetch(`${API_BASE}/bins`);
        const binsData = await res.json();
        if (!binsData) return;

        const bins = Object.keys(binsData).map(key => ({ id: key, ...binsData[key] }));

        // Stats calculation
        const totalBins = bins.length;
        const totalLevel = bins.reduce((sum, b) => sum + (b.level || 0), 0);
        const avgFill = totalBins > 0 ? Math.round(totalLevel / totalBins) : 0;

        document.getElementById("stat-total-bins").innerText = totalBins;
        document.getElementById("stat-avg-fill").innerText = `${avgFill}%`;

        displayBinsInList(bins);
        addBinsToMap(bins);
    } catch (err) {
        console.error("Error loading bins:", err);
    }
}

function displayBinsInList(bins) {
    const list = document.querySelector("#bin-list");
    if (!list) return;
    list.innerHTML = "";

    // Sort by level descending to show critical ones first
    const sortedBins = [...bins].sort((a, b) => (b.level || 0) - (a.level || 0));

    sortedBins.forEach(bin => {
        const div = document.createElement('div');
        div.className = 'bin-summary-item';
        div.style.cssText = "display: flex; justify-content: space-between; padding: 10px; border-bottom: 1px solid #334155; align-items: center;";

        const level = bin.level || 0;
        const color = level > 75 ? '#ef4444' : (level > 40 ? '#f59e0b' : '#10b981');

        div.innerHTML = `
            <div>
                <strong style="color: #f8fafc;">${bin.id}</strong>
                <div style="font-size: 12px; color: #94a3b8;">${bin.locationName || 'Main Street'}</div>
            </div>
            <div style="text-align: right;">
                <div style="font-weight: 600; color: ${color}">${level}%</div>
                <div style="font-size: 10px; color: #64748b; text-transform: uppercase;">${bin.status || 'Active'}</div>
            </div>
        `;
        list.appendChild(div);
    });
}

function createBinMarker(fillLevel) {
    const el = document.createElement("div");
    const icon = document.createElement("span");
    icon.className = "material-symbols-outlined";
    icon.textContent = "delete";
    icon.style.fontSize = "28px";
    icon.style.color = fillLevel < 40 ? "#10b981" : (fillLevel < 75 ? "#f59e0b" : "#ef4444");
    el.appendChild(icon);
    return el;
}

function addBinsToMap(bins) {
    bins.forEach(bin => {
        const lng = bin.lng || bin.longitude;
        const lat = bin.lat || bin.latitude;
        const fillLevel = bin.level || 0;

        if (lng && lat) {
            new tt.Marker({ element: createBinMarker(fillLevel) })
                .setLngLat([lng, lat])
                .setPopup(new tt.Popup({ offset: 30 }).setHTML(`
                    <div style="padding: 10px; color: #1e293b;">
                        <strong style="font-size: 14px;">🗑 Bin: ${bin.id}</strong><br/>
                        <div style="margin-top: 5px;">
                            Level: <b style="color: ${fillLevel > 75 ? 'red' : 'inherit'}">${fillLevel}% Full</b><br/>
                            Status: ${bin.status || 'Active'}
                        </div>
                    </div>
                `))
                .addTo(map);
        }
    });
}

function createReportedMarker(status) {
    const el = document.createElement("div");
    const icon = document.createElement("span");
    icon.className = "material-symbols-outlined";
    icon.textContent = "warning";
    icon.style.fontSize = "30px";
    icon.style.color = status === "resolved" ? "#10b981" : "#ef4444";
    el.appendChild(icon);
    return el;
}

async function loadReports() {
    try {
        const res = await fetch(`${API_BASE}/reports`);
        const reportsData = await res.json();

        const container = document.querySelector("#reports-container");
        container.innerHTML = "";

        if (!reportsData) {
            container.innerHTML = "<p>No reports found.</p>";
            document.getElementById("stat-pending-issues").innerText = 0;
            return;
        }

        let pendingCount = 0;
        Object.keys(reportsData).forEach(key => {
            const report = reportsData[key];
            if (report.status === "pending") pendingCount++;

            // Add to Map if location exists
            if (report.lng && report.lat) {
                new tt.Marker({ element: createReportedMarker(report.status) })
                    .setLngLat([report.lng, report.lat])
                    .setPopup(new tt.Popup({ offset: 30 }).setHTML(`
                        <div style="padding: 5px; color: #1e293b;">
                            <strong style="color: #ef4444;">🚨 Issue: ${report.reportType}</strong><br/>
                            <p style="margin: 5px 0;">${report.description}</p>
                            <span style="font-size: 11px; color: #64748b;">Status: ${report.status}</span>
                        </div>
                    `))
                    .addTo(map);
            }

            // UI Cards
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
                reportHtml += `<div class="report-img" style="display:flex;align-items:center;justify-content:center;color:#64748b;height:100px;background:#1e293b;border-radius:12px 12px 0 0;">No image</div>`;
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
        document.getElementById("stat-pending-issues").innerText = pendingCount;
    } catch (err) {
        console.error("Error loading reports:", err);
        document.querySelector("#reports-container").innerHTML = "<p style='color:#ef4444'>Error loading reports.</p>";
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
            // Refresh Both
            loadAllData();
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

// Global exposure
window.resolveReport = resolveReport;
window.openImageModal = openImageModal;
window.closeImageModal = closeImageModal;
