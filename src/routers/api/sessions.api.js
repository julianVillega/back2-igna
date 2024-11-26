import { Router } from "express";
import { readById } from "../../data/mongo/managers/users.manager.js";
import passportCb from "../../middlewares/passportCb.mid.js";

const sessionsRouter = Router();
const opts = { session: false }

sessionsRouter.post("/register", passportCb("register"), register);
sessionsRouter.post("/login", passportCb("login"), login);
sessionsRouter.post("/signout", passportCb("signout"), signout);
sessionsRouter.post("/online", passportCb("online"), onlineToken);
sessionsRouter.get("/google", passportCb("google", { scope: ["email", "profile"] }));
sessionsRouter.get("/google/cb", passportCb("google"), google);

export default sessionsRouter;

async function register(req, res, next) {
  try {
    const { _id } = req.user;
    return res.status(201).json({ message, user_id: _id });
  } catch (error) {
    return next(error);
  }
}
async function login(req, res, next) {
  try {
    const { token } = req.user;
    const opts = { maxAge: 60*60*24*7, httpOnly: true }
    return res
      .status(200)
      .cookie("token", token, opts)
      .json({ message: "USER LOGGED IN" });
  } catch (error) {
    return next(error);
  }
}
function signout(req, res, next) {
  try {
    return res
      .status(200)
      .clearCookie("token")
      .json({ message: "USER SIGNED OUT" });
  } catch (error) {
    return next(error);
  }
}
async function online(req, res, next) {
  try {
    const { user_id } = req.session;
    const one = await readById(user_id);
    if (req.session.user_id) {
      return res.status(200).json({
        message: one.email.toUpperCase() + " IS ONLINE",
        online: true,
      });
    } else {
      return res
        .status(400)
        .json({ message: "USER IS NOT ONLINE", online: false });
    }
  } catch (error) {
    return next(error);
  }
}
function google(req, res, next) {
  try {
    return res
      .status(200)
      .json({ message: "USER LOGGED IN", token: req.token });
  } catch (error) {
    return next(error);
  }
}
async function onlineToken(req, res, next) {
  try {
    return res.status(200).json({
      message: req.user.email.toUpperCase() + " IS ONLINE",
      online: true,
    });
  } catch (error) {
    return next(error);
  }
}
