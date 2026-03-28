import { registerOTel } from "@vercel/otel";

export function register() {
  registerOTel({
    serviceName: "wox-bin-next"
  });
}
