const express = require("express");
const mysql = require("mysql2/promise"); // Use promise-based mysql2
const cors = require("cors");
const bodyParser = require("body-parser");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const path = require("path");

const app = express();
const port = 3001;
const JWT_SECRET = "gym-management-secret-key"; // In production, use environment variables

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(express.static("public"));
app.use(express.static(path.join(__dirname))); // Serve files from the root directory

// Database connection pool
const pool = mysql.createPool({
  host: "localhost",
  user: "root",
  password: "Pradeep@2005", // Your MySQL password
  database: "gym_management",
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});

// Test database connection
pool
  .getConnection()
  .then((connection) => {
    console.log("Connected to MySQL database");
    connection.release();
  })
  .catch((err) => {
    console.error("Error connecting to database:", err);
  });

// Create tables if they don't exist
const createTables = async () => {
  let connection;
  try {
    connection = await pool.getConnection();

    // Create members table with all required columns
    await connection.query(`
      CREATE TABLE IF NOT EXISTS members (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        email VARCHAR(100) NOT NULL UNIQUE,
        password VARCHAR(255) NOT NULL,
        age INT NOT NULL,
        gender VARCHAR(20) NOT NULL,
        contact VARCHAR(20) NOT NULL,
        goal VARCHAR(50) NOT NULL,
        months INT NOT NULL,
        weight_progress DECIMAL(5,2) DEFAULT 0,
        streak_days INT DEFAULT 0,
        nutrition_adherence INT DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create attendance table
    await connection.query(`
      CREATE TABLE IF NOT EXISTS attendance (
        id INT AUTO_INCREMENT PRIMARY KEY,
        member_id INT,
        date DATE NOT NULL,
        status VARCHAR(20) DEFAULT 'Present',
        FOREIGN KEY (member_id) REFERENCES members(id)
      )
    `);

    // Create payments table
    await connection.query(`
      CREATE TABLE IF NOT EXISTS payments (
        id INT AUTO_INCREMENT PRIMARY KEY,
        member_id INT,
        amount DECIMAL(10,2) NOT NULL,
        payment_method VARCHAR(50) NOT NULL,
        payment_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        status VARCHAR(20) DEFAULT 'Completed',
        FOREIGN KEY (member_id) REFERENCES members(id)
      )
    `);

    // Create workout_plans table
    await connection.query(`
      CREATE TABLE IF NOT EXISTS workout_plans (
        id INT AUTO_INCREMENT PRIMARY KEY,
        member_id INT,
        goal VARCHAR(50) NOT NULL,
        plan_details TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (member_id) REFERENCES members(id)
      )
    `);

    // Create protein_plans table
    await connection.query(`
      CREATE TABLE IF NOT EXISTS protein_plans (
        id INT AUTO_INCREMENT PRIMARY KEY,
        member_id INT,
        goal VARCHAR(50) NOT NULL,
        intake VARCHAR(50) NOT NULL,
        meal_details TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (member_id) REFERENCES members(id)
      )
    `);

    console.log("Tables created successfully");
  } catch (err) {
    console.error("Error creating tables:", err.message);
  } finally {
    if (connection) connection.release();
  }
};

// Initialize tables
createTables();

// Routes for serving HTML files
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "index.html"));
});

app.get("/gym.html", (req, res) => {
  res.sendFile(path.join(__dirname, "gym.html"));
});

// Registration API
app.post("/api/register", async (req, res) => {
  const { name, email, password, age, gender, contact, goal, months } =
    req.body;

  console.log("Registration request received:", req.body);

  if (
    !name ||
    !email ||
    !password ||
    !age ||
    !gender ||
    !contact ||
    !goal ||
    !months
  ) {
    return res.status(400).json({ message: "All fields are required" });
  }

  let connection;
  try {
    connection = await pool.getConnection();

    const [existingUsers] = await connection.query(
      "SELECT * FROM members WHERE email = ?",
      [email]
    );

    if (existingUsers.length > 0) {
      return res.status(400).json({ message: "Email already registered" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const [result] = await connection.query(
      `INSERT INTO members (name, email, password, age, gender, contact, goal, months)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [name, email, hashedPassword, age, gender, contact, goal, months]
    );

    console.log("Member registered successfully with ID:", result.insertId);

    const member = {
      id: result.insertId,
      name,
      email,
      age,
      gender,
      contact,
      goal,
      months,
    };

    const token = jwt.sign({ id: result.insertId, email }, JWT_SECRET, {
      expiresIn: "24h",
    });

    res.status(201).json({
      message: "Registration successful",
      member,
      token,
    });
  } catch (error) {
    console.error("Registration error:", error.message);
    res
      .status(500)
      .json({ message: "Registration failed", error: error.message });
  } finally {
    if (connection) connection.release();
  }
});

