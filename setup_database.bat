@echo off
echo Setting up the Gym Management System database...

REM Replace with your MySQL username and password
set MYSQL_USER=root
set MYSQL_PASSWORD=

REM Run the SQL script
mysql -u %MYSQL_USER% -p%MYSQL_PASSWORD% < database.sql

echo Database setup complete!
pause 
