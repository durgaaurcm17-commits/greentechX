const API_BASE = "/api";
const TOMTOM_KEY = "IcOngI16Mupy2rv8kAW9bGxbp9JXRv5N";
let map;
let allBins = []; // Keep a reference to bins

document.addEventListener("DOMContentLoaded", function () {
    // Initialize TomTom Map
    map = tt.map({
        key: TOMTOM_KEY,
        container: "map",
        center: [78.1198, 9.9252], // Madurai [lng, lat]
        zoom: 12
    });

    map.addControl(new tt.NavigationControl());

    map.on("load", function () {
        console.log("Map loaded ✅");
        map.showTrafficFlow();
        map.showTrafficIncidents();
        loadBins(); // Initial load
    });

    // Event Listeners
    const optimizeFilledBtn = document.querySelector("#optimizeFilledBtn");
    const optimizeReadyBtn = document.querySelector("#optimizeReadyBtn");

    if (optimizeFilledBtn) {
        optimizeFilledBtn.addEventListener("click", () => optimizeFilledRoute(allBins));
    }
    if (optimizeReadyBtn) {
        optimizeReadyBtn.addEventListener("click", () => {
            const readyBins = allBins.filter(bin => bin.status === "ready" || bin.status === "Ready");
            optimizeRoute(readyBins);
        });
    }
});

function collectAllBins() {
    if (!allBins || allBins.length === 0) {
        alert("No bins available");
        return;
    }
    optimizeRoute(allBins);
}

async function loadBins() {
    try {
        const res = await fetch(`${API_BASE}/bins`);
        const binsData = await res.json();

        if (!binsData) {
            const list = document.querySelector("#route-list");
            if (list) list.innerHTML = "<p>No active bins found.</p>";
            await loadReportedBins(); // Still try reports
            return;
        }

        allBins = Object.keys(binsData).map(key => ({
            id: key,
            ...binsData[key]
        }));

        displayBinsOnUI(allBins);
        addBinsToMap(allBins);

        await loadReportedBins();
    } catch (err) {
        console.error("Error loading bins:", err);
        const list = document.querySelector("#route-list");
        if (list) {
            list.innerHTML = "<p style='color: #ef4444'>Failed to fetch bins. Is the backend running?</p>";
        }
    }
}

function createBinMarker(fillLevel) {
    const el = document.createElement("div");
    const icon = document.createElement("span");
    icon.className = "material-symbols-outlined";
    icon.textContent = "delete";   // bin icon
    icon.style.fontSize = "28px";

    if (fillLevel < 40) {
        icon.style.color = "green";      // Low
    } else if (fillLevel < 75) {
        icon.style.color = "orange";     // Medium
    } else {
        icon.style.color = "red";        // High
    }
    el.appendChild(icon);
    return el;
}

function createReportedMarker(status) {
    const el = document.createElement("div");
    const icon = document.createElement("span");
    icon.className = "material-symbols-outlined";
    icon.textContent = "warning";
    icon.style.fontSize = "30px";

    if (status === "resolved") {
        icon.style.color = "green";
    } else {
        icon.style.color = "red";
    }
    el.appendChild(icon);
    return el;
}

async function loadReportedBins() {
    try {
        const res = await fetch(`${API_BASE}/reports`);
        const reports = await res.json();
        if (!reports) return;

        Object.values(reports).forEach(report => {
            if (!report.lng || !report.lat) return;

            new tt.Marker({
                element: createReportedMarker(report.status)
            })
                .setLngLat([report.lng, report.lat])
                .setPopup(
                    new tt.Popup({ offset: 30 })
                        .setHTML(`
                        <div style="font-size:13px; color: #1e293b; padding: 5px;">
                            <strong style="color: #ef4444;">🚨 Public Issue: ${report.reportType || 'Waste'}</strong><br/>
                            <div style="margin-top: 5px;">
                                📝 ${report.description || 'No details'}<br/>
                                👤 By: ${report.reporterName || 'Anonymous'}<br/>
                                📦 Status: <b>${report.status}</b>
                            </div>
                        </div>
                    `)
                )
                .addTo(map);
        });
    } catch (err) {
        console.error("Error loading reported bins:", err);
    }
}

