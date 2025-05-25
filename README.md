# Gym Management System

A comprehensive gym management system with member registration, attendance tracking, payment management, and personalized workout and nutrition plans.

## Features

- Member registration with personal details
- Attendance tracking
- Payment management
- Personalized workout plans based on fitness goals
- Protein intake recommendations
- Dark mode support
- Responsive design

## Prerequisites

- Node.js (v14 or higher)
- MySQL (v8 or higher)
- npm (Node Package Manager)

## Installation

1. Clone the repository:
   ```
   git clone <repository-url>
   cd gym-management-system
   ```

2. Install dependencies:
   ```
   npm install
   ```

3. Set up the database:
   - Run the `setup_database.bat` file (Windows) or execute the SQL statements in `database.sql` manually
   - Alternatively, you can run the following command:
     ```
     mysql -u root -p < database.sql
     ```

4. Configure the database connection:
   - Open `server.js` and update the database connection details:
     ```javascript
     const db = mysql.createConnection({
       host: 'localhost',
       user: 'root',
       password: 'your_password', // Replace with your MySQL password
       database: 'gym_management'
     });
     ```

## Running the Application

1. Start the server:
   ```
   node server.js
   ```

2. Open your browser and navigate to:
   ```
   http://localhost:3001
   ```

## Database Structure

The application uses the following tables:

- `members`: Stores member information
- `attendance`: Tracks member attendance
- `payments`: Records payment transactions
- `workout_plans`: Stores personalized workout plans
- `protein_plans`: Stores protein intake recommendations

## API Endpoints

- `POST /api/register`: Register a new member
- `POST /api/attendance`: Mark attendance for a member
- `GET /api/attendance/:member_id`: Get attendance history for a member
- `POST /api/payment`: Record a payment
- `GET /api/payments/:member_id`: Get payment history for a member
- `POST /api/workout-plan`: Save a workout plan
- `GET /api/workout-plan/:member_id`: Get workout plan for a member
- `POST /api/protein-plan`: Save a protein plan
- `GET /api/protein-plan/:member_id`: Get protein plan for a member

## License

This project is licensed under the MIT License - see the LICENSE file for details. 