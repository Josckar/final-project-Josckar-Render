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
const user = {
    username: 'JohnDoe',
    appointments: [
        {
            id: '1',
            date: '2023-11-01',
            time: '10:00 AM',
            customer: 'JohnDoe',
            employee: 'Jane'
        },
        
    ]
};

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
    const UserModel = userType === 'customer' ? Customer : userType === 'employee' ? Employee : null;

    if (!UserModel) {
        return res.status(400).send('Invalid userType');
    }

    // Find the user in the respective collection
    const user = await UserModel.findOne({ username, password }).exec();

    if (user) {
        // Store user information in the session
        req.session.user = {
            id: user._id,
            username: user.username,
            userType: userType,
        };
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



app.get('/appointments/own', (req, res) => {
    res.render('appointments/own', {user});
});

app.get('/appointments/schedule', (req, res) => {
    res.render('appointments/schedule', { availableAppointments });
});

//code taken from render template

const server = app.listen(port, () => console.log(`Example app listening on port ${port}!`));

server.keepAliveTimeout = 120 * 1000;
server.headersTimeout = 120 * 1000;