function displayBinsOnUI(bins) {
    const list = document.querySelector("#route-list");
    if (!list) return;
    list.innerHTML = "";
    bins.forEach(bin => {
        const div = document.createElement('div');
        div.className = 'bin-item';
        div.innerHTML = `
            <span class="bin-id">${bin.id}</span>
            <span class="bin-level">${bin.level}% Full</span>
            <span class="bin-status" style="font-size: 10px; opacity: 0.7">${bin.status || 'N/A'}</span>
        `;
        list.appendChild(div);
    });
}

function addBinsToMap(bins) {
    bins.forEach(bin => {
        const lng = bin.lng || bin.longitude;
        const lat = bin.lat || bin.latitude;
        const fillLevel = bin.level || bin.fillLevel || 0;

        if (lng && lat) {
            const popup = new tt.Popup({ offset: 30 }).setHTML(`
                <div style="font-size:14px; color: #1e293b; padding: 5px;">
                    <strong>🗑 Waste Bin: ${bin.id}</strong><br/>
                    <div style="margin-top: 5px;">
                        📍 Lng: ${lng.toFixed(4)} | Lat: ${lat.toFixed(4)}<br/>
                        📊 Fill Level: <strong>${fillLevel}%</strong><br/>
                        ⚡ Priority: ${bin.priority || 'Normal'}<br/>
                        📦 Status: <span style="text-transform: capitalize;">${bin.status || 'Active'}</span>
                    </div>
                </div>
            `);

            new tt.Marker({
                element: createBinMarker(fillLevel)
            })
                .setLngLat([lng, lat])
                .setPopup(popup)
                .addTo(map);
        }
    });
}

function optimizeFilledRoute(bins) {
    const filledBins = bins
        .filter(bin => bin.level >= 60);

    if (filledBins.length === 0) {
        console.warn("No filled bins available (level >= 60)");
        const list = document.querySelector("#route-list");
        if (list) list.innerHTML = "<h4>Optimized Route</h4><p style='color: #f59e0b'>No bins require immediate collection (level < 60%)</p>";
        return;
    }

    optimizeRoute(filledBins);
}

async function optimizeRoute(bins) {
    if (!bins || bins.length === 0) return;

    const list = document.querySelector("#route-list");
    if (list) list.innerHTML = "<p>Calculating strategic route...</p>";

    // 1. Get current location (fallback to Madurai center)
    let startLat = 9.9252;
    let startLng = 78.1198;

    try {
        const pos = await new Promise((resolve, reject) => {
            navigator.geolocation.getCurrentPosition(resolve, reject);
        });
        startLat = pos.coords.latitude;
        startLng = pos.coords.longitude;
    } catch (e) {
        console.warn("Geolocation failed, using default center.");
    }

    // 2. Call backend optimizer
    try {
        const res = await fetch(`${API_BASE}/optimize-route`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                bins: bins,
                start: [startLat, startLng]
            })
        });

        const data = await res.json();
        if (data.success && data.route && data.route.routes && data.route.routes.length > 0) {
            const route = data.route.routes[0];
            drawRouteOnMap(route);
            displayOptimizedLegend(data.optimized_bins, route.summary);
        } else {
            console.error("Backend Error:", data);
            const errorMsg = data.error || "Route not found or API error. Check if TomTom API key is valid.";
            alert("Optimization failed: " + errorMsg);

            if (list) {
                list.innerHTML = `<h4>Optimization Error</h4><p style='color: #ef4444'>${errorMsg}</p>`;
            }
        }
    } catch (err) {
        console.error("Routing error:", err);
        alert("Optimization failed: Connection error to backend.");
        if (list) {
            list.innerHTML = "<h4>Optimization Error</h4><p style='color: #ef4444'>Could not connect to optimization server.</p>";
        }
    }
}

