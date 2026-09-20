const express = require("express");
const cors = require("cors");
const crypto = require("crypto");
const path = require("path");
const Database = require("better-sqlite3");
require("dotenv").config();

const twilio = require("twilio");

const twilioClient = twilio(
    process.env.TWILIO_ACCOUNT_SID,
    process.env.TWILIO_AUTH_TOKEN
);

const app = express();
const PORT = process.env.PORT || 5000;
const SESSION_DURATION_MS = 7 * 24 * 60 * 60 * 1000;
const database = new Database(
    process.env.DB_PATH || path.join(__dirname, "pulsepath.db")
);

database.pragma("journal_mode = WAL");
database.exec(`
    CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        email TEXT NOT NULL UNIQUE COLLATE NOCASE,
        password_hash TEXT NOT NULL,
        emergency_contact_name TEXT NOT NULL,
        emergency_contact_number TEXT NOT NULL,
        language TEXT NOT NULL DEFAULT 'en',
        created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS sessions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        token_hash TEXT NOT NULL UNIQUE,
        expires_at INTEGER NOT NULL,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS safety_profiles (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        route_index INTEGER NOT NULL,
        profile TEXT NOT NULL,
        accident INTEGER NOT NULL,
        traffic INTEGER NOT NULL,
        lighting INTEGER NOT NULL,
        activity INTEGER NOT NULL,
        accessibility INTEGER NOT NULL,
        isolation INTEGER NOT NULL,
        road INTEGER NOT NULL,
        source TEXT NOT NULL DEFAULT 'prototype seed',
        updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(route_index, profile)
    );
`);

const safetySeed = [
    [0, "pedestrian", 88, 82, 86, 91, 92, 88, 85],
    [1, "pedestrian", 68, 60, 64, 63, 78, 60, 72],
    [2, "pedestrian", 38, 44, 39, 35, 58, 32, 55],
    [0, "cyclist", 85, 76, 88, 94, 100, 86, 97],
    [1, "cyclist", 67, 52, 70, 68, 91, 56, 84],
    [2, "cyclist", 36, 38, 45, 41, 72, 35, 68]
];

const insertSafetyProfile = database.prepare(`
    INSERT OR IGNORE INTO safety_profiles (
        route_index, profile, accident, traffic, lighting, activity,
        accessibility, isolation, road
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
`);

const seedSafetyProfiles = database.transaction(function () {
    safetySeed.forEach(function (record) {
        insertSafetyProfile.run(...record);
    });
});

seedSafetyProfiles();

app.use(cors({ origin: true, credentials: true }));
app.use(express.json());

function normalizeEmail(email) {
    return String(email || "").trim().toLowerCase();
}

function hashPassword(password) {
    const salt = crypto.randomBytes(16).toString("hex");
    const derivedKey = crypto.scryptSync(password, salt, 64).toString("hex");
    return `${salt}:${derivedKey}`;
}

function verifyPassword(password, storedHash) {
    const [salt, expectedKey] = String(storedHash).split(":");

    if (!salt || !expectedKey) {
        return false;
    }

    const actualKey = crypto.scryptSync(password, salt, 64).toString("hex");
    const expectedBuffer = Buffer.from(expectedKey, "hex");
    const actualBuffer = Buffer.from(actualKey, "hex");

    return expectedBuffer.length === actualBuffer.length &&
        crypto.timingSafeEqual(expectedBuffer, actualBuffer);
}

function hashSessionToken(token) {
    return crypto.createHash("sha256").update(token).digest("hex");
}

function getCookies(request) {
    return String(request.headers.cookie || "")
        .split(";")
        .map((part) => part.trim().split("="))
        .filter((part) => part.length === 2)
        .reduce((cookies, [name, value]) => {
            cookies[name] = decodeURIComponent(value);
            return cookies;
        }, {});
}

function setSessionCookie(response, token) {
    const secure = process.env.NODE_ENV === "production" ? "; Secure" : "";
    response.setHeader(
        "Set-Cookie",
        `pulsepath_session=${encodeURIComponent(token)}; HttpOnly; Path=/; SameSite=Lax; Max-Age=${SESSION_DURATION_MS / 1000}${secure}`
    );
}

function clearSessionCookie(response) {
    response.setHeader(
        "Set-Cookie",
        "pulsepath_session=; HttpOnly; Path=/; SameSite=Lax; Max-Age=0"
    );
}

function createSession(userId) {
    const token = crypto.randomBytes(32).toString("base64url");
    const expiresAt = Date.now() + SESSION_DURATION_MS;

    database.prepare(
        "INSERT INTO sessions (user_id, token_hash, expires_at) VALUES (?, ?, ?)"
    ).run(userId, hashSessionToken(token), expiresAt);

    return token;
}

function publicUser(user) {
    return {
        id: user.id,
        name: user.name,
        email: user.email,
        emergencyContactName: user.emergency_contact_name,
        emergencyContactNumber: user.emergency_contact_number,
        language: user.language
    };
}