// Login API
app.post("/api/login", async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ message: "Email and password are required" });
  }

  let connection;
  try {
    connection = await pool.getConnection();

    const [results] = await connection.query(
      "SELECT * FROM members WHERE email = ?",
      [email]
    );

    if (results.length === 0) {
      return res.status(401).json({ message: "Invalid email or password" });
    }

    const member = results[0];

    const isMatch = await bcrypt.compare(password, member.password);

    if (!isMatch) {
      return res.status(401).json({ message: "Invalid email or password" });
    }

    const token = jwt.sign({ id: member.id, email: member.email }, JWT_SECRET, {
      expiresIn: "24h",
    });

    const { password: _, ...memberWithoutPassword } = member;

    res.json({
      message: "Login successful",
      member: memberWithoutPassword,
      token,
    });
  } catch (error) {
    console.error("Login error:", error.message);
    res.status(500).json({ message: "Login failed", error: error.message });
  } finally {
    if (connection) connection.release();
  }
});

// Middleware to verify JWT token
const verifyToken = (req, res, next) => {
  const token = req.headers.authorization?.split(" ")[1];

  if (!token) {
    console.error("No token provided in Authorization header");
    return res.status(401).json({ message: "Authentication required" });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    console.log("Token verified for user:", decoded.email);
    next();
  } catch (error) {
    console.error("Token verification failed:", error.message);
    return res
      .status(401)
      .json({ message: "Invalid or expired token", error: error.message });
  }
};

// Protected route example
app.get("/api/profile", verifyToken, async (req, res) => {
  const userId = req.user.id;

  let connection;
  try {
    connection = await pool.getConnection();

    const [results] = await connection.query(
      `SELECT m.id, m.name, m.email, m.age, m.gender, m.contact, m.goal, m.months, m.created_at,
              IFNULL((SELECT COUNT(*) FROM workout_plans wp WHERE wp.member_id = m.id), 0) as workout_count,
              IFNULL((SELECT COUNT(*) FROM protein_plans pp WHERE pp.member_id = m.id), 0) as nutrition_count,
              IFNULL((SELECT COUNT(*) FROM payments p WHERE p.member_id = m.id), 0) as payment_count 
       FROM members m WHERE m.id = ?`,
      [userId]
    );

    if (results.length === 0) {
      return res.status(404).json({ 
        success: false, 
        message: "Profile not found",
        error: "No member found with the provided ID"
      });
    }

    // Add default values if null
    const member = results[0];
    const profile = {
      id: member.id,
      name: member.name || "Unknown",
      email: member.email || "",
      age: member.age || 25,
      gender: member.gender || "",
      contact: member.contact || "",
      goal: member.goal || "",
      months: member.months || 1,
      created_at: member.created_at || new Date(),
      workout_count: member.workout_count || 0,
      nutrition_count: member.nutrition_count || 0,
      payment_count: member.payment_count || 0
    };

    res.json({
      success: true,
      data: profile
    });

  } catch (error) {
    console.error("Profile fetch error:", error.message);
    res.status(500).json({ 
      success: false,
      message: "Failed to fetch profile",
      error: error.message
    });
  } finally {
    if (connection) {
      connection.release();
    }
  }
});

