/* =========================================
   PULSEPATH - COMPLETE SCRIPT.JS
   Includes:
   - Leaflet map
   - Geocoding
   - OSRM route alternatives
   - Safety scoring
   - Profiles
   - Multilingual UI
   - SOS backend connection
   - GPS voice navigation
   - Turn-by-turn OSRM instructions
========================================= */

/* =========================================
   GLOBAL VARIABLES
========================================= */

let map;
let routeLayers = [];
let currentLocationMarker = null;
let traveledRouteLayer = null;
let routes = [];
let selectedRoute = 0;
let currentProfile = "pedestrian";
let currentLanguage = "en";
let currentUser = null;

const API_BASE = window.location.port === "5000" ? "" :
    "http://" + (window.location.hostname || "localhost") + ":5000";

/* =========================================
   TRANSLATIONS
========================================= */

const translations = {
    en: {
        planRoute: "Plan Your Route",
        compare: "Compare safety, time and distance before you choose.",
        startingLocation: "Starting Location",
        destination: "Destination",
        profile: "Profile",
        pedestrian: "Pedestrian",
        female: "Female",
        cyclist: "Cyclist",
        findSaferRoutes: "Find Safer Routes",
        selectedRoute: "Selected Route",
        selectRoute: "Select a route to see its safety details.",
        lowRisk: "Low Risk",
        moderateRisk: "Moderate Risk",
        highRisk: "High Risk",
        sos: "SOS",
        finding: "Finding routes...",
        route: "Route"
    },

    hi: {
        planRoute: "अपना मार्ग चुनें",
        compare: "मार्ग चुनने से पहले सुरक्षा, समय और दूरी की तुलना करें।",
        startingLocation: "शुरुआती स्थान",
        destination: "गंतव्य",
        profile: "प्रोफ़ाइल",
        pedestrian: "पैदल यात्री",
        female: "महिला",
        cyclist: "साइकिल चालक",
        findSaferRoutes: "सुरक्षित मार्ग खोजें",
        selectedRoute: "चयनित मार्ग",
        selectRoute: "सुरक्षा विवरण देखने के लिए कोई मार्ग चुनें।",
        lowRisk: "कम जोखिम",
        moderateRisk: "मध्यम जोखिम",
        highRisk: "उच्च जोखिम",
        sos: "SOS",
        finding: "मार्ग खोजा जा रहा है...",
        route: "मार्ग"
    },

    mr: {
        planRoute: "तुमचा मार्ग निवडा",
        compare: "मार्ग निवडण्यापूर्वी सुरक्षितता, वेळ आणि अंतराची तुलना करा.",
        startingLocation: "सुरुवातीचे ठिकाण",
        destination: "गंतव्यस्थान",
        profile: "प्रोफाइल",
        pedestrian: "पादचारी",
        female: "महिला",
        cyclist: "सायकलस्वार",
        findSaferRoutes: "सुरक्षित मार्ग शोधा",
        selectedRoute: "निवडलेला मार्ग",
        selectRoute: "सुरक्षिततेचे तपशील पाहण्यासाठी मार्ग निवडा.",
        lowRisk: "कमी धोका",
        moderateRisk: "मध्यम धोका",
        highRisk: "जास्त धोका",
        sos: "SOS",
        finding: "मार्ग शोधत आहे...",
        route: "मार्ग"
    },

    gu: {
        planRoute: "તમારો માર્ગ પસંદ કરો",
        compare: "માર્ગ પસંદ કરતા પહેલા સુરક્ષા, સમય અને અંતરની તુલના કરો.",
        startingLocation: "પ્રારંભિક સ્થાન",
        destination: "ગંતવ્ય",
        profile: "પ્રોફાઇલ",
        pedestrian: "પદયાત્રી",
        female: "મહિલા",
        cyclist: "સાયકલ સવાર",
        findSaferRoutes: "સુરક્ષિત માર્ગ શોધો",
        selectedRoute: "પસંદ કરેલ માર્ગ",
        selectRoute: "સુરક્ષા વિગતો જોવા માટે માર્ગ પસંદ કરો.",
        lowRisk: "ઓછું જોખમ",
        moderateRisk: "મધ્યમ જોખમ",
        highRisk: "વધુ જોખમ",
        sos: "SOS",
        finding: "માર્ગ શોધી રહ્યા છીએ...",
        route: "માર્ગ"
    },

    pa: {
        planRoute: "ਆਪਣਾ ਰਸਤਾ ਚੁਣੋ",
        compare: "ਰਸਤਾ ਚੁਣਨ ਤੋਂ ਪਹਿਲਾਂ ਸੁਰੱਖਿਆ, ਸਮਾਂ ਅਤੇ ਦੂਰੀ ਦੀ ਤੁਲਨਾ ਕਰੋ।",
        startingLocation: "ਸ਼ੁਰੂਆਤੀ ਸਥਾਨ",
        destination: "ਮੰਜ਼ਿਲ",
        profile: "ਪ੍ਰੋਫਾਈਲ",
        pedestrian: "ਪੈਦਲ ਯਾਤਰੀ",
        female: "ਔਰਤ",
        cyclist: "ਸਾਈਕਲ ਸਵਾਰ",
        findSaferRoutes: "ਸੁਰੱਖਿਅਤ ਰਸਤੇ ਲੱਭੋ",
        selectedRoute: "ਚੁਣਿਆ ਰਸਤਾ",
        selectRoute: "ਸੁਰੱਖਿਆ ਵੇਰਵੇ ਦੇਖਣ ਲਈ ਰਸਤਾ ਚੁਣੋ।",
        lowRisk: "ਘੱਟ ਜੋਖਮ",
        moderateRisk: "ਦਰਮਿਆਨਾ ਜੋਖਮ",
        highRisk: "ਵੱਧ ਜੋਖਮ",
        sos: "SOS",
        finding: "ਰਸਤੇ ਲੱਭੇ ਜਾ ਰਹੇ ਹਨ...",
        route: "ਰਸਤਾ"
    },

    bn: {
        planRoute: "আপনার পথ পরিকল্পনা করুন",
        compare: "পথ বেছে নেওয়ার আগে নিরাপত্তা, সময় এবং দূরত্ব তুলনা করুন।",
        startingLocation: "শুরুর স্থান",
        destination: "গন্তব্য",
        profile: "প্রোফাইল",
        pedestrian: "পথচারী",
        female: "মহিলা",
        cyclist: "সাইকেল চালক",
        findSaferRoutes: "নিরাপদ পথ খুঁজুন",
        selectedRoute: "নির্বাচিত পথ",
        selectRoute: "নিরাপত্তার বিবরণ দেখতে একটি পথ নির্বাচন করুন।",
        lowRisk: "কম ঝুঁকি",
        moderateRisk: "মাঝারি ঝুঁকি",
        highRisk: "উচ্চ ঝুঁকি",
        sos: "SOS",
        finding: "পথ খোঁজা হচ্ছে...",
        route: "পথ"
    },

    ta: {
        planRoute: "உங்கள் பாதையைத் திட்டமிடுங்கள்",
        compare: "பாதையைத் தேர்ந்தெடுப்பதற்கு முன் பாதுகாப்பு, நேரம் மற்றும் தூரத்தை ஒப்பிடுங்கள்.",
        startingLocation: "தொடக்க இடம்",
        destination: "செல்லும் இடம்",
        profile: "சுயவிவரம்",
        pedestrian: "நடைபயணி",
        female: "பெண்",
        cyclist: "மிதிவண்டி ஓட்டுநர்",
        findSaferRoutes: "பாதுகாப்பான பாதைகளைத் தேடுங்கள்",
        selectedRoute: "தேர்ந்தெடுக்கப்பட்ட பாதை",
        selectRoute: "பாதுகாப்பு விவரங்களைப் பார்க்க ஒரு பாதையைத் தேர்ந்தெடுக்கவும்.",
        lowRisk: "குறைந்த ஆபத்து",
        moderateRisk: "மிதமான ஆபத்து",
        highRisk: "அதிக ஆபத்து",
        sos: "SOS",
        finding: "பாதைகளைத் தேடுகிறது...",
        route: "பாதை"
    },

    te: {
        planRoute: "మీ మార్గాన్ని ప్లాన్ చేసుకోండి",
        compare: "మార్గాన్ని ఎంచుకునే ముందు భద్రత, సమయం మరియు దూరాన్ని పోల్చండి.",
        startingLocation: "ప్రారంభ స్థానం",
        destination: "గమ్యం",
        profile: "ప్రొఫైల్",
        pedestrian: "పాదచారి",
        female: "మహిళ",
        cyclist: "సైకిల్ రైడర్",
        findSaferRoutes: "సురక్షితమైన మార్గాలను కనుగొనండి",
        selectedRoute: "ఎంచుకున్న మార్గం",
        selectRoute: "భద్రత వివరాలను చూడటానికి మార్గాన్ని ఎంచుకోండి.",
        lowRisk: "తక్కువ ప్రమాదం",
        moderateRisk: "మధ్యస్థ ప్రమాదం",
        highRisk: "అధిక ప్రమాదం",
        sos: "SOS",
        finding: "మార్గాలను వెతుకుతోంది...",
        route: "మార్గం"
    },

    kn: {
        planRoute: "ನಿಮ್ಮ ಮಾರ್ಗವನ್ನು ಯೋಜಿಸಿ",
        compare: "ಮಾರ್ಗವನ್ನು ಆಯ್ಕೆ ಮಾಡುವ ಮೊದಲು ಸುರಕ್ಷತೆ, ಸಮಯ ಮತ್ತು ದೂರವನ್ನು ಹೋಲಿಸಿ.",
        startingLocation: "ಪ್ರಾರಂಭದ ಸ್ಥಳ",
        destination: "ಗಮ್ಯಸ್ಥಾನ",
        profile: "ಪ್ರೊಫೈಲ್",
        pedestrian: "ಪಾದಚಾರಿ",
        female: "ಮಹಿಳೆ",
        cyclist: "ಸೈಕಲ್ ಸವಾರ",
        findSaferRoutes: "ಸುರಕ್ಷಿತ ಮಾರ್ಗಗಳನ್ನು ಹುಡುಕಿ",
        selectedRoute: "ಆಯ್ಕೆ ಮಾಡಿದ ಮಾರ್ಗ",
        selectRoute: "ಸುರಕ್ಷತಾ ವಿವರಗಳನ್ನು ನೋಡಲು ಮಾರ್ಗವನ್ನು ಆಯ್ಕೆಮಾಡಿ.",
        lowRisk: "ಕಡಿಮೆ ಅಪಾಯ",
        moderateRisk: "ಮಧ್ಯಮ ಅಪಾಯ",
        highRisk: "ಹೆಚ್ಚಿನ ಅಪಾಯ",
        sos: "SOS",
        finding: "ಮಾರ್ಗಗಳನ್ನು ಹುಡುಕಲಾಗುತ್ತಿದೆ...",
        route: "ಮಾರ್ಗ"
    },

    ml: {
        planRoute: "നിങ്ങളുടെ വഴി ആസൂത്രണം ചെയ്യുക",
        compare: "വഴി തിരഞ്ഞെടുക്കുന്നതിന് മുമ്പ് സുരക്ഷ, സമയം, ദൂരം എന്നിവ താരതമ്യം ചെയ്യുക.",
        startingLocation: "ആരംഭ സ്ഥലം",
        destination: "ലക്ഷ്യസ്ഥാനം",
        profile: "പ്രൊഫൈൽ",
        pedestrian: "കാൽനടയാത്രികൻ",
        female: "സ്ത്രീ",
        cyclist: "സൈക്കിൾ യാത്രികൻ",
        findSaferRoutes: "സുരക്ഷിതമായ വഴികൾ കണ്ടെത്തുക",
        selectedRoute: "തിരഞ്ഞെടുത്ത വഴി",
        selectRoute: "സുരക്ഷാ വിശദാംശങ്ങൾ കാണാൻ ഒരു വഴി തിരഞ്ഞെടുക്കുക.",
        lowRisk: "കുറഞ്ഞ അപകടസാധ്യത",
        moderateRisk: "മിതമായ അപകടസാധ്യത",
        highRisk: "ഉയർന്ന അപകടസാധ്യത",
        sos: "SOS",
        finding: "വഴികൾ കണ്ടെത്തുന്നു...",
        route: "വഴി"
    }
};

