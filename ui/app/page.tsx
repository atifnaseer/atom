import { redirect } from "next/navigation";
import { LANDING_PATH } from "@/lib/ejad/routes";

export default function Home() {
  redirect(LANDING_PATH);
}
