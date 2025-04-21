import passport from "passport";
import { Strategy as JwtStrategy, ExtractJwt } from "passport-jwt";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";
import { Strategy as FacebookStrategy } from "passport-facebook";
import User from "../models/user.model.js";
import dotenv from "dotenv";
dotenv.config();

// Validate environment variables
const requiredEnvVars = [
  "GOOGLE_CLIENT_ID",
  "GOOGLE_CLIENT_SECRET",
  "FACEBOOK_CLIENT_ID",
  "FACEBOOK_CLIENT_SECRET",
  "SERVER_URL",
  "CLIENT_URL",
];

const missingVars = requiredEnvVars.filter((envVar) => !process.env[envVar]);
if (missingVars.length > 0) {
  console.error(
    `Missing required environment variables: ${missingVars.join(", ")}`
  );
  throw new Error(
    `Missing required environment variables: ${missingVars.join(", ")}`
  );
}
passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL: `${process.env.SERVER_URL}/api/auth/google/callback`,
      proxy: true,
    },
    async (accessToken, refreshToken, profile, done) => {
      try {
        console.log("Google profile:", {
          id: profile.id,
          displayName: profile.displayName,
          emails: profile.emails,
        });

        if (!profile.emails || !profile.emails[0] || !profile.emails[0].value) {
          return done(new Error("Email not provided by Google"), null);
        }

        const email = profile.emails[0].value;
        let user = await User.findOne({ email });

        if (user) {
          // Update Google ID if not set
          if (!user.googleId) {
            user.googleId = profile.id;
            await user.save();
          }
          return done(null, user);
        }

        // Create new user
        user = new User({
          googleId: profile.id,
          fullname: profile.displayName,
          username: email.split("@")[0],
          email: email,
          emailVerified: true, // Google emails are verified
          avatar: profile.photos ? profile.photos[0].value : null,
        });

        await user.save();
        return done(null, user);
      } catch (error) {
        console.error("Google Strategy Error:", error);
        return done(error, null);
      }
    }
  )
);

passport.use(
  new FacebookStrategy(
    {
      clientID: process.env.FACEBOOK_CLIENT_ID,
      clientSecret: process.env.FACEBOOK_CLIENT_SECRET,
      callbackURL: `${process.env.SERVER_URL}/api/auth/facebook/callback`,
      profileFields: ["id", "displayName", "emails", "photos"],
      proxy: true,
    },
    async (accessToken, refreshToken, profile, done) => {
      try {
        console.log("Facebook profile:", {
          id: profile.id,
          displayName: profile.displayName,
          emails: profile.emails,
        });

        if (!profile.emails || !profile.emails[0] || !profile.emails[0].value) {
          return done(new Error("Email not provided by Facebook"), null);
        }

        const email = profile.emails[0].value;
        let user = await User.findOne({ email });

        if (user) {
          // Update Facebook ID if not set
          if (!user.facebookId) {
            user.facebookId = profile.id;
            await user.save();
          }
          return done(null, user);
        }

        // Create new user
        user = new User({
          facebookId: profile.id,
          fullname: profile.displayName,
          username: email.split("@")[0],
          email: email,
          emailVerified: true, // Facebook emails are verified
          avatar: profile.photos ? profile.photos[0].value : null,
        });

        await user.save();
        return done(null, user);
      } catch (error) {
        console.error("Facebook Strategy Error:", error);
        return done(error, null);
      }
    }
  )
);

passport.serializeUser((user, done) => {
  done(null, user.id);
});

passport.deserializeUser(async (id, done) => {
  try {
    const user = await User.findById(id);
    if (!user) {
      return done(new Error("User not found"), null);
    }
    done(null, user);
  } catch (error) {
    console.error("Deserialize User Error:", error);
    done(error, null);
  }
});