/* =========================================
   TRANSLATION HELPER
========================================= */

function t(key) {
    const lang = translations[currentLanguage] || translations.en;
    return lang[key] || translations.en[key] || key;
}

/* =========================================
   MAP
========================================= */

map = L.map("map").setView([26.9124, 75.7873], 13);

L.tileLayer(
    "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
    {
        attribution: "© OpenStreetMap contributors"
    }
).addTo(map);

/* =========================================
   LANGUAGE
========================================= */

function changeLanguage(language) {
    if (!translations[language]) {
        language = "en";
    }

    currentLanguage = language;

    document.querySelectorAll("[data-i18n]").forEach(function (element) {
        const key = element.getAttribute("data-i18n");
        element.textContent = t(key);
    });

    document.querySelectorAll("[data-i18n-placeholder]").forEach(function (element) {
        const key = element.getAttribute("data-i18n-placeholder");
        element.placeholder = t(key);
    });

    localStorage.setItem("pulsePathLanguage", language);

    if (languageSelect) {
        languageSelect.value = language;
    }

    if (routes.length > 0) {
        createRoutes();
        selectRoute(selectedRoute);
    }
}

function expandRoutePlanner() {
    const container = document.querySelector(".container");
    const layout = document.querySelector(".layout");

    if (!container || !layout) {
        return;
    }

    container.classList.add("route-planner-expanded");
    layout.classList.add("route-planner-expanded");

    requestAnimationFrame(function () {
        if (map) {
            map.invalidateSize();
        }
    });
}

