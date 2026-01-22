SELECT u.id, u.userName, u.roles, e.name as empName 
FROM users u 
LEFT JOIN employees e ON u.employeeId = e.id 
WHERE e.name IN ('杜红川', '熊海钧') OR u.userName IN ('杜红川', '熊海钧');