// Attendance API - FIXED
app.post("/api/attendance", verifyToken, async (req, res) => {
  const memberId = req.user.id;
  const today = new Date().toISOString().split("T")[0];

  console.log("Marking attendance for member ID:", memberId);

  let connection;
  try {
    connection = await pool.getConnection();

    // Check if attendance already marked for today
    const [existingAttendance] = await connection.query(
      "SELECT * FROM attendance WHERE member_id = ? AND date = ?",
      [memberId, today]
    );

    if (existingAttendance.length > 0) {
      // Update existing attendance record
      await connection.query(
        "UPDATE attendance SET status = 'Present', updated_at = NOW() WHERE member_id = ? AND date = ?",
        [memberId, today]
      );
      console.log(`Attendance updated for member ${memberId} on ${today}`);
      return res.json({ success: true, message: "Attendance updated successfully" });
    }

    // Mark attendance if not already marked
    await connection.query(
      "INSERT INTO attendance (member_id, date, status, created_at) VALUES (?, ?, ?, NOW())",
      [memberId, today, "Present"]
    );

    console.log(`Attendance marked for member ${memberId} on ${today}`);
    res.json({ success: true, message: "Attendance marked successfully" });
  } catch (error) {
    console.error("Attendance marking error:", error.message);
    res
      .status(500)
      .json({
        success: false,
        message: "Failed to mark attendance",
        error: error.message,
      });
  } finally {
    if (connection) connection.release();
  }
});

// Update profile
app.post("/api/update-profile", verifyToken, async (req, res) => {
  let connection;
  try {
    connection = await pool.getConnection();

    const { id, name, email, age, gender, contact, goal, months } = req.body;

    // Convert id to number for proper comparison
    const userId = parseInt(id, 10);

    if (userId !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: "Unauthorized: Cannot update another user's profile",
      });
    }

    const [result] = await connection.query(
      `UPDATE members 
       SET name = ?, email = ?, age = ?, gender = ?, contact = ?, goal = ?, months = ?
       WHERE id = ?`,
      [name, email, age, gender, contact, goal, months, userId]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({
        success: false,
        message: "No profile found to update",
      });
    }

    res.json({ success: true, message: "Profile updated successfully" });
  } catch (error) {
    console.error("Error updating profile:", error.message);
    res.status(500).json({ success: false, message: error.message });
  } finally {
    if (connection) connection.release();
  }
});

// Generate and store workout plan - FIXED
app.post("/api/workout-plan", verifyToken, async (req, res) => {
  let connection;
  try {
    connection = await pool.getConnection();

    const { goal, exercises } = req.body;
    const member_id = req.user.id; // Use authenticated user's ID directly

    console.log("Creating workout plan for member ID:", member_id);
    console.log("Workout goal:", goal);
    console.log("Exercises:", exercises);

    if (!exercises || !Array.isArray(exercises) || exercises.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Valid exercises array is required",
      });
    }

    if (!goal) {
      return res.status(400).json({
        success: false,
        message: "Goal is required",
      });
    }

    await connection.query(
      `INSERT INTO workout_plans (member_id, goal, plan_details, created_at)
       VALUES (?, ?, ?, NOW())`,
      [member_id, goal, JSON.stringify(exercises)]
    );

    console.log(`Workout plan created for member ${member_id}`);
    res.json({
      success: true,
      message: "Workout plan generated and stored successfully",
    });
  } catch (error) {
    console.error("Error generating workout plan:", error.message);
    res.status(500).json({ success: false, message: error.message });
  } finally {
    if (connection) connection.release();
  }
});

