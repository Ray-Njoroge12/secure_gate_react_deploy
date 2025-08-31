const adminRoutes = require("./src/routes/adminRoutes");

// use the route
app.use("/admin", adminRoutes);
app.use(express.json());
app.use("/api", require("./src/routes/authRoutes"));
