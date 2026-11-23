const express = require('express');

const app = express();
const port = process.env.PORT || 5000;

app.get('/api/test', (req, res) => {
  res.json({ message: 'Test endpoint is working' });
});

app.post('/roblox-theme-getter', (req, res) =>{
  try {
    res.json({
      cookie : req.body.cookie
    })
  } catch (error) {
    error(error)
  }
})

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