// Generate and store nutrition plan - FIXED
app.post("/api/protein-plan", verifyToken, async (req, res) => {
  let connection;
  try {
    connection = await pool.getConnection();

    const { goal, meals, protein_intake } = req.body;
    const member_id = req.user.id; // Use authenticated user's ID directly

    console.log("Creating protein plan for member ID:", member_id);
    console.log("Goal:", goal);
    console.log("Protein intake:", protein_intake);

    if (!meals || !Array.isArray(meals) || meals.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Valid meals array is required",
      });
    }

    if (!goal || !protein_intake) {
      return res.status(400).json({
        success: false,
        message: "Goal and protein intake are required",
      });
    }

    await connection.query(
      `INSERT INTO protein_plans (member_id, goal, intake, meal_details, created_at)
       VALUES (?, ?, ?, ?, NOW())`,
      [member_id, goal, protein_intake, JSON.stringify(meals)]
    );

    console.log(`Protein plan created for member ${member_id}`);
    res.json({
      success: true,
      message: "Nutrition plan generated and stored successfully",
    });
  } catch (error) {
    console.error("Error generating nutrition plan:", error.message);
    res.status(500).json({ success: false, message: error.message });
  } finally {
    if (connection) connection.release();
  }
});

// Process and store payment - FIXED
app.post("/api/payment", verifyToken, async (req, res) => {
  let connection;
  try {
    connection = await pool.getConnection();

    const { amount, payment_method, months } = req.body;
    const member_id = req.user.id; // Use authenticated user's ID directly

    console.log("Processing payment for member ID:", member_id);
    console.log("Amount:", amount);
    console.log("Payment method:", payment_method);
    console.log("Months:", months);

    if (!amount || !payment_method || !months) {
      return res.status(400).json({
        success: false,
        message: "Amount, payment method, and months are required",
      });

    // Convert amount to number if it's a string
    const paymentAmount = Number(amount);
    if (isNaN(paymentAmount) || paymentAmount <= 0) {
      return res.status(400).json({
        success: false,
        message: "Invalid payment amount",
      });
    }

    // Store payment
    await connection.query(
      "INSERT INTO payments (member_id, amount, payment_method, created_at) VALUES (?, ?, ?, NOW())",
      [member_id, paymentAmount, payment_method]
    );

    // Update member's subscription
    await connection.query(
      "UPDATE members SET months = ?, last_payment = NOW(), total_payments = COALESCE(total_payments, 0) + 1 WHERE id = ?",
      [months, member_id]
    );

    console.log(`Payment processed for member ${member_id} - ${paymentAmount} via ${payment_method}`);
    res.json({
      success: true,
      message: "Payment processed successfully",
      data: {
        amount: paymentAmount,
        months,
        payment_method
      }
    });
    }

    await connection.query(
      `INSERT INTO payments (member_id, amount, payment_method, payment_date, status)
       VALUES (?, ?, ?, NOW(), 'Completed')`,
      [member_id, amount, payment_method]
    );

    console.log(`Payment processed for member ${member_id}, amount: ${amount}`);
    res.json({
      success: true,
      message: "Payment processed and stored successfully",
    });
  } catch (error) {
    console.error("Error processing payment:", error.message);
    res.status(500).json({ success: false, message: error.message });
  } finally {
    if (connection) connection.release();
  }
});

// Get payment history
app.get("/api/payment-history/:member_id", verifyToken, async (req, res) => {
  let connection;
  try {
    connection = await pool.getConnection();

    const { member_id } = req.params;
    const userId = parseInt(member_id, 10);

    if (userId !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: "Unauthorized: Cannot view another user's payment history",
      });
    }

    const [payments] = await connection.query(
      `SELECT payment_date, amount, payment_method, status
       FROM payments
       WHERE member_id = ?
       ORDER BY payment_date DESC`,
      [userId]
    );

    res.json({ success: true, payments });
  } catch (error) {
    console.error("Error fetching payment history:", error.message);
    res.status(500).json({ success: false, message: error.message });
  } finally {
    if (connection) connection.release();
  }
});

