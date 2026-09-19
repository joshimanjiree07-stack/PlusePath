/* =========================================
   GLOBAL VARIABLES
========================================= */

let map;

let routeLayers = [];

let routes = [];

let selectedRoute = 0;

let currentProfile = "general";


/* =========================================
   INITIALIZE MAP
========================================= */

map = L.map("map").setView(
    [26.9124, 75.7873],
    13
);

L.tileLayer(
    "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
    {
        attribution:
            "© OpenStreetMap contributors"
    }
).addTo(map);


/* =========================================
   LANGUAGE
========================================= */

const translations = {

    en: {

        plan: "Plan Your Route",

        subtitle:
            "Compare safety, time and distance before you choose.",

        start:
            "Starting Location",

        destination:
            "Destination",

        find:
            "Find Safer Routes"

    },

    hi: {

        plan:
            "अपना मार्ग चुनें",

        subtitle:
            "चुनने से पहले सुरक्षा, समय और दूरी की तुलना करें।",

        start:
            "शुरुआती स्थान",

        destination:
            "गंतव्य",

        find:
            "सुरक्षित मार्ग खोजें"

    }

};


document
    .getElementById("language")
    .addEventListener("change", function () {

        const lang = this.value;

        document.getElementById(
            "planTitle"
        ).innerText = translations[lang].plan;

        document.getElementById(
            "subtitle"
        ).innerText = translations[lang].subtitle;

        document.getElementById(
            "startLabel"
        ).innerText = translations[lang].start;

        document.getElementById(
            "destinationLabel"
        ).innerText = translations[lang].destination;

        document.getElementById(
            "findButton"
        ).innerText = translations[lang].find;

    });


/* =========================================
   CURRENT LOCATION
========================================= */

function useCurrentLocation() {

    if (!navigator.geolocation) {

        alert(
            "Geolocation is not supported by your browser."
        );

        return;
    }

    navigator.geolocation.getCurrentPosition(

        function (position) {

            const lat =
                position.coords.latitude;

            const lon =
                position.coords.longitude;

            document.getElementById(
                "start"
            ).value =
                lat.toFixed(5) +
                ", " +
                lon.toFixed(5);

            map.setView(
                [lat, lon],
                15
            );

        },

        function () {

            alert(
                "Location permission was not granted."
            );

        }

    );

}


/* =========================================
   PROFILE
========================================= */

function selectProfile(button) {

    document
        .querySelectorAll(".profile")
        .forEach(function (btn) {

            btn.classList.remove("active");

        });

    button.classList.add("active");

    currentProfile =
        button.dataset.profile;

    if (routes.length > 0) {

        createRoutes();

        selectRoute(selectedRoute);

    }

}


/* =========================================
   GEOCODING
========================================= */

async function geocode(location) {

    /*
      Allows input like:
  
      26.9124,75.7873
    */

    const coordinateRegex =
        /^\s*-?\d+(\.\d+)?\s*,\s*-?\d+(\.\d+)?\s*$/;

    if (coordinateRegex.test(location)) {

        const values =
            location.split(",");

        return {

            lat:
                Number(values[0]),

            lon:
                Number(values[1])

        };

    }


    const url =
        "https://nominatim.openstreetmap.org/search?" +
        "format=json&limit=1&q=" +
        encodeURIComponent(location);


    const response =
        await fetch(url, {

            headers: {
                "Accept-Language": "en"
            }

        });


    const data =
        await response.json();


    if (!data.length) {

        throw new Error(
            "Location not found: " +
            location
        );

    }


    return {

        lat:
            Number(data[0].lat),

        lon:
            Number(data[0].lon)

    };

}


/* =========================================
   FIND ROUTES
========================================= */