function initializeSidebarToggle() {
    const sidebarToggle = document.getElementById("sidebarToggle");
    const layout = document.querySelector(".layout");

    if (!sidebarToggle || !layout) {
        return;
    }

    sidebarToggle.addEventListener("click", function () {
        const isCollapsed = layout.classList.toggle("sidebar-collapsed");

        sidebarToggle.setAttribute("aria-expanded", String(!isCollapsed));
        sidebarToggle.setAttribute(
            "aria-label",
            isCollapsed ? "Show route planner" : "Hide route planner"
        );

        requestAnimationFrame(function () {
            if (map) {
                map.invalidateSize();
            }
        });
    });
}

const languageSelect = document.getElementById("languageSelect");

if (languageSelect) {
    languageSelect.addEventListener("change", function () {
        changeLanguage(this.value);
    });
}

/* =========================================
   CURRENT LOCATION
========================================= */

function useCurrentLocation() {
    if (!navigator.geolocation) {
        alert("Geolocation is not supported by your browser.");
        return;
    }

    navigator.geolocation.getCurrentPosition(
        function (position) {
            const lat = position.coords.latitude;
            const lon = position.coords.longitude;

            const startInput = document.getElementById("start");

            if (startInput) {
                startInput.value =
                    lat.toFixed(5) + ", " + lon.toFixed(5);
            }

            map.setView([lat, lon], 15);
        },
        function (error) {
            console.error("Location error:", error);
            alert("Location permission was not granted.");
        },
        {
            enableHighAccuracy: true,
            timeout: 10000,
            maximumAge: 0
        }
    );
}

/* =========================================
   PROFILE
========================================= */

async function selectProfile(button) {
    document.querySelectorAll(".profile").forEach(function (btn) {
        btn.classList.remove("active");
    });

    button.classList.add("active");
    currentProfile = button.dataset.profile;

    if (routes.length > 0) {
        try {
            await refreshRouteSafety();
        } catch (error) {
            console.error("Profile safety refresh error:", error);
            alert("Could not load safety data for this profile.");
        }
    }
}

/* =========================================
   GEOCODING
========================================= */

async function geocode(location) {
    const coordinateRegex =
        /^\s*-?\d+(\.\d+)?\s*,\s*-?\d+(\.\d+)?\s*$/;

    if (coordinateRegex.test(location)) {
        const values = location.split(",");

        return {
            lat: Number(values[0]),
            lon: Number(values[1])
        };
    }

    const url =
        "https://nominatim.openstreetmap.org/search?" +
        "format=json&limit=1&q=" +
        encodeURIComponent(location);

    const response = await fetch(url, {
        headers: {
            "Accept-Language": currentLanguage + ",en"
        }
    });

    if (!response.ok) {
        throw new Error("Could not contact the location service.");
    }

    const data = await response.json();

    if (!data.length) {
        throw new Error("Location not found: " + location);
    }

    return {
        lat: Number(data[0].lat),
        lon: Number(data[0].lon)
    };
}

/* =========================================
   FIND ROUTES
========================================= */

async function findRoutes() {
    const startInput = document.getElementById("start");
    const destinationInput = document.getElementById("destination");
    const button = document.getElementById("findButton");

    if (!startInput || !destinationInput) {
        alert("Starting location or destination field is missing.");
        return;
    }

    const start = startInput.value.trim();
    const destination = destinationInput.value.trim();

    if (!start || !destination) {
        alert("Please enter both starting location and destination.");
        return;
    }

    if (button) {
        button.disabled = true;
        button.textContent = t("finding");
    }

    try {
        const startPoint = await geocode(start);
        const endPoint = await geocode(destination);

        /*
          IMPORTANT:
          steps=true is required for voice navigation.
        */

        const url =
            "https://router.project-osrm.org/route/v1/driving/" +
            startPoint.lon + "," + startPoint.lat +
            ";" +
            endPoint.lon + "," + endPoint.lat +
            "?alternatives=true" +
            "&overview=full" +
            "&geometries=geojson" +
            "&steps=true";

        console.log("OSRM request:", url);

        const response = await fetch(url);

        if (!response.ok) {
            throw new Error("Routing service returned an error.");
        }

        const data = await response.json();

        console.log("OSRM response:", data);

        if (data.code !== "Ok" || !data.routes || !data.routes.length) {
            throw new Error("No route found.");
        }

        routes = await getRouteSafety(data.routes.slice(0, 3));

        selectedRoute = 0;

        drawRoutes();
        createRoutes();
        selectRoute(0);
        expandRoutePlanner();

        /*
          Prepare voice instructions immediately.
          This confirms that OSRM returned steps.
        */
        const firstRouteSteps = prepareNavigationSteps(routes[0]);

        console.log(
            "Voice navigation steps available:",
            firstRouteSteps.length
        );

        if (firstRouteSteps.length > 0) {
            updateVoiceStatus(
                "Route selected. Press Start Navigation to begin GPS guidance."
            );
        } else {
            updateVoiceStatus(
                "Route found, but turn-by-turn instructions were not returned."
            );
        }

    } catch (error) {
        console.error("Find routes error:", error);

        alert(
            error.message +
            "\n\nTry using well-known locations or coordinates."
        );
    } finally {
        if (button) {
            button.disabled = false;
            button.textContent = t("findSaferRoutes");
        }
    }
}

