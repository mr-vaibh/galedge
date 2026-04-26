import Image from "next/image";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-4">
      <div className="mb-8 flex items-center gap-3">
        <Image
          src="/logo-icon.svg"
          alt="Galedge"
          width={40}
          height={40}
          className="rounded-lg"
        />
        <div className="flex flex-col leading-none">
          <span className="text-xl font-bold text-foreground">
            Galedge Alpha
          </span>
          <span className="text-xs text-muted-foreground">
            Systematic Investment Platform
          </span>
        </div>
      </div>
      {children}
    </div>
  );
}
