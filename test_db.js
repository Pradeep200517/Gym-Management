const mysql = require('mysql2');

// Database connection
const db = mysql.createConnection({
  host: 'localhost',
  user: 'root',
  password: '', // Your MySQL password
  database: 'gym_management'
});

db.connect((err) => {
  if (err) {
    console.error('Error connecting to database:', err);
    return;
  }
  console.log('Connected to MySQL database');
  
  // Test query to check if tables exist
  const tables = ['members', 'attendance', 'payments', 'workout_plans', 'protein_plans'];
  
  tables.forEach(table => {
    db.query(`SHOW TABLES LIKE '${table}'`, (err, results) => {
      if (err) {
        console.error(`Error checking table ${table}:`, err);
      } else if (results.length > 0) {
        console.log(`Table ${table} exists`);
        
        // Check table structure
        db.query(`DESCRIBE ${table}`, (err, columns) => {
          if (err) {
            console.error(`Error describing table ${table}:`, err);
          } else {
            console.log(`Table ${table} structure:`, columns);
          }
        });
      } else {
        console.log(`Table ${table} does not exist`);
      }
    });
  });
  
  // Test inserting a member
  const testMember = {
    name: 'Test User',
    age: 30,
    gender: 'Male',
    contact: '1234567890',
    goal: 'bulk',
    months: 3
  };
  
  db.query(
    'INSERT INTO members (name, age, gender, contact, goal, months) VALUES (?, ?, ?, ?, ?, ?)',
    [testMember.name, testMember.age, testMember.gender, testMember.contact, testMember.goal, testMember.months],
    (err, result) => {
      if (err) {
        console.error('Error inserting test member:', err);
      } else {
        console.log('Test member inserted successfully with ID:', result.insertId);
        
        // Test inserting a workout plan
        const workoutPlan = {
          member_id: result.insertId,
          goal: 'bulk',
          plan_details: 'Test workout plan'
        };
        
        db.query(
          'INSERT INTO workout_plans (member_id, goal, plan_details) VALUES (?, ?, ?)',
          [workoutPlan.member_id, workoutPlan.goal, workoutPlan.plan_details],
          (err, result) => {
            if (err) {
              console.error('Error inserting test workout plan:', err);
            } else {
              console.log('Test workout plan inserted successfully with ID:', result.insertId);
            }
            
            // Close the connection
            db.end();
          }
        );
      }
    }
  );
}); 
