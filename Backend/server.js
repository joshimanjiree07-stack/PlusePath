const express = require("express");
const cors = require("cors");
require("dotenv").config();

const twilio = require("twilio");

const twilioClient = twilio(
    process.env.TWILIO_ACCOUNT_SID,
    process.env.TWILIO_AUTH_TOKEN
);

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

// Home
app.get("/", (req, res) => {
    res.json({
        app: "PulsePath",
        status: "running",
        message: "PulsePath backend is working!"
    });
});

// Health check
app.get("/api/health", (req, res) => {
    res.json({
        success: true,
        message: "PulsePath API is healthy"
    });
});

// Calculate safety score
function calculateSafetyScore(factors) {
    return Math.round(
        factors.accidentHistory * 0.25 +
        factors.trafficDensity * 0.20 +
        factors.lighting * 0.15 +
        factors.publicActivity * 0.15 +
        factors.infrastructure * 0.15 +
        factors.isolation * 0.10
    );
}

// Risk level
function getRisk(score) {
    if (score >= 75) {
        return {
            level: "LOW",
            label: "Low Risk",
            color: "green"
        };
    }

    if (score >= 50) {
        return {
            level: "MODERATE",
            label: "Moderate Risk",
            color: "orange"
        };
    }

    return {
        level: "HIGH",
        label: "High Risk",
        color: "red"
    };
}

// Demo safety data
function getSafetyFactors(routeIndex) {
    const data = [
        {
            accidentHistory: 92,
            trafficDensity: 85,
            lighting: 90,
            publicActivity: 88,
            infrastructure: 94,
            isolation: 87
        },
        {
            accidentHistory: 70,
            trafficDensity: 65,
            lighting: 62,
            publicActivity: 68,
            infrastructure: 72,
            isolation: 64
        },
        {
            accidentHistory: 45,
            trafficDensity: 42,
            lighting: 38,
            publicActivity: 40,
            infrastructure: 50,
            isolation: 35
        }
    ];

    return data[routeIndex];
}

// Generate explanation
function getExplanation(factors) {
    const reasons = [];

    if (factors.accidentHistory >= 75) {
        reasons.push("Low accident-risk indicator");
    } else if (factors.accidentHistory < 50) {
        reasons.push("Higher accident-risk indicator");
    }

    if (factors.trafficDensity >= 75) {
        reasons.push("Low traffic density");
    } else if (factors.trafficDensity < 50) {
        reasons.push("High traffic density");
    }

    if (factors.lighting >= 75) {
        reasons.push("Good street lighting");
    } else if (factors.lighting < 50) {
        reasons.push("Poor street lighting");
    }

    if (factors.publicActivity >= 75) {
        reasons.push("High public activity");
    } else if (factors.publicActivity < 50) {
        reasons.push("Low public activity");
    }

    if (factors.infrastructure >= 75) {
        reasons.push("Good pedestrian/cyclist infrastructure");
    } else if (factors.infrastructure < 50) {
        reasons.push("Limited pedestrian/cyclist infrastructure");
    }

    if (factors.isolation >= 75) {
        reasons.push("Well-populated route");
    } else if (factors.isolation < 50) {
        reasons.push("Relatively isolated sections");
    }

    return reasons;
}

// Safety alert
function getSafetyAlert(factors, profile) {
    const warnings = [];

    if (factors.lighting < 50) {
        warnings.push("poor lighting");
    }

    if (factors.publicActivity < 50) {
        warnings.push("low public activity");
    }

    if (factors.isolation < 50) {
        warnings.push("isolated sections");
    }

    if (warnings.length === 0) {
        return null;
    }

    return {
        show: true,
        message:
            `Safety Alert: This route has ${warnings.join(", ")}. ` +
            "A more populated alternative route may be available.",
        reasons: warnings
    };
}

// Distance using coordinates
function calculateDistance(start, destination) {
    const R = 6371;

    const lat1 = start.lat * Math.PI / 180;
    const lat2 = destination.lat * Math.PI / 180;

    const dLat =
        (destination.lat - start.lat) * Math.PI / 180;

    const dLon =
        (destination.lon - start.lon) * Math.PI / 180;

    const a =
        Math.sin(dLat / 2) ** 2 +
        Math.cos(lat1) *
        Math.cos(lat2) *
        Math.sin(dLon / 2) ** 2;

    const c =
        2 * Math.atan2(
            Math.sqrt(a),
            Math.sqrt(1 - a)
        );

    return R * c;
}

// Calculate travel time
function calculateTravelTime(distance, profile) {
    let speed;

    if (profile === "cycling") {
        speed = 15;
    } else {
        speed = 5;
    }

    return Math.max(
        1,
        Math.round((distance / speed) * 60)
    );
}

// Create multiple routes
function createRoutes(distance, profile) {
    const multipliers = [1.0, 1.12, 0.92];

    return multipliers.map((multiplier, index) => {
        const routeDistance =
            Number((distance * multiplier).toFixed(2));

        const factors = getSafetyFactors(index);

        const score =
            calculateSafetyScore(factors);

        const risk = getRisk(score);

        return {
            id: index + 1,

            name: `Route ${index + 1}`,

            distance: routeDistance,

            estimatedTime:
                calculateTravelTime(
                    routeDistance,
                    profile
                ),

            safetyScore: score,

            riskLevel: risk.level,

            riskLabel: risk.label,

            riskColor: risk.color,

            safetyFactors: factors,

            reasons: getExplanation(factors),

            safetyAlert:
                getSafetyAlert(
                    factors,
                    profile
                )
        };
    });
}

// Main route API
app.post("/api/routes", (req, res) => {
    try {
        const {
            start,
            destination,
            profile = "walking"
        } = req.body;

        if (
            !start ||
            !destination ||
            typeof start.lat !== "number" ||
            typeof start.lon !== "number" ||
            typeof destination.lat !== "number" ||
            typeof destination.lon !== "number"
        ) {
            return res.status(400).json({
                success: false,
                error:
                    "Valid start and destination coordinates are required."
            });
        }

        const distance =
            calculateDistance(
                start,
                destination
            );

        const routes =
            createRoutes(
                distance,
                profile
            );

        res.json({
            success: true,
            profile,
            start,
            destination,
            routes
        });

    } catch (error) {
        console.error(error);

        res.status(500).json({
            success: false,
            error: "Server error"
        });
    }
});
// Main route API
app.post("/api/routes", (req, res) => {
    // your existing code...
});


// ===============================
// SOS ALERT
// ===============================

app.post("/api/sos", async (req, res) => {
    try {
        const { phoneNumber } = req.body;

        if (!phoneNumber) {
            return res.status(400).json({
                success: false,
                error: "Emergency contact number is required"
            });
        }

        const message = await twilioClient.messages.create({
            to: phoneNumber,
            body: "sms_appointment_reminders"
        });

        console.log("SOS SMS sent:", message.sid);

        res.json({
            success: true,
            message: "SOS alert sent successfully"
        });

    } catch (error) {
        console.error("SOS SMS error:", error.message);

        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});
// Unknown endpoint
app.use((req, res) => {
    res.status(404).json({
        success: false,
        error: "Endpoint not found"
    });
});



// Start server
app.listen(PORT, () => {
    console.log("=================================");
    console.log("       PULSEPATH BACKEND");
    console.log("=================================");
    console.log(`Server: http://localhost:${PORT}`);
    console.log(
        `Health: http://localhost:${PORT}/api/health`
    );
    console.log("=================================");
});