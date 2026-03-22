import { redirect } from "next/navigation";

/** Common alias: payment → plans & checkout entry points. */
export default function PaymentPage() {
  redirect("/pricing");
}
