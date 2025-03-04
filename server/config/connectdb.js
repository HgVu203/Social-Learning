import mongoose from "mongoose";
import dotenv from "dotenv"
dotenv.config()
const connectDB = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URL)
        console.log('Mongo db connected')
    } catch (error) {
        console.log("Mongo db error : " + error?.message)
    }
}

export default connectDB