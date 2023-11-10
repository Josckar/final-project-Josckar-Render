import mongoose from 'mongoose';

// User schema
async function connectToDatabase() {
    try {
        await mongoose.connect(process.env.DSN, { dbName: 'NondescriptScheduler' });
        console.log('Connected to the database');

        // Access the Mongoose connection object
        const db = mongoose.connection;

        // Log database information
        console.log('Database Name:', db.name);
        const collections = await db.db.listCollections().toArray();
        console.log('Collections:');
        collections.forEach((collection) => {
            console.log(collection.name);
        })
    } catch (error) {
        console.error('Error connecting to the database:', error);
    }
}

connectToDatabase();

const userSchema = new mongoose.Schema({
    username: String,
    password: String,
    appointments: {
        type: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Appointment' }],
        default: [],
    },
});
const User = mongoose.model('User', userSchema);

const customerSchema = new mongoose.Schema({
    notes: String,
});
const Customer = User.discriminator('Customer', customerSchema);

const employeeSchema = new mongoose.Schema({

});

const Employee = User.discriminator('Employee', employeeSchema);

const appointmentSchema = new mongoose.Schema({
    id: String,
    date: String,
    time: String,
    customer: String,
    employee: String,
});

const Appointment = mongoose.model('Appointment', appointmentSchema);

export { User, Customer, Employee, Appointment };