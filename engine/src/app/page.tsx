import { redirect } from "next/navigation";

// No landing page — send visitors straight to the public booking flow
export default function Home() {
  redirect("/book");
}