async function findRoutes() {

    const start =
        document.getElementById(
            "start"
        ).value.trim();

    const destination =
        document.getElementById(
            "destination"
        ).value.trim();


    if (!start || !destination) {

        alert(
            "Please enter both starting location and destination."
        );

        return;

    }


    const button =
        document.getElementById(
            "findButton"
        );

    button.disabled = true;

    button.innerText =
        "Finding routes...";


    try {

        const startPoint =
            await geocode(start);

        const endPoint =
            await geocode(destination);


        /*
          OSRM routing API
        */

        const url =
            "https://router.project-osrm.org/route/v1/driving/" +

            startPoint.lon +
            "," +
            startPoint.lat +

            ";" +

            endPoint.lon +
            "," +
            endPoint.lat +

            "?alternatives=true" +
            "&overview=full" +
            "&geometries=geojson";


        const response =
            await fetch(url);


        const data =
            await response.json();


        if (data.code !== "Ok") {

            throw new Error(
                "No route found."
            );

        }


        routes =
            data.routes
                .slice(0, 3)
                .map(function (route, index) {

                    return {

                        ...route,

                        safety:
                            calculateSafetyScore(
                                index
                            )

                    };

                });


        drawRoutes();

        createRoutes();

        selectRoute(0);


    } catch (error) {

        alert(
            error.message +
            "\n\nTry using well-known locations or coordinates."
        );

    }


    button.disabled = false;

    button.innerText =
        "Find Safer Routes";

}


/* =========================================
   SAFETY SCORE
========================================= */

function calculateSafetyScore(routeIndex) {

    /*
      DEMO DATA
  
      Each value represents a safety
      indicator from 0 - 100.
  
      Higher = safer.
  
      Production application should
      obtain these values from real
      verified datasets.
    */

    const demoData = [

        {

            accident: 88,

            traffic: 82,

            lighting: 86,

            activity: 91,

            accessibility: 92,

            isolation: 88,

            road: 85

        },

        {

            accident: 68,

            traffic: 60,

            lighting: 64,

            activity: 63,

            accessibility: 78,

            isolation: 60,

            road: 72

        },

        {

            accident: 38,

            traffic: 44,

            lighting: 39,

            activity: 35,

            accessibility: 58,

            isolation: 32,

            road: 55

        }

    ];


    let factor =
    {
        ...demoData[
        routeIndex
        ]
    };


    /*
      Profile adjustments.
  
      Important:
  
      We do NOT mark a route unsafe
      simply because the user is female.
  
      We adjust the presentation around
      measurable indicators such as
      lighting, activity and isolation.
    */

    if (
        currentProfile === "female"
    ) {

        factor.lighting -= 4;

        factor.activity -= 3;

        factor.isolation -= 5;

    }


    if (
        currentProfile === "cyclist"
    ) {

        factor.accessibility += 7;

        factor.road += 5;

        factor.traffic -= 2;

    }


    /*
      Safety weighting
    */

    const weights = {

        accident: 0.20,

        traffic: 0.15,

        lighting: 0.15,

        activity: 0.15,

        accessibility: 0.15,

        isolation: 0.10,

        road: 0.10

    };


    let score = 0;


    for (
        const key in weights
    ) {

        score +=
            factor[key] *
            weights[key];

    }


    score =
        Math.round(score);


    /*
      Keep score between 0 and 100
    */

    score =
        Math.max(
            0,
            Math.min(
                100,
                score
            )
        );


    return {

        score,
        factors: factor

    };

}


/* =========================================
   RISK LEVEL
========================================= */

function getRisk(score) {

    if (score >= 75) {

        return {

            name:
                "Low Risk / Safer Route",

            className:
                "green",

            color:
                "#16a34a"

        };

    }


    if (score >= 55) {

        return {

            name:
                "Moderate Risk",

            className:
                "orange",

            color:
                "#f59e0b"

        };

    }


    return {

        name:
            "High Risk",

        className:
            "red",

        color:
            "#dc2626"

    };

}


/* =========================================
   DRAW ROUTES ON MAP
========================================= */

function drawRoutes() {

    routeLayers.forEach(
        function (layer) {

            map.removeLayer(layer);

        }
    );


    routeLayers = [];


    routes.forEach(
        function (route, index) {

            const risk =
                getRisk(
                    route.safety.score
                );


            const layer =
                L.geoJSON(
                    route.geometry,
                    {

                        style: {

                            color:
                                risk.color,

                            weight:
                                index === selectedRoute
                                    ? 8
                                    : 5,

                            opacity:
                                index === selectedRoute
                                    ? 1
                                    : 0.55

                        }

                    }
                );


            layer.on(
                "click",
                function () {

                    selectRoute(index);

                }
            );


            layer.addTo(map);

            routeLayers.push(layer);

        }
    );


    if (routes.length) {

        const bounds =
            L.geoJSON(
                routes[0].geometry
            ).getBounds();

        map.fitBounds(
            bounds,
            {
                padding:
                    [30, 30]
            }
        );

    }

}