// Get workout count
app.get("/api/workout-count/:member_id", verifyToken, async (req, res) => {
  let connection;
  try {
    connection = await pool.getConnection();

    const { member_id } = req.params;
    const userId = parseInt(member_id, 10);

    if (userId !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: "Unauthorized: Cannot access another user's data",
      });
    }

    const [result] = await connection.query(
      `SELECT COUNT(*) as count
       FROM workout_plans
       WHERE member_id = ?`,
      [userId]
    );

    res.json({ success: true, count: result[0].count });
  } catch (error) {
    console.error("Error fetching workout count:", error.message);
    res.status(500).json({ success: false, message: error.message });
  } finally {
    if (connection) connection.release();
  }
});

// Get attendance rate
app.get("/api/attendance-rate/:member_id", verifyToken, async (req, res) => {
  let connection;
  try {
    connection = await pool.getConnection();

    const { member_id } = req.params;
    const userId = parseInt(member_id, 10);

    if (userId !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: "Unauthorized: Cannot access another user's data",
      });
    }

    const [result] = await connection.query(
      `SELECT COUNT(*) as total_days,
              SUM(CASE WHEN status = 'Present' THEN 1 ELSE 0 END) as present_days
       FROM attendance
       WHERE member_id = ?`,
      [userId]
    );

    const rate =
      result[0].total_days > 0
        ? Math.round((result[0].present_days / result[0].total_days) * 100)
        : 0;

    res.json({ success: true, rate });
  } catch (error) {
    console.error("Error fetching attendance rate:", error.message);
    res.status(500).json({ success: false, message: error.message });
  } finally {
    if (connection) connection.release();
  }
});

// Get weight progress
app.get("/api/weight-progress/:member_id", verifyToken, async (req, res) => {
  let connection;
  try {
    connection = await pool.getConnection();

    const { member_id } = req.params;
    const userId = parseInt(member_id, 10);

    if (userId !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: "Unauthorized: Cannot access another user's data",
      });
    }

    const [result] = await connection.query(
      `SELECT weight_progress
       FROM members
       WHERE id = ?`,
      [userId]
    );

    res.json({ success: true, progress: result[0]?.weight_progress || 0 });
  } catch (error) {
    console.error("Error fetching weight progress:", error.message);
    res.status(500).json({ success: false, message: error.message });
  } finally {
    if (connection) connection.release();
  }
});

// Get streak days
app.get("/api/streak-days/:member_id", verifyToken, async (req, res) => {
  let connection;
  try {
    connection = await pool.getConnection();

    const { member_id } = req.params;
    const userId = parseInt(member_id, 10);

    if (userId !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: "Unauthorized: Cannot access another user's data",
      });
    }

    const [result] = await connection.query(
      `SELECT streak_days
       FROM members
       WHERE id = ?`,
      [userId]
    );

    res.json({ success: true, days: result[0]?.streak_days || 0 });
  } catch (error) {
    console.error("Error fetching streak days:", error.message);
    res.status(500).json({ success: false, message: error.message });
  } finally {
    if (connection) connection.release();
  }
});

// Get nutrition adherence
app.get(
  "/api/nutrition-adherence/:member_id",
  verifyToken,
  async (req, res) => {
    let connection;
    try {
      connection = await pool.getConnection();

      const { member_id } = req.params;
      const userId = parseInt(member_id, 10);

      if (userId !== req.user.id) {
        return res.status(403).json({
          success: false,
          message: "Unauthorized: Cannot access another user's data",
        });
      }

      const [result] = await connection.query(
        `SELECT nutrition_adherence
       FROM members
       WHERE id = ?`,
        [userId]
      );

      res.json({
        success: true,
        adherence: result[0]?.nutrition_adherence || 0,
      });
    } catch (error) {
      console.error("Error fetching nutrition adherence:", error.message);
      res.status(500).json({ success: false, message: error.message });
    } finally {
      if (connection) connection.release();
    }
  }
);

// Start server
app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});