function displayOptimizedLegend(bins, summary) {
    const list = document.querySelector("#route-list");
    if (!list) return;

    const distKm = (summary.lengthInMeters / 1000).toFixed(1);
    const timeMin = Math.round(summary.travelTimeInSeconds / 60);

    let html = `
        <div class="route-summary" style="margin-bottom: 20px; padding: 10px; background: rgba(0, 122, 255, 0.1); border-radius: 8px;">
            <div style="display:flex; justify-content:space-between; font-weight:600; color:#007AFF;">
                <span>STOPS: ${bins.length}</span>
                <span>${distKm} km | ${timeMin} min</span>
            </div>
        </div>
        <div class="steps-container">
    `;

    bins.forEach((bin, index) => {
        const isCritical = (bin.level || 0) > 75;
        html += `
            <div class="route-step" style="display: flex; gap: 12px; margin-bottom: 12px; align-items: flex-start; border-left: 2px solid #007AFF; padding-left: 12px;">
                <div class="step-num" style="background: #007AFF; color: white; width: 24px; height: 24px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 12px; flex-shrink: 0;">${index + 1}</div>
                <div style="flex: 1;">
                    <div style="font-weight: 600; color: #f8fafc; font-size: 14px;">Bin ${bin.id}</div>
                    <div style="font-size: 12px; color: ${isCritical ? '#ef4444' : '#94a3b8'};">
                        ${bin.level}% Full • ${bin.priority || 'Medium'} Priority
                    </div>
                </div>
                <button onclick="markAsCollected('${bin.id}')" class="btn-collect" style="padding: 4px 8px; font-size: 10px; background: #10b981; color: white; border: none; border-radius: 4px; cursor: pointer;">Collect</button>
            </div>
        `;
    });

    html += `</div>`;
    list.innerHTML = `<h4>Optimized Route</h4>` + html;
}

let lastAudioPlayTime = 0;

async function markAsCollected(binId) {
    const bin = allBins.find(b => b.id === binId);

    if (bin && bin.wasteType) {
        const wasteType = bin.wasteType.toLowerCase();
        const audioMap = {
            plastic: "/audio/plastic.mp3",
            glass: "/audio/glass.mp3",
            metal: "/audio/metal.mp3"
        };

        if (audioMap[wasteType]) {
            const now = Date.now();
            if (now - lastAudioPlayTime > 2000) {
                try {
                    const audio = new Audio(audioMap[wasteType]);
                    audio.play().catch(err => console.error("Audio playback error:", err));
                    lastAudioPlayTime = now;
                } catch (err) {
                    console.error("Audio initialization error:", err);
                }
            }
        }
    }

    if (!confirm(`Mark bin ${binId} as collected? This will reset fill level to 0.`)) return;

    try {
        const res = await fetch(`${API_BASE}/bins/update/${binId}`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                level: 0,
                status: "active",
                lastCollected: Date.now()
            })
        });

        const data = await res.json();
        if (data.success) {
            alert(`Bin ${binId} marked as collected!`);
            loadBins(); // Refresh
        }
    } catch (err) {
        console.error("Collection error:", err);
    }
}

function drawRouteOnMap(route) {
    if (!route || !route.legs) return;

    let coordinates = [];
    route.legs.forEach(leg => {
        if (!leg.points) return;
        leg.points.forEach(point => {
            // TomTom API uses 'latitude' and 'longitude', our app uses 'lat' and 'lng'
            const lng = point.longitude || point.lng;
            const lat = point.latitude || point.lat;

            if (lng !== undefined && lat !== undefined && !isNaN(lng) && !isNaN(lat)) {
                coordinates.push([lng, lat]);
            }
        });
    });

    if (coordinates.length === 0) {
        console.warn("No valid coordinates found in route data.");
        return;
    }

    const geojson = {
        type: "Feature",
        geometry: {
            type: "LineString",
            coordinates: coordinates
        }
    };

    if (map.getLayer("route")) map.removeLayer("route");
    if (map.getSource("route")) map.removeSource("route");

    map.addSource("route", {
        type: "geojson",
        data: geojson
    });

    map.addLayer({
        id: "route",
        type: "line",
        source: "route",
        layout: {
            "line-join": "round",
            "line-cap": "round"
        },
        paint: {
            "line-color": "#007AFF",
            "line-width": 6,
            "line-opacity": 0.9
        }
    });

    const bounds = coordinates.reduce((bounds, coord) => {
        return bounds.extend(coord);
    }, new tt.LngLatBounds(coordinates[0], coordinates[0]));

    map.fitBounds(bounds, { padding: 40 });
}

// Expose to global for onclick targets
window.collectAllBins = collectAllBins;
window.optimizeRoute = optimizeRoute;
window.markAsCollected = markAsCollected;
