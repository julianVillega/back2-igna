import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import { Strategy as GoogleStrategy } from "passport-google-oauth2";
import { Strategy as JwtStrategy, ExtractJwt } from "passport-jwt";
import {
  create,
  readByEmail,
  readById,
  update,
} from "../data/mongo/managers/users.manager.js";
import { createHashUtil, verifyHashUtil } from "../utils/hash.util.js";
import { createTokenUtil, verifyTokenUtil } from "../utils/token.util.js";
const { GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, BASE_URL } = process.env;

passport.use(
  "register",
  new LocalStrategy(
    {
      passReqToCallback: true,
      usernameField: "email",
    },
    async (req, email, password, done) => {
      try {
        const one = await readByEmail(email);
        if (one) {
          const info = { message: "USER ALREADY EXISTS", statusCode: 401 }
          return done(null, false, info);
        }
        const hashedPassword = createHashUtil(password);
        const user = await create({
          email,
          password: hashedPassword,
          name: req.body.name || "Default Name",
        });
        return done(null, user);
      } catch (error) {
        return done(error);
      }
    }
  )
);
passport.use(
  "login",
  new LocalStrategy(
    { usernameField: "email" },
    async (email, password, done) => {
      try {
        const user = await readByEmail(email);
        if (!user) {
          const error = new Error("USER NOT FOUND");
          error.statusCode = 401;
          return done(error);
        }
        const passwordForm = password; /* req.body.password */
        const passwordDb = user.password;
        const verify = verifyHashUtil(passwordForm, passwordDb);
        if (!verify) {
          const error = new Error("INVALID CREDENTIALS");
          error.statusCode = 401;
          return done(error);
        }
        const data = {
          user_id: user._id,
          role: user.role,
        };
        const token = createTokenUtil(data);
        user.token = token;
        await update(user._id, { isOnline: true });
        return done(null, user);
      } catch (error) {
        return done(error);
      }
    }
  )
);
passport.use(
  "admin",
  new JwtStrategy(
    {
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      secretOrKey: process.env.SECRET_KEY,
    },
    async (data, done) => {
      try {
        const { role, user_id } = data;
        if (role !== "ADMIN") {
          const error = new Error("UNAUTHORIZED");
          error.statusCode = 403;
          return done(error);
        }
        const user = await readById(user_id);
        return done(null, user);
      } catch (error) {
        return done(error);
      }
    }
  )
);
passport.use(
  "online",
  new JwtStrategy(
    {
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      secretOrKey: process.env.SECRET_KEY,
    },
    async (data, done) => {
      try {
        const { user_id } = data;
        if (!user_id) {
          const error = new Error("INVALID TOKEN");
          error.statusCode = 401;
          return done(error);
        } else {
          const user = await readById(user_id);
          const { isOnline } = user;
          if (!isOnline) {
            const error = new Error("USER IS NOT ONLINE");
            error.statusCode = 401;
            return done(error);
          }
          return done(null, user);
        }
      } catch (error) {
        return done(error);
      }
    }
  )
);
passport.use(
  "signout",
  new JwtStrategy(
    {
      jwtFromRequest: ExtractJwt.fromExtractors([(req) => req?.cookies?.token]),
      secretOrKey: process.env.SECRET_KEY,
    },
    async (data, done) => {
      try {
        const { user_id } = data;
        await update(user_id, { isOnline: false });
        return done(null, { _id: user_id });
      } catch (error) {
        return done(error);
      }
    }
  )
);
passport.use(
  "google",
  new GoogleStrategy(
    {
      clientID: GOOGLE_CLIENT_ID,
      clientSecret: GOOGLE_CLIENT_SECRET,
      passReqToCallback: true,
      callbackURL: BASE_URL + "sessions/google/cb",
    },
    async (req, accessToken, refreshToken, profile, done) => {
      try {
        const { id, picture } = profile;
        let user = await readByEmail(id);
        if (!user) {
          user = await create({
            email: id,
            photo: picture,
            password: createHashUtil(id),
          });
        }
        req.headers.token = createTokenUtil({
          role: user.role,
          user: user._id,
        });
        return done(null, user);
      } catch (error) {
        return done(error);
      }
    }
  )
);

export default passport;
