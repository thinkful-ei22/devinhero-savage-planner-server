const express = require('express');
const cors = require('cors');
const morgan = require('morgan');

const { PORT, CLIENT_ORIGIN } = require('./config');
const { dbConnect } = require('./db-mongoose');
// const {dbConnect} = require('./db-knex');

//get auth
const passport = require('passport');
const localStrategy = require('./passport/local');
const jwtStrategy = require('./passport/jwt');

//get routers
const characterRouter = require('./routes/characters');
const edgeRouter = require('./routes/edges');
const userRouter = require('./routes/users');
const authRouter = require('./routes/auth');


const app = express();

app.use(
  morgan(process.env.NODE_ENV === 'production' ? 'common' : 'dev', {
    skip: (req, res) => process.env.NODE_ENV === 'test'
  })
);

// Parse request body
app.use(express.json());

app.use(
  cors({
    origin: CLIENT_ORIGIN
  })
);

//Utilize local strategy for login
passport.use(localStrategy);

//Utilize JWS strategy for login
passport.use(jwtStrategy);

//mount routers
app.use('/api/characters', characterRouter);
app.use('/api/edges', edgeRouter);
app.use('/api/users', userRouter);
app.use('/api/auth', authRouter);


//Custom 404 not found route
app.use((req, res, next) =>{
  const err = new Error('Not found');
  err.status = 404;
  next(err);
});

//Custom Error Handler
app.use((err, req, res, next) =>{
  if(err.status){
    const errBody = Object.assign({}, err, {message: err.message});
    res.status(err.status).json(errBody);
  }else{
    console.error(err);
    res.status(500).json({message: 'Internal Server Error'});
  }
});

function runServer(port = PORT) {
  const server = app
    .listen(port, () => {
      console.info(`App listening on port ${server.address().port}`);
    })
    .on('error', err => {
      console.error('Express failed to start');
      console.error(err);
    });
}

if (require.main === module) {
  dbConnect();
  runServer();
}

module.exports = { app };
