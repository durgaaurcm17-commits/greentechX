// public.js

// ----------------------
// LOCAL IMAGE UPLOAD
// ----------------------
async function uploadToLocal(file) {
    const formData = new FormData();
    formData.append("file", file);

    const res = await fetch("/api/upload", {
        method: "POST",
        body: formData
    });

    const data = await res.json();

    if (data.success && data.image_url) {
        return data.image_url;
    } else {
        throw new Error(data.error || "Local upload failed");
    }
}
let selectedLat = null;
let selectedLng = null;
let currentMarker = null;

// Initialize TomTom Map
const map = tt.map({
    key: TOMTOM_KEY,
    container: "map",
    center: [78.1198, 9.9195], // Default Madurai
    zoom: 14
});

map.addControl(new tt.NavigationControl());

map.on("click", function (e) {
    selectedLng = e.lngLat.lng;
    selectedLat = e.lngLat.lat;

    if (currentMarker) currentMarker.remove();

    currentMarker = new tt.Marker()
        .setLngLat([selectedLng, selectedLat])
        .addTo(map);

    console.log("Marker set at:", selectedLat, selectedLng);
});

function useMyLocation() {
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
            function (position) {
                selectedLat = position.coords.latitude;
                selectedLng = position.coords.longitude;

                map.setCenter([selectedLng, selectedLat]);
                map.setZoom(16);

                if (currentMarker) currentMarker.remove();
                currentMarker = new tt.Marker({ color: "blue" })
                    .setLngLat([selectedLng, selectedLat])
                    .addTo(map);
            },
            function () {
                alert("Unable to retrieve your location.");
            },
            { enableHighAccuracy: true }
        );
    } else {
        alert("Geolocation not supported.");
    }
}

async function submitReport() {
    const description = document.getElementById("description").value;
    const reporter = document.getElementById("reporter").value;
    const issueType = document.getElementById("issueType").value;
    const imageFile = document.getElementById("imageInput").files[0];

    if (!selectedLat || !selectedLng) {
        alert("Select location first");
        return;
    }

    if (!description || !reporter) {
        alert("Please fill all fields");
        return;
    }

    const submitBtn = document.querySelector('button[type="submit"]');
    const originalText = submitBtn.innerText;
    submitBtn.innerText = "Submitting...";
    submitBtn.disabled = true;

    try {
        let imageUrl = "";

        if (imageFile) {
            imageUrl = await uploadToLocal(imageFile);
        }

        const reportData = {
            reporterName: reporter,
            reportType: issueType,
            description: description,
            lat: selectedLat,
            lng: selectedLng,
            image_url: imageUrl,
            timestamp: Date.now()
        };

        const res = await fetch("/api/reports", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify(reportData)
        });

        const result = await res.json();

        if (result.success) {
            alert("Report submitted successfully!");
            location.reload();
        } else {
            alert("Error submitting report: " + (result.error || "Unknown error"));
        }
    } catch (error) {
        console.error("Submission error:", error);
        alert("Error submitting report. Please check your connection.");
    } finally {
        submitBtn.innerText = originalText;
        submitBtn.disabled = false;
    }
}

// Form Submission Hook
document.getElementById("reportForm")?.addEventListener("submit", async (e) => {
    e.preventDefault();
    await submitReport();
});

// Global exposure
window.useMyLocation = useMyLocation;