/* =========================================
   ROUTE CARDS
========================================= */

function createRoutes() {

    const container =
        document.getElementById(
            "routes"
        );


    container.innerHTML = "";


    routes.forEach(
        function (route, index) {

            const risk =
                getRisk(
                    route.safety.score
                );


            const distance =
                (
                    route.distance /
                    1000
                ).toFixed(1);


            const time =
                Math.round(
                    route.duration /
                    60
                );


            const card =
                document.createElement(
                    "div"
                );


            card.className =
                "route " +
                (
                    index === selectedRoute
                        ? "selected"
                        : ""
                );


            card.onclick =
                function () {

                    selectRoute(index);

                };


            card.innerHTML = `

        <div class="route-header">

          <strong>
            Route ${index + 1}
          </strong>

          <span class="badge ${risk.className}">
            ${risk.name}
          </span>

        </div>


        <div class="score">
          ${route.safety.score}
          <span style="font-size:12px">
            /100
          </span>
        </div>


        <div class="metrics">

          <span>
            📍 ${distance} km
          </span>

          <span>
            ⏱ ${time} min
          </span>

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


            container.appendChild(
                card
            );

        }
    );

}


/* =========================================
   ROUTE REASON
========================================= */

function getRouteReason(factors) {

    const reasons = [];


    if (
        factors.activity < 55
    ) {

        reasons.push(
            "low public activity"
        );

    }


    if (
        factors.lighting < 55
    ) {

        reasons.push(
            "limited lighting"
        );

    }


    if (
        factors.isolation < 55
    ) {

        reasons.push(
            "higher isolation"
        );

    }


    if (
        factors.traffic < 55
    ) {

        reasons.push(
            "higher traffic exposure"
        );

    }


    if (
        factors.accessibility < 60
    ) {

        reasons.push(
            "limited pedestrian/cyclist access"
        );

    }


    if (!reasons.length) {

        return `
      Good lighting, public activity
      and accessibility indicators.
    `;

    }


    return `
    Factors affecting score:
    ${reasons.join(", ")}.
  `;

}


/* =========================================
   SELECT ROUTE
========================================= */

function selectRoute(index) {

    selectedRoute =
        index;


    drawRoutes();

    createRoutes();


    const route =
        routes[index];


    const risk =
        getRisk(
            route.safety.score
        );


    const factors =
        route.safety.factors;


    const labels = {

        accident:
            "Accident History",

        traffic:
            "Traffic Exposure",

        lighting:
            "Street Lighting",

        activity:
            "Public Activity",

        accessibility:
            "Pedestrian/Cyclist Access",

        isolation:
            "Route Openness",

        road:
            "Road Type & Condition"

    };


    let html = `

    <div style="margin-bottom:15px">

      <strong>
        ${risk.name}
      </strong>

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


    for (
        const key in factors
    ) {

        const value =
            Math.max(
                0,
                Math.min(
                    100,
                    factors[key]
                )
            );


        html += `

      <div class="factor">

        <span>
          ${labels[key]}
        </span>

        <div class="factor-bar">

          <div
            class="factor-fill"
            style="width:${value}%"
          ></div>

        </div>

        <strong>
          ${value}
        </strong>

      </div>

    `;

    }


    document.getElementById(
        "routeDetails"
    ).innerHTML = html;


    /*
      FEMALE SAFETY ALERT
    */

    const alert =
        document.getElementById(
            "femaleAlert"
        );


    if (
        currentProfile === "female" &&
        (
            factors.activity < 55 ||
            factors.lighting < 55 ||
            factors.isolation < 55
        )
    ) {

        alert.classList.remove(
            "hidden"
        );


        alert.innerHTML = `

      <strong>
        ⚠️ Safety Alert
      </strong>

      <br>

      This route has measurable indicators
      such as low public activity, limited
      lighting, or higher isolation.

      A more populated alternative route
      may be available.

    `;

    } else {

        alert.classList.add(
            "hidden"
        );

    }

}


/* =========================================
   SOS
========================================= */

function emergencySOS() {

    const contact =
        prompt(
            "Enter your emergency contact number:"
        );


    if (!contact) {

        return;

    }


    alert(

        "SOS DEMO\n\n" +

        "Emergency contact: " +
        contact +
        "\n\n" +

        "In the production version, " +
        "this button can call the emergency " +
        "number and share the user's live " +
        "location after permission is granted."

    );

}