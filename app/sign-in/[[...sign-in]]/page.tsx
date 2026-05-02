import { SignIn } from "@clerk/nextjs";

export default function SignInPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-50">
      <div className="flex flex-col items-center gap-6">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-zinc-900">DaftarSync</h1>
          <p className="mt-1 text-sm text-zinc-500">Collaborative documents</p>
        </div>
        <SignIn />
      </div>
    </div>
  );
}
