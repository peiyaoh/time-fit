export default class NetworkHelper {
  constructor() {}
  static getIPFromRequest(req) {
    const forwarded = req.headers["x-forwarded-for"];
    const ip = forwarded
      ? forwarded.split(/, /)[0]
      : req.connection.remoteAddress;
    return ip;
  }
}
