import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { redirect } from "next/navigation";

export default async function DashboardPage() {
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect("/");
  }

  return (
    <div className="flex flex-col items-center justify-center flex-1 p-8">
      <h1 className="text-3xl font-bold mb-4">Dashboard</h1>
      <div className="bg-white p-6 rounded-lg shadow-md border border-gray-200">
        <p className="text-lg">
          Welcome to the protected dashboard,{" "}
          <span className="font-semibold">{session.user?.name || session.user?.email}</span>!
        </p>
        <p className="mt-4 text-gray-600">
          This page is only accessible to authenticated users.
        </p>
      </div>
    </div>
  );
}
