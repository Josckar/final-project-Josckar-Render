class Appointment {
    constructor(date, time, customer, ate) {
        this.id = this.generateAppointmentID();
        this.date = date;
        this.time = time;
        this.customer = customer;
        this.ate = ate;
        
    }

    generateAppointmentID() {
        // Generate a unique ID for the appointment, e.g., using a timestamp
        return Date.now();
    }

    toString() {
        // Generate a name for the appointment based on the details
        return `${this.customer.name}'s Appointment with ${this.ate.name} on ${this.date} at ${this.time}`;
    }
}

class User {
    constructor(username, password) {
        this.username = username;
        this.password = password;
        this.appointments = [];
    }
    printAppointments() {
        this.appointments.forEach( (appointment) => {console.log(appointment)});
    }
    getAppointments() {
        return this.ownATE.appointments;
    }
}

class Customer extends User {

    constructor(username, password) {
        super(username, password);
    }

    newAppointment(appointment, employee) {
        if (appointment instanceof Appointment) {
            this.appointments.push(appointment);
            return true;
        }
        return false;
    }


}

class ATE extends User {

    constructor(username, password) {
        super(username, password);
        this.appointments = [];
    }

    scheduleOwn(appointment) {
        if (appointment instanceof Appointment) {
            this.appointments.push(appointment);
            return true;
        }
        return false;
    }


}

class Manager extends ATE {

    constructor(username, password, isATE) {
        super(username, password);
        this.isATE = isATE;
    }

    scheduleOwn(appointment) {
        if(!this.isATE) {
            throw new Error("User is not an ATE, please contact management");
        }
        if (appointment instanceof Appointment) {
            this.ownATE.scheduleOwnAppointment(appointment, this);
            return true;
        }
        return false;
    }
    //functions for managing ATE's and users

}

class Owner extends Manager {
    constructor(username, password, isATE) {
        super(username, password, isATE);
    }

    //functions for managing Managers

}