async function getRouteSafety(routeList) {
    const response = await fetch(API_BASE + "/api/route-safety", {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        credentials: "include",
        body: JSON.stringify({
            profile: currentProfile,
            routes: routeList.map(function (route) {
                return {
                    distance: route.distance,
                    duration: route.duration
                };
            })
        })
    });

    const data = await response.json();

    if (!response.ok || !data.success) {
        throw new Error(data.error || "Could not load route safety data.");
    }

    return routeList.map(function (route, index) {
        const safety = data.routes[index];

        return {
            ...route,
            safety: {
                score: safety.score,
                factors: safety.factors
            }
        };
    });
}

async function refreshRouteSafety() {
    routes = await getRouteSafety(routes);
    createRoutes();
    selectRoute(selectedRoute);
}

/* =========================================
   RISK
========================================= */

function getRisk(score) {
    if (score >= 75) {
        return {
            name: t("lowRisk"),
            className: "green",
            color: "#16a34a"
        };
    }

    if (score >= 55) {
        return {
            name: t("moderateRisk"),
            className: "orange",
            color: "#f59e0b"
        };
    }

    return {
        name: t("highRisk"),
        className: "red",
        color: "#dc2626"
    };
}

/* =========================================
   DRAW ROUTES
========================================= */

function drawRoutes() {
    routeLayers.forEach(function (layer) {
        map.removeLayer(layer);
    });

    routeLayers = [];

    if (traveledRouteLayer) {
        map.removeLayer(traveledRouteLayer);
        traveledRouteLayer = null;
    }

    routes.forEach(function (route, index) {
        const risk = getRisk(route.safety.score);

        const layer = L.geoJSON(route.geometry, {
            style: {
                color: risk.color,
                weight: index === selectedRoute ? 8 : 5,
                opacity: index === selectedRoute ? 1 : 0.55
            }
        });

        layer.on("click", function () {
            selectRoute(index);
        });

        layer.addTo(map);
        routeLayers.push(layer);
    });

    if (routes.length) {
        const bounds =
            L.geoJSON(routes[selectedRoute].geometry).getBounds();

        map.fitBounds(bounds, {
            padding: [30, 30]
        });
    }
}

function updateTraveledRoute(latitude, longitude) {
    const route = routes[selectedRoute];
    const coordinates = route &&
        route.geometry &&
        route.geometry.coordinates;

    if (!coordinates || coordinates.length < 2) {
        return;
    }

    let closestIndex = 0;
    let closestDistance = Infinity;

    coordinates.forEach(function (coordinate, index) {
        const distance = distanceBetweenPoints(
            latitude,
            longitude,
            Number(coordinate[1]),
            Number(coordinate[0])
        );

        if (distance < closestDistance) {
            closestDistance = distance;
            closestIndex = index;
        }
    });

    const traveledCoordinates = coordinates
        .slice(0, closestIndex + 1)
        .map(function (coordinate) {
            return [Number(coordinate[1]), Number(coordinate[0])];
        });

    traveledCoordinates.push([latitude, longitude]);

    if (!traveledRouteLayer) {
        traveledRouteLayer = L.polyline(traveledCoordinates, {
            color: "#2563eb",
            weight: 8,
            opacity: 0.95,
            lineCap: "round",
            lineJoin: "round"
        }).addTo(map);
    } else {
        traveledRouteLayer.setLatLngs(traveledCoordinates);
    }
}

/* =========================================
   ROUTE CARDS
========================================= */

function createRoutes() {
    const container = document.getElementById("routes");

    if (!container) {
        return;
    }

    container.innerHTML = "";

    routes.forEach(function (route, index) {
        const risk = getRisk(route.safety.score);
        const distance = (route.distance / 1000).toFixed(1);
        const time = Math.round(route.duration / 60);

        const card = document.createElement("div");

        card.className =
            "route " +
            (index === selectedRoute ? "selected" : "");

        card.onclick = function () {
            selectRoute(index);
        };

        card.innerHTML = `
            <div class="route-header">
                <strong>${t("route")} ${index + 1}</strong>
                <span class="badge ${risk.className}">
                    ${risk.name}
                </span>
            </div>

            <div class="score">
                ${route.safety.score}
                <span style="font-size:12px">/100</span>
            </div>

            <div class="metrics">
                <span>📍 ${distance} km</span>
                <span>⏱ ${time} min</span>
            </div>

            <div class="risk-bar">
                <div
                    class="risk-fill"
                    style="
                        width:${route.safety.score}%;
                        background:${risk.color};
                    "
                ></div>
            </div>

            <small>
                ${getRouteReason(route.safety.factors)}
            </small>
        `;

        container.appendChild(card);
    });
}

/* =========================================
   ROUTE REASON
========================================= */

function getRouteReason(factors) {
    const reasons = [];

    if (factors.activity < 55) {
        reasons.push("low public activity");
    }

    if (factors.lighting < 55) {
        reasons.push("limited lighting");
    }

    if (factors.isolation < 55) {
        reasons.push("higher isolation");
    }

    if (factors.traffic < 55) {
        reasons.push("higher traffic exposure");
    }

    if (factors.accessibility < 60) {
        reasons.push("limited pedestrian/cyclist access");
    }

    if (!reasons.length) {
        return "Good lighting, public activity and accessibility indicators.";
    }

    return "Factors affecting score: " + reasons.join(", ") + ".";
}

/* =========================================
   SELECT ROUTE
========================================= */

