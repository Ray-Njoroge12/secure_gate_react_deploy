// server/src/controllers/authController.js
exports.login = (req,res) => {
  const { email, password } = req.body;
  // mock user mapping
  const map = {
    "admin@x": "admin",
    "guard@x": "guard",
    "resident@x": "resident"
  };
  const role = map[email] || null;
  if(role && password) return res.json({ success:true, role, token:"fake-jwt" });
  return res.status(401).json({ success:false, message:"Invalid creds" });
};
