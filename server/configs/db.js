import mongoose from "mongoose";

const connectDB = async () => {
    try {
        await mongoose.connect(`${process.env.MONGODB_URI}`);
        console.log("Database is connected successfully");
    } catch (error) {
        console.error("Database connection error:", error.message);
        process.exit(1); // Exit the process with failure code
    }
};

export default connectDB;