function requireAuth(request, response, next) {
    const token = getCookies(request).pulsepath_session;

    if (!token) {
        return response.status(401).json({
            success: false,
            error: "Authentication is required."
        });
    }

    const session = database.prepare(`
        SELECT users.*
        FROM sessions
        JOIN users ON users.id = sessions.user_id
        WHERE sessions.token_hash = ? AND sessions.expires_at > ?
    `).get(hashSessionToken(token), Date.now());

    if (!session) {
        clearSessionCookie(response);
        return response.status(401).json({
            success: false,
            error: "Your session has expired."
        });
    }

    request.user = session;
    next();
}

function validateAccountFields(body) {
    const name = String(body.name || "").trim();
    const email = normalizeEmail(body.email);
    const password = String(body.password || "");
    const emergencyContactName = String(body.emergencyContactName || "").trim();
    const emergencyContactNumber = String(body.emergencyContactNumber || "").trim();
    const language = String(body.language || "en");

    if (!name || !email || !password || !emergencyContactName || !emergencyContactNumber) {
        return { error: "All account and emergency contact fields are required." };
    }

    if (!email.includes("@")) {
        return { error: "Please enter a valid email address." };
    }

    if (password.length < 8) {
        return { error: "Password must be at least 8 characters long." };
    }

    return {
        name,
        email,
        password,
        emergencyContactName,
        emergencyContactNumber,
        language
    };
}

function authenticate(response, user) {
    const token = createSession(user.id);
    setSessionCookie(response, token);
    return response.json({ success: true, user: publicUser(user) });
}

app.post("/api/auth/register", (request, response) => {
    const fields = validateAccountFields(request.body);

    if (fields.error) {
        return response.status(400).json({ success: false, error: fields.error });
    }

    try {
        const result = database.prepare(`
            INSERT INTO users (
                name, email, password_hash, emergency_contact_name,
                emergency_contact_number, language
            ) VALUES (?, ?, ?, ?, ?, ?)
        `).run(
            fields.name,
            fields.email,
            hashPassword(fields.password),
            fields.emergencyContactName,
            fields.emergencyContactNumber,
            fields.language
        );

        const user = database.prepare("SELECT * FROM users WHERE id = ?").get(result.lastInsertRowid);
        return authenticate(response, user);
    } catch (error) {
        if (error.code === "SQLITE_CONSTRAINT_UNIQUE") {
            return response.status(409).json({
                success: false,
                error: "An account with that email already exists."
            });
        }

        console.error("Registration error:", error);
        return response.status(500).json({ success: false, error: "Could not create account." });
    }
});

app.post("/api/auth/login", (request, response) => {
    const email = normalizeEmail(request.body.email);
    const password = String(request.body.password || "");
    const user = database.prepare("SELECT * FROM users WHERE email = ?").get(email);

    if (!user || !verifyPassword(password, user.password_hash)) {
        return response.status(401).json({
            success: false,
            error: "Email or password is incorrect."
        });
    }

    return authenticate(response, user);
});

app.get("/api/auth/me", requireAuth, (request, response) => {
    response.json({ success: true, user: publicUser(request.user) });
});

app.post("/api/auth/logout", (request, response) => {
    const token = getCookies(request).pulsepath_session;

    if (token) {
        database.prepare("DELETE FROM sessions WHERE token_hash = ?").run(hashSessionToken(token));
    }

    clearSessionCookie(response);
    response.json({ success: true });
});

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

function calculateProfileSafetyScore(factors, profile) {
    const weights = profile === "cyclist" ? {
        accident: 0.18,
        traffic: 0.18,
        lighting: 0.10,
        activity: 0.10,
        accessibility: 0.20,
        isolation: 0.09,
        road: 0.15
    } : {
        accident: 0.20,
        traffic: 0.15,
        lighting: 0.15,
        activity: 0.15,
        accessibility: 0.15,
        isolation: 0.10,
        road: 0.10
    };

    return Math.round(Object.keys(weights).reduce(function (total, key) {
        return total + factors[key] * weights[key];
    }, 0));
}

function getDatabaseSafetyFactors(routeIndex, profile) {
    const record = database.prepare(`
        SELECT accident, traffic, lighting, activity, accessibility, isolation, road
        FROM safety_profiles
        WHERE route_index = ? AND profile = ?
    `).get(routeIndex, profile);

    if (!record) {
        throw new Error("Safety profile is not available for this route.");
    }

    return record;
}

app.post("/api/route-safety", (req, res) => {
    try {
        const profile = req.body.profile === "cyclist" ? "cyclist" : "pedestrian";
        const requestedRoutes = Array.isArray(req.body.routes) ? req.body.routes : [];

        if (!requestedRoutes.length || requestedRoutes.length > 3) {
            return res.status(400).json({
                success: false,
                error: "One to three routes are required."
            });
        }

        const routes = requestedRoutes.map(function (route, index) {
            const factors = getDatabaseSafetyFactors(index, profile);
            const score = calculateProfileSafetyScore(factors, profile);

            return {
                routeIndex: index,
                score,
                factors,
                risk: getRisk(score)
            };
        });

        res.json({ success: true, profile, routes });
    } catch (error) {
        console.error("Route safety error:", error);
        res.status(500).json({
            success: false,
            error: "Could not load route safety data."
        });
    }
});

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
// ===============================
// SOS ALERT
// ===============================

app.post("/api/sos", requireAuth, async (req, res) => {
    try {
        const phoneNumber = req.user.emergency_contact_number;

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