function selectRoute(index) {
    if (!routes[index]) {
        return;
    }

    selectedRoute = index;

    drawRoutes();
    createRoutes();

    const route = routes[index];

    const risk = getRisk(route.safety.score);
    const factors = route.safety.factors;

    const labels = {
        accident: "Accident History",
        traffic: "Traffic Exposure",
        lighting: "Street Lighting",
        activity: "Public Activity",
        accessibility: "Pedestrian/Cyclist Access",
        isolation: "Route Openness",
        road: "Road Type & Condition"
    };

    let html = `
        <div style="margin-bottom:15px">
            <strong>${risk.name}</strong>
            <span
                style="
                    font-size:24px;
                    font-weight:bold;
                    margin-left:10px;
                "
            >
                ${route.safety.score}/100
            </span>
        </div>
    `;

    for (const key in factors) {
        const value =
            Math.max(0, Math.min(100, factors[key]));

        html += `
            <div class="factor">
                <span>${labels[key]}</span>

                <div class="factor-bar">
                    <div
                        class="factor-fill"
                        style="width:${value}%"
                    ></div>
                </div>

                <strong>${value}</strong>
            </div>
        `;
    }

    const details = document.getElementById("routeDetails");

    if (details) {
        details.innerHTML = html;
    }

    const alertBox =
        document.getElementById("femaleAlert");

    if (
        alertBox &&
        currentProfile === "female" &&
        (
            factors.activity < 55 ||
            factors.lighting < 55 ||
            factors.isolation < 55
        )
    ) {
        alertBox.classList.remove("hidden");

        alertBox.innerHTML = `
            <strong>⚠️ Safety Alert</strong>
            <br>
            This route has measurable indicators
            such as low public activity, limited
            lighting, or higher isolation.
            A more populated alternative route
            may be available.
        `;
    } else if (alertBox) {
        alertBox.classList.add("hidden");
    }

    /*
      Enable voice navigation for every valid route,
      including Route 1 (index 0).
    */
    const voiceButton =
        document.getElementById("voiceNavButton");

    if (voiceButton) {
        voiceButton.disabled = false;
        voiceButton.hidden = false;
    }

    const steps =
        prepareNavigationSteps(route);

    if (steps.length > 0) {
        updateVoiceStatus(
            "Route selected. You can start voice navigation."
        );
    } else {
        updateVoiceStatus(
            "Route selected, but turn-by-turn steps are unavailable."
        );
    }
}

/* =========================================
   SOS
========================================= */

async function emergencySOS() {
    const contactName = currentUser && currentUser.emergencyContactName;
    const contact = currentUser && currentUser.emergencyContactNumber;

    if (!contactName || !contact) {
        alert("Please add an emergency contact on the login page first.");
        return;
    }

    const confirmed =
        confirm("Send SOS alert to " + contactName + " (" + contact + ")?");

    if (!confirmed) {
        return;
    }

    try {
        const response = await fetch(
            API_BASE + "/api/sos",
            {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                credentials: "include",
                body: JSON.stringify({})
            }
        );

        const data = await response.json();

        if (data.success) {
            alert(
                "🚨 SOS SENT!\n\n" +
                "Emergency contact: " +
                contactName +
                "\n" +
                contact
            );
        } else {
            alert(
                "SOS could not be sent.\n\n" +
                (data.error || "Unknown error")
            );
        }
    } catch (error) {
        console.error("SOS Error:", error);

        alert(
            "Could not connect to the PulsePath server.\n\n" +
            "Make sure the backend is running."
        );
    }
}

/* =========================================
   VOICE NAVIGATION
========================================= */

let voiceNavigationActive = false;
let voiceWatchId = null;

let lastSpokenInstruction = "";
let lastSpokenTime = 0;

let currentNavigationStep = 0;
let navigationSteps = [];

/* =========================================
   SPEECH
========================================= */

function speak(text) {
    if (!("speechSynthesis" in window)) {
        alert(
            "Voice navigation is not supported by this browser."
        );
        return;
    }

    window.speechSynthesis.cancel();

    const speech =
        new SpeechSynthesisUtterance(text);

    speech.lang = getVoiceLanguage();
    speech.rate = 0.9;
    speech.pitch = 1;
    speech.volume = 1;

    speech.onstart = function () {
        console.log("🔊 Speaking:", text);
    };

    speech.onerror = function (event) {
        console.error(
            "Speech synthesis error:",
            event
        );
    };

    window.speechSynthesis.speak(speech);
}

/* =========================================
   VOICE LANGUAGE
========================================= */

function getVoiceLanguage() {
    const languages = {
        en: "en-IN",
        hi: "hi-IN",
        mr: "mr-IN",
        gu: "gu-IN",
        pa: "pa-IN",
        bn: "bn-IN",
        ta: "ta-IN",
        te: "te-IN",
        kn: "kn-IN",
        ml: "ml-IN"
    };

    return languages[currentLanguage] || "en-IN";
}

/* =========================================
   VOICE STATUS
========================================= */

function updateVoiceStatus(message) {
    const status =
        document.getElementById("voiceStatus");

    if (status) {
        status.textContent = message;
    }

    console.log("Voice status:", message);
}

/* =========================================
   PREPARE OSRM STEPS
========================================= */

function prepareNavigationSteps(route) {
    if (!route || !route.legs) {
        return [];
    }

    const steps = [];

    route.legs.forEach(function (leg) {
        if (!leg.steps) {
            return;
        }

        leg.steps.forEach(function (step) {
            steps.push(step);
        });
    });

    return steps;
}

/* =========================================
   SPOKEN TURN INSTRUCTION
========================================= */

