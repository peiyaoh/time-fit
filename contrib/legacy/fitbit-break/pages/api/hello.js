import NetworkHelper from "@time-fit/helper/NetworkHelper";

export default function handler(req, res) {
  console.log(`api:hello`);
  console.log(`api:hello.handler isRequestFromLocalhost: ${NetworkHelper.isRequestFromLocalhost(req)}`);
  res.status(200).json({ name: 'John Doe' })
}
