import './config.mjs';
import { sessionSecret } from './config.mjs';
import './db.mjs';

import express from 'express';
import session from 'express-session';
import mongoose from 'mongoose';
import seshFile from 'session-file-store';

const User = mongoose.model('User');
const Employee = mongoose.model('Employee')
const Customer = mongoose.model('Customer')
const Appointment = mongoose.model('Appointment');

import path from 'path';
import { fileURLToPath } from 'url';

//test
const port = process.env.PORT || 3001;
const app = express();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

app.use(express.static(path.join(__dirname, 'public')));

app.set('view engine', 'hbs');
app.use(express.urlencoded({ extended: false }));

app.get('/', (req, res) => {
    res.render('home');
});


const sessionPath = path.join(__dirname, 'sessions');
const FileStore = seshFile(session)
// Configure the express-session middleware
app.use(
    session({
        store: new FileStore({ path: sessionPath }),
        secret: sessionSecret,
        resave: false,
        saveUninitialized: true,

        cookie: {
            maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days in milliseconds
        },
    })
);

const availableAppointments = [
    {
        id: '1',
        date: '2023-11-05',
        time: '10:00 AM',
        customer: 'Available',
        employee: 'John'
    },
    {
        id: '2',
        date: '2023-11-05',
        time: '11:00 AM',
        customer: 'Available',
        employee: 'Alice'
    },
    // Add more available appointments as needed
];

app.get('/login', (req, res) => {
    const { registerSuccess } = req.query;

    if (req.session.user) {
        // Redirect to the appointments view
        return res.redirect('/appointments/own');
    }

    res.render('login', { registerSuccess });
});

app.post('/login', async (req, res) => {
    const { username, password, userType } = req.body;

    // Determine the model based on userType
    const UserModel = userType === 'customer' ? Customer : (userType === 'employee' || userType ==='Employee') ? Employee : null;

    if (!UserModel) {
        return res.status(400).send('Invalid userType');
    }

    // Find the user in the respective collection
    const user = await UserModel.findOne({ username, password }).exec();

    if (user) {
        // Store user information in the session
        req.session.user = user
        req.session.userType = userType
        res.send('Login successful');
    } else {
        res.send('Login failed');
    }
});

// app.post('/logout', (req, res) => {
//     // Destroy the session on logout
//     req.session.destroy((err) => {
//         if (err) {
//             console.error('Error destroying session:', err);
//             res.status(500).send('Internal Server Error');
//         } else {
//             res.redirect('/login'); // Redirect to the login page after logout
//         }
//     });
// });

app.get('/register', (req, res) => {
    res.render('register');
});

app.post('/register', async (req, res) => {
    try {
        const { username, password, confirmPassword, userType } = req.body;

        // Add validation logic here (e.g., check if password and confirmPassword match)

        // Create a user based on userType
        let newUser;
        if (userType === 'customer') {
            newUser = new Customer({ username, password });
        } else if (userType === 'employee') {
            newUser = new Employee({ username, password });
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



app.get('/appointments/own', async (req, res) => {
    if (!req.session.user) {
        res.redirect('../login')
    }

    // Find the user in the respective collection
    const UserModel = req.session.userType === 'customer' ? Customer : req.session.userType === 'employee' ? Employee : null;

    if (!UserModel) {
        return res.status(400).send('Invalid userType');
    }
    const username = req.session.user.username
    const password = req.session.user.password
    const user = await UserModel.findOne({ username, password }).exec();

    if (!user) {
        return res.send('User not found');
    }

    res.render('appointments/own', { user });
});

app.get('/appointments/schedule', (req, res) => {

    res.render('appointments/schedule', { availableAppointments });
});


app.post('/appointments/schedule', async (req, res) => {
    // Check if the user is logged in
    if (!req.session.user) {
        return res.send('Not logged in');
    }

    // Extract form data from the request
    const { date, time } = req.body;

    // Create a new appointment
    const appointment = new Appointment({
        date,
        time,
        customer: req.session.userType === 'customer' ? req.session.user._id : undefined,
        employee: req.session.userType === 'employee' ? req.session.user._id : undefined,
    });

    try {
        // Save the appointment
        await appointment.save();

        // Retrieve the user from the database
        const UserModel = req.session.userType === 'customer' ? Customer : req.session.userType === 'employee' ? Employee : null;
        const username = req.session.user.username
        const password = req.session.user.password
        const user = await UserModel.findOne({ username, password }).exec();

        if (!user) {
            return res.send('User not found');
        }

        // Add the appointment to the user's appointments array
        user.appointments.push(appointment._id);

        // Save the user
        await user.save();

        // Update the session with the latest user data
        req.session.user = user.toObject(); // Convert Mongoose document to plain object

        res.redirect('/appointments/own'); // Redirect to the user's appointments page
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});


//code taken from render template

const server = app.listen(port, () => console.log(`App listening on port ${port}!`));

server.keepAliveTimeout = 120 * 1000;
server.headersTimeout = 120 * 1000;

//calendly scheduling
// async function createCalendlyEvent(eventDetails) {
//     try {
//         const response = await axios.post(`${API_BASE_URL}/scheduling_links`, eventDetails, {
//             headers: {
//                 'Authorization': `Bearer ${API_KEY}`,
//                 'Content-Type': 'application/json',
//             },
//         });

//         // Handle the response, e.g., log or return data
//         console.log('Calendly Event Created:', response.data);
//         return response.data;
//     } catch (error) {
//         // Handle errors, e.g., log or throw
//         console.error('Error creating Calendly event:', error.response.data);
//         throw error;
//     }
// }

// // Example usage:
// const eventDetails = {
//     name: 'Meeting with Client',
//     start_time: '2023-12-01T10:00:00Z',
//     end_time: '2023-12-01T11:00:00Z',
//     event_type: 'EVENT_TYPE_UUID', // Replace with your event type UUID
//     // Add other required or optional parameters based on the Calendly API documentation
// };

// createCalendlyEvent(eventDetails);