function getStepInstruction(step) {
    if (!step || !step.maneuver) {
        return "Continue on the route.";
    }

    const maneuver = step.maneuver;

    const type = maneuver.type || "";
    const modifier = maneuver.modifier || "";
    const direction = modifier
        ? modifier.replace(/-/g, " ")
        : "";
    const phrase = function (english, localized) {
        const messages = {
            en: english,
            hi: localized.hi || english,
            mr: localized.mr || english,
            gu: localized.gu || english,
            pa: localized.pa || english,
            bn: localized.bn || english,
            ta: localized.ta || english,
            te: localized.te || english,
            kn: localized.kn || english,
            ml: localized.ml || english
        };

        return messages[currentLanguage] || english;
    };

    if (type === "arrive") {
        return phrase("You have arrived at your destination.", {
            hi: "आप अपने गंतव्य पर पहुंच गए हैं।",
            mr: "तुम्ही तुमच्या गंतव्यस्थानी पोहोचला आहात।"
        });
    }

    if (type === "depart") {
        return phrase("Start your route and continue ahead.", {
            hi: "अपना मार्ग शुरू करें और आगे बढ़ते रहें।",
            mr: "तुमचा मार्ग सुरू करा आणि पुढे जा।"
        });
    }

    if (
        type === "roundabout" ||
        type === "rotary"
    ) {
        if (maneuver.exit) {
            return phrase(
                "At the roundabout, take exit " + maneuver.exit + ".",
                {
                    hi: "गोलचक्कर पर निकास " + maneuver.exit + " लें।",
                    mr: "गोलाकार चौकात बाहेर पडण्याचा मार्ग " +
                        maneuver.exit + " घ्या।"
                }
            );
        }

        return phrase("Enter the roundabout and follow the route.", {
            hi: "गोलचक्कर में प्रवेश करें और मार्ग का अनुसरण करें।",
            mr: "गोलाकार चौकात प्रवेश करा आणि मार्गाचा पाठलाग करा।"
        });
    }

    if (type === "merge") {
        if (modifier) {
            return phrase("Merge " + direction + ".", {
                hi: "दाईं ओर मिलें।",
                mr: "उजवीकडे विलीन व्हा।"
            });
        }

        return phrase("Merge onto the road.", {
            hi: "सड़क पर मिलें।",
            mr: "रस्त्यावर विलीन व्हा।"
        });
    }

    if (type === "fork") {
        if (modifier) {
            return phrase("Keep " + direction + " at the fork.", {
                hi: "रास्ते के विभाजन पर " + direction + " रहें।",
                mr: "रस्त्याच्या फाट्यावर " + direction + " बाजूला रहा।"
            });
        }

        return phrase("Keep following the route at the fork.", {
            hi: "रास्ते के विभाजन पर मार्ग का अनुसरण करते रहें।",
            mr: "रस्त्याच्या फाट्यावर मार्गाचा पाठलाग करा।"
        });
    }

    if (
        type === "on ramp" ||
        type === "off ramp"
    ) {
        if (modifier) {
            return phrase("Take the " + direction + " ramp.", {
                hi: direction + " रैंप लें।",
                mr: direction + " रॅम्प घ्या।"
            });
        }

        return phrase("Take the ramp.", {
            hi: "रैंप लें।",
            mr: "रॅम्प घ्या।"
        });
    }

    if (type === "continue") {
        if (modifier) {
            return phrase("Continue " + direction + ".", {
                hi: "आगे " + direction + " बढ़ें।",
                mr: "पुढे " + direction + " जा।"
            });
        }

        return phrase("Continue straight.", {
            hi: "सीधे आगे बढ़ें।",
            mr: "सरळ पुढे जा।"
        });
    }

    if (
        type === "turn" ||
        type === "end of road"
    ) {
        if (modifier) {
            return phrase("Turn " + direction + ".", {
                hi: direction + " मुड़ें।",
                mr: direction + " वळा।"
            });
        }

        return phrase("Continue on the route.", {
            hi: "मार्ग पर आगे बढ़ते रहें।",
            mr: "मार्गावर पुढे जात रहा।"
        });
    }

    return phrase("Continue on the route.", {
        hi: "मार्ग पर आगे बढ़ते रहें।",
        mr: "मार्गावर पुढे जात रहा।"
    });
}

/* =========================================
   DISTANCE BETWEEN GPS POINTS
========================================= */

function distanceBetweenPoints(
    lat1,
    lon1,
    lat2,
    lon2
) {
    const earthRadius = 6371000;

    const lat1Rad =
        lat1 * Math.PI / 180;

    const lat2Rad =
        lat2 * Math.PI / 180;

    const deltaLat =
        (lat2 - lat1) * Math.PI / 180;

    const deltaLon =
        (lon2 - lon1) * Math.PI / 180;

    const a =
        Math.sin(deltaLat / 2) *
        Math.sin(deltaLat / 2) +

        Math.cos(lat1Rad) *
        Math.cos(lat2Rad) *

        Math.sin(deltaLon / 2) *
        Math.sin(deltaLon / 2);

    const c =
        2 *
        Math.atan2(
            Math.sqrt(a),
            Math.sqrt(1 - a)
        );

    return earthRadius * c;
}

/* =========================================
   STEP LOCATION
========================================= */

function getStepLocation(step) {
    if (
        !step ||
        !step.maneuver ||
        !step.maneuver.location
    ) {
        return null;
    }

    return {
        lon: Number(step.maneuver.location[0]),
        lat: Number(step.maneuver.location[1])
    };
}

/* =========================================
   SPEAK ONCE WITH COOLDOWN
========================================= */

function speakOnce(text, cooldown) {
    const now = Date.now();

    if (
        text === lastSpokenInstruction &&
        now - lastSpokenTime < cooldown
    ) {
        return;
    }

    lastSpokenInstruction = text;
    lastSpokenTime = now;

    speak(text);
}

/* =========================================
   PROCESS GPS POSITION
========================================= */

function processNavigationPosition(
    latitude,
    longitude
) {
    if (!voiceNavigationActive) {
        return;
    }

    if (!navigationSteps.length) {
        updateVoiceStatus(
            "Turn-by-turn instructions are unavailable."
        );
        return;
    }

    if (
        currentNavigationStep >=
        navigationSteps.length
    ) {
        updateVoiceStatus(
            "You have reached the end of the route."
        );
        return;
    }

    const step =
        navigationSteps[currentNavigationStep];

    const location =
        getStepLocation(step);

    if (!location) {
        currentNavigationStep++;
        return;
    }

    const distance =
        distanceBetweenPoints(
            latitude,
            longitude,
            location.lat,
            location.lon
        );

    const instruction =
        getStepInstruction(step);

    updateVoiceStatus("Navigation active. GPS guidance is running.");

    /*
      Speak roughly 120 m before the maneuver.
    */
    if (
        distance <= 120 &&
        distance > 30
    ) {
        speakOnce(
            instruction +
            " In about " +
            Math.round(distance) +
            " meters.",
            15000
        );

        return;
    }

    /*
      Speak again when close.
    */
    if (
        distance <= 30 &&
        distance > 8
    ) {
        speakOnce(
            instruction,
            10000
        );

        return;
    }

    /*
      We reached the maneuver.
    */
    if (distance <= 12) {

        if (
            step.maneuver &&
            step.maneuver.type === "arrive"
        ) {
            speakOnce(
                "You have arrived at your destination.",
                60000
            );

            updateVoiceStatus(
                "✅ You have arrived at your destination."
            );

            stopVoiceNavigation(false);

            return;
        }

        currentNavigationStep++;

        lastSpokenInstruction = "";
        lastSpokenTime = 0;

        if (
            currentNavigationStep <
            navigationSteps.length
        ) {
            const nextStep =
                navigationSteps[
                currentNavigationStep
                ];

            const nextInstruction =
                getStepInstruction(nextStep);

            speakOnce(
                nextInstruction,
                8000
            );
        }
    }
}

