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

function optimizeRoute(bins) {
    if (map.getLayer("route")) {
        map.removeLayer("route");
        map.removeSource("route");
    }

    const locations = bins
        .map(bin => `${bin.lng},${bin.lat}`)
        .join(":");

    tt.services.calculateRoute({
        key: TOMTOM_KEY,
        locations: locations,
        computeBestOrder: true
    })
        .then(response => {
            const route = response.routes[0];
            drawRouteOnMap(route);
        })
        .catch(error => {
            console.log("Routing failed:", error);
        });
}

function drawRouteOnMap(route) {
    if (!route) return;

    let coordinates = [];
    route.legs.forEach(leg => {
        leg.points.forEach(point => {
            coordinates.push([point.lng, point.lat]);
        });
    });

    if (!coordinates.length) return;

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
