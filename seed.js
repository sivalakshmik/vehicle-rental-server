import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Vehicle from './models/Vehicle.js';

dotenv.config();

const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ MongoDB connected');
  } catch (err) {
    console.error('❌ MongoDB connection error:', err);
    process.exit(1);
  }
};

const seedVehicles = async () => {
  try {
    // Clear existing data
    await Vehicle.deleteMany();

    // Insert new seed data
    await Vehicle.insertMany([
      {
        make: 'Toyota',
        model: 'Corolla',
        year: 2021,
        type: 'car',
        location: 'Madurai',
        pricePerDay: 2500,
        available: true,
        imageUrl: '/assets/toyota-corolla.jpg',
        description: 'Reliable sedan with great mileage and super comfort......'
      },
      {
        make: 'Honda',
        model: 'Civic',
        year: 2020,
        type: 'car',
        location: 'Chennai',
        pricePerDay: 2000,
        available: true,
        imageUrl: '/assets/honda_civic.jpg',
        description: 'Sporty design with smooth handling and spacious interior.'
      },
      {
        make: 'Hyundai',
        model: 'i20',
        year: 2022,
        type: 'car',
        location: 'Coimbatore',
        pricePerDay: 3000,
        available: true,
        imageUrl: '/assets/Hyundai-i20.jpg',
        description: 'Premium hatchback with touchscreen and rear camera.'
      },
      {
        make: 'Mahindra',
        model: 'Thar',
        year: 2022,
        type: 'suv',
        location: 'Trichy',
        pricePerDay: 2500,
        available: true,
        imageUrl: '/assets/Thar.jpg',
        description: 'Rugged off-roader with convertible top and 4x4 drive...'
      },
      {
        make: 'Tata',
        model: 'Harrier',
        year: 2021,
        type: 'suv',
        location: 'Madurai',
        pricePerDay: 3300,
        available: true,
        imageUrl: '/assets/Tata-Harrier.jpg',
        description: 'Spacious SUV with panoramic sunroof and premium interiors.'
      },
      {
        make: 'Royal Enfield',
        model: 'Machismo 500CC',
        year: 2022,
        type: 'bike',
        location: 'Madurai',
        pricePerDay: 1500,
        available: true,
        imageUrl: '/assets/Machismo.jpg',
        description: 'Classic cruiser with powerful thump and retro styling....'
      },
      {
        make: 'Bajaj',
        model: 'Pulsar NS200',
        year: 2021,
        type: 'bike',
        location: 'Chennai',
        pricePerDay: 650,
        available: true,
        imageUrl: '/assets/Pulsar-NS-200.jpg',
        description: 'Aggressive street bike with good sporty performance.....'
      },
      {
        make: 'Yamaha',
        model: 'FZ',
        year: 2022,
        type: 'bike',
        location: 'Madurai',
        pricePerDay: 900,
        available: true,
        imageUrl: '/assets/Yamah-FZS.jpg',
        description: 'Urban commuter with muscular design and smooth ride....'
      },
      {
        make: 'Honda',
        model: 'CBR 20th',
        year: 2022,
        type: 'bike',
        location: 'Trichy',
        pricePerDay: 2000,
        available: true,
        imageUrl: '/assets/Honda-cbr.jpg',
        description: 'Sport bike with aerodynamic styling and high-speed stability.'
      },
      {
        make: 'BMW',
        model: 'G310 GS',
        year: 2021,
        type: 'bike',
        location: 'Madurai',
        pricePerDay: 1500,
        available: true,
        imageUrl: '/assets/BMW-G310-GS.jpg',
        description: 'Adventure bike with dual-purpose tires and upright stance.'
      },
      {
        make: 'Honda',
        model: 'Activa 6G',
        year: 2022,
        type: 'scooter',
        location: 'Madurai',
        pricePerDay: 1500,
        available: true,
        imageUrl: '/assets/Honda-Activa-Scooter.jpg',
        description: 'India’s favorite scooter with silent start and fuel efficiency.'
      },
      {
        make: 'TVS',
        model: 'Jupiter Classic 110CC',
        year: 2019,
        type: 'scooter',
        location: 'Madurai',
        pricePerDay: 1000,
        available: true,
        imageUrl: '/assets/TVS-Jupiter-110CC.jpg',
        description: 'Comfortable ride with classic styling and mobile charger....'
      }
    ]);

    console.log('✅ Vehicles seeded successfully');
    process.exit();
  } catch (err) {
    console.error('❌ Seeder error:', err);
    process.exit(1);
  }
};

// Run seeder
connectDB().then(seedVehicles);
