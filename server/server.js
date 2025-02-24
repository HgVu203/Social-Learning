import express from 'express';
import mongoose from 'mongoose';
import passport from 'passport';
import cookieParser from 'cookie-parser';
import dotenv from 'dotenv';
import cors from 'cors';
import authRouter from './routers/auth.router.js';
import postRouter from './routers/post.router.js';
import friendshipRouter from './routers/friendship.router.js'
import messageRouter from './routers/message.router.js'
import userRouter from './routers/user.router.js'
import groupRouter from './routers/group.router.js'

import './config/passport.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 8080;

app.use(cors({
    origin: process.env.CLIENT_URL,
    credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

app.use(passport.initialize());

app.use('/api/auth', authRouter);
app.use('/api/posts', postRouter);
app.use('/api/friendship', friendshipRouter);
app.use('/api/message', messageRouter);
app.use('/api/user', userRouter);
app.use('/api/group', groupRouter);



app.get("/", (req, res) => {
    res.send("Hello World");
});

mongoose.connect(process.env.MONGODB_URL).then(() => {
    console.log('Connected to MongoDB');
    app.listen(PORT, () => {
        console.log(`Server is running on port ${PORT}`);
    });
}).catch((error) => {
    console.error('Connection error', error);
});