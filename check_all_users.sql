
SELECT u.id, u.userName, u.roles, e.name as empName, e.id as empId
FROM users u
LEFT JOIN employees e ON u.employeeId = e.id
LIMIT 100;
