const express = require('express');
const loggerMiddleware = require('./middlewares/estimator');
const app = express();
const port = 3000;

app.use(loggerMiddleware);

app.get('/test', (req, res) => {
  res.send('testing..');
});

app.get('/heavy',async (req, res) => {
    console.log('Request received, starting delay...');
    
    const delay=3000; 
    
    setTimeout(()=> {
        res.send('This response was delayed by 3 seconds.');
    },delay);
});

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`);
});