/* =========================================
   START VOICE NAVIGATION
========================================= */

function startVoiceNavigation() {

    if (!("geolocation" in navigator)) {
        alert(
            "Your device does not support GPS location."
        );
        return;
    }

    if (!("speechSynthesis" in window)) {
        alert(
            "Your browser does not support speech synthesis."
        );
        return;
    }

    const route = routes[selectedRoute];

    if (!route) {
        alert(
            "Please select a route first."
        );
        return;
    }

    /*
      Read the turn-by-turn steps that were
      returned by OSRM using steps=true.
    */
    navigationSteps =
        prepareNavigationSteps(route);

    console.log(
        "Selected route:",
        selectedRoute
    );

    console.log(
        "Navigation steps:",
        navigationSteps
    );

    if (!navigationSteps.length) {
        alert(
            "Turn-by-turn instructions are not available for this route.\n\n" +
            "Please click Find Safer Routes again after saving the new script.js."
        );
        return;
    }

    voiceNavigationActive = true;

    currentNavigationStep = 0;

    lastSpokenInstruction = "";
    lastSpokenTime = 0;

    const startButton =
        document.getElementById(
            "voiceNavButton"
        );

    const stopButton =
        document.getElementById(
            "stopVoiceButton"
        );

    if (startButton) {
        startButton.disabled = true;
        startButton.hidden = true;
    }

    if (stopButton) {
        stopButton.disabled = false;
        stopButton.hidden = false;
    }

    updateVoiceStatus(
        "Navigation started. GPS guidance is active."
    );

    /*
      Start with a clear spoken message.
    */
    speak(
        "Navigation started. Follow the voice instructions."
    );

    /*
      Start continuous GPS tracking.
    */
    voiceWatchId =
        navigator.geolocation.watchPosition(
            handleNavigationPosition,
            handleNavigationError,
            {
                enableHighAccuracy: true,
                maximumAge: 5000,
                timeout: 60000
            }
        );
}

/* =========================================
   STOP VOICE NAVIGATION
========================================= */

function stopVoiceNavigation(showStatus = true) {

    voiceNavigationActive = false;

    if (voiceWatchId !== null) {
        navigator.geolocation.clearWatch(
            voiceWatchId
        );

        voiceWatchId = null;
    }

    if ("speechSynthesis" in window) {
        window.speechSynthesis.cancel();
    }

    const startButton =
        document.getElementById(
            "voiceNavButton"
        );

    const stopButton =
        document.getElementById(
            "stopVoiceButton"
        );

    if (startButton) {
        startButton.disabled = routes.length === 0;
        startButton.hidden = routes.length === 0;
    }

    if (stopButton) {
        stopButton.disabled = true;
        stopButton.hidden = true;
    }

    if (showStatus) {
        updateVoiceStatus(
            "Voice navigation stopped."
        );
    }
}

/* =========================================
   GPS POSITION
========================================= */

function handleNavigationPosition(position) {

    if (!voiceNavigationActive) {
        return;
    }

    const latitude =
        position.coords.latitude;

    const longitude =
        position.coords.longitude;

    const accuracy =
        position.coords.accuracy;

    console.log(
        "GPS:",
        latitude,
        longitude,
        "accuracy:",
        accuracy
    );

    if (!currentLocationMarker) {
        currentLocationMarker = L.circleMarker(
            [latitude, longitude],
            {
                radius: 8,
                color: "#2563eb",
                fillColor: "#60a5fa",
                fillOpacity: 1,
                weight: 3
            }
        ).addTo(map);
    } else {
        currentLocationMarker.setLatLng([latitude, longitude]);
    }

    updateTraveledRoute(latitude, longitude);

    map.setView([latitude, longitude], Math.max(map.getZoom(), 15), {
        animate: true
    });

    updateVoiceStatus(
        "📍 GPS active. Accuracy: " +
        Math.round(accuracy) +
        " m"
    );

    processNavigationPosition(
        latitude,
        longitude
    );
}

/* =========================================
   GPS ERROR
========================================= */

function handleNavigationError(error) {

    console.error(
        "Navigation GPS error:",
        error
    );

    let message =
        "Unable to access your location.";

    if (error.code === 1) {
        message =
            "Location permission is required for voice navigation.";
    }

    else if (error.code === 2) {
        message =
            "Your location could not be determined.";
    }

    else if (error.code === 3) {
        message =
            "Waiting for GPS. Move outdoors or enable location services.";
    }

    updateVoiceStatus(message);

    /*
      Do not repeatedly speak the same GPS error.
    */
    speakOnce(
        message,
        15000
    );
}

/* =========================================
   INITIALIZE SAVED LANGUAGE
========================================= */

const savedLanguage =
    localStorage.getItem("pulsePathLanguage") || "en";

if (languageSelect) {
    languageSelect.value = savedLanguage;
}

changeLanguage(savedLanguage);

/* =========================================
   LOGIN / ONBOARDING
========================================= */

function showPlanner() {
    const loginScreen = document.getElementById("loginScreen");
    const appContent = document.getElementById("appContent");

    if (loginScreen) {
        loginScreen.hidden = true;
        loginScreen.setAttribute("aria-hidden", "true");
    }

    if (appContent) {
        appContent.hidden = false;
    }

    requestAnimationFrame(function () {
        if (map) {
            map.invalidateSize();
        }
    });
}

