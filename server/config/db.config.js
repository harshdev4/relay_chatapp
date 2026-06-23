import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

const connectDB = async () => {
    try { 
        const instance = await mongoose.connect(process.env.MONGO_URI);
        console.log("Connected to mongodb", instance.connection.host);
        
    } catch (error) {
        console.log("Error connecting to mongodb", error);
        process.exit(1);
    }
}

export default connectDB;