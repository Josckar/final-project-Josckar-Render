import './config.mjs';
import { sessionSecret } from './config.mjs';

import express from 'express';
import session from 'express-session';
import mongoose from 'mongoose';
import { User, Customer, Employee, Appointment } from './db.mjs';
import MongoStore from 'connect-mongo';
import fetch from 'node-fetch';

import path from 'path';
import { fileURLToPath } from 'url';


const options = {
  method: 'GET',
  headers: {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${process.env.CALENDLY_ACCESS_TOKEN}`,
  },
};

const userUris = process.env.USER_URIS.split(',');
const port = process.env.PORT || 3001;

const app = express();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

app.use(express.static(path.join(__dirname, 'public')));

app.set('view engine', 'hbs');
app.use(express.urlencoded({ extended: false }));

const sessionStore = MongoStore.create({
  mongoUrl: process.env.DSN,
  dbName: 'NondescriptScheduler',
  collectionName: 'sessions',
});
  
app.use(
  session({
    secret: sessionSecret,
    resave: false,
    saveUninitialized: false,
    store: sessionStore,
    cookie: { maxAge: 30 * 24 * 60 * 60 * 1000 }, // 30 days in milliseconds
  })
);

app.use((req, res, next) => {
  console.log('Session:', req.session);
  next();
});

app.use((req, res, next) => {
  sessionStore.get(req.sessionID, (err, session) => {
    if (err) {
      console.error('Error retrieving session from MongoDB:', err);
    } else {
      console.log('Retrieved session from MongoDB:', session);
    }
    next();
  });
});

app.get('/', (req, res) => {
  if (req.session.user) {
    console.log('Authenticated');
    res.render('home');
  } else {
    res.redirect('/login');
  }
});

app.get('/login', (req, res) => {
  const { registerSuccess } = req.query;
  if (req.session.user) {
    return res.redirect('/appointments/own');
  }
  console.log('Login session:', req.session.user);
  res.render('login', { registerSuccess });
});

app.post('/login', async (req, res) => {
  const { username, password, userType } = req.body;

  const UserModel =
    userType === 'customer'
      ? Customer
      : userType === 'employee' || userType === 'Employee'
        ? Employee
        : null;
 
  if (!UserModel) {
    return res.status(400).send('Invalid userType');
  }

  const user = await UserModel.findOne({ username, password }).exec();

  if (user) {
    if (!req.session.user) {
      req.session.user = user;
      req.session.userType = userType;
    }

    res.redirect('/appointments/own');
  } else {
    res.send('Login failed');
  }
});

app.get('/logout', (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      console.error('Error destroying session:', err);
      res.status(500).send('Internal Server Error');
    } else {
      res.redirect('/login');
    }
  });
});

app.get('/register', (req, res) => {
  res.render('register');
});

app.post('/register', async (req, res) => {
  try {
    const { username, password, confirmPassword, userType, calendlyLink } = req.body;

    // Check if the username already exists in the database
    const existingUser = await User.findOne({ username }).exec();

    if (existingUser) {
      return res.status(400).json({ error: 'Username already exists' });
    }

    let newUser;
    if (userType === 'customer') {
      newUser = new Customer({ username, password });
    } else if (userType === 'employee') {
      newUser = new Employee({ username, password, calendlyLink });
    } else {
      return res.status(400).json({ error: 'Invalid userType' });
    }

    await newUser.save();

    res.redirect('/login?registerSuccess=true');
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

app.get('/account', async (req, res) => {
  try {
    if (!req.session.user) {
      return res.redirect('/login');
    }

    const UserModel =
      req.session.userType === 'customer'
        ? Customer
        : req.session.userType === 'employee'
        ? Employee
        : null;

    if (!UserModel) {
      return res.status(400).send('Invalid userType');
    }

    const userId = req.session.user._id;
    const user = await UserModel.findById(userId).exec();

    if (!user) {
      return res.send('User not found');
    }

    res.render('account', { user });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

app.post('/account', async (req, res) => {
  try {
    if (!req.session.user) {
      return res.redirect('/login');
    }

    const UserModel =
      req.session.userType === 'customer'
        ? Customer
        : req.session.userType === 'employee'
        ? Employee
        : null;

    if (!UserModel) {
      return res.status(400).send('Invalid userType');
    }

    const userId = req.session.user._id;
    const user = await UserModel.findById(userId).exec();

    if (!user) {
      return res.send('User not found');
    }

    // Update user based on form data
    const { newCalendlyLink } = req.body;

    if (newCalendlyLink) {
      user.calendlyLink = newCalendlyLink;
    }

    await user.save();

    // Update session user object with the latest changes
    req.session.user = user.toObject();

    res.redirect('/account');
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

app.get('/appointments/own', async (req, res) => {
  if (!req.session.user) {
    res.redirect('/login');
  }

  const UserModel =
    req.session.userType === 'customer'
      ? Customer
      : req.session.userType === 'employee'
        ? Employee
        : null;

  if (!UserModel) {
    return res.status(400).send('Invalid userType');
  }
  const username = req.session.user.username;
  const password = req.session.user.password;
  const user = await UserModel.findOne({ username, password }).exec();

  if (!user) {
    return res.send('User not found');
  }

  res.render('appointments/own', { user });
});

app.get('/appointments/schedule', async (req, res) => {
  const availabilities = [];
  for (const user of userUris) {
    availabilities.push(fetch((`https://api.calendly.com/user_availability_schedules?user=${user}`), options)
      .then(response => response.json())
      .then(response => console.log(response))
      .catch(err => console.error(err)));
  }
  // await fetch('https://api.calendly.com/users/me', options)
  //   .then((response) => response.json())
  //   .then((response) => console.log(response))
  //   .catch((err) => console.error(err));

  res.render('appointments/schedule', {
    availableAppointments,
    alreadyLoggedIn: true,
  });
});

app.post('/appointments/schedule', async (req, res) => {
  if (!req.session.user) {
    return res.send('Not logged in');
  }

  const { date, time } = req.body;

  const appointment = new Appointment({
    date,
    time,
    customer:
      req.session.userType === 'customer' ? req.session.user._id : undefined,
    employee:
      req.session.userType === 'employee' ? req.session.user._id : undefined,
  });

  try {
    await appointment.save();

    const UserModel =
      req.session.userType === 'customer'
        ? Customer
        : req.session.userType === 'employee'
          ? Employee
          : null;
    const username = req.session.user.username;
    const password = req.session.user.password;
    const user = await UserModel.findOne({ username, password }).exec();

    if (!user) {
      return res.send('User not found');
    }

    user.appointments.push(appointment._id);
    await user.save();

    req.session.user = user.toObject();

    res.redirect('/appointments/own');
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

const server = app.listen(port, () =>
  console.log(`App listening on port ${port}!`)
);

server.keepAliveTimeout = 120 * 1000;
server.headersTimeout = 120 * 1000;