function initializeLogin() {
    const loginForm = document.getElementById("loginForm");
    const loginLanguage = document.getElementById("userLanguage");
    const authModeToggle = document.getElementById("authModeToggle");
    const loginTitle = document.getElementById("loginTitle");
    const loginSubmit = loginForm && loginForm.querySelector(".login-submit");
    const passwordInput = document.getElementById("userPassword");
    const profileFields = [
        document.getElementById("userName"),
        document.getElementById("emergencyContactName"),
        document.getElementById("emergencyContactNumber"),
        loginLanguage
    ];
    let authMode = "register";

    if (loginLanguage && translations[savedLanguage]) {
        loginLanguage.value = savedLanguage;
    }

    if (!loginForm) {
        throw new Error("Login form is missing from the page.");
    }

    function updateAuthMode() {
        const isRegistering = authMode === "register";

        if (loginTitle) {
            loginTitle.textContent = isRegistering ?
                "Create your account" :
                "Welcome back";
        }

        if (loginSubmit) {
            loginSubmit.innerHTML = isRegistering ?
                "Create account <span aria-hidden=\"true\">→</span>" :
                "Sign in <span aria-hidden=\"true\">→</span>";
        }

        if (authModeToggle) {
            authModeToggle.textContent = isRegistering ?
                "Already have an account? Sign in" :
                "Need an account? Create one";
        }

        profileFields.forEach(function (field) {
            if (!field) {
                return;
            }

            const fieldContainer = field.closest(".form-field");
            field.required = isRegistering;

            if (fieldContainer) {
                fieldContainer.hidden = !isRegistering;
            }
        });

        if (passwordInput) {
            passwordInput.autocomplete = isRegistering ?
                "new-password" :
                "current-password";
        }
    }

    if (authModeToggle) {
        authModeToggle.addEventListener("click", function () {
            authMode = authMode === "register" ? "login" : "register";
            const error = document.getElementById("loginError");

            if (error) {
                error.hidden = true;
                error.textContent = "";
            }

            updateAuthMode();
        });
    }

    updateAuthMode();

    loginForm.addEventListener("submit", async function (event) {
        event.preventDefault();

        if (!loginForm.reportValidity()) {
            return;
        }

        const formData = new FormData(loginForm);
        const isRegistering = authMode === "register";
        const payload = {
            email: String(formData.get("email") || "").trim(),
            password: String(formData.get("password") || "")
        };

        if (isRegistering) {
            payload.name = String(formData.get("name") || "").trim();
            payload.emergencyContactName = String(
                formData.get("emergencyContactName") || ""
            ).trim();
            payload.emergencyContactNumber = String(
                formData.get("emergencyContactNumber") || ""
            ).trim();
            payload.language = String(formData.get("language") || "en");
        }

        const error = document.getElementById("loginError");

        try {
            if (loginSubmit) {
                loginSubmit.disabled = true;
            }

            const response = await fetch(
                API_BASE + (isRegistering ? "/api/auth/register" : "/api/auth/login"),
                {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json"
                    },
                    credentials: "include",
                    body: JSON.stringify(payload)
                }
            );

            const data = await response.json();

            if (!response.ok || !data.success) {
                throw new Error(data.error || "Authentication failed.");
            }

            currentUser = data.user;
            changeLanguage(currentUser.language);
            showPlanner();
        } catch (requestError) {
            if (error) {
                error.hidden = false;
                error.textContent = requestError.message;
            }
        } finally {
            if (loginSubmit) {
                loginSubmit.disabled = false;
            }
        }
    });
}

async function restoreSession() {
    try {
        const response = await fetch(API_BASE + "/api/auth/me", {
            credentials: "include"
        });

        if (!response.ok) {
            return;
        }

        const data = await response.json();
        currentUser = data.user;
        changeLanguage(currentUser.language);
        showPlanner();
    } catch (error) {
        console.warn("No active PulsePath session.");
    }
}

async function logout() {
    try {
        await fetch(API_BASE + "/api/auth/logout", {
            method: "POST",
            credentials: "include"
        });
    } finally {
        currentUser = null;
        document.getElementById("appContent").hidden = true;
        document.getElementById("loginScreen").hidden = false;
    }
}

function initializeTheme() {
    const themeToggle = document.getElementById("themeToggle");
    const savedTheme = localStorage.getItem("pulsePathTheme") || "light";

    document.body.classList.toggle("dark-mode", savedTheme === "dark");

    if (!themeToggle) {
        return;
    }

    function updateThemeLabel() {
        const isDark = document.body.classList.contains("dark-mode");
        themeToggle.textContent = isDark ? "☀️ Light mode" : "🌙 Dark mode";
        themeToggle.setAttribute(
            "aria-label",
            isDark ? "Switch to light mode" : "Switch to dark mode"
        );
    }

    updateThemeLabel();

    themeToggle.addEventListener("click", function () {
        const isDark = document.body.classList.toggle("dark-mode");
        localStorage.setItem("pulsePathTheme", isDark ? "dark" : "light");
        updateThemeLabel();
    });
}

/* =========================================
   INITIAL VOICE BUTTON STATE
========================================= */

document.addEventListener("DOMContentLoaded", function () {

    if ("serviceWorker" in navigator) {
        navigator.serviceWorker.register("service-worker.js").catch(function (error) {
            console.warn("PlusePath offline support is unavailable:", error);
        });
    }

    initializeLogin();
    initializeTheme();
    initializeSidebarToggle();

    const logoutButton = document.getElementById("logoutButton");

    if (logoutButton) {
        logoutButton.addEventListener("click", logout);
    }

    const voiceButton =
        document.getElementById(
            "voiceNavButton"
        );

    const stopButton =
        document.getElementById(
            "stopVoiceButton"
        );

    if (voiceButton) {
        voiceButton.addEventListener("click", startVoiceNavigation);
    }

    if (stopButton) {
        stopButton.addEventListener("click", stopVoiceNavigation);
    }

    if (voiceButton) {
        voiceButton.disabled =
            routes.length === 0;
    }

    if (stopButton) {
        stopButton.disabled = true;
    }

    updateVoiceStatus(
        "Select a route to start voice navigation."
    );

    restoreSession();
});