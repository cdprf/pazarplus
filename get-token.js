const jwt = require("jsonwebtoken");
const config = require("./server/config/config");

// Admin user from database
const adminUser = {
  id: "d328794b-321c-45ac-a5cb-3014775389f7",
  username: "devuser",
  email: "dev@example.com",
  role: "admin",
};

// Generate a token that expires in 1 hour
const token = jwt.sign(
  {
    id: adminUser.id,
    username: adminUser.username,
    email: adminUser.email,
    role: adminUser.role,
  },
  config.jwt.secret,
  { expiresIn: "1h" }
);

console.log(token);
