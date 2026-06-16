export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="relative z-10 grid min-h-screen place-items-center px-4 py-10">
      {children}
    </div>
  );
}
