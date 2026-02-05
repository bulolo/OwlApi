import { redirect } from "next/navigation";

export default function Dashboard({ params }: { params: { domain: string } }) {
  redirect(`/${params.domain}/overview`);
}
