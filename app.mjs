import './config.mjs';
import { sessionSecret } from './config.mjs';
import './db.mjs';

import express from 'express';
import session from 'express-session';
import mongoose from 'mongoose';
const User = mongoose.model('User');

import path from 'path';
import { fileURLToPath } from 'url';

//test
const app = express();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

app.use(express.static(path.join(__dirname, 'public')));

app.set('view engine', 'hbs');
app.use(express.urlencoded({ extended: false }));

const allUsers = [];

const sampleUser1 = { username: 'user1', password: 'password1' };
const sampleUser2 = { username: 'user2', password: 'password2' };

allUsers.push(sampleUser1, sampleUser2);


app.get('/', (req, res) => {
    res.render('home');
});

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

app.get('/appointments/own', (req, res) => {
    res.render('appointments/own', {user});
});

app.get('/appointments/schedule', (req, res) => {
    res.render('appointments/schedule', { availableAppointments });
});

app.get('/login', (req, res) => {
    res.render('login'); // Render the login page
});

app.post('/login', (req, res) => {
    const { username, password } = req.body;

    // Perform authentication logic here
    const user = allUsers.find(user => user.username === username && user.password === password);

    if (user) {
        res.send('Login successful');
    } else {
        res.send('Login failed');
    }
});
app.listen(process.env.PORT || 3000);
